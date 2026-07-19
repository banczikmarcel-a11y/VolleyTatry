import { getAdminState } from "@/lib/admin";
import { assignRefereeTeams, generateRoundRobinSchedule, scheduleGroupMatches } from "@/src/domain/tournament/generators";
import { generatePlayoffBracket, resolvePlayoffProgression as resolvePlayoffProgressionDomain } from "@/src/domain/tournament/playoffs";
import { validateMatchResult } from "@/src/domain/tournament/rules";
import { calculateGroupStandings } from "@/src/domain/tournament/standings";
import type {
  AddTournamentTeamsInput,
  AssignTournamentTeamsToGroupsInput,
  CloseTournamentInput,
  CreateTournamentInput,
  EnterTournamentMatchResultInput,
  GenerateGroupStageScheduleInput,
  GeneratedTournamentMatchDraft,
  GroupStandingsSnapshot,
  ResolvePlayoffProgressionInput,
  SaveGeneratedMatchesInput,
  TournamentBundle,
  TournamentFinalStandingWriteInput,
  TournamentMatchRecord,
  TournamentResultAuditSnapshot,
  TournamentServiceError,
  TournamentServiceResult
} from "@/src/server/tournaments/types";
import type { TournamentMatchPhase } from "@/types/tournament";
import type { PlayoffProgressionChange, PlayoffProgressionMatch } from "@/src/domain/tournament/playoffs";

type PlayoffPhase = Exclude<TournamentMatchPhase, "group_stage">;
type PlayoffMatchRecord = TournamentMatchRecord & { phase: PlayoffPhase };
type PlayoffProgressionPreview = {
  changes: PlayoffProgressionChange[];
  matches: PlayoffProgressionMatch[];
};
type TournamentAdminStateProvider = typeof getAdminState;
type TournamentServiceRepository = Awaited<
  ReturnType<(typeof import("@/src/server/tournaments/repositories/tournament-repository"))["createTournamentRepository"]>
>;
const PLAYOFF_PHASES: readonly PlayoffPhase[] = ["semifinal", "bronze", "final", "placement"];

function fail<T>(error: TournamentServiceError): TournamentServiceResult<T> {
  return { error, ok: false };
}

function ok<T>(data: T): TournamentServiceResult<T> {
  return { data, ok: true };
}

async function requireAdminAccess(adminStateProvider: TournamentAdminStateProvider = getAdminState) {
  const adminState = await adminStateProvider();

  if (!adminState.userId || !adminState.isAdmin) {
    return fail<null>({
      code: "AUTHORIZATION_REQUIRED",
      message: "Tournament administration requires an authenticated administrator."
    });
  }

  return ok(adminState.userId);
}

function mapRepositoryError(error: { code: string; message: string; cause?: unknown }): TournamentServiceError {
  return {
    code: error.code === "NOT_FOUND" ? "NOT_FOUND" : error.code === "CONFLICT" ? "CONFLICT" : "REPOSITORY_ERROR",
    details: error.cause,
    message: error.message
  };
}

function buildGroupSnapshots(bundle: TournamentBundle): TournamentServiceResult<GroupStandingsSnapshot[]> {
  const groups = bundle.groups.filter((group) => group.code === "A" || group.code === "B");
  const snapshots: GroupStandingsSnapshot[] = [];

  for (const group of groups) {
    const teams = bundle.teams.filter((team) => team.tournament_group_id === group.id);
    const groupMatches = bundle.matches.filter((match) => match.phase === "group_stage" && match.tournament_group_id === group.id);

    const standingsResult = calculateGroupStandings({
      matches: groupMatches.map((match) => ({
        awayTeamId: match.away_tournament_team_id ?? "",
        homeTeamId: match.home_tournament_team_id ?? "",
        id: match.id,
        isCompleted: match.status === "completed",
        sets: match.sets.map((set) => ({
          awayPoints: set.away_points,
          homePoints: set.home_points,
          setNumber: set.set_number
        }))
      })),
      teams: teams.map((team) => ({
        id: team.id,
        name: team.display_name ?? team.teamName
      }))
    });

    if (!standingsResult.ok) {
      return fail({
        code: "VALIDATION_FAILED",
        details: standingsResult.errors,
        message: `Could not calculate standings for group ${group.code}.`
      });
    }

    snapshots.push({
      entries: standingsResult.entries.map((entry) => ({
        draws: entry.draws,
        groupCode: group.code,
        losses: entry.losses,
        played: entry.played,
        position: entry.position,
        rallyPointDifference: entry.rallyPointDifference,
        rallyPointsAgainst: entry.rallyPointsAgainst,
        rallyPointsFor: entry.rallyPointsFor,
        setDifference: entry.setDifference,
        setsAgainst: entry.setsAgainst,
        setsFor: entry.setsFor,
        tablePoints: entry.tablePoints,
        teamId: entry.teamId,
        teamName: entry.teamName,
        wins: entry.wins
      })),
      groupCode: group.code,
      groupId: group.id
    });
  }

  return ok(snapshots.sort((left, right) => left.groupCode.localeCompare(right.groupCode, "sk")));
}

function toGroupStageDrafts(
  scheduleResult: ReturnType<typeof scheduleGroupMatches>,
  bundle: TournamentBundle
): TournamentServiceResult<{ matches: GeneratedTournamentMatchDraft[]; warnings: { code: string; message: string }[] }> {
  if (!scheduleResult.ok) {
    return fail({
      code: "VALIDATION_FAILED",
      details: scheduleResult.errors,
      message: "Group-stage scheduling constraints are invalid."
    });
  }

  const drafts: GeneratedTournamentMatchDraft[] = [];
  const warnings: { code: string; message: string }[] = [];
  const groupMatchOrderByGroupId = new Map<string, number>();

  for (const round of scheduleResult.schedule.rounds) {
    const groupTeams = bundle.teams.filter((team) => team.tournament_group_id === round.groupId);
    const refereeResult = assignRefereeTeams({
      matches: round.matches,
      teams: groupTeams.map((team) => ({
        groupId: round.groupId,
        id: team.id
      }))
    });

    if (!refereeResult.ok) {
      return fail({
        code: "VALIDATION_FAILED",
        details: refereeResult.errors,
        message: `Referee assignment could not be generated for group ${groupTeams[0]?.groupCode ?? "?"}.`
      });
    }

    const refereeBySequenceNumber = new Map(
      refereeResult.result.assignments.map((assignment) => [assignment.matchSequenceNumber, assignment.refereeTeamId])
    );
    warnings.push(
      ...refereeResult.result.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message
      }))
    );
    const groupCode = bundle.groups.find((group) => group.id === round.groupId)?.code ?? null;

    round.matches.forEach((match) => {
      const groupMatchOrder = (groupMatchOrderByGroupId.get(round.groupId) ?? 0) + 1;
      groupMatchOrderByGroupId.set(round.groupId, groupMatchOrder);

      drafts.push({
        awayTournamentTeamId: match.awayTeamId,
        bracketKey: `group_${groupCode ?? "?"}_round_${match.roundNumber}_match_${match.matchNumber}`,
        groupCode,
        homeTournamentTeamId: match.homeTeamId,
        id: `${match.tournamentId}:group_stage:${groupCode ?? "?"}:${match.roundNumber}:${match.sequenceNumber}`,
        label: `Skupina ${groupCode ?? "?"} - zápas ${groupMatchOrder}`,
        location: `Ihrisko ${match.courtNumber}`,
        phase: "group_stage",
        placementRank: null,
        refereeTournamentTeamId: refereeBySequenceNumber.get(match.sequenceNumber) ?? null,
        roundNumber: match.roundNumber,
        ruleProfile: "GROUP_TIMED_MATCH",
        scheduledAt: match.scheduledStart,
        sequenceNumber: match.sequenceNumber,
        slotNumber: match.sequenceNumber,
        sources: [
          {
            participantSlot: "home",
            sourceTournamentTeamId: match.homeTeamId,
            sourceType: "tournament_team"
          },
          {
            participantSlot: "away",
            sourceTournamentTeamId: match.awayTeamId,
            sourceType: "tournament_team"
          }
        ],
        status: "scheduled",
        tournamentGroupId: round.groupId,
        tournamentId: round.tournamentId
      });
    });
  }

  return ok({
    matches: drafts,
    warnings
  });
}

function deriveRuleProfile(match: TournamentMatchRecord) {
  return match.phase === "group_stage" ? "GROUP_TIMED_MATCH" : "PLAYOFF_BEST_OF_THREE_TO_15";
}

function buildResultAuditSnapshot(
  match: TournamentMatchRecord,
  input: {
    sets: readonly { awayPoints: number; homePoints: number; setNumber: number }[];
    status: TournamentMatchRecord["status"];
  }
): TournamentResultAuditSnapshot {
  const profile = deriveRuleProfile(match);
  const sets = [...input.sets].map((set) => ({
    awayPoints: set.awayPoints,
    homePoints: set.homePoints,
    setNumber: set.setNumber
  }));

  if (sets.length === 0) {
    return {
      profile,
      sets,
      status: input.status,
      summary: null
    };
  }

  const validation = validateMatchResult({
    profile,
    sets
  });

  return {
    profile,
    sets,
    status: input.status,
    summary: validation.ok ? validation.summary : { errors: validation.errors }
  };
}

function areResultAuditSnapshotsEqual(left: TournamentResultAuditSnapshot, right: TournamentResultAuditSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPlayoffPhase(phase: TournamentMatchPhase): phase is PlayoffPhase {
  return phase !== "group_stage";
}

function isPlayoffMatch(match: TournamentMatchRecord): match is PlayoffMatchRecord {
  return isPlayoffPhase(match.phase);
}

function isProgressionSource(
  source: TournamentMatchRecord["sources"][number]
): source is TournamentMatchRecord["sources"][number] & { source_type: "match_winner" | "match_loser" } {
  return source.source_type === "match_winner" || source.source_type === "match_loser";
}

async function previewPlayoffProgression(
  repository: TournamentServiceRepository,
  bundle: TournamentBundle,
  sourceMatchId: string,
  overrideResult?: readonly { awayPoints: number; homePoints: number; setNumber: number }[] | null
): Promise<TournamentServiceResult<PlayoffProgressionPreview>> {
  const dependentSourcesResult = await repository.listMatchSourcesBySourceMatchId(bundle.tournament.id, sourceMatchId);

  if (!dependentSourcesResult.ok) {
    return fail(mapRepositoryError(dependentSourcesResult.error));
  }

  const playoffMatches: PlayoffProgressionMatch[] = bundle.matches
    .filter(isPlayoffMatch)
    .map((match) => ({
      awayTeamId: match.away_tournament_team_id,
      homeTeamId: match.home_tournament_team_id,
      id: match.id,
      phase: match.phase,
      result:
        (match.id === sourceMatchId ? overrideResult : null) !== null && match.id === sourceMatchId
          ? {
              sets: (overrideResult ?? []).map((set) => ({
                awayPoints: set.awayPoints,
                homePoints: set.homePoints,
                setNumber: set.setNumber
              }))
            }
          : match.sets.length
            ? {
                sets: match.sets.map((set) => ({
                  awayPoints: set.away_points,
                  homePoints: set.home_points,
                  setNumber: set.set_number
                }))
              }
            : null
    }));

  const progressionResult = resolvePlayoffProgressionDomain({
    matches: playoffMatches,
    sourceMatchId,
    sources: dependentSourcesResult.data
      .filter(isProgressionSource)
      .map((source) => ({
        participantSlot: source.participant_slot,
        sourceMatchId: source.source_tournament_match_id ?? "",
        sourceType: source.source_type,
        targetMatchId: source.tournament_match_id
      }))
  });

  if (!progressionResult.ok) {
    return fail({
      code: "PLAYOFF_CONFLICT",
      details: progressionResult.conflicts,
      message: "Playoff progression could not be applied safely."
    });
  }

  return ok(progressionResult);
}

function deriveFinalStandings(bundle: TournamentBundle): TournamentServiceResult<TournamentFinalStandingWriteInput[]> {
  const findMatch = (predicate: (match: TournamentMatchRecord) => boolean) => bundle.matches.find(predicate);
  const requiredMatches = [
    findMatch((match) => match.phase === "final"),
    findMatch((match) => match.phase === "bronze"),
    findMatch((match) => match.phase === "placement" && match.placement_rank === 5),
    findMatch((match) => match.phase === "placement" && match.placement_rank === 7),
    findMatch((match) => match.phase === "placement" && match.placement_rank === 9)
  ];

  if (requiredMatches.some((match) => !match)) {
    return fail({
      code: "PLAYOFF_INCOMPLETE",
      message: "All final, bronze, and placement matches must exist before closing the tournament."
    });
  }

  const standings: TournamentFinalStandingWriteInput[] = [];

  for (const match of requiredMatches) {
    if (!match || match.status !== "completed" || !match.home_tournament_team_id || !match.away_tournament_team_id) {
      return fail({
        code: "PLAYOFF_INCOMPLETE",
        message: "All playoff and placement matches must be completed before closing the tournament."
      });
    }

    const validation = validateMatchResult({
      profile: "PLAYOFF_BEST_OF_THREE_TO_15",
      sets: match.sets.map((set) => ({
        awayPoints: set.away_points,
        homePoints: set.home_points,
        setNumber: set.set_number
      }))
    });

    if (!validation.ok || validation.profile !== "PLAYOFF_BEST_OF_THREE_TO_15") {
      return fail({
        code: "VALIDATION_FAILED",
        details: validation.ok ? [] : validation.errors,
        message: `Match '${match.id}' does not contain a valid playoff result.`
      });
    }

    const winnerTeamId = validation.summary.winner === "home" ? match.home_tournament_team_id : match.away_tournament_team_id;
    const loserTeamId = validation.summary.loser === "home" ? match.home_tournament_team_id : match.away_tournament_team_id;

    if (match.phase === "final") {
      standings.push({ finalPosition: 1, tournamentTeamId: winnerTeamId });
      standings.push({ finalPosition: 2, tournamentTeamId: loserTeamId });
    } else if (match.phase === "bronze") {
      standings.push({ finalPosition: 3, tournamentTeamId: winnerTeamId });
      standings.push({ finalPosition: 4, tournamentTeamId: loserTeamId });
    } else if (match.placement_rank === 5) {
      standings.push({ finalPosition: 5, tournamentTeamId: winnerTeamId });
      standings.push({ finalPosition: 6, tournamentTeamId: loserTeamId });
    } else if (match.placement_rank === 7) {
      standings.push({ finalPosition: 7, tournamentTeamId: winnerTeamId });
      standings.push({ finalPosition: 8, tournamentTeamId: loserTeamId });
    } else if (match.placement_rank === 9) {
      standings.push({ finalPosition: 9, tournamentTeamId: winnerTeamId });
      standings.push({ finalPosition: 10, tournamentTeamId: loserTeamId });
    }
  }

  return ok(standings.sort((left, right) => left.finalPosition - right.finalPosition));
}

export async function createTournamentServiceWithDependencies(dependencies?: {
  getAdminState?: TournamentAdminStateProvider;
  repository?: TournamentServiceRepository | Promise<TournamentServiceRepository>;
}) {
  const repository = dependencies?.repository
    ? await dependencies.repository
    : await (await import("@/src/server/tournaments/repositories/tournament-repository")).createTournamentRepository();
  const adminStateProvider = dependencies?.getAdminState ?? getAdminState;

  return {
    async createTournament(input: CreateTournamentInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const adminUserId = authResult.data;

      if (!adminUserId) {
        return fail({
          code: "AUTHORIZATION_REQUIRED",
          message: "Tournament administration requires an authenticated administrator."
        });
      }

      const formatsResult = await repository.listTournamentFormats();

      if (!formatsResult.ok) {
        return fail(mapRepositoryError(formatsResult.error));
      }

      const format = formatsResult.data.find((item) => item.key === input.formatKey);

      if (!format) {
        return fail({
          code: "VALIDATION_FAILED",
          message: `Tournament format '${input.formatKey}' was not found.`
        });
      }

      const tournamentResult = await repository.createTournament({
        break_duration_minutes: input.breakDurationMinutes,
        court_count: input.courtCount,
        description: input.description ?? null,
        ends_at: input.endsAt ?? null,
        format_id: format.id,
        is_public: input.isPublic ?? true,
        location: input.location ?? null,
        match_duration_minutes: input.matchDurationMinutes,
        name: input.name,
        published_at: input.publishedAt ?? null,
        slug: input.slug,
        starts_at: input.startsAt ?? null,
        status: input.status ?? "draft",
        updated_by: authResult.data
      });

      if (!tournamentResult.ok) {
        return fail(mapRepositoryError(tournamentResult.error));
      }

      const groupResult = await repository.upsertTournamentGroups([
        {
          code: "A",
          name: "Skupina A",
          sort_order: 1,
          tournament_id: tournamentResult.data.id,
          updated_by: authResult.data
        },
        {
          code: "B",
          name: "Skupina B",
          sort_order: 2,
          tournament_id: tournamentResult.data.id,
          updated_by: authResult.data
        }
      ]);

      if (!groupResult.ok) {
        return fail(mapRepositoryError(groupResult.error));
      }

      return ok({
        groups: groupResult.data,
        tournament: tournamentResult.data
      });
    },

    async addTeamsToTournament(input: AddTournamentTeamsInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const needsBaseTeamLookup = input.teamIds.some((teamInput) => !teamInput.displayName?.trim() && teamInput.teamId);
      const availableTeamsResult = needsBaseTeamLookup ? await repository.listAvailableTeams() : null;

      if (availableTeamsResult && !availableTeamsResult.ok) {
        return fail(mapRepositoryError(availableTeamsResult.error));
      }

      const groupsByCode = new Map(bundleResult.data.groups.map((group) => [group.code, group]));
      const baseTeamsById = new Map(
        (availableTeamsResult?.ok ? availableTeamsResult.data : []).map((team) => [team.id, team])
      );
      const existingLabels = new Set(
        bundleResult.data.teams
          .map((team) => (team.display_name ?? team.teamName).trim().toLocaleLowerCase("sk"))
          .filter((value) => value.length > 0)
      );
      const currentCounts = new Map(
        bundleResult.data.groups.map((group) => [group.code, bundleResult.data.teams.filter((team) => team.tournament_group_id === group.id).length])
      );

      const payloads = input.teamIds.map((teamInput, index) => {
        const fallbackDisplayName =
          !teamInput.displayName?.trim() && teamInput.teamId
            ? baseTeamsById.get(teamInput.teamId)?.name ?? null
            : null;
        const resolvedDisplayName = teamInput.displayName?.trim() || fallbackDisplayName;
        const normalizedLabel = resolvedDisplayName?.toLocaleLowerCase("sk") ?? "";

        if (!resolvedDisplayName || !normalizedLabel) {
          return null;
        }

        if (existingLabels.has(normalizedLabel)) {
          return undefined;
        }

        const groupCode =
          teamInput.groupCode ??
          [...currentCounts.entries()].sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0], "sk"))[0]?.[0];
        const targetGroup = groupCode ? groupsByCode.get(groupCode) : null;

        if (!targetGroup) {
          return null;
        }

        currentCounts.set(groupCode, (currentCounts.get(groupCode) ?? 0) + 1);
        existingLabels.add(normalizedLabel);

        return {
          display_name: resolvedDisplayName,
          id: teamInput.teamId ? `tt-${teamInput.teamId}` : crypto.randomUUID(),
          seed_number: teamInput.seedNumber ?? null,
          sort_order: teamInput.sortOrder ?? bundleResult.data.teams.length + index + 1,
          team_id: teamInput.teamId ?? null,
          tournament_group_id: targetGroup.id,
          tournament_id: input.tournamentId,
          updated_by: authResult.data
        };
      });

      if (payloads.some((payload) => payload === null)) {
        return fail({
          code: "VALIDATION_FAILED",
          message: "Každé turnajové družstvo musí mať názov a platnú skupinu."
        });
      }

      if (payloads.some((payload) => payload === undefined)) {
        return fail({
          code: "CONFLICT",
          message: "Družstvo s rovnakým názvom už v tomto turnaji existuje."
        });
      }

      const saveResult = await repository.upsertTournamentTeams(
        payloads.filter((payload): payload is Exclude<typeof payload, null | undefined> => payload !== null && payload !== undefined)
      );
      return saveResult.ok ? ok(saveResult.data) : fail(mapRepositoryError(saveResult.error));
    },

    async assignTeamsToGroups(input: AssignTournamentTeamsToGroupsInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const groupsByCode = new Map(bundleResult.data.groups.map((group) => [group.code, group]));
      const teamsById = new Map(bundleResult.data.teams.map((team) => [team.id, team]));

      const payloads = input.assignments.map((assignment) => {
        const team = teamsById.get(assignment.tournamentTeamId);
        const group = groupsByCode.get(assignment.groupCode);

        if (!team || !group) {
          return null;
        }

        const displayName = assignment.displayName?.trim() || team.display_name || team.teamName;

        return {
          display_name: displayName,
          id: team.id,
          seed_number: assignment.seedNumber ?? team.seed_number,
          sort_order: assignment.sortOrder ?? team.sort_order,
          team_id: team.team_id,
          tournament_group_id: group.id,
          tournament_id: input.tournamentId,
          updated_by: authResult.data
        };
      });

      if (payloads.some((payload) => payload === null)) {
        return fail({
          code: "VALIDATION_FAILED",
          message: "Group assignment references an unknown tournament team or group."
        });
      }

      const saveResult = await repository.upsertTournamentTeams(payloads.filter((payload): payload is NonNullable<typeof payload> => payload !== null));
      return saveResult.ok ? ok(saveResult.data) : fail(mapRepositoryError(saveResult.error));
    },

    async generateGroupStageSchedule(input: GenerateGroupStageScheduleInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const rounds = [];

      for (const group of bundleResult.data.groups.filter((item) => item.code === "A" || item.code === "B")) {
        const teams = bundleResult.data.teams
          .filter((team) => team.tournament_group_id === group.id)
          .sort((left, right) => (left.seed_number ?? 999) - (right.seed_number ?? 999) || (left.sort_order ?? 999) - (right.sort_order ?? 999));

        const roundRobin = generateRoundRobinSchedule({
          groupId: group.id,
          teams: teams.map((team) => ({ id: team.id })),
          tournamentId: input.tournamentId
        });

        if (!roundRobin.ok) {
          return fail({
            code: "VALIDATION_FAILED",
            details: roundRobin.errors,
            message: `Round-robin generation failed for group ${group.code}.`
          });
        }

        rounds.push(...roundRobin.schedule.rounds);
      }

      const scheduleResult = scheduleGroupMatches({
        breakDurationMinutes: input.breakDurationMinutes,
        courtCount: input.courtCount,
        groupConfigurations: bundleResult.data.groups
          .filter((group) => group.code === "A" || group.code === "B")
          .map((group) => ({
            groupId: group.id,
            order: group.sort_order
          })),
        matchDurationMinutes: input.matchDurationMinutes,
        rounds,
        tournamentId: input.tournamentId,
        tournamentStart: input.tournamentStart
      });

      return toGroupStageDrafts(scheduleResult, bundleResult.data);
    },

    async saveGeneratedMatches(input: SaveGeneratedMatchesInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const existingGroupMatches = bundleResult.data.matches.filter((match) => match.phase === "group_stage");

      if (existingGroupMatches.length > 0 && !input.allowRegenerate) {
        return fail({
          code: "CONFLICT",
          message: "Group-stage schedule already exists. Explicit regeneration confirmation is required before overwriting it."
        });
      }

      const lockedGroupMatch = existingGroupMatches.find((match) => match.status === "completed" || match.status === "in_progress");

      if (lockedGroupMatch) {
        return fail({
          code: "CONFLICT",
          message: "Group-stage schedule cannot be regenerated after results have started or been completed."
        });
      }

      const saveResult = await repository.upsertTournamentMatches(input.matches);
      return saveResult.ok ? ok(saveResult.data) : fail(mapRepositoryError(saveResult.error));
    },

    async enterOrCorrectMatchResult(input: EnterTournamentMatchResultInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const adminUserId = authResult.data;

      if (!adminUserId) {
        return fail({
          code: "AUTHORIZATION_REQUIRED",
          message: "Tournament administration requires an authenticated administrator."
        });
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const match = bundleResult.data.matches.find((item) => item.id === input.tournamentMatchId);

      if (!match) {
        return fail({
          code: "NOT_FOUND",
          message: `Tournament match '${input.tournamentMatchId}' was not found.`
        });
      }

      const validation = validateMatchResult({
        profile: deriveRuleProfile(match),
        sets: [...input.sets]
      });

      if (!validation.ok) {
        return fail({
          code: "VALIDATION_FAILED",
          details: validation.errors,
          message: "Submitted match result does not satisfy tournament rules."
        });
      }

      const previousResult = buildResultAuditSnapshot(match, {
        sets: match.sets.map((set) => ({
          awayPoints: set.away_points,
          homePoints: set.home_points,
          setNumber: set.set_number
        })),
        status: match.status
      });

      const newResult = buildResultAuditSnapshot(match, {
        sets: input.sets,
        status: input.status ?? "completed"
      });

      const progressionPreview =
        match.phase === "semifinal"
          ? await previewPlayoffProgression(repository, bundleResult.data, match.id, input.sets)
          : ok(null);

      if (!progressionPreview.ok) {
        return fail(progressionPreview.error);
      }

      const saveResult = await repository.replaceMatchResult({
        sets: input.sets,
        status: input.status ?? "completed",
        tournamentId: input.tournamentId,
        tournamentMatchId: input.tournamentMatchId,
        updatedBy: adminUserId
      });

      if (!saveResult.ok) {
        return fail(mapRepositoryError(saveResult.error));
      }

      let progressionData:
        | {
            changes: PlayoffProgressionChange[];
            matches: TournamentMatchRecord[];
          }
        | null = null;

      if (match.phase === "semifinal" && progressionPreview.data) {
        const updateResult = await repository.updateMatchParticipants(
          input.tournamentId,
          progressionPreview.data.changes.map((change) => ({
            participantSlot: change.participantSlot,
            teamId: change.teamId,
            tournamentMatchId: change.dependentMatchId
          }))
        );

        if (!updateResult.ok) {
          return fail(mapRepositoryError(updateResult.error));
        }

        progressionData = {
          changes: progressionPreview.data.changes,
          matches: updateResult.data
        };
      }

      if (!areResultAuditSnapshotsEqual(previousResult, newResult)) {
        const auditResult = await repository.insertTournamentResultAuditLog({
          changedBy: adminUserId,
          correctionReason: input.correctionReason ?? null,
          newResult,
          previousResult,
          tournamentId: input.tournamentId,
          tournamentMatchId: input.tournamentMatchId
        });

        if (!auditResult.ok) {
          return fail(mapRepositoryError(auditResult.error));
        }
      }

      return ok({
        match: saveResult.data,
        progression: progressionData
      });
    },

    async recalculateStandings(tournamentId: string) {
      const bundleResult = await repository.getTournamentBundle(tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      return buildGroupSnapshots(bundleResult.data);
    },

    async closeGroupStage(tournamentId: string) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const incompleteGroupMatch = bundleResult.data.matches.find((match) => match.phase === "group_stage" && match.status !== "completed");

      if (incompleteGroupMatch) {
        return fail({
          code: "GROUP_STAGE_INCOMPLETE",
          message: "All group-stage matches must be completed before closing the group stage."
        });
      }

      const standingsResult = buildGroupSnapshots(bundleResult.data);

      if (!standingsResult.ok) {
        return standingsResult;
      }

      const updateResult = await repository.updateTournament(tournamentId, {
        status: "in_progress",
        updated_by: authResult.data
      });

      if (!updateResult.ok) {
        return fail(mapRepositoryError(updateResult.error));
      }

      return ok({
        standings: standingsResult.data,
        tournament: updateResult.data
      });
    },

    async generatePlayoffs(tournamentId: string) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const incompleteGroupMatch = bundleResult.data.matches.find((match) => match.phase === "group_stage" && match.status !== "completed");

      if (incompleteGroupMatch) {
        return fail({
          code: "GROUP_STAGE_INCOMPLETE",
          message: "Playoffs can only be generated after all group-stage matches are completed."
        });
      }

      const existingPlayoffMatch = bundleResult.data.matches.find((match) => match.phase !== "group_stage");

      if (existingPlayoffMatch) {
        return fail({
          code: "CONFLICT",
          message: "Playoff bracket has already been generated for this tournament."
        });
      }

      const standingsResult = buildGroupSnapshots(bundleResult.data);

      if (!standingsResult.ok) {
        return standingsResult;
      }

      const groupA = standingsResult.data.find((group) => group.groupCode === "A");
      const groupB = standingsResult.data.find((group) => group.groupCode === "B");

      if (!groupA || !groupB) {
        return fail({
          code: "VALIDATION_FAILED",
          message: "Both groups A and B must exist before playoff generation."
        });
      }

      const bracketResult = generatePlayoffBracket({
        groupAStandings: groupA.entries,
        groupBStandings: groupB.entries,
        tournamentId
      });

      if (!bracketResult.ok) {
        return fail({
          code: "VALIDATION_FAILED",
          details: bracketResult.errors,
          message: "Playoff bracket generation failed."
        });
      }

      const drafts: GeneratedTournamentMatchDraft[] = bracketResult.matches.map((match) => ({
        awayTournamentTeamId: match.awayTeamId,
        bracketKey: match.bracketKey,
        groupCode: null,
        homeTournamentTeamId: match.homeTeamId,
        id: match.id,
        label: match.label,
        location: null,
        phase: match.phase,
        placementRank: match.placementRank,
        refereeTournamentTeamId: null,
        roundNumber: match.roundNumber,
        ruleProfile: match.ruleProfile,
        scheduledAt: null,
        slotNumber: match.slotNumber,
        sources: match.sources.map((source) =>
          source.sourceType === "group_position"
            ? {
                participantSlot: source.participantSlot,
                sourceGroupCode: source.groupCode,
                sourceGroupPosition: source.groupPosition,
                sourceType: source.sourceType
              }
            : {
                participantSlot: source.participantSlot,
                sourceTournamentMatchId: source.sourceMatchId,
                sourceType: source.sourceType
              }
        ),
        status: "pending",
        tournamentGroupId: null,
        tournamentId
      }));

      const saveResult = await repository.upsertTournamentMatches(drafts);
      return saveResult.ok ? ok(saveResult.data) : fail(mapRepositoryError(saveResult.error));
    },

    async deletePlayoffs(tournamentId: string) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const playoffMatches = bundleResult.data.matches.filter((match) => isPlayoffPhase(match.phase));

      if (playoffMatches.length === 0) {
        return fail({
          code: "NOT_FOUND",
          message: "Nadstavba pre tento turnaj ešte nebola vygenerovaná."
        });
      }

      const lockedPlayoffMatch = playoffMatches.find((match) => match.status === "completed" || match.status === "in_progress");

      if (lockedPlayoffMatch) {
        return fail({
          code: "CONFLICT",
          message: "Nadstavbu nie je možné zmazať po začatí alebo uložení playoff výsledkov."
        });
      }

      if (bundleResult.data.finalStandings.length > 0 || bundleResult.data.tournament.status === "completed") {
        return fail({
          code: "CONFLICT",
          message: "Nadstavbu nie je možné zmazať po uzavretí turnaja alebo výpočte konečného poradia."
        });
      }

      const deleteResult = await repository.deleteTournamentMatchesByPhases(tournamentId, PLAYOFF_PHASES);

      if (!deleteResult.ok) {
        return fail(mapRepositoryError(deleteResult.error));
      }

      return ok(null);
    },

    async resolvePlayoffProgression(input: ResolvePlayoffProgressionInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const progressionResult = await previewPlayoffProgression(repository, bundleResult.data, input.sourceMatchId);

      if (!progressionResult.ok) {
        return progressionResult;
      }

      const updateResult = await repository.updateMatchParticipants(
        input.tournamentId,
        progressionResult.data.changes.map((change) => ({
          participantSlot: change.participantSlot,
          teamId: change.teamId,
          tournamentMatchId: change.dependentMatchId
        }))
      );

      if (!updateResult.ok) {
        return fail(mapRepositoryError(updateResult.error));
      }

      return ok({
        changes: progressionResult.data.changes,
        matches: updateResult.data
      });
    },

    async closeTournament(input: CloseTournamentInput) {
      const authResult = await requireAdminAccess(adminStateProvider);

      if (!authResult.ok) {
        return authResult;
      }

      const bundleResult = await repository.getTournamentBundle(input.tournamentId);

      if (!bundleResult.ok) {
        return fail(mapRepositoryError(bundleResult.error));
      }

      const finalStandingsResult = deriveFinalStandings(bundleResult.data);

      if (!finalStandingsResult.ok) {
        return finalStandingsResult;
      }

      const saveStandingsResult = await repository.replaceFinalStandings(input.tournamentId, finalStandingsResult.data);

      if (!saveStandingsResult.ok) {
        return fail(mapRepositoryError(saveStandingsResult.error));
      }

      const updateTournamentResult = await repository.updateTournament(input.tournamentId, {
        status: "completed",
        updated_by: authResult.data
      });

      if (!updateTournamentResult.ok) {
        return fail(mapRepositoryError(updateTournamentResult.error));
      }

      return ok({
        finalStandings: saveStandingsResult.data,
        tournament: updateTournamentResult.data
      });
    }
  };
}

export async function createTournamentService() {
  return createTournamentServiceWithDependencies();
}

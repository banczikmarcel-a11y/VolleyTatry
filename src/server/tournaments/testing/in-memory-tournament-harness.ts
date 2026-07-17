import type { AdminState } from "@/lib/admin";
import { createTournamentServiceWithDependencies } from "@/src/server/tournaments/services/tournament-service-core";
import type {
  TournamentFinalStandingRecord,
  TournamentFormatRecord,
  TournamentGroupRecord,
  TournamentMatchRecord,
  TournamentRecord,
  TournamentResultAuditLogRecord,
  TournamentTeamRecord
} from "@/src/server/tournaments/types";
import type { MatchSetInput } from "@/src/domain/tournament/rules";

type BaseTeam = {
  id: string;
  name: string;
  slug: string;
};

type MutableTournamentState = {
  auditLogs: TournamentResultAuditLogRecord[];
  finalStandings: TournamentFinalStandingRecord[];
  groups: TournamentGroupRecord[];
  matches: TournamentMatchRecord[];
  teams: TournamentTeamRecord[];
  tournament: TournamentRecord | null;
};

const DEFAULT_ADMIN_STATE: AdminState = {
  error: null,
  isAdmin: true,
  userId: "admin-user-1"
};

const FORMAT: TournamentFormatRecord = {
  description: "10 teams in two groups of five, semifinals, and placement matches.",
  id: "format-ten-teams",
  is_active: true,
  key: "ten_teams_two_groups_semifinals_placement",
  name: "10 tímov; 2x5; semifinále; o umiestnenie",
  rules: {
    groupCount: 2,
    teamCount: 10
  }
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function ok<T>(data: T) {
  return { data, ok: true as const };
}

function sortMatches(matches: TournamentMatchRecord[]) {
  const phaseOrder = new Map([
    ["group_stage", 1],
    ["semifinal", 2],
    ["bronze", 3],
    ["final", 4],
    ["placement", 5]
  ]);

  return [...matches].sort((left, right) => {
    const phaseDelta = (phaseOrder.get(left.phase) ?? 99) - (phaseOrder.get(right.phase) ?? 99);

    if (phaseDelta !== 0) {
      return phaseDelta;
    }

    return (left.round_number ?? 99) - (right.round_number ?? 99) || (left.slot_number ?? 99) - (right.slot_number ?? 99) || left.id.localeCompare(right.id, "sk");
  });
}

function makeBaseTeams() {
  return Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `team-${number}`,
      name: `Team ${number}`,
      slug: `team-${number}`
    } satisfies BaseTeam;
  });
}

export async function createInMemoryTournamentHarness(adminState: AdminState = DEFAULT_ADMIN_STATE) {
  const baseTeams = makeBaseTeams();
  const state: MutableTournamentState = {
    auditLogs: [],
    finalStandings: [],
    groups: [],
    matches: [],
    teams: [],
    tournament: null
  };

  const repository = {
    async createTournament(input: {
      break_duration_minutes?: number;
      court_count?: number;
      description?: string | null;
      ends_at?: string | null;
      format_id: string;
      is_public?: boolean;
      location?: string | null;
      match_duration_minutes?: number;
      name: string;
      published_at?: string | null;
      slug: string;
      starts_at?: string | null;
      status?: TournamentRecord["status"];
      updated_by?: string | null;
    }) {
      state.tournament = {
        break_duration_minutes: input.break_duration_minutes ?? 5,
        court_count: input.court_count ?? 1,
        created_at: "2026-07-17T08:00:00.000Z",
        description: input.description ?? null,
        ends_at: input.ends_at ?? null,
        format: FORMAT,
        id: "tournament-1",
        is_public: input.is_public ?? true,
        location: input.location ?? null,
        match_duration_minutes: input.match_duration_minutes ?? 20,
        name: input.name,
        published_at: input.published_at ?? null,
        slug: input.slug,
        starts_at: input.starts_at ?? null,
        status: input.status ?? "draft",
        updated_at: "2026-07-17T08:00:00.000Z"
      };

      return ok(clone(state.tournament));
    },

    async deleteTournament() {
      return ok(null);
    },

    async deleteTournamentTeams(tournamentId: string, tournamentTeamIds: readonly string[]) {
      state.teams = state.teams.filter(
        (team) => !(team.tournament_id === tournamentId && tournamentTeamIds.includes(team.id))
      );

      return ok(null);
    },

    async getTournamentBundle(tournamentId: string) {
      if (!state.tournament || state.tournament.id !== tournamentId) {
        return { error: { code: "NOT_FOUND" as const, message: `Tournament '${tournamentId}' was not found.` }, ok: false as const };
      }

      return ok(
        clone({
          finalStandings: state.finalStandings,
          groups: state.groups,
          matches: sortMatches(state.matches),
          teams: state.teams,
          tournament: state.tournament
        })
      );
    },

    async getTournamentBundleBySlug(slug: string) {
      if (!state.tournament || state.tournament.slug !== slug) {
        return { error: { code: "NOT_FOUND" as const, message: `Tournament '${slug}' was not found.` }, ok: false as const };
      }

      return this.getTournamentBundle(state.tournament.id);
    },

    async insertTournamentResultAuditLog(input: {
      changedBy: string;
      correctionReason?: string | null;
      newResult: TournamentResultAuditLogRecord["new_result"];
      previousResult?: TournamentResultAuditLogRecord["previous_result"];
      tournamentId: string;
      tournamentMatchId: string;
    }) {
      const record: TournamentResultAuditLogRecord = {
        changed_at: `2026-07-17T08:${String(state.auditLogs.length).padStart(2, "0")}:00.000Z`,
        changed_by: input.changedBy,
        changedByIdentity: {
          email: `${input.changedBy}@example.com`,
          fullName: input.changedBy
        },
        correction_reason: input.correctionReason ?? null,
        id: `audit-${String(state.auditLogs.length + 1).padStart(2, "0")}`,
        new_result: clone(input.newResult),
        previous_result: clone(input.previousResult ?? null),
        tournament_id: input.tournamentId,
        tournament_match_id: input.tournamentMatchId
      };

      state.auditLogs.unshift(record);
      return ok(clone(record));
    },

    async listAvailableTeams() {
      return ok(clone(baseTeams));
    },

    async listMatchSourcesBySourceMatchId(tournamentId: string, sourceMatchId: string) {
      const sources = state.matches
        .filter((match) => match.tournament_id === tournamentId)
        .flatMap((match) => match.sources)
        .filter((source) => source.source_tournament_match_id === sourceMatchId);

      return ok(clone(sources));
    },

    async listTournamentFormats() {
      return ok([clone(FORMAT)]);
    },

    async listTournamentGroups(tournamentId: string) {
      return ok(clone(state.groups.filter((group) => group.tournament_id === tournamentId)));
    },

    async listTournamentMatches(tournamentId: string) {
      return ok(clone(sortMatches(state.matches.filter((match) => match.tournament_id === tournamentId))));
    },

    async deleteTournamentMatchesByPhases(
      tournamentId: string,
      phases: readonly TournamentMatchRecord["phase"][]
    ) {
      state.matches = state.matches.filter(
        (match) => !(match.tournament_id === tournamentId && phases.includes(match.phase))
      );

      return ok(null);
    },

    async listTournamentResultAuditLogs(tournamentId: string, tournamentMatchId: string) {
      return ok(
        clone(
          state.auditLogs.filter((log) => log.tournament_id === tournamentId && log.tournament_match_id === tournamentMatchId)
        )
      );
    },

    async listTournamentTeams(tournamentId: string) {
      return ok(clone(state.teams.filter((team) => team.tournament_id === tournamentId)));
    },

    async listTournaments() {
      return ok(state.tournament ? [clone(state.tournament)] : []);
    },

    async replaceFinalStandings(tournamentId: string, standings: readonly { finalPosition: number; notes?: string | null; tournamentTeamId: string }[]) {
      state.finalStandings = standings.map((standing, index) => ({
        created_at: "2026-07-17T08:00:00.000Z",
        final_position: standing.finalPosition,
        id: `standing-${String(index + 1).padStart(2, "0")}`,
        notes: standing.notes ?? null,
        tournament_id: tournamentId,
        tournament_team_id: standing.tournamentTeamId,
        updated_at: "2026-07-17T08:00:00.000Z"
      }));

      return ok(clone(state.finalStandings));
    },

    async replaceMatchResult(input: {
      sets: readonly MatchSetInput[];
      status: TournamentMatchRecord["status"];
      tournamentId: string;
      tournamentMatchId: string;
      updatedBy?: string | null;
    }) {
      const match = state.matches.find((item) => item.tournament_id === input.tournamentId && item.id === input.tournamentMatchId);

      if (!match) {
        return { error: { code: "NOT_FOUND" as const, message: `Tournament match '${input.tournamentMatchId}' was not found.` }, ok: false as const };
      }

      match.status = input.status;
      match.updated_at = "2026-07-17T09:00:00.000Z";
      match.sets = [...input.sets]
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((set) => ({
          away_points: set.awayPoints,
          home_points: set.homePoints,
          id: `${match.id}-set-${set.setNumber}`,
          set_number: set.setNumber,
          tournament_id: input.tournamentId,
          tournament_match_id: match.id
        }));

      return ok(clone(match));
    },

    async updateMatchParticipants(
      tournamentId: string,
      changes: readonly { participantSlot: "away" | "home"; teamId: string | null; tournamentMatchId: string }[]
    ) {
      changes.forEach((change) => {
        const match = state.matches.find((item) => item.tournament_id === tournamentId && item.id === change.tournamentMatchId);

        if (!match) {
          return;
        }

        if (change.participantSlot === "home") {
          match.home_tournament_team_id = change.teamId;
        } else {
          match.away_tournament_team_id = change.teamId;
        }
      });

      return ok(clone(sortMatches(state.matches.filter((match) => match.tournament_id === tournamentId))));
    },

    async updateTournament(tournamentId: string, update: Partial<TournamentRecord>) {
      if (!state.tournament || state.tournament.id !== tournamentId) {
        return { error: { code: "NOT_FOUND" as const, message: `Tournament '${tournamentId}' was not found.` }, ok: false as const };
      }

      state.tournament = {
        ...state.tournament,
        ...update,
        updated_at: "2026-07-17T10:00:00.000Z"
      };

      return ok(clone(state.tournament));
    },

    async upsertTournamentGroups(
      rows: readonly { code: TournamentGroupRecord["code"]; name?: string | null; sort_order: number; tournament_id: string }[]
    ) {
      rows.forEach((row) => {
        const existing = state.groups.find((group) => group.tournament_id === row.tournament_id && group.code === row.code);

        if (existing) {
          existing.name = row.name ?? null;
          existing.sort_order = row.sort_order;
          return;
        }

        state.groups.push({
          code: row.code,
          created_at: "2026-07-17T08:00:00.000Z",
          id: `group-${row.code.toLowerCase()}`,
          name: row.name ?? null,
          sort_order: row.sort_order,
          tournament_id: row.tournament_id,
          updated_at: "2026-07-17T08:00:00.000Z"
        });
      });

      return ok(clone([...state.groups].sort((left, right) => left.sort_order - right.sort_order)));
    },

    async upsertTournamentMatches(rows: readonly {
      awayTournamentTeamId?: string | null;
      bracketKey?: string | null;
      homeTournamentTeamId?: string | null;
      id?: string;
      label?: string | null;
      location?: string | null;
      phase: TournamentMatchRecord["phase"];
      placementRank?: number | null;
      refereeTournamentTeamId?: string | null;
      roundNumber?: number | null;
      scheduledAt?: string | null;
      slotNumber?: number | null;
      sources: readonly {
        participantSlot: "away" | "home";
        sourceGroupCode?: "A" | "B" | "C" | "D" | null;
        sourceGroupPosition?: number | null;
        sourceTournamentMatchId?: string | null;
        sourceTournamentTeamId?: string | null;
        sourceType: "group_position" | "match_loser" | "match_winner" | "tournament_team";
      }[];
      status: TournamentMatchRecord["status"];
      tournamentGroupId?: string | null;
      tournamentId: string;
    }[]) {
      rows.forEach((row) => {
        const existing = state.matches.find(
          (match) =>
            match.tournament_id === row.tournamentId &&
            match.phase === row.phase &&
            (match.round_number ?? null) === (row.roundNumber ?? null) &&
            (match.slot_number ?? null) === (row.slotNumber ?? null)
        );

        const target = existing ?? {
          away_tournament_team_id: null,
          bracket_key: row.bracketKey ?? null,
          created_at: "2026-07-17T08:00:00.000Z",
          home_tournament_team_id: null,
          id: row.id ?? row.bracketKey ?? `${row.phase}-${row.roundNumber ?? 0}-${row.slotNumber ?? 0}`,
          label: row.label ?? null,
          location: row.location ?? null,
          match_id: null,
          phase: row.phase,
          placement_rank: row.placementRank ?? null,
          referee_tournament_team_id: row.refereeTournamentTeamId ?? null,
          round_number: row.roundNumber ?? null,
          scheduled_at: row.scheduledAt ?? null,
          sets: [],
          slot_number: row.slotNumber ?? null,
          sources: [],
          status: row.status,
          tournament_group_id: row.tournamentGroupId ?? null,
          tournament_id: row.tournamentId,
          updated_at: "2026-07-17T08:00:00.000Z"
        } satisfies TournamentMatchRecord;

        target.away_tournament_team_id = row.awayTournamentTeamId ?? null;
        target.bracket_key = row.bracketKey ?? null;
        target.home_tournament_team_id = row.homeTournamentTeamId ?? null;
        target.label = row.label ?? null;
        target.location = row.location ?? null;
        target.phase = row.phase;
        target.placement_rank = row.placementRank ?? null;
        target.referee_tournament_team_id = row.refereeTournamentTeamId ?? null;
        target.round_number = row.roundNumber ?? null;
        target.scheduled_at = row.scheduledAt ?? null;
        target.slot_number = row.slotNumber ?? null;
        target.status = row.status;
        target.tournament_group_id = row.tournamentGroupId ?? null;
        target.updated_at = "2026-07-17T08:00:00.000Z";
        target.sources = row.sources.map((source, index) => ({
          id: `${target.id}-source-${index + 1}`,
          participant_slot: source.participantSlot,
          source_group_code: source.sourceGroupCode ?? null,
          source_group_position: source.sourceGroupPosition ?? null,
          source_tournament_match_id: source.sourceTournamentMatchId ?? null,
          source_tournament_team_id: source.sourceTournamentTeamId ?? null,
          source_type: source.sourceType,
          tournament_id: row.tournamentId,
          tournament_match_id: target.id
        }));

        if (!existing) {
          state.matches.push(target);
        }
      });

      return ok(clone(sortMatches(state.matches)));
    },

    async upsertTournamentTeams(
      rows: readonly {
        display_name?: string | null;
        id?: string;
        seed_number?: number | null;
        sort_order?: number | null;
        team_id: string | null;
        tournament_group_id: string;
        tournament_id: string;
      }[]
    ) {
      rows.forEach((row) => {
        const baseTeam = row.team_id ? baseTeams.find((team) => team.id === row.team_id) ?? null : null;
        const group = state.groups.find((item) => item.id === row.tournament_group_id);
        const existing = state.teams.find((team) => (row.id ? team.id === row.id : team.tournament_id === row.tournament_id && team.team_id === row.team_id));

        if (!group || (!baseTeam && !row.display_name?.trim())) {
          return;
        }

        const resolvedName = row.display_name?.trim() || baseTeam?.name || "Turnajové družstvo";
        const resolvedSlug = (baseTeam?.slug ?? resolvedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) || "tournament-team";

        const target = existing ?? {
          created_at: "2026-07-17T08:00:00.000Z",
          display_name: resolvedName,
          groupCode: group.code,
          groupName: group.name,
          id: row.id ?? `tt-${crypto.randomUUID()}`,
          seed_number: row.seed_number ?? null,
          sort_order: row.sort_order ?? null,
          team_id: row.team_id,
          teamName: resolvedName,
          teamSlug: resolvedSlug,
          tournament_group_id: row.tournament_group_id,
          tournament_id: row.tournament_id,
          updated_at: "2026-07-17T08:00:00.000Z"
        } satisfies TournamentTeamRecord;

        target.display_name = resolvedName;
        target.groupCode = group.code;
        target.groupName = group.name;
        target.seed_number = row.seed_number ?? null;
        target.sort_order = row.sort_order ?? null;
        target.teamName = resolvedName;
        target.teamSlug = resolvedSlug;
        target.team_id = row.team_id;
        target.tournament_group_id = row.tournament_group_id;
        target.updated_at = "2026-07-17T08:00:00.000Z";

        if (!existing) {
          state.teams.push(target);
        }
      });

      return ok(clone(state.teams));
    }
  };

  const service = await createTournamentServiceWithDependencies({
    getAdminState: async () => adminState,
    repository
  });

  return {
    baseTeams,
    getAuditLogs() {
      return clone(state.auditLogs);
    },
    async getBundle() {
      if (!state.tournament) {
        throw new Error("Tournament has not been created yet.");
      }

      const result = await repository.getTournamentBundle(state.tournament.id);

      if (!result.ok) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    repository,
    service
  };
}

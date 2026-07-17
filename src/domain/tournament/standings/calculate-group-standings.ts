import { validateMatchResult } from "@/src/domain/tournament/rules/validate-match-result";
import type { GroupMatchSummary } from "@/src/domain/tournament/rules/types";
import { resolveGroupStandingsConfig } from "@/src/domain/tournament/standings/tie-breakers";
import type {
  GroupStandingsEntry,
  GroupStandingsError,
  GroupStandingsInput,
  GroupStandingsMatch,
  GroupStandingsResult,
  GroupStandingsTeam,
  GroupStandingsTieBreakerKey
} from "@/src/domain/tournament/standings/types";

type EntryAccumulator = Omit<GroupStandingsEntry, "position">;

type CompletedGroupMatchSummary = {
  awayTeamId: string;
  homeTeamId: string;
  id: string;
  summary: GroupMatchSummary;
};

type RankContext = {
  completedMatches: readonly CompletedGroupMatchSummary[];
};

function makeError(
  code: GroupStandingsError["code"],
  message: string,
  details?: Pick<GroupStandingsError, "matchId" | "teamId" | "validationErrors">
): GroupStandingsError {
  return {
    code,
    message,
    ...details
  };
}

function createEntryAccumulator(team: GroupStandingsTeam): EntryAccumulator {
  return {
    draws: 0,
    losses: 0,
    played: 0,
    rallyPointDifference: 0,
    rallyPointsAgainst: 0,
    rallyPointsFor: 0,
    setDifference: 0,
    setsAgainst: 0,
    setsFor: 0,
    tablePoints: 0,
    teamId: team.id,
    teamName: team.name ?? null,
    wins: 0
  };
}

function compareStableFallback(left: EntryAccumulator, right: EntryAccumulator) {
  const leftLabel = left.teamName?.trim() || left.teamId;
  const rightLabel = right.teamName?.trim() || right.teamId;
  return leftLabel.localeCompare(rightLabel, "sk");
}

function getCriterionValue(entry: EntryAccumulator, criterion: Exclude<GroupStandingsTieBreakerKey, "head_to_head_result" | "stable_fallback">) {
  switch (criterion) {
    case "table_points":
      return entry.tablePoints;
    case "set_difference":
      return entry.setDifference;
    case "sets_won":
      return entry.setsFor;
    case "rally_point_difference":
      return entry.rallyPointDifference;
    case "rally_points_won":
      return entry.rallyPointsFor;
  }
}

function groupByNumericValue(
  entries: readonly EntryAccumulator[],
  criterion: Exclude<GroupStandingsTieBreakerKey, "head_to_head_result" | "stable_fallback">
) {
  const groups = new Map<number, EntryAccumulator[]>();

  entries.forEach((entry) => {
    const value = getCriterionValue(entry, criterion);
    const existing = groups.get(value) ?? [];
    groups.set(value, [...existing, entry]);
  });

  return [...groups.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, groupedEntries]) => groupedEntries);
}

function getHeadToHeadMatch(
  completedMatches: readonly CompletedGroupMatchSummary[],
  firstTeamId: string,
  secondTeamId: string
) {
  return completedMatches.find((match) => {
    const involvedTeams = new Set([match.homeTeamId, match.awayTeamId]);
    return involvedTeams.has(firstTeamId) && involvedTeams.has(secondTeamId);
  });
}

function applyMatchSummary(entryMap: Map<string, EntryAccumulator>, match: GroupStandingsMatch, summary: GroupMatchSummary) {
  const homeEntry = entryMap.get(match.homeTeamId);
  const awayEntry = entryMap.get(match.awayTeamId);

  if (!homeEntry || !awayEntry) {
    return;
  }

  homeEntry.played += 1;
  awayEntry.played += 1;

  homeEntry.wins += summary.home.result === "win" ? 1 : 0;
  homeEntry.draws += summary.home.result === "draw" ? 1 : 0;
  homeEntry.losses += summary.home.result === "loss" ? 1 : 0;
  homeEntry.tablePoints += summary.home.tablePoints;
  homeEntry.setsFor += summary.home.setsWon;
  homeEntry.setsAgainst += summary.away.setsWon;
  homeEntry.rallyPointsFor += summary.home.totalRallyPoints;
  homeEntry.rallyPointsAgainst += summary.away.totalRallyPoints;

  awayEntry.wins += summary.away.result === "win" ? 1 : 0;
  awayEntry.draws += summary.away.result === "draw" ? 1 : 0;
  awayEntry.losses += summary.away.result === "loss" ? 1 : 0;
  awayEntry.tablePoints += summary.away.tablePoints;
  awayEntry.setsFor += summary.away.setsWon;
  awayEntry.setsAgainst += summary.home.setsWon;
  awayEntry.rallyPointsFor += summary.away.totalRallyPoints;
  awayEntry.rallyPointsAgainst += summary.home.totalRallyPoints;
}

function finalizeEntries(entryMap: Map<string, EntryAccumulator>) {
  return [...entryMap.values()].map((entry) => ({
    ...entry,
    rallyPointDifference: entry.rallyPointsFor - entry.rallyPointsAgainst,
    setDifference: entry.setsFor - entry.setsAgainst
  }));
}

function resolveHeadToHeadTie(
  entries: readonly EntryAccumulator[],
  remainingTieBreakers: readonly GroupStandingsTieBreakerKey[],
  context: RankContext
) {
  if (entries.length !== 2) {
    return rankEntries(entries, remainingTieBreakers, context);
  }

  const [firstEntry, secondEntry] = entries;
  const headToHeadMatch = getHeadToHeadMatch(context.completedMatches, firstEntry.teamId, secondEntry.teamId);

  if (!headToHeadMatch || headToHeadMatch.summary.outcome === "draw") {
    return rankEntries(entries, remainingTieBreakers, context);
  }

  const homeWon = headToHeadMatch.summary.outcome === "home_win";
  const winningTeamId = homeWon ? headToHeadMatch.homeTeamId : headToHeadMatch.awayTeamId;

  return winningTeamId === firstEntry.teamId ? [firstEntry, secondEntry] : [secondEntry, firstEntry];
}

function rankEntries(
  entries: readonly EntryAccumulator[],
  tieBreakers: readonly GroupStandingsTieBreakerKey[],
  context: RankContext
): EntryAccumulator[] {
  if (entries.length <= 1) {
    return [...entries];
  }

  if (tieBreakers.length === 0) {
    return [...entries].sort(compareStableFallback);
  }

  const [currentTieBreaker, ...remainingTieBreakers] = tieBreakers;

  if (currentTieBreaker === "stable_fallback") {
    return [...entries].sort(compareStableFallback);
  }

  if (currentTieBreaker === "head_to_head_result") {
    return resolveHeadToHeadTie(entries, remainingTieBreakers, context);
  }

  return groupByNumericValue(entries, currentTieBreaker).flatMap((group) => {
    if (group.length === 1) {
      return group;
    }

    return rankEntries(group, remainingTieBreakers, context);
  });
}

function validateInput(teams: readonly GroupStandingsTeam[], matches: readonly GroupStandingsMatch[]) {
  const errors: GroupStandingsError[] = [];
  const seenTeamIds = new Set<string>();
  const teamIds = new Set<string>();

  if (teams.length < 2) {
    errors.push(makeError("TOO_FEW_TEAMS", "At least 2 teams are required to calculate group standings."));
  }

  teams.forEach((team) => {
    if (seenTeamIds.has(team.id)) {
      errors.push(makeError("DUPLICATE_TEAM_ID", `Duplicate team id '${team.id}' is not allowed.`, { teamId: team.id }));
      return;
    }

    seenTeamIds.add(team.id);
    teamIds.add(team.id);
  });

  matches.forEach((match) => {
    if (match.homeTeamId === match.awayTeamId) {
      errors.push(
        makeError("MATCH_REFERENCES_SAME_TEAM", "A match cannot reference the same team as home and away.", {
          matchId: match.id
        })
      );
    }

    [match.homeTeamId, match.awayTeamId].forEach((teamId) => {
      if (!teamIds.has(teamId)) {
        errors.push(
          makeError("MATCH_REFERENCES_UNKNOWN_TEAM", `Match references unknown team '${teamId}'.`, {
            matchId: match.id,
            teamId
          })
        );
      }
    });
  });

  return errors;
}

export function calculateGroupStandings(input: GroupStandingsInput): GroupStandingsResult {
  const config = resolveGroupStandingsConfig(input.config);
  const validationErrors = validateInput(input.teams, input.matches);

  if (validationErrors.length > 0) {
    return {
      config,
      errors: validationErrors,
      ok: false
    };
  }

  const entryMap = new Map<string, EntryAccumulator>(input.teams.map((team) => [team.id, createEntryAccumulator(team)]));
  const completedMatches: CompletedGroupMatchSummary[] = [];

  for (const match of input.matches) {
    if (!match.isCompleted) {
      continue;
    }

    const validationResult = validateMatchResult({
      profile: "GROUP_TIMED_MATCH",
      sets: [...match.sets]
    });

    if (!validationResult.ok) {
      return {
        config,
        errors: [
          makeError("INVALID_GROUP_MATCH_RESULT", `Group match '${match.id}' contains an invalid result.`, {
            matchId: match.id,
            validationErrors: validationResult.errors
          })
        ],
        ok: false
      };
    }

    if (validationResult.profile !== "GROUP_TIMED_MATCH") {
      return {
        config,
        errors: [
          makeError("INVALID_GROUP_MATCH_RESULT", `Group match '${match.id}' resolved to an unexpected profile.`, {
            matchId: match.id
          })
        ],
        ok: false
      };
    }

    applyMatchSummary(entryMap, match, validationResult.summary);
    completedMatches.push({
      awayTeamId: match.awayTeamId,
      homeTeamId: match.homeTeamId,
      id: match.id,
      summary: validationResult.summary
    });
  }

  const rankedEntries = rankEntries(finalizeEntries(entryMap), config.tieBreakers, {
    completedMatches
  });

  return {
    config,
    entries: rankedEntries.map((entry, index) => ({
      ...entry,
      position: index + 1
    })),
    ok: true
  };
}

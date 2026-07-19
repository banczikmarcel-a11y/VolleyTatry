import { validateMatchResult } from "@/src/domain/tournament/rules";
import type { TournamentBundle, TournamentMatchRecord, TournamentTeamRecord } from "@/src/server/tournaments";
import type { TournamentGroupCode } from "@/types/tournament";

export type TournamentPublicFilter = "all" | "completed" | "group-a" | "group-b" | "playoffs" | "upcoming";

export function getTournamentTeamsById(teams: readonly TournamentTeamRecord[]) {
  return new Map(teams.map((team) => [team.id, team]));
}

export function getTournamentGroupsById(bundle: TournamentBundle) {
  return new Map(bundle.groups.map((group) => [group.id, group]));
}

function getSourceLabel(match: TournamentMatchRecord, slot: "home" | "away", bundle: TournamentBundle) {
  const source = match.sources.find((item) => item.participant_slot === slot);

  if (!source) {
    return "Čaká sa na tím";
  }

  if (source.source_type === "group_position") {
    return `Sk. ${source.source_group_code}${source.source_group_position}`;
  }

  if (source.source_type === "tournament_team" && source.source_tournament_team_id) {
    const team = bundle.teams.find((item) => item.id === source.source_tournament_team_id);
    return team?.display_name ?? team?.teamName ?? "Čaká sa na tím";
  }

  if ((source.source_type === "match_winner" || source.source_type === "match_loser") && source.source_tournament_match_id) {
    const sourceMatch = bundle.matches.find((item) => item.id === source.source_tournament_match_id);
    const baseLabel = sourceMatch?.label ?? source.source_tournament_match_id;
    return source.source_type === "match_winner" ? `Víťaz ${baseLabel}` : `Porazený ${baseLabel}`;
  }

  return "Čaká sa na tím";
}

export function getTournamentParticipantName(
  match: TournamentMatchRecord,
  slot: "home" | "away",
  bundle: TournamentBundle
) {
  const teamsById = getTournamentTeamsById(bundle.teams);
  const teamId = slot === "home" ? match.home_tournament_team_id : match.away_tournament_team_id;

  if (teamId) {
    const team = teamsById.get(teamId);
    return team?.display_name ?? team?.teamName ?? teamId;
  }

  return getSourceLabel(match, slot, bundle);
}

export function getTournamentMatchGroupCode(match: TournamentMatchRecord, bundle: TournamentBundle): TournamentGroupCode | null {
  if (!match.tournament_group_id) {
    return null;
  }

  return bundle.groups.find((group) => group.id === match.tournament_group_id)?.code ?? null;
}

export function getTournamentMatchPhaseLabel(match: TournamentMatchRecord, bundle: TournamentBundle) {
  const groupCode = getTournamentMatchGroupCode(match, bundle);

  if (match.phase === "group_stage") {
    return `Skupina ${groupCode ?? "?"}`;
  }

  if (match.phase === "semifinal") {
    return "Semifinále";
  }

  if (match.phase === "final") {
    return "Finále";
  }

  if (match.phase === "bronze") {
    return "O 3. miesto";
  }

  if (match.phase === "placement") {
    return match.placement_rank ? `O ${match.placement_rank}. miesto` : "O umiestnenie";
  }

  return match.phase;
}

export function getTournamentMatchStatusLabel(status: TournamentMatchRecord["status"]) {
  switch (status) {
    case "completed":
      return "Odohrané";
    case "in_progress":
      return "Prebieha";
    case "scheduled":
      return "Naplánované";
    case "cancelled":
      return "Zrušené";
    case "pending":
    default:
      return "Čaká";
  }
}

export function getTournamentMatchResultSummary(match: TournamentMatchRecord) {
  if (match.sets.length === 0) {
    return null;
  }

  const validation = validateMatchResult({
    profile: match.phase === "group_stage" ? "GROUP_TIMED_MATCH" : "PLAYOFF_BEST_OF_THREE_TO_15",
    sets: match.sets.map((set) => ({
      awayPoints: set.away_points,
      homePoints: set.home_points,
      setNumber: set.set_number
    }))
  });

  if (!validation.ok) {
    return null;
  }

  if (validation.profile === "GROUP_TIMED_MATCH") {
    return {
      awayDisplayScore: validation.summary.away.tablePoints,
      awayTablePoints: validation.summary.away.tablePoints,
      homeDisplayScore: validation.summary.home.tablePoints,
      homeTablePoints: validation.summary.home.tablePoints,
      isGroupStage: true,
      awaySetsWon: validation.summary.away.setsWon,
      homeSetsWon: validation.summary.home.setsWon,
      totalAwayRallyPoints: validation.summary.away.totalRallyPoints,
      totalHomeRallyPoints: validation.summary.home.totalRallyPoints,
      totalSets: validation.summary.totalSets
    };
  }

  return {
    awayDisplayScore: validation.summary.away.setsWon,
    awaySetsWon: validation.summary.away.setsWon,
    homeDisplayScore: validation.summary.home.setsWon,
    homeSetsWon: validation.summary.home.setsWon,
    isGroupStage: false,
    totalAwayRallyPoints: validation.summary.away.totalRallyPoints,
    totalHomeRallyPoints: validation.summary.home.totalRallyPoints,
    totalSets: validation.summary.totalSets
  };
}

export function formatTournamentDateTime(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Bez termínu";
  }

  return new Intl.DateTimeFormat(
    "sk-SK",
    options ?? {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(new Date(value));
}

export function filterTournamentMatches(
  bundle: TournamentBundle,
  filter: TournamentPublicFilter,
  courtFilter: string | null
) {
  return bundle.matches.filter((match) => {
    const groupCode = getTournamentMatchGroupCode(match, bundle);
    const isPlayoff = match.phase !== "group_stage";
    const isCompleted = match.status === "completed";
    const isUpcoming = !isCompleted;
    const courtLabel = match.location?.trim() ?? "";

    const filterMatches =
      filter === "all"
      || (filter === "group-a" && groupCode === "A")
      || (filter === "group-b" && groupCode === "B")
      || (filter === "playoffs" && isPlayoff)
      || (filter === "completed" && isCompleted)
      || (filter === "upcoming" && isUpcoming);

    const courtMatches = !courtFilter || courtFilter === "all" || courtLabel === courtFilter;

    return filterMatches && courtMatches;
  });
}

export function sortTournamentMatchesChronologically(matches: readonly TournamentMatchRecord[]) {
  return [...matches].sort((left, right) => {
    const leftTime = left.scheduled_at ? new Date(left.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduled_at ? new Date(right.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });
}

export function sortTournamentMatchesLatestFirst(matches: readonly TournamentMatchRecord[]) {
  return [...matches].sort((left, right) => {
    const leftTime = left.scheduled_at ? new Date(left.scheduled_at).getTime() : 0;
    const rightTime = right.scheduled_at ? new Date(right.scheduled_at).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getTournamentFinalStandingsOverview(bundle: TournamentBundle) {
  const teamStats = new Map(
    bundle.teams.map((team) => [
      team.id,
      {
        groupCode: team.groupCode,
        losses: 0,
        played: 0,
        pointsAgainst: 0,
        pointsFor: 0,
        teamId: team.id,
        teamName: team.display_name ?? team.teamName,
        wins: 0
      }
    ])
  );

  bundle.matches
    .filter((match) => match.status === "completed" && match.home_tournament_team_id && match.away_tournament_team_id && match.sets.length > 0)
    .forEach((match) => {
      const validation = validateMatchResult({
        profile: match.phase === "group_stage" ? "GROUP_TIMED_MATCH" : "PLAYOFF_BEST_OF_THREE_TO_15",
        sets: match.sets.map((set) => ({
          awayPoints: set.away_points,
          homePoints: set.home_points,
          setNumber: set.set_number
        }))
      });

      if (!validation.ok) {
        return;
      }

      const homeStats = teamStats.get(match.home_tournament_team_id!);
      const awayStats = teamStats.get(match.away_tournament_team_id!);

      if (!homeStats || !awayStats) {
        return;
      }

      homeStats.played += 1;
      awayStats.played += 1;

      homeStats.pointsFor += validation.summary.home.totalRallyPoints;
      homeStats.pointsAgainst += validation.summary.away.totalRallyPoints;
      awayStats.pointsFor += validation.summary.away.totalRallyPoints;
      awayStats.pointsAgainst += validation.summary.home.totalRallyPoints;

      if (validation.summary.outcome === "home_win") {
        homeStats.wins += 1;
        awayStats.losses += 1;
      } else if (validation.summary.outcome === "away_win") {
        awayStats.wins += 1;
        homeStats.losses += 1;
      }
    });

  return bundle.finalStandings
    .slice()
    .sort((left, right) => left.final_position - right.final_position)
    .map((standing) => {
      const stats = teamStats.get(standing.tournament_team_id);

      return {
        groupCode: stats?.groupCode ?? null,
        losses: stats?.losses ?? 0,
        played: stats?.played ?? 0,
        pointsAgainst: stats?.pointsAgainst ?? 0,
        pointsFor: stats?.pointsFor ?? 0,
        position: standing.final_position,
        teamId: standing.tournament_team_id,
        teamName: stats?.teamName ?? standing.tournament_team_id,
        wins: stats?.wins ?? 0
      };
    });
}

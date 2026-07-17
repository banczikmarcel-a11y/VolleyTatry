import type { MatchSetInput, MatchValidationError } from "@/src/domain/tournament/rules/types";

export type GroupStandingsTeam = {
  id: string;
  name?: string;
};

export type GroupStandingsMatch = {
  awayTeamId: string;
  homeTeamId: string;
  id: string;
  isCompleted: boolean;
  sets: readonly MatchSetInput[];
};

export type GroupStandingsEntry = {
  draws: number;
  losses: number;
  played: number;
  position: number;
  rallyPointDifference: number;
  rallyPointsAgainst: number;
  rallyPointsFor: number;
  setDifference: number;
  setsAgainst: number;
  setsFor: number;
  tablePoints: number;
  teamId: string;
  teamName: string | null;
  wins: number;
};

export type GroupStandingsTieBreakerKey =
  | "head_to_head_result"
  | "rally_point_difference"
  | "rally_points_won"
  | "set_difference"
  | "sets_won"
  | "stable_fallback"
  | "table_points";

export type GroupStandingsConfig = {
  tieBreakers: readonly GroupStandingsTieBreakerKey[];
};

export type GroupStandingsInput = {
  config?: Partial<GroupStandingsConfig>;
  matches: readonly GroupStandingsMatch[];
  teams: readonly GroupStandingsTeam[];
};

export type GroupStandingsErrorCode =
  | "DUPLICATE_TEAM_ID"
  | "INVALID_GROUP_MATCH_RESULT"
  | "MATCH_REFERENCES_SAME_TEAM"
  | "MATCH_REFERENCES_UNKNOWN_TEAM"
  | "TOO_FEW_TEAMS";

export type GroupStandingsError = {
  code: GroupStandingsErrorCode;
  matchId?: string;
  message: string;
  teamId?: string;
  validationErrors?: MatchValidationError[];
};

export type GroupStandingsResult =
  | {
      config: GroupStandingsConfig;
      entries: GroupStandingsEntry[];
      ok: true;
    }
  | {
      config: GroupStandingsConfig;
      errors: GroupStandingsError[];
      ok: false;
    };

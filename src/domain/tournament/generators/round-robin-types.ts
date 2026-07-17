export type RoundRobinTeamInput = {
  id: string;
  label?: string;
};

export type RoundRobinMatch = {
  awayTeamId: string;
  groupId: string;
  homeTeamId: string;
  matchNumber: number;
  roundNumber: number;
  tournamentId: string;
};

export type RoundRobinRound = {
  byeTeamId: string | null;
  groupId: string;
  matches: RoundRobinMatch[];
  roundNumber: number;
  tournamentId: string;
};

export type RoundRobinSchedule = {
  groupId: string;
  rounds: RoundRobinRound[];
  teamIds: string[];
  totalMatches: number;
  totalRounds: number;
  tournamentId: string;
};

export type RoundRobinGenerationErrorCode = "DUPLICATE_TEAM_ID" | "TOO_FEW_TEAMS";

export type RoundRobinGenerationError = {
  code: RoundRobinGenerationErrorCode;
  message: string;
  teamId?: string;
};

export type RoundRobinGenerationInput = {
  groupId: string;
  teams: RoundRobinTeamInput[];
  tournamentId: string;
};

export type RoundRobinGenerationResult =
  | {
      ok: true;
      schedule: RoundRobinSchedule;
    }
  | {
      errors: RoundRobinGenerationError[];
      ok: false;
    };

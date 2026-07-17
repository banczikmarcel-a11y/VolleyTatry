import type { RoundRobinMatch, RoundRobinRound, RoundRobinSchedule } from "@/src/domain/tournament/generators/round-robin-types";

export type GroupScheduleConfig = {
  groupId: string;
  order: number;
};

export type ScheduleGroupMatchesInput = {
  breakDurationMinutes: number;
  courtCount: number;
  groupConfigurations: readonly GroupScheduleConfig[];
  matchDurationMinutes: number;
  rounds: readonly RoundRobinRound[];
  tournamentId: string;
  tournamentStart: string;
};

export type ScheduledGroupMatch = RoundRobinMatch & {
  courtNumber: number;
  scheduledEnd: string;
  scheduledStart: string;
  sequenceNumber: number;
};

export type ScheduledGroupRound = Omit<RoundRobinRound, "matches"> & {
  matches: ScheduledGroupMatch[];
};

export type GroupMatchSchedule = Omit<RoundRobinSchedule, "rounds" | "totalMatches"> & {
  rounds: ScheduledGroupRound[];
  totalMatches: number;
};

export type ScheduleGroupMatchesErrorCode =
  | "INVALID_BREAK_DURATION"
  | "INVALID_COURT_COUNT"
  | "INVALID_MATCH_DURATION"
  | "INVALID_START_DATETIME"
  | "MIXED_TOURNAMENT_IDS"
  | "MISSING_GROUP_CONFIGURATION"
  | "TEAM_OVERLAP";

export type ScheduleGroupMatchesError = {
  code: ScheduleGroupMatchesErrorCode;
  groupId?: string;
  message: string;
  roundNumber?: number;
  teamId?: string;
};

export type ScheduleGroupMatchesResult =
  | {
      ok: true;
      schedule: GroupMatchSchedule;
    }
  | {
      errors: ScheduleGroupMatchesError[];
      ok: false;
    };

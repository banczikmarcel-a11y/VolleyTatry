import type { ScheduledGroupMatch } from "@/src/domain/tournament/generators/schedule-group-matches-types";

export type RefereeGroupTeam = {
  groupId: string;
  id: string;
};

export type RefereeAssignmentWarningCode =
  | "ADJACENT_TO_OWN_MATCH"
  | "IMPOSSIBLE_ASSIGNMENT"
  | "REPEATED_TEAM_WHEN_ALTERNATIVES_LIMITED";

export type RefereeAssignmentWarning = {
  code: RefereeAssignmentWarningCode;
  matchSequenceNumber?: number;
  message: string;
  refereeTeamId?: string;
};

export type RefereeAssignmentErrorCode =
  | "EMPTY_TEAMS"
  | "GROUP_MISMATCH"
  | "NO_MATCHES"
  | "NO_VALID_REFEREE_AVAILABLE";

export type RefereeAssignmentError = {
  code: RefereeAssignmentErrorCode;
  matchSequenceNumber?: number;
  message: string;
};

export type RefereeAssignment = {
  matchSequenceNumber: number;
  refereeTeamId: string;
};

export type RefereeAssignmentResult = {
  assignments: RefereeAssignment[];
  dutyCounts: Record<string, number>;
  warnings: RefereeAssignmentWarning[];
};

export type AssignRefereeTeamsInput = {
  matches: readonly ScheduledGroupMatch[];
  teams: readonly RefereeGroupTeam[];
};

export type AssignRefereeTeamsGenerationResult =
  | {
      ok: true;
      result: RefereeAssignmentResult;
    }
  | {
      errors: RefereeAssignmentError[];
      ok: false;
    };

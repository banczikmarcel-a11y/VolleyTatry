import type { MatchSetInput, MatchValidationError, MatchRuleProfile } from "@/src/domain/tournament/rules";
import type { GroupStandingsEntry } from "@/src/domain/tournament/standings";

export type PlayoffGroupCode = "A" | "B";

export type PlayoffMatchPhase = "bronze" | "final" | "placement" | "semifinal";

export type PlayoffParticipantSlot = "away" | "home";

export type PlayoffMatchSource =
  | {
      groupCode: PlayoffGroupCode;
      groupPosition: number;
      participantSlot: PlayoffParticipantSlot;
      sourceType: "group_position";
    }
  | {
      participantSlot: PlayoffParticipantSlot;
      sourceMatchId: string;
      sourceType: "match_loser" | "match_winner";
    };

export type PlayoffMatchDefinition = {
  awayTeamId: string | null;
  bracketKey: string;
  homeTeamId: string | null;
  id: string;
  label: string;
  phase: PlayoffMatchPhase;
  placementRank: 3 | 5 | 7 | 9 | null;
  roundNumber: 1 | 2;
  ruleProfile: MatchRuleProfile;
  slotNumber: number;
  sources: readonly [PlayoffMatchSource, PlayoffMatchSource];
  tournamentId: string;
};

export type PlayoffGenerationInput = {
  groupAStandings: readonly GroupStandingsEntry[];
  groupBStandings: readonly GroupStandingsEntry[];
  tournamentId: string;
};

export type PlayoffGenerationErrorCode =
  | "DUPLICATE_GROUP_POSITION"
  | "MISSING_GROUP_POSITION"
  | "UNEXPECTED_GROUP_SIZE";

export type PlayoffGenerationError = {
  code: PlayoffGenerationErrorCode;
  groupCode: PlayoffGroupCode;
  message: string;
  position?: number;
};

export type PlayoffGenerationResult =
  | {
      matches: PlayoffMatchDefinition[];
      ok: true;
    }
  | {
      errors: PlayoffGenerationError[];
      ok: false;
    };

export type PlayoffProgressionMatch = {
  awayTeamId: string | null;
  homeTeamId: string | null;
  id: string;
  phase: PlayoffMatchPhase;
  result?: {
    sets: readonly MatchSetInput[];
  } | null;
};

export type PlayoffProgressionConflictCode = "DEPENDENT_MATCH_RESULT_CONFLICT" | "INVALID_SOURCE_MATCH_RESULT";

export type PlayoffProgressionConflict = {
  code: PlayoffProgressionConflictCode;
  dependentMatchId?: string;
  matchId?: string;
  message: string;
  participantSlot?: PlayoffParticipantSlot;
  proposedTeamId?: string;
  validationErrors?: MatchValidationError[];
};

export type PlayoffProgressionChange = {
  dependentMatchId: string;
  participantSlot: PlayoffParticipantSlot;
  previousTeamId: string | null;
  teamId: string | null;
};

export type PlayoffProgressionInput = {
  matches: readonly PlayoffProgressionMatch[];
  sourceMatchId: string;
  sources: readonly {
    participantSlot: PlayoffParticipantSlot;
    sourceMatchId: string;
    sourceType: "match_loser" | "match_winner";
    targetMatchId: string;
  }[];
};

export type PlayoffProgressionResult =
  | {
      changes: PlayoffProgressionChange[];
      conflicts: [];
      matches: PlayoffProgressionMatch[];
      ok: true;
    }
  | {
      changes: PlayoffProgressionChange[];
      conflicts: PlayoffProgressionConflict[];
      matches: PlayoffProgressionMatch[];
      ok: false;
    };

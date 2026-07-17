import type { MatchRuleProfile, MatchSetInput } from "@/src/domain/tournament/rules";
import type { Json } from "@/types/database";
import type {
  TournamentFinalStandingRow,
  TournamentFormatRow,
  TournamentGroupCode,
  TournamentGroupRow,
  TournamentMatchParticipantSlot,
  TournamentMatchPhase,
  TournamentMatchSetRow,
  TournamentMatchSourceRow,
  TournamentMatchStatus,
  TournamentMatchStatus as TournamentMatchRecordStatus,
  TournamentMatchSourceType,
  TournamentMatchRow,
  TournamentResultAuditLogRow,
  TournamentRow,
  TournamentTeamRow
} from "@/types/tournament";

export type TournamentRepositoryErrorCode = "CONFLICT" | "FORBIDDEN" | "INVALID_INPUT" | "NOT_FOUND" | "UNKNOWN";

export type TournamentRepositoryError = {
  cause?: unknown;
  code: TournamentRepositoryErrorCode;
  message: string;
};

export type TournamentRepositoryResult<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      error: TournamentRepositoryError;
      ok: false;
    };

export type TournamentServiceErrorCode =
  | "AUTHORIZATION_REQUIRED"
  | "CONFLICT"
  | "GROUP_STAGE_INCOMPLETE"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "PLAYOFF_CONFLICT"
  | "PLAYOFF_INCOMPLETE"
  | "REPOSITORY_ERROR"
  | "VALIDATION_FAILED";

export type TournamentServiceError = {
  code: TournamentServiceErrorCode;
  details?: unknown;
  message: string;
};

export type TournamentServiceResult<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      error: TournamentServiceError;
      ok: false;
    };

export type TournamentFormatRecord = Pick<TournamentFormatRow, "description" | "id" | "is_active" | "key" | "name" | "rules">;

export type TournamentRecord = Pick<
  TournamentRow,
  | "break_duration_minutes"
  | "court_count"
  | "created_at"
  | "description"
  | "ends_at"
  | "id"
  | "is_public"
  | "location"
  | "match_duration_minutes"
  | "name"
  | "published_at"
  | "slug"
  | "starts_at"
  | "status"
  | "updated_at"
> & {
  format: TournamentFormatRecord;
};

export type TournamentGroupRecord = Pick<TournamentGroupRow, "code" | "created_at" | "id" | "name" | "sort_order" | "tournament_id" | "updated_at">;

export type TournamentTeamRecord = Pick<
  TournamentTeamRow,
  "created_at" | "display_name" | "id" | "seed_number" | "sort_order" | "team_id" | "tournament_group_id" | "tournament_id" | "updated_at"
> & {
  groupCode: TournamentGroupCode;
  groupName: string | null;
  teamName: string;
  teamSlug: string;
};

export type TournamentMatchSourceRecord = Pick<
  TournamentMatchSourceRow,
  "id" | "participant_slot" | "source_group_code" | "source_group_position" | "source_tournament_match_id" | "source_tournament_team_id" | "source_type" | "tournament_id" | "tournament_match_id"
>;

export type TournamentMatchSetRecord = Pick<TournamentMatchSetRow, "away_points" | "home_points" | "id" | "set_number" | "tournament_id" | "tournament_match_id">;

export type TournamentMatchRecord = Pick<
  TournamentMatchRow,
  | "away_tournament_team_id"
  | "bracket_key"
  | "created_at"
  | "home_tournament_team_id"
  | "id"
  | "label"
  | "location"
  | "match_id"
  | "phase"
  | "placement_rank"
  | "referee_tournament_team_id"
  | "round_number"
  | "scheduled_at"
  | "slot_number"
  | "status"
  | "tournament_group_id"
  | "tournament_id"
  | "updated_at"
> & {
  sets: TournamentMatchSetRecord[];
  sources: TournamentMatchSourceRecord[];
};

export type TournamentResultAuditSnapshot = {
  profile: MatchRuleProfile;
  sets: MatchSetInput[];
  status: TournamentMatchStatus;
  summary: Json;
};

export type TournamentResultAuditLogRecord = Pick<
  TournamentResultAuditLogRow,
  "changed_at" | "changed_by" | "correction_reason" | "id" | "new_result" | "previous_result" | "tournament_id" | "tournament_match_id"
> & {
  changedByIdentity: {
    email: string | null;
    fullName: string | null;
  } | null;
};

export type TournamentFinalStandingRecord = Pick<
  TournamentFinalStandingRow,
  "created_at" | "final_position" | "id" | "notes" | "tournament_id" | "tournament_team_id" | "updated_at"
>;

export type TournamentBundle = {
  finalStandings: TournamentFinalStandingRecord[];
  groups: TournamentGroupRecord[];
  matches: TournamentMatchRecord[];
  teams: TournamentTeamRecord[];
  tournament: TournamentRecord;
};

export type TournamentMatchSourceWriteInput = {
  participantSlot: TournamentMatchParticipantSlot;
  sourceGroupCode?: TournamentGroupCode | null;
  sourceGroupPosition?: number | null;
  sourceTournamentMatchId?: string | null;
  sourceTournamentTeamId?: string | null;
  sourceType: TournamentMatchSourceType;
};

export type TournamentMatchWriteInput = {
  awayTournamentTeamId?: string | null;
  bracketKey?: string | null;
  homeTournamentTeamId?: string | null;
  id?: string;
  label?: string | null;
  location?: string | null;
  phase: TournamentMatchPhase;
  placementRank?: number | null;
  refereeTournamentTeamId?: string | null;
  roundNumber?: number | null;
  ruleProfile: MatchRuleProfile;
  scheduledAt?: string | null;
  slotNumber?: number | null;
  sources: readonly TournamentMatchSourceWriteInput[];
  status: TournamentMatchRecordStatus;
  tournamentGroupId?: string | null;
  tournamentId: string;
};

export type TournamentMatchResultWriteInput = {
  sets: readonly MatchSetInput[];
  status: TournamentMatchStatus;
  tournamentId: string;
  tournamentMatchId: string;
  updatedBy?: string | null;
};

export type TournamentResultAuditLogWriteInput = {
  changedBy: string;
  correctionReason?: string | null;
  newResult: TournamentResultAuditSnapshot;
  previousResult?: TournamentResultAuditSnapshot | null;
  tournamentId: string;
  tournamentMatchId: string;
};

export type TournamentFinalStandingWriteInput = {
  finalPosition: number;
  notes?: string | null;
  tournamentTeamId: string;
};

export type CreateTournamentInput = {
  breakDurationMinutes: number;
  courtCount: number;
  description?: string | null;
  endsAt?: string | null;
  formatKey: string;
  isPublic?: boolean;
  location?: string | null;
  matchDurationMinutes: number;
  name: string;
  publishedAt?: string | null;
  slug: string;
  startsAt?: string | null;
  status?: TournamentRow["status"];
};

export type AddTournamentTeamsInput = {
  teamIds: readonly {
    displayName?: string | null;
    groupCode?: TournamentGroupCode;
    seedNumber?: number | null;
    sortOrder?: number | null;
    teamId?: string;
  }[];
  tournamentId: string;
};

export type AssignTournamentTeamsToGroupsInput = {
  assignments: readonly {
    groupCode: TournamentGroupCode;
    seedNumber?: number | null;
    sortOrder?: number | null;
    tournamentTeamId: string;
  }[];
  tournamentId: string;
};

export type GenerateGroupStageScheduleInput = {
  breakDurationMinutes: number;
  courtCount: number;
  matchDurationMinutes: number;
  tournamentId: string;
  tournamentStart: string;
};

export type GeneratedTournamentMatchDraft = TournamentMatchWriteInput & {
  groupCode: TournamentGroupCode | null;
  sequenceNumber?: number | null;
};

export type SaveGeneratedMatchesInput = {
  allowRegenerate?: boolean;
  matches: readonly GeneratedTournamentMatchDraft[];
  tournamentId: string;
};

export type EnterTournamentMatchResultInput = {
  correctionReason?: string | null;
  sets: readonly MatchSetInput[];
  status?: TournamentMatchStatus;
  tournamentId: string;
  tournamentMatchId: string;
};

export type ResolvePlayoffProgressionInput = {
  sourceMatchId: string;
  tournamentId: string;
};

export type CloseTournamentInput = {
  tournamentId: string;
};

export type GroupStandingsSnapshot = {
  entries: {
    draws: number;
    groupCode: TournamentGroupCode;
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
  }[];
  groupCode: TournamentGroupCode;
  groupId: string;
};

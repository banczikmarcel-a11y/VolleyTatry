import type { Database, Json } from "@/types/database";

export type TournamentFormatRow = Database["public"]["Tables"]["tournament_formats"]["Row"];
export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentGroupRow = Database["public"]["Tables"]["tournament_groups"]["Row"];
export type TournamentTeamRow = Database["public"]["Tables"]["tournament_teams"]["Row"];
export type TournamentMatchRow = Database["public"]["Tables"]["tournament_matches"]["Row"];
export type TournamentMatchSourceRow = Database["public"]["Tables"]["match_sources"]["Row"];
export type TournamentMatchSetRow = Database["public"]["Tables"]["match_sets"]["Row"];
export type TournamentResultAuditLogRow = Database["public"]["Tables"]["tournament_result_audit_logs"]["Row"];
export type TournamentFinalStandingRow = Database["public"]["Tables"]["final_standings"]["Row"];

export type TournamentGroupCode = "A" | "B" | "C" | "D";
export type TournamentStatus = "draft" | "scheduled" | "in_progress" | "completed" | "archived";
export type TournamentMatchPhase = "group_stage" | "semifinal" | "final" | "bronze" | "placement";
export type TournamentMatchStatus = "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
export type TournamentMatchParticipantSlot = "home" | "away";
export type TournamentMatchSourceType = "tournament_team" | "group_position" | "match_winner" | "match_loser";

export type TournamentRules = {
  allowedGroupCodes: TournamentGroupCode[];
  formatKey: string;
  raw: Json;
};

export type TournamentDefinition = {
  formatKey: string;
  groups: TournamentGroupCode[];
  teamCount: number;
  tournamentId: string;
};

export type TournamentTeamInput = {
  displayName: string;
  groupCode: TournamentGroupCode;
  id: string;
  seedNumber: number | null;
  teamId: string;
  tournamentId: string;
};

export type TournamentStage =
  | { kind: "group_stage"; group: TournamentGroupCode; round: number; slot: number }
  | { kind: "semifinal"; slot: 1 | 2 }
  | { kind: "final" }
  | { kind: "bronze" }
  | { kind: "placement"; place: 5 | 7 | 9 };

export type TournamentMatchSourceInput =
  | { participantSlot: TournamentMatchParticipantSlot; sourceType: "tournament_team"; tournamentTeamId: string }
  | { participantSlot: TournamentMatchParticipantSlot; sourceType: "group_position"; groupCode: TournamentGroupCode; groupPosition: number }
  | { participantSlot: TournamentMatchParticipantSlot; sourceType: "match_winner"; tournamentMatchId: string }
  | { participantSlot: TournamentMatchParticipantSlot; sourceType: "match_loser"; tournamentMatchId: string };

export type TournamentMatchSlot = {
  id: string;
  label: string | null;
  phase: TournamentMatchPhase;
  placementRank: 3 | 5 | 7 | 9 | null;
  roundNumber: number | null;
  slotNumber: number | null;
  sources: [TournamentMatchSourceInput, TournamentMatchSourceInput];
  tournamentGroupCode: TournamentGroupCode | null;
  tournamentId: string;
};

export type ScheduledTournamentMatch = TournamentMatchSlot & {
  location: string | null;
  scheduledAt: string | null;
};

export type TournamentRefereeAssignment = {
  refereeTournamentTeamId: string;
  tournamentMatchId: string;
};

export type TournamentSetInput = {
  awayPoints: number;
  homePoints: number;
  setNumber: number;
};

export type TournamentResultInput = {
  phase: TournamentMatchPhase;
  sets: TournamentSetInput[];
  status: TournamentMatchStatus;
  tournamentMatchId: string;
};

export type GroupStandingRow = {
  draws: number;
  groupCode: TournamentGroupCode;
  losses: number;
  matchesPlayed: number;
  points: number;
  position: number;
  rallyPointsAgainst: number;
  rallyPointsFor: number;
  setsAgainst: number;
  setsFor: number;
  tournamentTeamId: string;
  wins: number;
};

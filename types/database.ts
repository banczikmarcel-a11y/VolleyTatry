export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          first_name: string | null;
          full_name: string | null;
          id: string;
          last_name: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id: string;
          last_name?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          last_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_memberships: {
        Row: {
          created_at: string;
          id: string;
          joined_at: string | null;
          profile_id: string;
          role: "owner" | "coach" | "player";
          status: "active" | "invited" | "inactive";
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          profile_id: string;
          role?: "owner" | "coach" | "player";
          status?: "active" | "invited" | "inactive";
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          profile_id?: string;
          role?: "owner" | "coach" | "player";
          status?: "active" | "invited" | "inactive";
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          away_sets: number | null;
          away_team_id: string;
          created_at: string;
          created_by: string | null;
          home_sets: number | null;
          home_team_id: string;
          id: string;
          location: string | null;
          match_date: string;
          notes: string | null;
          opponent_team_id: string | null;
          season_year: number;
          starts_at: string;
          status: "scheduled" | "cancelled" | "completed";
          team_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          away_sets?: number | null;
          away_team_id: string;
          created_at?: string;
          created_by?: string | null;
          home_sets?: number | null;
          home_team_id: string;
          id?: string;
          location?: string | null;
          match_date: string;
          notes?: string | null;
          opponent_team_id?: string | null;
          season_year: number;
          starts_at: string;
          status?: "scheduled" | "cancelled" | "completed";
          team_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          away_sets?: number | null;
          away_team_id?: string;
          created_at?: string;
          created_by?: string | null;
          home_sets?: number | null;
          home_team_id?: string;
          id?: string;
          location?: string | null;
          match_date?: string;
          notes?: string | null;
          opponent_team_id?: string | null;
          season_year?: number;
          starts_at?: string;
          status?: "scheduled" | "cancelled" | "completed";
          team_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_responses: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          note: string | null;
          profile_id: string;
          responded_at: string;
          status: "available" | "unavailable" | "maybe";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          note?: string | null;
          profile_id: string;
          responded_at?: string;
          status: "available" | "unavailable" | "maybe";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          note?: string | null;
          profile_id?: string;
          responded_at?: string;
          status?: "available" | "unavailable" | "maybe";
          updated_at?: string;
        };
        Relationships: [];
      };
      match_lineups: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          profile_id: string;
          team_side: "home" | "away";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          profile_id: string;
          team_side: "home" | "away";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          profile_id?: string;
          team_side?: "home" | "away";
          updated_at?: string;
        };
        Relationships: [];
      };
      tournament_formats: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          rules: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          key: string;
          name: string;
          rules?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          key?: string;
          name?: string;
          rules?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          break_duration_minutes: number;
          court_count: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          format_id: string;
          match_duration_minutes: number;
          id: string;
          is_public: boolean;
          location: string | null;
          name: string;
          published_at: string | null;
          slug: string;
          starts_at: string | null;
          status: "draft" | "scheduled" | "in_progress" | "completed" | "archived";
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          break_duration_minutes?: number;
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          format_id: string;
          match_duration_minutes?: number;
          id?: string;
          is_public?: boolean;
          location?: string | null;
          name: string;
          published_at?: string | null;
          slug: string;
          starts_at?: string | null;
          status?: "draft" | "scheduled" | "in_progress" | "completed" | "archived";
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          break_duration_minutes?: number;
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          format_id?: string;
          match_duration_minutes?: number;
          id?: string;
          is_public?: boolean;
          location?: string | null;
          name?: string;
          published_at?: string | null;
          slug?: string;
          starts_at?: string | null;
          status?: "draft" | "scheduled" | "in_progress" | "completed" | "archived";
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tournament_groups: {
        Row: {
          code: "A" | "B" | "C" | "D";
          created_at: string;
          created_by: string | null;
          id: string;
          name: string | null;
          sort_order: number;
          tournament_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: "A" | "B" | "C" | "D";
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string | null;
          sort_order: number;
          tournament_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: "A" | "B" | "C" | "D";
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string | null;
          sort_order?: number;
          tournament_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tournament_teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          display_name: string | null;
          id: string;
          seed_number: number | null;
          sort_order: number | null;
          team_id: string;
          tournament_group_id: string;
          tournament_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          display_name?: string | null;
          id?: string;
          seed_number?: number | null;
          sort_order?: number | null;
          team_id: string;
          tournament_group_id: string;
          tournament_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          display_name?: string | null;
          id?: string;
          seed_number?: number | null;
          sort_order?: number | null;
          team_id?: string;
          tournament_group_id?: string;
          tournament_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tournament_matches: {
        Row: {
          away_tournament_team_id: string | null;
          bracket_key: string | null;
          created_at: string;
          created_by: string | null;
          home_tournament_team_id: string | null;
          id: string;
          label: string | null;
          location: string | null;
          match_id: string | null;
          phase: "group_stage" | "semifinal" | "final" | "bronze" | "placement";
          placement_rank: number | null;
          referee_tournament_team_id: string | null;
          round_number: number | null;
          scheduled_at: string | null;
          slot_number: number | null;
          status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
          tournament_group_id: string | null;
          tournament_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          away_tournament_team_id?: string | null;
          bracket_key?: string | null;
          created_at?: string;
          created_by?: string | null;
          home_tournament_team_id?: string | null;
          id?: string;
          label?: string | null;
          location?: string | null;
          match_id?: string | null;
          phase: "group_stage" | "semifinal" | "final" | "bronze" | "placement";
          placement_rank?: number | null;
          referee_tournament_team_id?: string | null;
          round_number?: number | null;
          scheduled_at?: string | null;
          slot_number?: number | null;
          status?: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
          tournament_group_id?: string | null;
          tournament_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          away_tournament_team_id?: string | null;
          bracket_key?: string | null;
          created_at?: string;
          created_by?: string | null;
          home_tournament_team_id?: string | null;
          id?: string;
          label?: string | null;
          location?: string | null;
          match_id?: string | null;
          phase?: "group_stage" | "semifinal" | "final" | "bronze" | "placement";
          placement_rank?: number | null;
          referee_tournament_team_id?: string | null;
          round_number?: number | null;
          scheduled_at?: string | null;
          slot_number?: number | null;
          status?: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
          tournament_group_id?: string | null;
          tournament_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      match_sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          participant_slot: "home" | "away";
          source_group_code: "A" | "B" | "C" | "D" | null;
          source_group_position: number | null;
          source_tournament_match_id: string | null;
          source_tournament_team_id: string | null;
          source_type: "tournament_team" | "group_position" | "match_winner" | "match_loser";
          tournament_id: string;
          tournament_match_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          participant_slot: "home" | "away";
          source_group_code?: "A" | "B" | "C" | "D" | null;
          source_group_position?: number | null;
          source_tournament_match_id?: string | null;
          source_tournament_team_id?: string | null;
          source_type: "tournament_team" | "group_position" | "match_winner" | "match_loser";
          tournament_id: string;
          tournament_match_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          participant_slot?: "home" | "away";
          source_group_code?: "A" | "B" | "C" | "D" | null;
          source_group_position?: number | null;
          source_tournament_match_id?: string | null;
          source_tournament_team_id?: string | null;
          source_type?: "tournament_team" | "group_position" | "match_winner" | "match_loser";
          tournament_id?: string;
          tournament_match_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      match_sets: {
        Row: {
          away_points: number;
          created_at: string;
          created_by: string | null;
          home_points: number;
          id: string;
          set_number: number;
          tournament_id: string;
          tournament_match_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          away_points: number;
          created_at?: string;
          created_by?: string | null;
          home_points: number;
          id?: string;
          set_number: number;
          tournament_id: string;
          tournament_match_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          away_points?: number;
          created_at?: string;
          created_by?: string | null;
          home_points?: number;
          id?: string;
          set_number?: number;
          tournament_id?: string;
          tournament_match_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tournament_result_audit_logs: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          correction_reason: string | null;
          id: string;
          new_result: Json;
          previous_result: Json | null;
          tournament_id: string;
          tournament_match_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          correction_reason?: string | null;
          id?: string;
          new_result: Json;
          previous_result?: Json | null;
          tournament_id: string;
          tournament_match_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          correction_reason?: string | null;
          id?: string;
          new_result?: Json;
          previous_result?: Json | null;
          tournament_id?: string;
          tournament_match_id?: string;
        };
        Relationships: [];
      };
      final_standings: {
        Row: {
          created_at: string;
          created_by: string | null;
          final_position: number;
          id: string;
          notes: string | null;
          tournament_id: string;
          tournament_team_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          final_position: number;
          id?: string;
          notes?: string | null;
          tournament_id: string;
          tournament_team_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          final_position?: number;
          id?: string;
          notes?: string | null;
          tournament_id?: string;
          tournament_team_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

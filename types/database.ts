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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

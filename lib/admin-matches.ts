import { createClient } from "@/supabase/server";
import type { MatchStatus } from "@/types/entities";

export type AdminMatch = {
  id: string;
  matchDate: string;
  location: string | null;
  seasonYear: number;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeSets: number | null;
  awaySets: number | null;
};

type AdminMatchRow = {
  away_sets: number | null;
  away_team_id: string;
  home_sets: number | null;
  home_team_id: string;
  id: string;
  location: string | null;
  match_date: string;
  season_year: number;
  status: MatchStatus;
};

export async function getAdminMatch(matchId: string): Promise<{
  error: string | null;
  match: AdminMatch | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id,match_date,location,season_year,status,home_team_id,away_team_id,home_sets,away_sets")
    .eq("id", matchId)
    .single();

  if (error) {
    return { error: error.message, match: null };
  }

  const row = data as AdminMatchRow;

  return {
    error: null,
    match: {
      awaySets: row.away_sets,
      awayTeamId: row.away_team_id,
      homeSets: row.home_sets,
      homeTeamId: row.home_team_id,
      id: row.id,
      location: row.location,
      matchDate: row.match_date,
      seasonYear: row.season_year,
      status: row.status
    }
  };
}

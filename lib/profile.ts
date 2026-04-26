import { getSupabaseConfig } from "@/supabase/env";
import { formatFullName, splitFullName } from "@/lib/player-name";
import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";

type TeamRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
};

type MembershipRow = {
  team_id: string;
  teams: TeamRow | TeamRow[] | null;
};

type MatchRow = {
  away_sets: number | null;
  away_team_id: string;
  away_team: TeamRow | TeamRow[] | null;
  match_date: string;
  home_sets: number | null;
  home_team_id: string;
  home_team: TeamRow | TeamRow[] | null;
  id: string;
  status: string;
};

export type PlayerYearStats = {
  losses: number;
  lossRate: number;
  lostSets: number;
  lostSetsRate: number;
  wonSets: number;
  wonSetsRate: number;
  wins: number;
  winRate: number;
  year: number;
};

export type PlayerMatchHistory = {
  date: string;
  id: string;
  result: "Výhra" | "Prehra" | "Remíza";
  sets: string;
  teamName: string;
};

export type PlayerProfileData = {
  email: string | null;
  fullName: string;
  history: PlayerMatchHistory[];
  teamNames: string[];
  yearlyStats: PlayerYearStats[];
};

export type PlayerOption = {
  id: string;
  label: string;
  sortLabel: string;
};

function unwrapTeam(team: TeamRow | TeamRow[] | null) {
  return Array.isArray(team) ? team[0] ?? null : team;
}

function getRates(wins: number, losses: number) {
  const total = wins + losses;

  if (total === 0) {
    return {
      lossRate: 0,
      winRate: 0
    };
  }

  return {
    lossRate: Math.round((losses / total) * 100),
    winRate: Math.round((wins / total) * 100)
  };
}

export async function getCurrentPlayerProfile(profileId: string): Promise<{
  error: string | null;
  isConfigured: boolean;
  profile: PlayerProfileData | null;
}> {
  if (!getSupabaseConfig().isConfigured) {
    return { error: null, isConfigured: false, profile: null };
  }

  return getPlayerProfileById(profileId);
}

export async function getPlayerProfileById(profileId: string): Promise<{
  error: string | null;
  isConfigured: boolean;
  profile: PlayerProfileData | null;
}> {
  if (!getSupabaseConfig().isConfigured) {
    return { error: null, isConfigured: false, profile: null };
  }

  const supabase = getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();
  const [{ data: profile, error: profileError }, { data: memberships, error: membershipsError }, { data: responses, error: responsesError }] =
    await Promise.all([
      supabase.from("profiles").select("id,full_name,first_name,last_name,email").eq("id", profileId).maybeSingle(),
      supabase.from("team_memberships").select("team_id,teams:team_id(id,name)").eq("profile_id", profileId).eq("status", "active"),
      supabase.from("match_responses").select("match_id").eq("profile_id", profileId).eq("status", "available")
    ]);

  if (profileError) {
    return { error: profileError.message, isConfigured: true, profile: null };
  }

  if (membershipsError) {
    return { error: membershipsError.message, isConfigured: true, profile: null };
  }

  if (responsesError) {
    return { error: responsesError.message, isConfigured: true, profile: null };
  }

  if (!profile) {
    return { error: null, isConfigured: true, profile: null };
  }

  const fallbackName = splitFullName(profile.full_name);
  const firstName = profile.first_name ?? fallbackName.firstName;
  const lastName = profile.last_name ?? fallbackName.lastName;
  const displayName = formatFullName(firstName, lastName, profile.full_name);

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const teamIds = new Set(membershipRows.map((membership) => membership.team_id));
  const teamNames = Array.from(
    new Set(
      membershipRows
        .map((membership) => unwrapTeam(membership.teams)?.name)
        .filter((value): value is string => Boolean(value))
    )
  );
  const matchIds = Array.from(new Set((responses ?? []).map((response) => response.match_id)));

  if (matchIds.length === 0) {
    return {
      error: null,
      isConfigured: true,
      profile: {
        email: profile.email,
        fullName: displayName,
        history: [],
        teamNames,
        yearlyStats: []
      }
    };
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id,match_date,status,home_team_id,away_team_id,home_sets,away_sets,home_team:home_team_id(id,name),away_team:away_team_id(id,name)")
    .in("id", matchIds)
    .eq("status", "completed")
    .not("home_sets", "is", null)
    .not("away_sets", "is", null)
    .order("match_date", { ascending: false });

  if (matchesError) {
    return { error: matchesError.message, isConfigured: true, profile: null };
  }

  const yearlyMap = new Map<number, { losses: number; lostSets: number; wonSets: number; wins: number }>();
  const history: PlayerMatchHistory[] = [];

  ((matches ?? []) as MatchRow[]).forEach((match) => {
    if (match.home_sets === null || match.away_sets === null) {
      return;
    }

    const isHomeTeam = teamIds.has(match.home_team_id);
    const isAwayTeam = teamIds.has(match.away_team_id);

    if (!isHomeTeam && !isAwayTeam) {
      return;
    }

    const teamName = isHomeTeam
      ? unwrapTeam(match.home_team)?.name ?? "Domáci"
      : unwrapTeam(match.away_team)?.name ?? "Hostia";
    const teamSets = isHomeTeam ? match.home_sets : match.away_sets;
    const opponentSets = isHomeTeam ? match.away_sets : match.home_sets;
    const year = new Date(match.match_date).getFullYear();
    const yearlyRecord = yearlyMap.get(year) ?? { losses: 0, lostSets: 0, wonSets: 0, wins: 0 };

    yearlyRecord.wonSets += teamSets;
    yearlyRecord.lostSets += opponentSets;

    let result: "Výhra" | "Prehra" | "Remíza" = "Remíza";

    if (teamSets > opponentSets) {
      yearlyRecord.wins += 1;
      result = "Výhra";
    } else if (teamSets < opponentSets) {
      yearlyRecord.losses += 1;
      result = "Prehra";
    }

    yearlyMap.set(year, yearlyRecord);
    history.push({
      date: match.match_date,
      id: match.id,
      result,
      sets: `${teamSets}:${opponentSets}`,
      teamName
    });
  });

  const yearlyStats = [...yearlyMap.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, record]) => {
      const matchRates = getRates(record.wins, record.losses);
      const setRates = getRates(record.wonSets, record.lostSets);

      return {
        losses: record.losses,
        lossRate: matchRates.lossRate,
        lostSets: record.lostSets,
        lostSetsRate: setRates.lossRate,
        wonSets: record.wonSets,
        wonSetsRate: setRates.winRate,
        wins: record.wins,
        winRate: matchRates.winRate,
        year
      };
    });

  return {
    error: null,
    isConfigured: true,
    profile: {
      email: profile.email,
      fullName: displayName,
      history,
      teamNames,
      yearlyStats
    }
  };
}

export async function getPlayerOptions(): Promise<{
  error: string | null;
  isConfigured: boolean;
  players: PlayerOption[];
}> {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return { error: null, isConfigured: false, players: [] };
  }

  const supabase = config.serviceRoleKey ? createAdminClient() : await createClient();
  const { data, error } = await supabase.from("profiles").select("id,full_name,first_name,last_name").order("last_name", { ascending: true }).order("first_name", { ascending: true });

  if (error) {
    return { error: error.message, isConfigured: true, players: [] };
  }

  const players = (data ?? [])
    .map((profile) => {
      const fallbackName = splitFullName(profile.full_name);
      const firstName = profile.first_name ?? fallbackName.firstName;
      const lastName = profile.last_name ?? fallbackName.lastName;
      const label = formatFullName(firstName, lastName, profile.full_name);
      const sortLabel = [lastName.trim(), firstName.trim()].filter(Boolean).join(" ").trim() || label;

      return {
        id: profile.id,
        label,
        sortLabel
      };
    })
    .sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk"));

  return {
    error: null,
    isConfigured: true,
    players
  };
}

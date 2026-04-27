import { getSupabaseConfig } from "@/supabase/env";
import { createAdminClient } from "@/supabase/admin";
import { formatFullName, formatSortName, splitFullName } from "@/lib/player-name";
import { createClient } from "@/supabase/server";
import type { MatchResponseStatus, MatchStatus } from "@/types/entities";

export type MatchTeam = {
  id: string;
  name: string;
  slug: string;
};

export type MatchSummary = {
  availablePlayersCount: number;
  currentUserResponse: MatchResponseStatus | null;
  id: string;
  title: string;
  startsAt: string;
  matchDate: string;
  location: string | null;
  status: MatchStatus;
  signupPlayers: MatchSignupPlayer[];
  seasonYear: number;
  homeSets: number | null;
  awaySets: number | null;
  team: MatchTeam | null;
  opponent: MatchTeam | null;
};

export type MatchDetail = MatchSummary & {
  notes: string | null;
  availablePlayers: MatchSignupPlayer[];
  responseCounts: Record<MatchResponseStatus, number>;
  signupPlayers: MatchSignupPlayer[];
  unavailablePlayers: MatchSignupPlayer[];
  userResponse: MatchResponseStatus | null;
};

export type MatchSignupPlayer = {
  assignedTeamSide?: "away" | "home" | null;
  id: string;
  label: string;
  preferredTeamSlug: string | null;
  sortLabel: string;
};

type TeamRelation = MatchTeam | MatchTeam[] | null;

type MatchRow = {
  away_sets: number | null;
  away_team: TeamRelation;
  id: string;
  home_sets: number | null;
  home_team: TeamRelation;
  title: string;
  match_date: string;
  season_year: number;
  starts_at: string;
  location: string | null;
  status: MatchStatus;
  notes?: string | null;
  teams: TeamRelation;
  opponent_team: TeamRelation;
};

type MatchResponseRow = {
  profile_id?: string;
  status: MatchResponseStatus;
};

type MatchLineupRow = {
  profile_id: string;
  team_side: "away" | "home";
};

type ProfileLookupRow = {
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
};

function isMissingMatchLineupsTableError(error: { code?: string; message: string } | null) {
  if (!error) {
    return false;
  }

  return error.message.includes("public.match_lineups");
}

function unwrapTeam(team: TeamRelation): MatchTeam | null {
  return Array.isArray(team) ? team[0] ?? null : team;
}

function mapMatch(row: MatchRow): MatchSummary {
  return {
    availablePlayersCount: 0,
    currentUserResponse: null,
    awaySets: row.away_sets,
    homeSets: row.home_sets,
    id: row.id,
    location: row.location,
    matchDate: row.match_date,
    opponent: unwrapTeam(row.away_team ?? row.opponent_team),
    seasonYear: row.season_year,
    signupPlayers: [],
    startsAt: row.match_date ?? row.starts_at,
    status: row.status,
    team: unwrapTeam(row.home_team ?? row.teams),
    title: row.title
  };
}

function mapProfileToSignupPlayer(profile: ProfileLookupRow): MatchSignupPlayer {
  const fallbackName = splitFullName(profile.full_name);
  const firstName = profile.first_name ?? fallbackName.firstName;
  const lastName = profile.last_name ?? fallbackName.lastName;

  return {
    assignedTeamSide: null,
    id: profile.id,
    label: formatFullName(firstName, lastName, profile.email),
    preferredTeamSlug: null,
    sortLabel: formatSortName(firstName, lastName, profile.email)
  };
}

async function getAllActiveSignupPlayers() {
  if (!getSupabaseConfig().serviceRoleKey) {
    return [];
  }

  const supabase = createAdminClient();
  const { data: memberships, error: membershipsError } = await supabase
    .from("team_memberships")
    .select("profile_id,team_id,teams:team_id(slug)")
    .eq("status", "active");

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipRows = (memberships ?? []) as Array<{ profile_id: string; team_id: string; teams: { slug: string } | { slug: string }[] | null }>;
  const preferredTeamSlugByProfileId = new Map<string, string | null>();

  membershipRows.forEach((membership) => {
    if (preferredTeamSlugByProfileId.has(membership.profile_id)) {
      return;
    }

    const team = Array.isArray(membership.teams) ? membership.teams[0] ?? null : membership.teams;
    preferredTeamSlugByProfileId.set(membership.profile_id, team?.slug ?? null);
  });

  const profileIds = Array.from(new Set(membershipRows.map((membership) => membership.profile_id)));

  if (profileIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,full_name,first_name,last_name,email")
    .in("id", profileIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return (profiles ?? [])
    .map((profile) => {
      const player = mapProfileToSignupPlayer(profile as ProfileLookupRow);

      return {
        ...player,
        preferredTeamSlug: preferredTeamSlugByProfileId.get(player.id) ?? null
      };
    })
    .sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk"));
}

async function attachSignupPlayers(matches: MatchSummary[]) {
  if (matches.length === 0 || !getSupabaseConfig().serviceRoleKey) {
    return matches;
  }

  const [allPlayers, responsesResult] = await Promise.all([
    getAllActiveSignupPlayers(),
    createAdminClient()
      .from("match_responses")
      .select("match_id,profile_id,status")
      .in("match_id", matches.map((match) => match.id))
      .in("status", ["available", "unavailable"])
  ]);

  if (responsesResult.error) {
    throw new Error(responsesResult.error.message);
  }

  const excludedByMatchId = new Map<string, Set<string>>();

  ((responsesResult.data ?? []) as Array<{ match_id: string; profile_id: string; status: MatchResponseStatus }>).forEach((response) => {
    const excluded = excludedByMatchId.get(response.match_id) ?? new Set<string>();
    excluded.add(response.profile_id);
    excludedByMatchId.set(response.match_id, excluded);
  });

  return matches.map((match) => {
    const excluded = excludedByMatchId.get(match.id) ?? new Set<string>();

    return {
      ...match,
      signupPlayers: allPlayers.filter((player) => !excluded.has(player.id))
    };
  });
}

async function attachAvailableCounts(matches: MatchSummary[]) {
  if (matches.length === 0) {
    return matches;
  }

  if (!getSupabaseConfig().serviceRoleKey) {
    return matches;
  }

  const supabase = createAdminClient();
  const matchIds = matches.map((match) => match.id);
  const { data, error } = await supabase
    .from("match_responses")
    .select("match_id,status")
    .in("match_id", matchIds)
    .eq("status", "available");

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();

  (data ?? []).forEach((response) => {
    counts.set(response.match_id, (counts.get(response.match_id) ?? 0) + 1);
  });

  return matches.map((match) => ({
    ...match,
    availablePlayersCount: counts.get(match.id) ?? 0
  }));
}

async function attachCurrentUserResponses(matches: MatchSummary[], profileId?: string) {
  if (matches.length === 0 || !profileId) {
    return matches;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_responses")
    .select("match_id,status")
    .eq("profile_id", profileId)
    .in("match_id", matches.map((match) => match.id));

  if (error) {
    throw new Error(error.message);
  }

  const responsesByMatchId = new Map<string, MatchResponseStatus>();

  (data ?? []).forEach((response) => {
    responsesByMatchId.set(response.match_id, response.status);
  });

  return matches.map((match) => ({
    ...match,
    currentUserResponse: responsesByMatchId.get(match.id) ?? null
  }));
}

export function isMatchesConfigured() {
  return getSupabaseConfig().isConfigured;
}

export async function getMatches(profileId?: string): Promise<{
  error: string | null;
  isConfigured: boolean;
  matches: MatchSummary[];
}> {
  if (!isMatchesConfigured()) {
    return { error: null, isConfigured: false, matches: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,title,starts_at,match_date,location,status,season_year,home_sets,away_sets,teams:team_id(id,name,slug),opponent_team:opponent_team_id(id,name,slug),home_team:home_team_id(id,name,slug),away_team:away_team_id(id,name,slug)"
    )
    .order("match_date", { ascending: false });

  if (error) {
    return { error: error.message, isConfigured: true, matches: [] };
  }

  try {
    const matchesWithCounts = await attachAvailableCounts(((data ?? []) as MatchRow[]).map(mapMatch));
    const matchesWithResponses = await attachCurrentUserResponses(matchesWithCounts, profileId);
    const matches = await attachSignupPlayers(matchesWithResponses);
    return {
      error: null,
      isConfigured: true,
      matches
    };
  } catch (countError) {
    return {
      error: countError instanceof Error ? countError.message : "Could not load match responses.",
      isConfigured: true,
      matches: []
    };
  }
}

export async function getUpcomingProgramMatches(
  limit = 3,
  profileId?: string
): Promise<{
  error: string | null;
  isConfigured: boolean;
  matches: MatchSummary[];
}> {
  if (!isMatchesConfigured()) {
    return { error: null, isConfigured: false, matches: [] };
  }

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,title,starts_at,match_date,location,status,season_year,home_sets,away_sets,teams:team_id(id,name,slug),opponent_team:opponent_team_id(id,name,slug),home_team:home_team_id(id,name,slug),away_team:away_team_id(id,name,slug)"
    )
    .neq("status", "completed")
    .gte("match_date", todayStart.toISOString())
    .order("match_date", { ascending: true })
    .limit(limit);

  if (error) {
    return { error: error.message, isConfigured: true, matches: [] };
  }

  try {
    const matches = await attachAvailableCounts(((data ?? []) as MatchRow[]).map(mapMatch));
    const matchesWithResponses = await attachCurrentUserResponses(matches, profileId);
    const matchesWithSignupPlayers = await attachSignupPlayers(matchesWithResponses);
    return {
      error: null,
      isConfigured: true,
      matches: matchesWithSignupPlayers
    };
  } catch (countError) {
    return {
      error: countError instanceof Error ? countError.message : "Could not load match responses.",
      isConfigured: true,
      matches: []
    };
  }
}

export async function getRecentCompletedMatches(
  limit = 3,
  profileId?: string
): Promise<{
  error: string | null;
  isConfigured: boolean;
  matches: MatchSummary[];
}> {
  if (!isMatchesConfigured()) {
    return { error: null, isConfigured: false, matches: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,title,starts_at,match_date,location,status,season_year,home_sets,away_sets,teams:team_id(id,name,slug),opponent_team:opponent_team_id(id,name,slug),home_team:home_team_id(id,name,slug),away_team:away_team_id(id,name,slug)"
    )
    .eq("status", "completed")
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message, isConfigured: true, matches: [] };
  }

  try {
    const matches = await attachAvailableCounts(((data ?? []) as MatchRow[]).map(mapMatch));
    const matchesWithResponses = await attachCurrentUserResponses(matches, profileId);
    const matchesWithSignupPlayers = await attachSignupPlayers(matchesWithResponses);
    return {
      error: null,
      isConfigured: true,
      matches: matchesWithSignupPlayers
    };
  } catch (countError) {
    return {
      error: countError instanceof Error ? countError.message : "Could not load match responses.",
      isConfigured: true,
      matches: []
    };
  }
}

export async function getMatchDetail(
  matchId: string,
  profileId?: string
): Promise<{
  error: string | null;
  isConfigured: boolean;
  match: MatchDetail | null;
}> {
  if (!isMatchesConfigured()) {
    return { error: null, isConfigured: false, match: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,title,starts_at,match_date,location,status,notes,season_year,home_sets,away_sets,teams:team_id(id,name,slug),opponent_team:opponent_team_id(id,name,slug),home_team:home_team_id(id,name,slug),away_team:away_team_id(id,name,slug)"
    )
    .eq("id", matchId)
    .single();

  if (error) {
    return { error: error.message, isConfigured: true, match: null };
  }

  let responses: MatchResponseRow[] = [];
  let lineupRows: MatchLineupRow[] = [];

  if (getSupabaseConfig().serviceRoleKey) {
    const adminSupabase = createAdminClient();
    const [{ data: adminResponses, error: responsesError }, { data: lineups, error: lineupsError }] = await Promise.all([
      adminSupabase
        .from("match_responses")
        .select("profile_id,status")
        .eq("match_id", matchId),
      adminSupabase
        .from("match_lineups")
        .select("profile_id,team_side")
        .eq("match_id", matchId)
    ]);

    if (responsesError) {
      return { error: responsesError.message, isConfigured: true, match: null };
    }

    if (lineupsError && !isMissingMatchLineupsTableError(lineupsError)) {
      return { error: lineupsError.message, isConfigured: true, match: null };
    }

    responses = (adminResponses ?? []) as MatchResponseRow[];
    lineupRows = isMissingMatchLineupsTableError(lineupsError) ? [] : ((lineups ?? []) as MatchLineupRow[]);
  }

  let userResponse: MatchResponseStatus | null = null;

  if (profileId) {
    const { data: userResponseRow } = await supabase
      .from("match_responses")
      .select("status")
      .eq("match_id", matchId)
      .eq("profile_id", profileId)
      .maybeSingle();

    userResponse = userResponseRow?.status ?? null;
  }

  const responseCounts = responses.reduce<Record<MatchResponseStatus, number>>(
    (counts, response) => {
      counts[response.status] += 1;
      return counts;
    },
    { available: 0, maybe: 0, unavailable: 0 }
  );

  const availableProfileIds = Array.from(
    new Set(
      responses
        .filter((response) => response.status === "available" && typeof response.profile_id === "string")
        .map((response) => response.profile_id as string)
    )
  );
  const unavailableProfileIds = Array.from(
    new Set(
      responses
        .filter((response) => response.status === "unavailable" && typeof response.profile_id === "string")
        .map((response) => response.profile_id as string)
    )
  );

  let availablePlayers: MatchSignupPlayer[] = [];
  let unavailablePlayers: MatchSignupPlayer[] = [];

  if (availableProfileIds.length > 0 && getSupabaseConfig().serviceRoleKey) {
    const adminSupabase = createAdminClient();
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,email")
      .in("id", availableProfileIds);

    if (profilesError) {
      return { error: profilesError.message, isConfigured: true, match: null };
    }

    const assignedTeamSideByProfileId = new Map(lineupRows.map((row) => [row.profile_id, row.team_side] as const));

    availablePlayers = (profiles ?? [])
      .map((profile) => {
        const player = mapProfileToSignupPlayer(profile as ProfileLookupRow);

        return {
          ...player,
          assignedTeamSide: assignedTeamSideByProfileId.get(player.id) ?? null
        };
      })
      .sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk"));
  }

  if (unavailableProfileIds.length > 0 && getSupabaseConfig().serviceRoleKey) {
    const adminSupabase = createAdminClient();
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,email")
      .in("id", unavailableProfileIds);

    if (profilesError) {
      return { error: profilesError.message, isConfigured: true, match: null };
    }

    unavailablePlayers = (profiles ?? [])
      .map((profile) => mapProfileToSignupPlayer(profile as ProfileLookupRow))
      .sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "sk"));
  }

  const signupMatch = (await attachSignupPlayers([mapMatch(data as MatchRow)]))[0];

  return {
    error: null,
    isConfigured: true,
    match: {
      availablePlayers,
      ...signupMatch,
      notes: (data as MatchRow).notes ?? null,
      responseCounts,
      unavailablePlayers,
      userResponse
    }
  };
}

export function formatMatchStatus(status: MatchStatus) {
  if (status === "scheduled") {
    return "Plánovaný";
  }

  if (status === "completed") {
    return "Ukončený";
  }

  return "Zrušený";
}

export async function getMatchSignupPlayers(): Promise<{
  error: string | null;
  isConfigured: boolean;
  players: MatchSignupPlayer[];
}> {
  if (!isMatchesConfigured() || !getSupabaseConfig().serviceRoleKey) {
    return { error: null, isConfigured: false, players: [] };
  }

  try {
    const players = await getAllActiveSignupPlayers();
    return {
      error: null,
      isConfigured: true,
      players
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not load players.",
      isConfigured: true,
      players: []
    };
  }
}

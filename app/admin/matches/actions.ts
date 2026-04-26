"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { createClient } from "@/supabase/server";
import type { MatchStatus } from "@/types/entities";

type MatchPayload = {
  awaySets: number | null;
  awayTeamId: string;
  homeSets: number | null;
  homeTeamId: string;
  location: string;
  matchDate: string;
  seasonYear: number;
  status: MatchStatus;
};

type MatchActionContext = {
  action: "create" | "quick-create" | "update";
  matchId?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalSet(formData: FormData, key: string) {
  const raw = getString(formData, key);

  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
}

function isMatchStatus(value: string): value is MatchStatus {
  return value === "scheduled" || value === "cancelled" || value === "completed";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function logMatchActionError(context: MatchActionContext, error: unknown) {
  console.error("[matches:admin]", {
    ...context,
    error
  });
}

function getSupabaseErrorMessage(error: { code?: string; details?: string | null; message: string }) {
  const detail = error.details ? ` ${error.details}` : "";
  return `${error.message}${detail}`;
}

function parseDateOnly(value: string, errorPath: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    redirectWithError(errorPath, "Vyber platny datum.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dayStart = new Date(year, month - 1, day);
  const matchDate = new Date(year, month - 1, day, 19, 0, 0);
  const nextDayStart = new Date(year, month - 1, day + 1);

  if (
    Number.isNaN(dayStart.getTime())
    || dayStart.getFullYear() !== year
    || dayStart.getMonth() !== month - 1
    || dayStart.getDate() !== day
  ) {
    redirectWithError(errorPath, "Vyber platny datum.");
  }

  return {
    dayStart: dayStart.toISOString(),
    matchDate: matchDate.toISOString(),
    nextDayStart: nextDayStart.toISOString(),
    seasonYear: year
  };
}

function parsePayload(formData: FormData, errorPath: string): MatchPayload {
  const matchDateRaw = getString(formData, "match_date");
  const location = getString(formData, "location");
  const seasonYear = Number(getString(formData, "season_year"));
  const status = getString(formData, "status");
  const homeTeamId = getString(formData, "home_team_id");
  const awayTeamId = getString(formData, "away_team_id");
  const homeSets = getOptionalSet(formData, "home_sets");
  const awaySets = getOptionalSet(formData, "away_sets");
  const parsedDate = new Date(matchDateRaw);

  if (!matchDateRaw || Number.isNaN(parsedDate.getTime())) {
    redirectWithError(errorPath, "Enter a valid match date.");
  }

  if (!location) {
    redirectWithError(errorPath, "Enter a match location.");
  }

  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
    redirectWithError(errorPath, "Season year must be between 2000 and 2100.");
  }

  if (!isMatchStatus(status)) {
    redirectWithError(errorPath, "Choose a valid match status.");
  }

  if (!homeTeamId || !awayTeamId) {
    redirectWithError(errorPath, "Choose both teams.");
  }

  if (homeTeamId === awayTeamId) {
    redirectWithError(errorPath, "Home and away teams must be different.");
  }

  if (Number.isNaN(homeSets) || Number.isNaN(awaySets)) {
    redirectWithError(errorPath, "Sets must be empty or a non-negative whole number.");
  }

  if ((homeSets !== null && homeSets > 5) || (awaySets !== null && awaySets > 5)) {
    redirectWithError(errorPath, "Maximalny pocet setov pre jedno druzstvo je 5.");
  }

  if (homeSets !== null && awaySets !== null && homeSets + awaySets > 5) {
    redirectWithError(errorPath, "Sucet setov oboch druzstiev moze byt maximalne 5.");
  }

  if (status === "completed" && (homeSets === null || awaySets === null)) {
    redirectWithError(errorPath, "Completed matches need both set scores.");
  }

  return {
    awaySets,
    awayTeamId,
    homeSets,
    homeTeamId,
    location,
    matchDate: parsedDate.toISOString(),
    seasonYear,
    status
  };
}

async function getMatchTitle(homeTeamId: string, awayTeamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("id,name").in("id", [homeTeamId, awayTeamId]);

  if (error) {
    throw new Error(error.message);
  }

  const home = data?.find((team) => team.id === homeTeamId)?.name ?? "Domaci";
  const away = data?.find((team) => team.id === awayTeamId)?.name ?? "Super";

  return `${home} vs ${away}`;
}

async function getDefaultMatchTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("id,name,slug").in("slug", ["tatry", "ostatni"]);

  if (error) {
    throw new Error(error.message);
  }

  const homeTeam = data?.find((team) => team.slug === "tatry");
  const awayTeam = data?.find((team) => team.slug === "ostatni");

  if (!homeTeam || !awayTeam) {
    throw new Error("Default teams Tatry and Ostatni were not found.");
  }

  return { awayTeam, homeTeam };
}

async function hasMatchOnDay(dayStart: string, nextDayStart: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .gte("match_date", dayStart)
    .lt("match_date", nextDayStart)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

export async function createQuickMatch(formData: FormData) {
  await requireAdminUser("/admin/matches/new");
  const errorPath = "/admin/matches/new";
  const customDate = getString(formData, "custom_match_date");
  const selectedDate = customDate || getString(formData, "match_date");
  const { dayStart, matchDate, nextDayStart, seasonYear } = parseDateOnly(selectedDate, errorPath);

  let matchExists = false;

  try {
    matchExists = await hasMatchOnDay(dayStart, nextDayStart);
  } catch (error) {
    logMatchActionError({ action: "quick-create" }, error);
    redirectWithError(errorPath, "Could not check existing matches for this date.");
  }

  if (matchExists) {
    redirectWithError(errorPath, "Zapas na dany den uz existuje.");
  }

  let teams: Awaited<ReturnType<typeof getDefaultMatchTeams>>;

  try {
    teams = await getDefaultMatchTeams();
  } catch (error) {
    logMatchActionError({ action: "quick-create" }, error);
    redirectWithError(errorPath, "Could not load default teams Tatry and Ostatni.");
  }

  const supabase = await createClient();
  const matchId = crypto.randomUUID();
  const title = `${teams.homeTeam.name} vs ${teams.awayTeam.name}`;
  const { error } = await supabase.from("matches").insert({
    away_sets: null,
    away_team_id: teams.awayTeam.id,
    created_by: null,
    home_sets: null,
    home_team_id: teams.homeTeam.id,
    id: matchId,
    location: "Miesto bude doplnene",
    match_date: matchDate,
    notes: null,
    opponent_team_id: teams.awayTeam.id,
    season_year: seasonYear,
    starts_at: matchDate,
    status: "scheduled",
    team_id: teams.homeTeam.id,
    title
  });

  if (error) {
    logMatchActionError({ action: "quick-create", matchId }, error);
    redirectWithError(errorPath, getSupabaseErrorMessage(error));
  }

  revalidatePath("/matches");
  redirect(`/matches?message=${encodeURIComponent("Zapas bol vytvoreny.")}`);
}

export async function createMatch(formData: FormData) {
  await requireAdminUser("/admin/matches/new");
  const payload = parsePayload(formData, "/admin/matches/new");
  let title = "";

  try {
    title = await getMatchTitle(payload.homeTeamId, payload.awayTeamId);
  } catch (error) {
    logMatchActionError({ action: "create" }, error);
    redirectWithError("/admin/matches/new", "Could not load selected teams.");
  }

  const supabase = await createClient();
  const matchId = crypto.randomUUID();
  const { error } = await supabase
    .from("matches")
    .insert({
      away_sets: payload.awaySets,
      away_team_id: payload.awayTeamId,
      created_by: null,
      home_sets: payload.homeSets,
      home_team_id: payload.homeTeamId,
      id: matchId,
      location: payload.location,
      match_date: payload.matchDate,
      notes: null,
      opponent_team_id: payload.awayTeamId,
      season_year: payload.seasonYear,
      starts_at: payload.matchDate,
      status: payload.status,
      team_id: payload.homeTeamId,
      title
    });

  if (error) {
    logMatchActionError({ action: "create", matchId }, error);
    redirectWithError("/admin/matches/new", getSupabaseErrorMessage(error));
  }

  revalidatePath("/matches");
  redirect(`/matches?message=${encodeURIComponent("Match created.")}`);
}

export async function updateMatch(formData: FormData) {
  const matchId = getString(formData, "match_id");

  if (!matchId) {
    redirectWithError("/matches", "Missing match id.");
  }

  await requireAdminUser(`/admin/matches/${matchId}/edit`);
  const errorPath = `/admin/matches/${matchId}/edit`;
  const payload = parsePayload(formData, errorPath);
  let title = "";

  try {
    title = await getMatchTitle(payload.homeTeamId, payload.awayTeamId);
  } catch (error) {
    logMatchActionError({ action: "update", matchId }, error);
    redirectWithError(errorPath, "Could not load selected teams.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      away_sets: payload.awaySets,
      away_team_id: payload.awayTeamId,
      home_sets: payload.homeSets,
      home_team_id: payload.homeTeamId,
      location: payload.location,
      match_date: payload.matchDate,
      opponent_team_id: payload.awayTeamId,
      season_year: payload.seasonYear,
      starts_at: payload.matchDate,
      status: payload.status,
      team_id: payload.homeTeamId,
      title
    })
    .eq("id", matchId);

  if (error) {
    logMatchActionError({ action: "update", matchId }, error);
    redirectWithError(errorPath, getSupabaseErrorMessage(error));
  }

  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  redirect(`/matches?message=${encodeURIComponent("Match updated.")}`);
}

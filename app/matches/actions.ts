"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { createClient } from "@/supabase/server";
import { requireAdminUser } from "@/lib/admin";
import type { MatchResponseStatus } from "@/types/entities";

type ActionResult = {
  error?: string;
  message?: string;
  ok: boolean;
};

type TeamSide = "away" | "home";

function isMissingMatchLineupsTableError(error: { code?: string; message: string } | null) {
  if (!error) {
    return false;
  }

  return error.message.includes("public.match_lineups");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isMatchResponseStatus(value: string): value is Extract<MatchResponseStatus, "available" | "unavailable"> {
  return value === "available" || value === "unavailable";
}

function isTeamSide(value: string): value is TeamSide {
  return value === "home" || value === "away";
}

function getErrorResult(error: unknown, fallback: string): ActionResult {
  return {
    error: error instanceof Error ? error.message : fallback,
    ok: false
  };
}

async function getCurrentUserOrRedirect(matchId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/matches/${matchId}`);
  }

  return { supabase, user };
}

async function getProfilePreferredTeamSide(matchId: string, profileId: string): Promise<TeamSide | null> {
  if (!getSupabaseConfig().serviceRoleKey) {
    return null;
  }

  const supabase = createAdminClient();
  const [{ data: match, error: matchError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from("matches").select("home_team_id,away_team_id").eq("id", matchId).single(),
    supabase
      .from("team_memberships")
      .select("team_id,teams:team_id(slug)")
      .eq("profile_id", profileId)
      .eq("status", "active")
  ]);

  if (matchError || membershipError || !match) {
    return null;
  }

  const teamIdsBySlug = new Map<string, string>();

  ((memberships ?? []) as Array<{ team_id: string; teams: { slug: string } | { slug: string }[] | null }>).forEach((membership) => {
    const team = Array.isArray(membership.teams) ? membership.teams[0] ?? null : membership.teams;

    if (team?.slug) {
      teamIdsBySlug.set(team.slug, membership.team_id);
    }
  });

  if (teamIdsBySlug.get("tatry") === match.home_team_id || teamIdsBySlug.get("tatry") === match.away_team_id) {
    return teamIdsBySlug.get("tatry") === match.home_team_id ? "home" : "away";
  }

  if (teamIdsBySlug.get("ostatni") === match.home_team_id || teamIdsBySlug.get("ostatni") === match.away_team_id) {
    return teamIdsBySlug.get("ostatni") === match.home_team_id ? "home" : "away";
  }

  return null;
}

async function syncLineupAfterResponse(matchId: string, profileId: string, status: Extract<MatchResponseStatus, "available" | "unavailable">) {
  if (!getSupabaseConfig().serviceRoleKey) {
    return;
  }

  const adminSupabase = createAdminClient();

  if (status === "unavailable") {
    const { error } = await adminSupabase.from("match_lineups").delete().eq("match_id", matchId).eq("profile_id", profileId);

    if (error && !isMissingMatchLineupsTableError(error)) {
      throw new Error(error.message);
    }

    return;
  }

  const preferredSide = await getProfilePreferredTeamSide(matchId, profileId);

  if (!preferredSide) {
    return;
  }

  const { error } = await adminSupabase.from("match_lineups").upsert(
    {
      match_id: matchId,
      profile_id: profileId,
      team_side: preferredSide
    },
    { onConflict: "match_id,profile_id" }
  );

  if (error && !isMissingMatchLineupsTableError(error)) {
    throw new Error(error.message);
  }
}

async function upsertMatchResponse(matchId: string, profileId: string, status: Extract<MatchResponseStatus, "available" | "unavailable">, useAdmin = false) {
  const client = useAdmin && getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();
  const { error } = await client.from("match_responses").upsert(
    {
      match_id: matchId,
      profile_id: profileId,
      responded_at: new Date().toISOString(),
      status
    },
    { onConflict: "match_id,profile_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await syncLineupAfterResponse(matchId, profileId, status);
}

function revalidateMatchViews(matchId: string) {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
}

export async function saveMatchResponse(formData: FormData) {
  const matchId = getString(formData, "matchId");
  const status = getString(formData, "status");

  if (!matchId || !isMatchResponseStatus(status)) {
    redirect("/matches?error=Neplatná odpoveď na zápas.");
  }

  const { user } = await getCurrentUserOrRedirect(matchId);

  try {
    await upsertMatchResponse(matchId, user.id, status);
  } catch (error) {
    redirect(`/matches/${matchId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Nepodarilo sa uložiť odpoveď.")}`);
  }

  revalidateMatchViews(matchId);

  redirect(
    `/matches/${matchId}?message=${encodeURIComponent(
      status === "available" ? "Odpoveď uložená: Idem." : "Odpoveď uložená: Nejdem."
    )}`
  );
}

export async function submitMatchResponse(matchId: string, status: Extract<MatchResponseStatus, "available" | "unavailable">): Promise<ActionResult> {
  try {
    const { user } = await getCurrentUserOrRedirect(matchId);
    await upsertMatchResponse(matchId, user.id, status);
    revalidateMatchViews(matchId);

    return {
      message: status === "available" ? "Odpoveď uložená: Idem." : "Odpoveď uložená: Nejdem.",
      ok: true
    };
  } catch (error) {
    return getErrorResult(error, "Nepodarilo sa uložiť odpoveď.");
  }
}

export async function saveHomeMatchSignup(formData: FormData) {
  const result = await submitHomeMatchSignup({
    matchId: getString(formData, "matchId"),
    profileId: getString(formData, "profileId") || null,
    status: getString(formData, "status") as Extract<MatchResponseStatus, "available" | "unavailable">,
    returnPath: "/"
  });

  redirect(`/${result.ok ? `?message=${encodeURIComponent(result.message ?? "")}` : `?error=${encodeURIComponent(result.error ?? "")}`}`);
}

export async function submitHomeMatchSignup({
  matchId,
  profileId,
  returnPath,
  status
}: {
  matchId: string;
  profileId?: string | null;
  returnPath?: string;
  status: Extract<MatchResponseStatus, "available" | "unavailable">;
}): Promise<ActionResult> {
  if (!matchId || !isMatchResponseStatus(status)) {
    return { error: "Chyba pri prihlásení na zápas.", ok: false };
  }

  try {
    const { user } = await getCurrentUserOrRedirect(matchId);
    const targetProfileId = profileId?.trim() || user.id;

    if (targetProfileId === user.id) {
      await upsertMatchResponse(matchId, targetProfileId, status);
    } else {
      if (!getSupabaseConfig().serviceRoleKey) {
        return { error: "Pre prihlásenie iného hráča chýba service role key.", ok: false };
      }

      const adminSupabase = createAdminClient();
      const { data: profile, error: profileError } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", targetProfileId)
        .maybeSingle();

      if (profileError || !profile) {
        return { error: "Vyber platného hráča.", ok: false };
      }

      await upsertMatchResponse(matchId, targetProfileId, status, true);
    }

    revalidateMatchViews(matchId);
    if (returnPath) {
      revalidatePath(returnPath);
    }

    return {
      message:
        targetProfileId === user.id
          ? status === "available"
            ? "Prihlásenie na zápas bolo uložené."
            : "Odhlásenie zo zápasu bolo uložené."
          : status === "available"
            ? "Hráč bol prihlásený na zápas."
            : "Hráč bol odhlásený zo zápasu.",
      ok: true
    };
  } catch (error) {
    return getErrorResult(error, "Nepodarilo sa uložiť prihlásenie na zápas.");
  }
}

export async function saveMatchLineupAssignment({
  matchId,
  profileId,
  teamSide
}: {
  matchId: string;
  profileId: string;
  teamSide: TeamSide | "available";
}): Promise<ActionResult> {
  if (!matchId || !profileId || (!isTeamSide(teamSide) && teamSide !== "available")) {
    return { error: "Neplatné priradenie hráča.", ok: false };
  }

  try {
    await getCurrentUserOrRedirect(matchId);

    if (!getSupabaseConfig().serviceRoleKey) {
      return { error: "Chýba service role key pre uloženie zostavy.", ok: false };
    }

    const adminSupabase = createAdminClient();

    if (teamSide === "available") {
      const { error } = await adminSupabase.from("match_lineups").delete().eq("match_id", matchId).eq("profile_id", profileId);

      if (error && !isMissingMatchLineupsTableError(error)) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await adminSupabase.from("match_lineups").upsert(
        {
          match_id: matchId,
          profile_id: profileId,
          team_side: teamSide
        },
        { onConflict: "match_id,profile_id" }
      );

      if (error && !isMissingMatchLineupsTableError(error)) {
        throw new Error(error.message);
      }
    }

    revalidateMatchViews(matchId);
    return {
      message: getSupabaseConfig().serviceRoleKey
        ? "Rozdelenie hráča bolo uložené."
        : "Rozdelenie hráča je pripravené, ale bez migrácie sa ešte trvalo neukladá.",
      ok: true
    };
  } catch (error) {
    return getErrorResult(error, "Nepodarilo sa uložiť rozdelenie hráča.");
  }
}

export async function saveMatchResult({
  awaySets,
  homeSets,
  matchId
}: {
  awaySets: number;
  homeSets: number;
  matchId: string;
}): Promise<ActionResult> {
  if (!matchId || !Number.isInteger(homeSets) || !Number.isInteger(awaySets)) {
    return { error: "Vyplň platný výsledok zápasu.", ok: false };
  }

  if (homeSets < 0 || awaySets < 0 || homeSets > 5 || awaySets > 5) {
    return { error: "Maximálny počet setov pre jedno družstvo je 5.", ok: false };
  }

  if (homeSets + awaySets > 5) {
    return { error: "Súčet setov oboch družstiev môže byť maximálne 5.", ok: false };
  }

  try {
    await requireAdminUser(`/matches/${matchId}`);

    const client = getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();
    const { error } = await client
      .from("matches")
      .update({
        away_sets: awaySets,
        home_sets: homeSets,
        status: "completed"
      })
      .eq("id", matchId);

    if (error) {
      throw new Error(error.message);
    }

    revalidateMatchViews(matchId);
    return { message: "Výsledok zápasu bol uložený.", ok: true };
  } catch (error) {
    return getErrorResult(error, "Nepodarilo sa uložiť výsledok zápasu.");
  }
}

export async function deleteMatchById(matchId: string): Promise<ActionResult> {
  if (!matchId) {
    return { error: "Chýba identifikátor zápasu.", ok: false };
  }

  try {
    await requireAdminUser("/matches");
    const client = getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();

    const lineupDelete = await client.from("match_lineups").delete().eq("match_id", matchId);

    if (lineupDelete.error && !isMissingMatchLineupsTableError(lineupDelete.error)) {
      throw new Error(lineupDelete.error.message);
    }

    await client.from("match_responses").delete().eq("match_id", matchId);

    const { error } = await client.from("matches").delete().eq("id", matchId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    revalidatePath("/matches");
    return { message: "Zápas bol zmazaný.", ok: true };
  } catch (error) {
    return getErrorResult(error, "Nepodarilo sa zmazať zápas.");
  }
}

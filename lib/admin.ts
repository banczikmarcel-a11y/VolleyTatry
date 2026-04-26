import { redirect } from "next/navigation";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { createClient, getCurrentUser } from "@/supabase/server";
import type { Team } from "@/types/entities";

export type AdminState = {
  error: string | null;
  isAdmin: boolean;
  userId: string | null;
};

export async function getAdminState(): Promise<AdminState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: null, isAdmin: false, userId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "coach"])
    .limit(1);

  if (error) {
    return { error: error.message, isAdmin: false, userId: user.id };
  }

  return { error: null, isAdmin: (data ?? []).length > 0, userId: user.id };
}

export async function requireAdminUser(next = "/admin/matches/new") {
  const state = await getAdminState();

  if (!state.userId) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!state.isAdmin) {
    redirect("/dashboard?error=Admin access required.");
  }

  return state.userId;
}

export async function getAdminTeams(): Promise<{
  error: string | null;
  teams: Pick<Team, "id" | "name" | "slug">[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("id,name,slug").order("name");

  if (error) {
    return { error: error.message, teams: [] };
  }

  return { error: null, teams: data ?? [] };
}

export async function getAdminEmailRecipients(): Promise<{
  emails: string[];
  error: string | null;
}> {
  const supabase = getSupabaseConfig().serviceRoleKey ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("team_memberships")
    .select("role,status,profiles:profile_id(email)")
    .eq("status", "active")
    .in("role", ["owner", "coach"]);

  if (error) {
    return { emails: [], error: error.message };
  }

  type AdminEmailRow = {
    profiles: { email: string | null } | { email: string | null }[] | null;
  };

  const emails = Array.from(
    new Set(
      ((data ?? []) as AdminEmailRow[])
        .flatMap((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
          return profile?.email ? [profile.email] : [];
        })
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "sk", { sensitivity: "base" }));

  return {
    emails,
    error: null
  };
}

import { redirect } from "next/navigation";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { requireAdmin, resolveApplicationSession } from "@/src/server/auth";
import type { Team } from "@/types/entities";

export type AdminState = {
  error: string | null;
  isAdmin: boolean;
  userId: string | null;
};

export async function getAdminState(): Promise<AdminState> {
  const session = await resolveApplicationSession();

  if (!session.isAuthenticated || session.status !== "active" || !session.session) {
    return { error: null, isAdmin: false, userId: null };
  }

  return {
    error: null,
    isAdmin: session.session.role === "admin",
    userId: session.session.profileId
  };
}

export async function requireAdminUser(next = "/admin/matches/new") {
  const session = await requireAdmin(next);

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return session.profileId;
}

export async function getAdminTeams(): Promise<{
  error: string | null;
  teams: Pick<Team, "id" | "name" | "slug">[];
}> {
  if (!getSupabaseConfig().serviceRoleKey) {
    return { error: "Chýba SUPABASE_SERVICE_ROLE_KEY.", teams: [] };
  }

  const supabase = createAdminClient();
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
  if (!getSupabaseConfig().serviceRoleKey) {
    return { emails: [], error: null };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("is_active", true)
    .eq("role", "admin")
    .not("email", "is", null);

  if (error) {
    return { emails: [], error: error.message };
  }

  const emails = Array.from(new Set((data ?? []).flatMap((row) => (row.email ? [row.email] : [])))).sort((left, right) =>
    left.localeCompare(right, "sk", { sensitivity: "base" })
  );

  return {
    emails,
    error: null
  };
}

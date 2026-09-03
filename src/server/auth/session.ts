import { redirect } from "next/navigation";
import { withTimeout } from "@/lib/async";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { createClient, getCurrentUser } from "@/supabase/server";
import { getSafeNext } from "@/src/server/auth/redirects";
import { resolveApplicationSessionCore } from "@/src/server/auth/session-core";
import type {
  ApplicationProfileRecord,
  ApplicationRole,
  ApplicationSession,
  AuthIdentity,
  ResolveApplicationSessionResult
} from "@/src/server/auth/types";

const PROFILE_QUERY_TIMEOUT_MS = 2500;

function mapAuthIdentity(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): AuthIdentity {
  return {
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    id: user.id,
    userMetadata: user.user_metadata ?? {}
  };
}

function mapProfile(row: {
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  email_normalized: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string;
}): ApplicationProfileRecord {
  return {
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    email: row.email,
    emailNormalized: row.email_normalized,
    firstName: row.first_name,
    fullName: row.full_name,
    id: row.id,
    isActive: row.is_active,
    lastName: row.last_name,
    role: row.role === "admin" ? "admin" : "user"
  };
}

async function createProfileLookupClient() {
  if (getSupabaseConfig().serviceRoleKey) {
    return createAdminClient();
  }

  return createClient();
}

export async function resolveApplicationSession(): Promise<ResolveApplicationSessionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      isAuthenticated: false,
      session: null,
      status: "anonymous"
    };
  }

  const identity = mapAuthIdentity(user);
  const client = await createProfileLookupClient();

  return resolveApplicationSessionCore({
    async findProfileByAuthUserId(authUserId) {
      const result = await withTimeout(
        Promise.resolve(
          client
            .from("profiles")
            .select("id,auth_user_id,email,email_normalized,display_name,full_name,first_name,last_name,role,is_active")
            .eq("auth_user_id", authUserId)
            .maybeSingle()
        ),
        PROFILE_QUERY_TIMEOUT_MS,
        "Timed out while loading the application profile."
      ).catch(() => null);

      if (result?.error || !result?.data) {
        return null;
      }

      return mapProfile(result.data);
    },
    async findProfileByNormalizedEmail(normalizedEmail) {
      const result = await withTimeout(
        Promise.resolve(
          client
            .from("profiles")
            .select("id,auth_user_id,email,email_normalized,display_name,full_name,first_name,last_name,role,is_active")
            .eq("email_normalized", normalizedEmail)
            .maybeSingle()
        ),
        PROFILE_QUERY_TIMEOUT_MS,
        "Timed out while loading the application profile."
      ).catch(() => null);

      if (result?.error || !result?.data) {
        return null;
      }

      return mapProfile(result.data);
    },
    identity,
    async linkProfileAuthUserId(profileId, authUserId) {
      const result = await withTimeout(
        Promise.resolve(
          client
            .from("profiles")
            .update({ auth_user_id: authUserId })
            .eq("id", profileId)
            .is("auth_user_id", null)
            .select("id,auth_user_id,email,email_normalized,display_name,full_name,first_name,last_name,role,is_active")
            .maybeSingle()
        ),
        PROFILE_QUERY_TIMEOUT_MS,
        "Timed out while linking the application profile."
      ).catch(() => null);

      if (result?.error || !result?.data) {
        return null;
      }

      return mapProfile(result.data);
    }
  });
}

export async function requireAuthenticatedUser(next = "/dashboard") {
  const session = await resolveApplicationSession();

  if (!session.isAuthenticated) {
    redirect(`/login?next=${encodeURIComponent(getSafeNext(next))}`);
  }

  return session.authUser;
}

export async function requireApplicationUser(next = "/dashboard"): Promise<ApplicationSession> {
  const session = await resolveApplicationSession();

  if (!session.isAuthenticated) {
    redirect(`/login?next=${encodeURIComponent(getSafeNext(next))}`);
  }

  if (session.status === "unverified") {
    redirect(`/auth/verify-email?next=${encodeURIComponent(getSafeNext(next))}`);
  }

  if (session.status === "no_profile") {
    redirect("/auth/access-denied");
  }

  if (session.status === "disabled") {
    redirect("/auth/account-disabled");
  }

  if (!session.session) {
    redirect("/auth/access-denied");
  }

  return session.session;
}

export async function requireRole(roles: readonly ApplicationRole[], next = "/dashboard"): Promise<ApplicationSession> {
  const session = await requireApplicationUser(next);

  if (!roles.includes(session.role)) {
    redirect("/auth/access-denied");
  }

  return session;
}

export async function requireAdmin(next = "/admin"): Promise<ApplicationSession> {
  return requireRole(["admin"], next);
}

export async function getApplicationNavigationState() {
  const session = await resolveApplicationSession();

  if (!session.isAuthenticated) {
    return {
      role: null,
      session: null,
      status: "anonymous" as const
    };
  }

  return {
    role: session.session?.role ?? null,
    session: session.session,
    status: session.status
  };
}

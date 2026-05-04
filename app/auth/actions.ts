"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { splitFullName } from "@/lib/player-name";
import { createAdminClient } from "@/supabase/admin";
import { getSiteUrl, getSupabaseConfig } from "@/supabase/env";
import { createClient } from "@/supabase/server";

type AuthPath = "/login" | "/register";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWith(pathname: AuthPath, type: "error" | "message", message: string) {
  const params = new URLSearchParams({ [type]: message });
  redirect(`${pathname}?${params.toString()}`);
}

function getRedirectPath(formData: FormData) {
  const next = getString(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

async function getOrigin() {
  const headerStore = await headers();
  const configuredSiteUrl = getSiteUrl();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, "");
  }

  const origin = headerStore.get("origin");

  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`.replace(/\/+$/, "");
  }

  const host = headerStore.get("host");

  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function getAuthError(error: unknown) {
  if (error instanceof Error && error.message.includes("NEXT_PUBLIC_SUPABASE")) {
    return "Supabase environment variables are missing. Add them to .env.local first.";
  }

  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

async function mergeExistingPlayerProfile({
  email,
  firstName,
  fullName,
  lastName,
  newProfileId
}: {
  email: string;
  firstName: string;
  fullName: string;
  lastName: string;
  newProfileId: string;
}) {
  if (!getSupabaseConfig().serviceRoleKey) {
    return;
  }

  if (!firstName.trim() || !lastName.trim()) {
    return;
  }

  const adminSupabase = createAdminClient();
  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("profiles")
    .select("id,email")
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .is("email", null)
    .neq("id", newProfileId)
    .limit(1)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (!existingProfile) {
    return;
  }

  const oldProfileId = existingProfile.id;

  const [{ error: membershipsError }, { error: responsesError }, { error: lineupsError }, { error: matchesError }] = await Promise.all([
    adminSupabase.from("team_memberships").update({ profile_id: newProfileId }).eq("profile_id", oldProfileId),
    adminSupabase.from("match_responses").update({ profile_id: newProfileId }).eq("profile_id", oldProfileId),
    adminSupabase.from("match_lineups").update({ profile_id: newProfileId }).eq("profile_id", oldProfileId),
    adminSupabase.from("matches").update({ created_by: newProfileId }).eq("created_by", oldProfileId)
  ]);

  if (membershipsError) {
    throw membershipsError;
  }

  if (responsesError) {
    throw responsesError;
  }

  if (lineupsError && !lineupsError.message.includes("public.match_lineups")) {
    throw lineupsError;
  }

  if (matchesError) {
    throw matchesError;
  }

  const { error: newProfileUpdateError } = await adminSupabase
    .from("profiles")
    .update({
      email,
      first_name: firstName,
      full_name: fullName,
      last_name: lastName
    })
    .eq("id", newProfileId);

  if (newProfileUpdateError) {
    throw newProfileUpdateError;
  }

  const { error: deleteOldProfileError } = await adminSupabase.from("profiles").delete().eq("id", oldProfileId);

  if (deleteOldProfileError) {
    throw deleteOldProfileError;
  }
}

export async function signInWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getRedirectPath(formData);

  if (!validateEmail(email)) {
    redirectWith("/login", "error", "Enter a valid email address.");
  }

  if (!password) {
    redirectWith("/login", "error", "Enter your password.");
  }

  let authError: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      authError = error.message;
    }
  } catch (error) {
    redirectWith("/login", "error", getAuthError(error));
  }

  if (authError) {
    redirectWith("/login", "error", authError);
  }

  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const fullName = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const { firstName, lastName } = splitFullName(fullName);

  if (!fullName) {
    redirectWith("/register", "error", "Enter your name.");
  }

  if (!validateEmail(email)) {
    redirectWith("/register", "error", "Enter a valid email address.");
  }

  if (!validatePassword(password)) {
    redirectWith("/register", "error", "Password must be at least 8 characters.");
  }

  let authError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || null,
          full_name: fullName,
          last_name: lastName || null
        },
        emailRedirectTo: `${await getOrigin()}/auth/callback`
      }
    });

    if (error) {
      authError = error.message;
    }

    if (!error && data.user) {
      await mergeExistingPlayerProfile({
        email,
        firstName: firstName || "",
        fullName,
        lastName: lastName || "",
        newProfileId: data.user.id
      });
    }
  } catch (error) {
    redirectWith("/register", "error", getAuthError(error));
  }

  if (authError) {
    redirectWith("/register", "error", authError);
  }

  redirectWith("/login", "message", "Check your email to confirm your account.");
}

export async function sendMagicLink(formData: FormData) {
  const email = getString(formData, "email");
  const next = getRedirectPath(formData);

  if (!validateEmail(email)) {
    redirectWith("/login", "error", "Enter a valid email address for magic link login.");
  }

  let authError: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });

    if (error) {
      authError = error.message;
    }
  } catch (error) {
    redirectWith("/login", "error", getAuthError(error));
  }

  if (authError) {
    redirectWith("/login", "error", authError);
  }

  redirectWith("/login", "message", "Magic link sent. Check your email.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}

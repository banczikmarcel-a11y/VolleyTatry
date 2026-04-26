"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { splitFullName } from "@/lib/player-name";
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
  return headerStore.get("origin") ?? "http://localhost:3000";
}

function getAuthError(error: unknown) {
  if (error instanceof Error && error.message.includes("NEXT_PUBLIC_SUPABASE")) {
    return "Supabase environment variables are missing. Add them to .env.local first.";
  }

  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
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
    const { error } = await supabase.auth.signUp({
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

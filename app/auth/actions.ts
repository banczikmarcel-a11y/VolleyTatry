"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/supabase/server";
import { getSiteUrl } from "@/supabase/env";
import { resolveApplicationSession } from "@/src/server/auth";
import { getPostAuthRedirectPath, getVerificationRedirect } from "@/src/server/auth/redirects";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function redirectWith(pathname: string, type: "error" | "message", message: string) {
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

function mapSignInError(message: string) {
  const value = message.toLowerCase();

  if (value.includes("invalid login credentials")) {
    return "Nesprávny e-mail alebo heslo.";
  }

  if (value.includes("email not confirmed")) {
    return "E-mail ešte nebol overený.";
  }

  if (value.includes("user not found")) {
    return "Účet s týmto e-mailom neexistuje.";
  }

  if (value.includes("too many requests")) {
    return "Prihlásenie je dočasne obmedzené. Skús to znova o chvíľu.";
  }

  return message;
}

function mapSignUpError(message: string) {
  const value = message.toLowerCase();

  if (value.includes("user already registered")) {
    return "Používateľ s týmto e-mailom už existuje.";
  }

  if (value.includes("password")) {
    return "Heslo nespĺňa požiadavky.";
  }

  return message;
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

function requireEmailValue(email: string | null): string {
  if (!email) {
    throw new Error("Nepodarilo sa určiť e-mail používateľa.");
  }

  return email;
}

export async function signInWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getRedirectPath(formData);

  if (!validateEmail(email)) {
    redirectWith("/login", "error", "Zadaj platný e-mail.");
  }

  if (!password) {
    redirectWith("/login", "error", "Zadaj heslo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      redirect(getVerificationRedirect(next, email));
    }

    redirectWith("/login", "error", mapSignInError(error.message));
  }

  const session = await resolveApplicationSession();
  redirect(getPostAuthRedirectPath(session, next));
}

export async function signInWithGoogle(formData: FormData) {
  const next = getRedirectPath(formData);
  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    },
    provider: "google"
  });

  if (error || !data.url) {
    redirectWith("/login", "error", error?.message ?? "Google prihlásenie sa nepodarilo spustiť.");
  }

  redirect(requireEmailValue(data.url));
}

export async function signUpWithPassword(formData: FormData) {
  const displayName = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const passwordConfirmation = getString(formData, "password_confirmation");

  if (!displayName) {
    redirectWith("/register", "error", "Zadaj meno.");
  }

  if (!validateEmail(email)) {
    redirectWith("/register", "error", "Zadaj platný e-mail.");
  }

  if (!validatePassword(password)) {
    redirectWith("/register", "error", "Heslo musí mať aspoň 8 znakov.");
  }

  if (password !== passwordConfirmation) {
    redirectWith("/register", "error", "Heslá sa nezhodujú.");
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        full_name: displayName
      },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) {
    redirectWith("/register", "error", mapSignUpError(error.message));
  }

  redirect(`${getVerificationRedirect("/dashboard", email)}&message=${encodeURIComponent("Overovací e-mail bol odoslaný.")}`);
}

export async function resendVerificationEmail(formData: FormData) {
  const emailFromForm = getOptionalString(formData, "email");
  const next = getRedirectPath(formData);
  const resolvedSession = await resolveApplicationSession();
  const authUser = resolvedSession.isAuthenticated ? resolvedSession.authUser : null;
  const email = emailFromForm ?? authUser?.email ?? null;

  if (!email || !validateEmail(email)) {
    redirectWith("/auth/verify-email", "error", "Nepodarilo sa určiť e-mail na opätovné odoslanie.");
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    email: requireEmailValue(email),
    options: {
      emailRedirectTo: `${origin}/auth/callback`
    },
    type: "signup"
  });

  if (error) {
    redirectWith("/auth/verify-email", "error", error.message);
  }

  redirect(`${getVerificationRedirect(next, email)}&message=${encodeURIComponent("Overovací e-mail bol odoslaný znova.")}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

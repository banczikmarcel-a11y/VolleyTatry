"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { requireApplicationUser } from "@/src/server/auth";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function updateProfileEmail(formData: FormData) {
  const email = getString(formData, "email");

  if (!isValidEmail(email)) {
    redirect(`/profile?error=${encodeURIComponent("Zadaj platný e-mail.")}`);
  }

  const session = await requireApplicationUser("/profile");
  const adminSupabase = createAdminClient();

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(session.authUserId, {
    email
  });

  if (authError) {
    redirect(`/profile?error=${encodeURIComponent(authError.message)}`);
  }

  if (getSupabaseConfig().serviceRoleKey) {
    await adminSupabase.from("profiles").update({ email }).eq("id", session.profileId);
  }

  redirect(`/profile?message=${encodeURIComponent("E-mail bol aktualizovaný. Ak Supabase vyžaduje potvrdenie, skontroluj si novú overovaciu správu.")}`);
}

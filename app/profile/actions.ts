"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/supabase/admin";
import { getSupabaseConfig } from "@/supabase/env";
import { createClient } from "@/supabase/server";

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

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile")}`);
  }

  const { error: authError } = await supabase.auth.updateUser({ email });

  if (authError) {
    redirect(`/profile?error=${encodeURIComponent(authError.message)}`);
  }

  if (getSupabaseConfig().serviceRoleKey) {
    const adminSupabase = createAdminClient();
    await adminSupabase.from("profiles").update({ email }).eq("id", user.id);
  } else {
    await supabase.from("profiles").update({ email }).eq("id", user.id);
  }

  redirect(`/profile?message=${encodeURIComponent("E-mail bol aktualizovaný.")}`);
}

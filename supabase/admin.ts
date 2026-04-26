import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdminConfig } from "@/supabase/env";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const { serviceRoleKey, url } = requireSupabaseAdminConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, requireSupabaseConfig } from "@/supabase/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const { anonKey, url } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware and Server Actions can.
        }
      }
    }
  });
}

export async function getCurrentUser() {
  if (!getSupabaseConfig().isConfigured) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

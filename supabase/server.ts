import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { withTimeout } from "@/lib/async";
import { getSupabaseConfig, requireSupabaseConfig } from "@/supabase/env";
import type { Database } from "@/types/database";

const AUTH_TIMEOUT_MS = 2500;

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

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      "Timed out while loading the authenticated user."
    );

    return user;
  } catch {
    return null;
  }
}

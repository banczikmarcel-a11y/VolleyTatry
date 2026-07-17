import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withTimeout } from "@/lib/async";
import { getSupabaseConfig } from "@/supabase/env";
import type { Database } from "@/types/database";

const AUTH_TIMEOUT_MS = 2500;

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });

  if (!config.isConfigured || !config.url || !config.anonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  let user = null;

  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      "Timed out while refreshing the authenticated user."
    );
    user = result.data.user;
  } catch {
    user = null;
  }

  return { response, user };
}

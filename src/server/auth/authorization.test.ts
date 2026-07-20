import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("auth migration: profiles keep unique normalized email and unique auth link", async () => {
  const sql = await readFile("supabase/migrations/0014_auth_profile_roles.sql", "utf8");

  assert.match(sql, /create unique index if not exists profiles_auth_user_id_unique/i);
  assert.match(sql, /create unique index if not exists profiles_email_normalized_unique/i);
  assert.match(sql, /add column if not exists auth_user_id uuid references auth\.users\(id\)/i);
  assert.match(sql, /add column if not exists is_active boolean not null default true/i);
  assert.match(sql, /add constraint profiles_role_check check \(role in \('admin', 'user'\)\)/i);
});

test("auth migration: RLS prevents self-managed role escalation through normal user policies", async () => {
  const sql = await readFile("supabase/migrations/0014_auth_profile_roles.sql", "utf8");

  assert.match(sql, /create policy "profiles_update_admin"[\s\S]*public\.is_application_admin\(\)/i);
  assert.doesNotMatch(sql, /create policy "profiles_update_own"/i);
  assert.match(sql, /create policy "team_memberships_update_admin"[\s\S]*public\.is_application_admin\(\)/i);
  assert.match(sql, /create policy "match_responses_insert_own"[\s\S]*public\.current_profile_id\(\)/i);
});

test("auth environment: browser and server clients keep service role off the browser path", async () => {
  const browserServerClientSource = await readFile("supabase/server.ts", "utf8");
  const adminClientSource = await readFile("supabase/admin.ts", "utf8");
  const envSource = await readFile("supabase/env.ts", "utf8");

  assert.match(browserServerClientSource, /const \{ anonKey, url \} = requireSupabaseConfig\(\)/);
  assert.doesNotMatch(browserServerClientSource, /serviceRoleKey/);
  assert.match(adminClientSource, /const \{ serviceRoleKey, url \} = requireSupabaseAdminConfig\(\)/);
  assert.match(envSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
});

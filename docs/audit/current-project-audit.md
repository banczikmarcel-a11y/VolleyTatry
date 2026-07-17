# Current Project Audit

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## 1. Current route structure

Application uses the Next.js App Router under [`app`](/d:/Development/VibeCoding/VolejbalTatry/app).

Current pages and route handlers:

- `/` homepage with hero, upcoming matches, and recent results
- `/dashboard` yearly team win dashboard
- `/matches` matches list
- `/matches/[id]` match detail, attendance, team assignment, result entry, delete
- `/stats` team stats, player stats, attendance views
- `/profile` signed-in player profile and email update
- `/login` sign-in page
- `/register` sign-up page
- `/admin/matches/new` admin match creation
- `/admin/matches/[id]/edit` admin match editing
- `/admin/players` admin player management
- `/auth/callback` Supabase auth callback
- `/auth/confirm` OTP / invite / confirmation route

Global shell:

- [`app/layout.tsx`](/d:/Development/VibeCoding/VolejbalTatry/app/layout.tsx) wraps all pages in [`AppShell`](/d:/Development/VibeCoding/VolejbalTatry/components/app-shell.tsx)
- top-level [`middleware.ts`](/d:/Development/VibeCoding/VolejbalTatry/middleware.ts) protects authenticated routes

Notable absence:

- no tournament routes, layouts, entities, or navigation entries yet

## 2. Current database entities and migrations

Supabase migrations exist under [`supabase/migrations`](/d:/Development/VibeCoding/VolejbalTatry/supabase/migrations).

Current tables:

- `profiles`
- `teams`
- `team_memberships`
- `matches`
- `match_responses`
- `match_lineups`

Migration summary:

- `0001_initial_schema.sql`
  - creates base tables, indexes, `set_updated_at()` trigger, and `handle_new_user()` auth trigger
- `0002_seed_teams.sql`
  - seeds `Tatry` and `Ostatní` teams
- `0003_match_admin_fields.sql`
  - expands `matches` with `match_date`, `season_year`, `home_team_id`, `away_team_id`, `home_sets`, `away_sets`
- `0004_rls_policies.sql`
  - enables RLS and basic authenticated policies
- `0005_player_admin_policies.sql`
  - adds helper SQL functions and admin policies for player/team membership management
- `0006_match_admin_policy_alignment.sql`
  - relaxes match admin policies from team-specific ownership to global team-admin access
- `0007_profiles_first_last_name.sql`
  - adds `first_name` and `last_name`, updates trigger logic for new users
- `0008_match_lineups.sql`
  - adds `match_lineups`, but its write policy is intentionally closed off in RLS

Observations:

- `matches` keeps both legacy-style fields (`team_id`, `opponent_team_id`, `starts_at`) and newer admin-oriented fields (`match_date`, `home_team_id`, `away_team_id`)
- `types/database.ts` does not model SQL functions such as `is_team_admin()` or `can_manage_team()`
- tournament-related entities do not exist yet

## 3. Supabase client and server configuration

Config files:

- [`supabase/env.ts`](/d:/Development/VibeCoding/VolejbalTatry/supabase/env.ts)
- [`supabase/server.ts`](/d:/Development/VibeCoding/VolejbalTatry/supabase/server.ts)
- [`supabase/admin.ts`](/d:/Development/VibeCoding/VolejbalTatry/supabase/admin.ts)
- [`supabase/middleware.ts`](/d:/Development/VibeCoding/VolejbalTatry/supabase/middleware.ts)

Current setup:

- anonymous server client created with `@supabase/ssr` and cookies
- service-role admin client created with `@supabase/supabase-js`
- middleware refreshes auth session and mirrors cookie updates back to the response
- environment flags:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL` / `SITE_URL`
  - optional SMTP settings also exist but are not central to the app flow

Important implementation detail:

- many read/write paths switch behavior depending on whether `SUPABASE_SERVICE_ROLE_KEY` is available
- some features degrade gracefully without service role, but others effectively depend on it for full functionality

## 4. Authentication implementation

Authentication is implemented with Supabase Auth.

Core files:

- [`app/auth/actions.ts`](/d:/Development/VibeCoding/VolejbalTatry/app/auth/actions.ts)
- [`app/auth/callback/route.ts`](/d:/Development/VibeCoding/VolejbalTatry/app/auth/callback/route.ts)
- [`app/auth/confirm/route.ts`](/d:/Development/VibeCoding/VolejbalTatry/app/auth/confirm/route.ts)
- [`components/auth-form.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/auth-form.tsx)

Supported flows:

- email + password sign-in
- email + password sign-up
- magic link sign-in
- invite / email confirmation / OTP verification
- sign-out server action

Profile linkage:

- `auth.users` inserts are mirrored into `public.profiles` via database trigger
- registration also tries to merge an existing placeholder player profile into the newly created auth user
- admin player creation now uses `inviteUserByEmail` and then assigns membership data

## 5. Existing admin authorization

Application-level admin checks:

- [`lib/admin.ts`](/d:/Development/VibeCoding/VolejbalTatry/lib/admin.ts)
- `requireAdminUser()` redirects unauthenticated users to `/login` and non-admin users to `/dashboard`
- app-level admin means an active `team_memberships` row with role `owner` or `coach`

Database-level admin checks:

- SQL helpers `is_team_admin()` and `can_manage_team()` introduced in migration `0005`
- player management RLS uses those helpers
- match RLS in `0006` now allows any active team admin to manage matches, not only admins of `home_team_id`

Important nuance:

- UI authorization and RLS are not perfectly aligned with team-specific ownership anymore
- some admin writes use the normal server client and rely on RLS
- some admin writes bypass RLS through the service-role client

## 6. Existing match functionality

Current match module already includes a substantial feature set.

Read layer:

- [`lib/matches.ts`](/d:/Development/VibeCoding/VolejbalTatry/lib/matches.ts)
- list of all matches
- upcoming program matches
- recent completed matches
- detailed match view
- available player counts
- current user response state
- signup candidate players
- lineup assignments for available players

User actions:

- respond `available` / `unavailable`
- quick signup from homepage
- signup another player from admin-style panel when service role is present

Admin actions:

- quick create scheduled match
- create full match
- edit match
- save completed result
- assign players to home/away lineup buckets
- delete match

UI surface:

- homepage cards for upcoming/recent matches
- `/matches` filtered list view
- `/matches/[id]` detail with attendance summary, unavailable list, lineup board, result form, edit, delete

Current limitations:

- attendance statuses only really use `available` and `unavailable` in product flows, while DB also supports `maybe`
- lineup persistence currently writes via service-role client because RLS for `match_lineups` denies authenticated writes
- match data model is optimized for standalone matches, not grouped multi-match tournament schedules

## 7. Reusable UI components

Common reusable building blocks:

- [`components/ui/button.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/ui/button.tsx)
- [`components/ui/card.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/ui/card.tsx)
- [`components/ui/badge.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/ui/badge.tsx)
- [`components/ui/query-toast.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/ui/query-toast.tsx)
- [`components/ui/live-toast.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/ui/live-toast.tsx)
- [`components/page-header.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/page-header.tsx)
- [`components/app-shell.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/app-shell.tsx)
- [`components/mobile-nav.tsx`](/d:/Development/VibeCoding/VolejbalTatry/components/mobile-nav.tsx)

Feature-level reusable components:

- match cards and list view
- signup panel and response panel
- result form
- team assignment board
- player combobox
- player history and stats tables
- admin match form and quick-match form
- admin player creation and role table

Styling approach:

- Tailwind CSS with custom design tokens like `court-*`
- consistent rounded card/button language across the app

## 8. Current testing setup

There is no automated test runner configured.

Evidence:

- [`package.json`](/d:/Development/VibeCoding/VolejbalTatry/package.json) only contains `dev`, `build`, `start`, `lint`, `type-check`
- no Jest, Vitest, Playwright, Cypress, or Testing Library setup is present
- [`docs/testing.md`](/d:/Development/VibeCoding/VolejbalTatry/docs/testing.md) contains manual test scenarios and observed notes

Current quality gates are:

- `npm run lint`
- `npm run type-check`
- `npm run build`
- manual end-to-end verification against a live Supabase project

## 9. Technical debt and inconsistencies

- `docs/schema.md` says the app is not yet connected to Supabase, but the repository is already using Supabase heavily.
- UI copy is mixed Slovak/English across actions, errors, and success messages.
- `matches` schema contains overlapping legacy and current fields (`team_id` vs `home_team_id`, `opponent_team_id` vs `away_team_id`, `starts_at` vs `match_date`).
- `match_lineups` exists in the database, but authenticated RLS writes are disabled, so the app depends on service-role writes for persistence.
- App logic often branches on service-role availability, which makes behavior differ between environments.
- `types/database.ts` omits database functions and relationship metadata, so it is only a partial schema mirror.
- Admin match RLS was broadened in `0006`; the app conceptually still talks about home team ownership in docs.
- Testing documentation is already stale in places, for example create-player flow now uses invite-by-email instead of local password creation.
- Some product flows assume only two volleyball buckets, effectively hardcoding `Tatry` and `Ostatní`.
- There are signs of iterative evolution rather than a unified domain model, especially around matches and player bootstrap/merge behavior.

## 10. Risks for adding a tournament module

- The current domain model is match-centric. Tournaments will likely need parent-child relationships such as `tournaments -> tournament_teams -> tournament_matches` or equivalent.
- Existing stats functions assume direct standalone match queries. Tournament matches may need filtering, aggregation rules, or opt-in inclusion.
- Current navigation and information architecture has no module boundary for tournaments, so route structure could become confusing if tournament pages are bolted onto existing match pages.
- RLS strategy is already split between authenticated access and service-role escape hatches. Adding tournament write flows without simplifying auth could multiply edge cases.
- Team assumptions are often binary (`Tatry` vs `Ostatní`). A tournament module may need arbitrary teams, pools, brackets, standings, and more than two participants.
- Match creation currently generates titles from exactly two teams. That logic will not scale to tournament rounds, bracket labels, pools, or placement matches.
- Existing `matches` table may be tempting to overload with tournament metadata, but doing so could worsen current schema duplication.
- Manual testing only means tournament regressions in auth, stats, and admin features will be easy to miss.
- Admin model is global enough to permit many writes, but not yet clearly modeled for tournament-scoped ownership or organizer roles.
- Current docs are partially stale, so new tournament work risks being built on incorrect assumptions unless documentation is updated alongside code.

## Suggested baseline before Phase 1

- Treat tournaments as a first-class domain module instead of extending `matches` ad hoc.
- Decide early whether tournament matches are stored in the existing `matches` table or in a tournament-aware extension around it.
- Clarify admin ownership rules for tournaments before adding UI.
- Add at least a lightweight automated test layer for critical server actions and route-level flows.

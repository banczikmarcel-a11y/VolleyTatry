# Tournament RLS

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## Purpose

This document summarizes Row Level Security for the tournament module and defines the security checks that must pass before relying on tournament data in production.

## Security principles

- Anonymous and authenticated users may read public tournament data.
- Only authenticated administrators may insert, update, or delete tournament data.
- Result entry and result correction are admin-only.
- Frontend visibility must not be treated as authorization.
- Policies must use the project’s existing profile/role mechanism.
- Service-role credentials must never be exposed to the browser.

## Authorization source of truth

The project already uses membership-based admin authorization.

Admin means:

- authenticated user
- active `team_memberships` row
- role is `owner` or `coach`

Existing helper reused by tournament RLS:

- `public.is_team_admin()`

New helper added for tournament reads:

- `public.can_read_tournament(target_tournament_id uuid)`

Behavior of `public.can_read_tournament(...)`:

- returns `true` if the referenced tournament is public
- returns `true` for admins even if the tournament is not public
- returns `false` for anonymous users when the tournament is not public

## Tables covered by tournament RLS

The tournament module RLS applies to:

- `tournament_formats`
- `tournaments`
- `tournament_groups`
- `tournament_teams`
- `tournament_matches`
- `match_sources`
- `match_sets`
- `final_standings`

## Policy summary

## `tournament_formats`

Read:

- public read allowed

Write:

- admin only

Reason:

- format definitions are safe to expose publicly and needed for rendering tournament metadata if referenced

## `tournaments`

Read:

- public users may read tournaments with `is_public = true`
- admins may read all tournaments

Write:

- admin only

## `tournament_groups`

Read:

- public users may read groups when parent tournament is public
- admins may read all

Write:

- admin only

## `tournament_teams`

Read:

- public users may read tournament team assignments when parent tournament is public
- admins may read all

Write:

- admin only

## `tournament_matches`

Read:

- public users may read tournament matches when parent tournament is public
- admins may read all

Write:

- admin only

Security implication:

- result entry and correction remain admin-only because match rows are write-protected

## `match_sources`

Read:

- public users may read source definitions when parent tournament is public
- admins may read all

Write:

- admin only

Reason:

- public playoff pages may need to show placeholders such as `A1 vs B2` or `winner SF1 vs winner SF2`

## `match_sets`

Read:

- public users may read set details when parent tournament is public
- admins may read all

Write:

- admin only

Reason:

- public results pages must be able to render per-set scores

## `final_standings`

Read:

- public users may read final standings when parent tournament is public
- admins may read all

Write:

- admin only

## Important boundary

Frontend route protection is not authorization.

This means:

- hiding an admin button is not enough
- protecting `/admin/*` is not enough
- database RLS must still block unauthorized insert, update, and delete attempts

The database is the final authorization boundary.

## Service-role usage

The project already contains a server-side admin client using `SUPABASE_SERVICE_ROLE_KEY`.

Required rule:

- service-role credentials may only be used on the server
- they must never be shipped to the browser
- browser clients must rely on RLS-protected anon/authenticated access

Tournament policies are designed so that normal authenticated admin requests can succeed without exposing service-role credentials to the client.

## Security test checklist

## Anonymous visitor checks

- anonymous user can read `tournaments` rows where `is_public = true`
- anonymous user cannot read a private tournament row
- anonymous user can read groups for a public tournament
- anonymous user can read tournament teams for a public tournament
- anonymous user can read tournament matches for a public tournament
- anonymous user can read match sources for a public tournament
- anonymous user can read match sets for a public tournament
- anonymous user can read final standings for a public tournament
- anonymous user cannot insert into any tournament table
- anonymous user cannot update any tournament table
- anonymous user cannot delete from any tournament table

## Authenticated non-admin checks

- authenticated non-admin user can read public tournament data
- authenticated non-admin user cannot read private tournament data
- authenticated non-admin user cannot insert tournaments
- authenticated non-admin user cannot modify groups
- authenticated non-admin user cannot modify tournament teams
- authenticated non-admin user cannot modify tournament matches
- authenticated non-admin user cannot enter or correct results in `match_sets`
- authenticated non-admin user cannot modify final standings

## Authenticated admin checks

- admin can create tournaments
- admin can edit both public and private tournaments
- admin can manage groups
- admin can manage tournament teams
- admin can manage tournament matches
- admin can manage source definitions
- admin can enter and correct match sets
- admin can manage final standings

## Regression checks against existing auth model

- if a user loses active `owner` / `coach` status, tournament writes stop working immediately
- if a user is `inactive`, tournament writes are denied
- if a user is not signed in, tournament writes are denied even if the UI is manipulated

## Manual verification checklist

Before production use, verify:

1. anon browser session can open a public tournament page successfully
2. anon browser session receives permission denial when querying private tournament data directly
3. signed-in player without admin role cannot submit tournament admin actions
4. signed-in admin can create and update tournament records without service-role credentials in the browser
5. RLS still protects the tables when requests are sent outside the app UI
6. no frontend bundle contains `SUPABASE_SERVICE_ROLE_KEY`

## Recommended future hardening

- add automated policy verification in a Supabase test environment
- consider private tournament preview flows explicitly in application UX
- audit whether any future tournament feature starts depending on direct `matches` reads by anonymous users

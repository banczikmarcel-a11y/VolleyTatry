# Tournament Integration Plan

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## Goal

Add a first-class tournament module that supports:

- multiple tournaments
- public tournament pages
- admin tournament management
- tournament teams
- groups `A` to `D`
- tournament formats
- group-stage matches
- playoff and placement matches
- match sets
- standings
- referee-team assignment

The new module must not break the existing simple match functionality on `/matches`, homepage widgets, stats, and current admin match flows.

## Recommended integration strategy

Recommended direction:

- keep the existing simple match module intact
- introduce tournaments as a separate domain module
- reuse the existing `matches` table only as the base record for an individual played/scheduled match
- add tournament-specific tables around `matches` rather than overloading the current `matches` schema with many nullable tournament columns

Why:

- the current `matches` model already has technical debt and legacy overlap
- tournament structure needs many concepts that do not belong to every simple match
- separation reduces regression risk for `/matches`, homepage cards, and existing stats

## Reuse vs separation

## Parts to reuse

These existing parts can be reused with minimal or moderate adaptation:

- `matches` table as the canonical match event/result record
- `match_responses` for player attendance, if tournament matches should support the same player participation flow
- `match_lineups` concept for assigning players to a side, if tournament matches will use the same roster/side assignment UX
- `lib/admin.ts` and `requireAdminUser()` for admin access gating
- Supabase server/admin clients in `supabase/server.ts` and `supabase/admin.ts`
- shared UI primitives:
  - `Button`
  - `Card`
  - `Badge`
  - `PageHeader`
  - `QueryToast`
  - `LiveToast`
- match result entry patterns from `app/matches/actions.ts`
- parts of the admin match form patterns for dates, teams, status, and sets

## Parts to keep separate

These should remain separate from the existing simple match module:

- tournament entities and schema
- tournament route tree
- tournament read layer in `lib/`
- tournament admin server actions
- standings calculation logic
- group-stage and playoff bracket logic
- referee-team assignment logic
- tournament-specific public presentation

These should not be folded into current simple-match code until a later consolidation phase:

- `lib/matches.ts`
- `/matches`
- homepage “Najbližšie zápasy” and “Posledné zápasy”
- current standalone match creation/edit flows

## Domain model proposal

Recommended new tables:

- `tournaments`
  - core record for one tournament
  - fields: `id`, `slug`, `name`, `description`, `location`, `starts_at`, `ends_at`, `season_year`, `status`, `format`, `is_public`
- `tournament_teams`
  - teams participating in a tournament
  - fields: `id`, `tournament_id`, `name`, `slug`, `group_key`, `seed`, `is_referee_only`
- `tournament_team_links`
  - optional link from tournament team to existing `teams.id`
  - useful when a tournament participant is one of the club teams, but not required for guest teams
- `tournament_matches`
  - joins tournament structure to the existing `matches` table
  - fields: `id`, `tournament_id`, `match_id`, `stage_type`, `group_key`, `round_number`, `match_number`, `home_tournament_team_id`, `away_tournament_team_id`, `referee_tournament_team_id`, `playoff_slot`, `placement_slot`
- `tournament_standings_snapshots` or no table initially
  - recommendation: do not persist standings first
  - compute standings dynamically from results, then persist later only if needed

Optional future tables:

- `tournament_formats`
  - only if formats become highly configurable and admin-editable
- `tournament_rules`
  - only if scoring rules vary by tournament

## Why use `matches` as the base match record

Benefits:

- existing set/result fields already exist
- existing detail page patterns can be reused
- attendance and lineups can remain compatible
- stats can later choose whether to include tournament matches

Required constraint:

- a tournament match must be represented by exactly one `matches` row plus one `tournament_matches` row

Important rule:

- a simple match may exist without a tournament
- a tournament match may not exist without a base `matches` row

## Tournament formats

For phaseable implementation, start with a controlled enum-like format field on `tournaments.format`.

Recommended initial values:

- `groups_to_playoff`
- `groups_to_placement`
- `full_custom`

Interpretation:

- `groups_to_playoff`: group stage followed by semifinals/finals
- `groups_to_placement`: group stage plus placement matches
- `full_custom`: admin explicitly manages stage labels and match order

This keeps the first rollout practical while leaving room for richer generators later.

## Group support

Support exactly these values in the first version:

- `A`
- `B`
- `C`
- `D`

Where they belong:

- `tournament_teams.group_key`
- `tournament_matches.group_key` for group-stage matches only

Recommendation:

- store as nullable text constrained to `A|B|C|D`
- keep it nullable for playoff and placement matches

## Match stage model

Recommended `stage_type` values for `tournament_matches`:

- `group`
- `quarterfinal`
- `semifinal`
- `final`
- `third_place`
- `placement`
- `custom`

This supports:

- group-stage matches
- playoff matches
- placement matches
- manual fallback for unusual brackets

## Standings approach

Standings should be computed from tournament matches, not manually entered.

Recommended first-version calculation source:

- all `tournament_matches` with `stage_type = 'group'`
- join to `matches`
- include only `matches.status = 'completed'`

Recommended metrics:

- matches played
- wins
- losses
- sets won
- sets lost
- set difference
- points

Tie-breaker order should be documented explicitly before implementation. A practical default:

1. points
2. wins
3. set difference
4. sets won
5. head-to-head if feasible

## Referee-team assignment

Recommendation:

- referee assignment belongs to `tournament_matches`, not `matches`
- field: `referee_tournament_team_id`

Why:

- referee in tournaments is usually one of the tournament participants, not a global app team
- using tournament-specific team identity avoids forcing all guest teams into global `teams`

UI implication:

- admin should select the referee from teams registered in the same tournament
- public page can display referee team in the match row/detail

## Route architecture

Recommended new public routes:

- `/tournaments`
  - public tournament listing
- `/tournaments/[slug]`
  - tournament overview
- `/tournaments/[slug]/groups`
  - group standings and teams
- `/tournaments/[slug]/schedule`
  - all tournament matches
- `/tournaments/[slug]/playoff`
  - playoff and placement bracket/list
- `/tournaments/[slug]/matches/[matchId]`
  - tournament-specific match detail wrapper, potentially reusing current match detail sections

Recommended admin routes:

- `/admin/tournaments`
  - tournament list
- `/admin/tournaments/new`
  - create tournament
- `/admin/tournaments/[id]`
  - overview / management hub
- `/admin/tournaments/[id]/edit`
  - edit tournament metadata
- `/admin/tournaments/[id]/teams`
  - manage tournament teams and groups
- `/admin/tournaments/[id]/matches`
  - manage generated/manual tournament matches

Important routing decision:

- do not merge tournament pages into `/matches`
- keep `/matches` focused on simple standalone match browsing

## Read layer architecture

Recommended new library modules:

- `lib/tournaments.ts`
  - public tournament list and detail queries
- `lib/tournament-teams.ts`
  - team/group queries
- `lib/tournament-matches.ts`
  - tournament schedule, stage filtering, public display rows
- `lib/tournament-standings.ts`
  - standings calculation
- `lib/admin-tournaments.ts`
  - admin-only tournament queries

Recommended rule:

- do not add tournament branching into `lib/matches.ts` unless a shared helper is truly generic

Good shared helpers that may be extracted later:

- set/result formatting
- date formatting
- team label helpers
- status badges

## Admin authorization strategy

Short-term recommendation:

- reuse current app-level admin model: active `owner` or `coach`
- all tournament admin routes use `requireAdminUser()`

Database recommendation:

- add tournament RLS policies aligned with the current admin model
- avoid making tournament writes depend on service-role unless absolutely necessary

Important improvement:

- unlike current `match_lineups`, new tournament tables should get proper authenticated admin RLS from day one

## Migration strategy

Recommended rollout order:

1. add tournament tables only
2. add RLS and indexes
3. add TypeScript database types
4. add read-only public tournament pages
5. add admin CRUD
6. add standings
7. add referee assignment
8. optionally connect player attendance/lineups for tournament matches

Do not do this in the first migration:

- do not refactor existing `matches` columns
- do not rename or remove current fields
- do not change `/matches` behavior

## Integration with existing match functionality

Recommended compatibility rules:

- standalone matches continue to be created exactly as today
- tournament matches create a normal `matches` row plus a `tournament_matches` row
- existing `/matches` continues to show all matches unless product later decides to filter tournament matches out

Recommended product choice for safety:

- keep tournament matches out of homepage widgets and `/matches` by default in the first tournament rollout

How to support that safely:

- add a boolean or match-origin flag to `matches`, for example `match_context = 'simple' | 'tournament'`
- alternatively infer origin from existence in `tournament_matches`, but explicit context will be simpler and faster to query

Preferred option:

- add `match_context` to `matches`

Why:

- avoids repeated anti-join logic
- keeps old pages stable
- gives explicit inclusion control for stats and listings

## Stats integration

Recommendation for first release:

- tournament matches should be excluded from existing dashboard and `/stats` unless intentionally enabled

Reason:

- current stats are designed around the Tatry vs Ostatní simple match model
- tournament results with many teams would distort current aggregates

Future path:

- add tournament-specific stats later
- if needed, selectively include only matches involving club-owned teams

## UI reuse plan

High-confidence reusable components:

- `Button`, `Card`, `Badge`, `PageHeader`
- table/list patterns from `MatchesListView`
- result display styling from match cards and match detail
- toast/query feedback patterns

Partial reuse:

- `MatchResultForm` can inspire a tournament result form, but should not directly own tournament data flow
- `TeamAssignmentBoard` may be reusable only if tournament match player assignment semantics match current behavior
- `HomeMatchSignupPanel` should stay separate unless tournament participation flow is identical

Should be separate:

- tournament bracket UI
- group standings tables
- tournament admin scheduling UI
- referee assignment UI

## Risks and mitigations

Risk: overloading the current `matches` table with tournament-only concerns  
Mitigation: keep tournament structure in dedicated tables and link back to `matches`

Risk: tournament matches accidentally pollute `/matches`, homepage, and stats  
Mitigation: add explicit `match_context` and filter old views to `simple`

Risk: current binary team assumptions break tournament logic  
Mitigation: use `tournament_teams` as tournament-local participants and do not assume only two global app teams

Risk: RLS complexity grows further  
Mitigation: define tournament admin policies early and avoid service-role-only write paths for core tournament data

Risk: standings become inconsistent if edited manually  
Mitigation: calculate standings from completed group matches rather than storing editable totals

Risk: public pages become tightly coupled to admin-only queries  
Mitigation: separate public read modules from admin read/write modules

## Recommended non-goals for the first tournament iteration

- no automatic bracket generation for every imaginable format
- no deep refactor of simple match pages
- no merge of tournament and simple match stats
- no generalized scheduling engine beyond the selected tournament formats
- no replacement of the current team membership model

## Final recommendation

Build tournaments as a separate module centered on:

- `tournaments`
- `tournament_teams`
- `tournament_matches`
- existing `matches` as the base match record

Keep current simple matches operational and isolated by:

- preserving `/matches` and existing match actions
- introducing a match-origin discriminator
- filtering existing pages away from tournament records by default

This is the safest path for adding tournaments incrementally while preserving the already working standalone match module.

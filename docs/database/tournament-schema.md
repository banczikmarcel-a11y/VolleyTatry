# Tournament Schema

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## Design goals

The tournament schema must:

- support multiple tournaments
- support up to 4 groups per tournament
- support group codes `A`, `B`, `C`, `D`
- allow one team to belong to only one group inside the same tournament
- support group-stage, semifinal, final, bronze, and placement matches
- support unresolved participants sourced from group positions or previous match winners/losers
- support referee-team assignment
- allow public read access
- allow admin-only writes
- store audit metadata with automatic `created_at` and `updated_at`

## Design decision

The tournament module will be modeled as a separate schema layer around the existing app.

Key decision:

- keep existing standalone `matches` intact
- add tournament-specific tables for structure, sources, sets, and standings
- allow a tournament match to optionally link to an existing `matches` row

Why:

- playoff matches may exist as logical slots before real participants are known
- tournament public pages need their own structure even before a concrete match is resolved
- this avoids overloading the current simple-match model

## Existing table reuse

The existing `teams` table remains the global team catalog.

New tournament membership is modeled with:

- `tournament_teams`

This means:

- `teams` = reusable global teams
- `tournament_teams` = a team’s participation inside one tournament

## Proposed tables

## 1. `tournament_formats`

Purpose:

- catalog of supported tournament formats
- stores format identity and rules configuration

Key columns:

- `id`
- `key`
- `name`
- `description`
- `rules`
- `is_active`
- audit columns

Notes:

- initial seeded format will be `10 tímov; 2x5; semifinále; o umiestnenie`
- `rules` should be stored as `jsonb` for future extensibility

## 2. `tournaments`

Purpose:

- one row per tournament

Key columns:

- `id`
- `format_id`
- `slug`
- `name`
- `description`
- `location`
- `starts_at`
- `ends_at`
- `court_count`
- `match_duration_minutes`
- `break_duration_minutes`
- `status`
- `is_public`
- `published_at`
- audit columns

Recommended controlled status values:

- `draft`
- `scheduled`
- `in_progress`
- `completed`
- `archived`

## 3. `tournament_groups`

Purpose:

- groups defined inside a tournament

Key columns:

- `id`
- `tournament_id`
- `code`
- `name`
- `sort_order`
- audit columns

Constraints:

- unique group code per tournament
- unique group sort order per tournament
- `code` limited to `A`, `B`, `C`, `D`

Maximum of 4 groups is naturally enforced by:

- only allowing `A`, `B`, `C`, `D`
- unique `(tournament_id, code)`

## 4. `tournament_teams`

Purpose:

- team participation inside one tournament

Key columns:

- `id`
- `tournament_id`
- `team_id`
- `tournament_group_id`
- `display_name`
- `seed_number`
- `sort_order`
- audit columns

Constraints:

- one team may appear only once per tournament
- one tournament team belongs to one tournament group
- seed order can be unique inside a group if provided

Notes:

- `display_name` acts as a historical snapshot in case the global team name changes later
- all initial tournament teams are expected to be assigned to a group

## 5. `tournament_matches`

Purpose:

- structural and public-facing match record for the tournament module

This is the core table for:

- group-stage matches
- semifinals
- final
- bronze match
- placement matches

Key columns:

- `id`
- `tournament_id`
- `tournament_group_id`
- `match_id`
- `home_tournament_team_id`
- `away_tournament_team_id`
- `referee_tournament_team_id`
- `phase`
- `round_number`
- `slot_number`
- `placement_rank`
- `bracket_key`
- `label`
- `scheduled_at`
- `location`
- `status`
- audit columns

Recommended controlled `phase` values:

- `group_stage`
- `semifinal`
- `final`
- `bronze`
- `placement`

Recommended controlled `status` values:

- `pending`
- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

Important behavior:

- `match_id` is optional
- unresolved playoff or placement slots can exist before actual teams are known
- once participants are resolved, a concrete `matches` row may be attached through `match_id`

Notes:

- `referee_tournament_team_id` supports referee-team assignment
- `placement_rank` is intended for 5th, 7th, and 9th place matches
- `home_tournament_team_id` and `away_tournament_team_id` may be null until resolved from `match_sources`

## 6. `match_sources`

Purpose:

- describes where each tournament match participant comes from

This is required to support:

- group positions
- previous match winners
- previous match losers
- directly assigned teams

Key columns:

- `id`
- `tournament_id`
- `tournament_match_id`
- `participant_slot`
- `source_type`
- `source_tournament_team_id`
- `source_group_code`
- `source_group_position`
- `source_tournament_match_id`
- audit columns

Recommended controlled `participant_slot` values:

- `home`
- `away`

Recommended controlled `source_type` values:

- `tournament_team`
- `group_position`
- `match_winner`
- `match_loser`

Required behavior:

- exactly one source for home participant
- exactly one source for away participant

Examples:

- group match with fixed participants:
  - `home -> tournament_team`
  - `away -> tournament_team`
- semifinal:
  - `home -> group_position A1`
  - `away -> group_position B2`
- final:
  - `home -> match_winner semifinal_1`
  - `away -> match_winner semifinal_2`

## 7. `match_sets`

Purpose:

- per-set score storage for tournament matches

Key columns:

- `id`
- `tournament_id`
- `tournament_match_id`
- `set_number`
- `home_points`
- `away_points`
- audit columns

Notes:

- `home_points` and `away_points` represent rally points / balls in the set
- `set_number` must be positive
- the engine and validator decide whether a set sequence is valid for the match phase

## 8. `final_standings`

Purpose:

- final tournament ranking snapshot

Key columns:

- `id`
- `tournament_id`
- `tournament_team_id`
- `final_position`
- `notes`
- audit columns

Constraints:

- one final standing row per team in a tournament
- one unique final position per tournament

Notes:

- this table stores final ranking output after tournament completion
- group standings are calculated dynamically from results, not stored here

## Audit information

All new tournament tables should include:

- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by uuid null references public.profiles(id) on delete set null`
- `updated_by uuid null references public.profiles(id) on delete set null`

`updated_at` should be maintained by the project’s existing `public.set_updated_at()` trigger pattern.

## Relationships

High-level relationships:

- `tournament_formats 1 -> many tournaments`
- `tournaments 1 -> many tournament_groups`
- `tournaments 1 -> many tournament_teams`
- `teams 1 -> many tournament_teams`
- `tournaments 1 -> many tournament_matches`
- `tournament_groups 1 -> many tournament_teams`
- `tournament_groups 1 -> many tournament_matches`
- `tournament_teams 1 -> many tournament_matches` as home/away/referee roles
- `tournament_matches 1 -> many match_sources`
- `tournament_matches 1 -> many match_sets`
- `tournaments 1 -> many final_standings`
- `tournament_teams 1 -> many final_standings`

Optional integration relationship:

- `tournament_matches 0..1 -> matches`

## Integrity rules

Required integrity rules:

- a tournament group code must be one of `A`, `B`, `C`, `D`
- a team may belong to only one group inside one tournament
- home and away tournament teams cannot be the same resolved team
- each match side has at most one source definition
- source definition must match its source type
- final positions are unique inside a tournament
- set number must be positive

## Public-read model

The tournament module must support public pages.

Therefore:

- tournament tables must be queryable by anonymous users when the tournament is public
- tournament public pages should not rely on private access to existing standalone `matches`

This is why `tournament_matches` contains its own public scheduling and structure fields even when it optionally links to `matches`.

## Admin-write model

Writes must be restricted to authenticated administrators using the project’s existing membership role mechanism:

- active `owner`
- active `coach`

This applies to:

- tournament creation
- team assignment
- match generation
- referee assignment
- result entry
- result correction
- final standings management

## Proposed migration order

Implemented migration order:

1. [`0009_tournament_module_schema.sql`](/d:/Development/VibeCoding/VolejbalTatry/supabase/migrations/0009_tournament_module_schema.sql)
   creates tournament tables, constraints, indexes, triggers, optional `matches` cleanup trigger, and seeds the initial format
2. [`0010_tournament_module_rls.sql`](/d:/Development/VibeCoding/VolejbalTatry/supabase/migrations/0010_tournament_module_rls.sql)
   enables RLS and adds public-read/admin-write policies
3. update generated TypeScript database types after those migrations are applied

## Notes about implementation boundaries

Database responsibilities:

- store tournament structure
- protect access
- enforce core relational integrity

Application / engine responsibilities:

- generate group matches
- generate playoff and placement slots
- calculate standings
- resolve source-based participants
- validate best-of-3 and win-by-2 rules
- distribute referee assignments fairly

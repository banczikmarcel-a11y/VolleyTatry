# Tournament Architecture Review

Review scope:

- domain tournament rules, generators, standings, and playoffs
- tournament repository and service layers
- admin and public tournament routes
- tournament RLS and audit flow
- existing unit and integration tests

Date:

- 2026-07-17

## Summary

The tournament module is in good overall shape:

- pure domain logic is separated from React components
- standings, playoff generation, referee assignment, and match validation are unit-testable without Supabase
- UI reads mostly through a repository layer rather than ad-hoc Supabase calls
- server-side authorization is present for admin flows
- public read and admin-only write RLS exists for tournament tables
- integration coverage now exercises the complete initial format

The most important remaining issues are not in basic correctness of the domain modules, but in server-side consistency guards around regeneration workflows.

## Critical

No critical findings.

## High

1. Group-stage schedule persistence can be overwritten by direct service calls
Severity:
- High

Affected area:
- `src/server/tournaments/services/tournament-service-core.ts`
- `app/admin/tournaments/actions.ts`

Details:
- the UI blocks duplicate schedule generation unless the admin explicitly requests regeneration
- however, the service `saveGeneratedMatches(...)` itself did not enforce this boundary
- any future server action, script, or API route calling the service directly could silently overwrite an existing schedule
- this is a consistency risk because later workflows assume stable match IDs, sources, and accumulated results

Recommendation:
- enforce a server-side guard in the service layer
- only allow overwrite when explicitly requested
- reject regeneration once existing group matches already contain started or completed results

2. Playoff generation can be re-run after playoff matches already exist
Severity:
- High

Affected area:
- `src/server/tournaments/services/tournament-service-core.ts`

Details:
- `generatePlayoffs(...)` currently validates group completion but does not reject existing playoff records
- because persistence uses upsert semantics, a repeated call could overwrite or reshape pending playoff rows
- even if IDs are now stabilized, repeated generation without an explicit server-side policy is dangerous once progression or results exist

Recommendation:
- reject playoff generation when any playoff matches already exist
- only introduce regeneration later with an explicit admin confirmation flow and stricter safety checks

## Medium

1. Result save, progression update, and audit insert are multi-step operations without a single database transaction
Affected area:
- `src/server/tournaments/services/tournament-service-core.ts`
- `src/server/tournaments/repositories/tournament-repository.ts`

Risk:
- a partial failure after `replaceMatchResult(...)` but before audit or progression persistence can leave the database in a temporarily inconsistent state

Why not marked high:
- current flow already preflights semifinal progression conflicts
- most failures here are infrastructure-level edge cases rather than common product-path errors

Recommendation:
- move result persistence + audit + progression into a dedicated SQL function or RPC-backed transactional repository method

2. Tournament format extensibility is only partial above the domain layer
Affected area:
- admin/public pages and several service helpers still assume groups `A` and `B`

Risk:
- domain modules are reasonably extensible, but higher layers are still tailored to the initial 2-group format

Recommendation:
- keep current behavior for the initial format
- before adding 3- or 4-group formats, lift hardcoded A/B assumptions into format-driven configuration

3. Public group standings page recalculates standings on every request through the service layer
Affected area:
- `app/tournaments/[slug]/groups/page.tsx`

Risk:
- acceptable for current scale, but repeated recomputation may become wasteful with many tournaments

Recommendation:
- if traffic grows, introduce a read model or cached standings snapshot per tournament/group

4. Repository bundle loading is broad for some pages
Affected area:
- repository `getTournamentBundle(...)` / `getTournamentBundleBySlug(...)`

Risk:
- pages that need only one subsection still load groups, teams, matches, sets, sources, and final standings together

Recommendation:
- acceptable now, but future optimization could split read models by page purpose

## Low

1. Some presentation still exposes internal enum values such as `in_progress`
Affected area:
- admin and public status displays

2. Public routes still query the repository directly from server components rather than a dedicated public service layer
Affected area:
- public tournament pages

Why low:
- Supabase queries are still centralized in the repository
- no business logic is leaking into those pages beyond simple filtering/presentation

3. Audit log rendering currently formats stored snapshots inline in the page component
Affected area:
- admin match result page

Why low:
- formatting is presentational and does not affect result correctness

## Domain Logic Separation

Status:
- Good

Notes:
- match rules, round robin generation, scheduling, referee assignment, standings, and playoff progression are all separated from React
- React components do not calculate standings or playoff progression themselves

## Duplicated Calculations

Status:
- Acceptable

Notes:
- `validateMatchResult(...)` is intentionally reused in rules, standings, public rendering, final standings derivation, and playoff progression
- this is repeated invocation, but not duplicated logic

## React Components Containing Business Rules

Status:
- Good

Notes:
- components mostly contain rendering decisions, local labels, and filtering UI state
- tournament business rules remain in domain or service code

## Supabase Queries Scattered In UI

Status:
- Acceptable

Notes:
- UI server components still call repository methods directly
- this is not ideal for a fully layered architecture, but queries are not scattered as raw Supabase calls

## Authorization Gaps

Status:
- Mostly good, with the high-severity regeneration gaps noted above

Notes:
- admin writes are checked server-side via `getAdminState()`
- frontend visibility is not relied on as the only control

## RLS Gaps

Status:
- Good for current scope

Notes:
- tournament tables have public read/admin write policies
- audit logs are admin-readable only
- browser client still uses anon/authenticated credentials, not service-role

## Playoff Correction Behavior

Status:
- Good

Notes:
- semifinal correction is preflighted against dependent matches
- if a dependent match already has a result, the system returns a conflict instead of silently replacing participants

## Standings Correctness

Status:
- Good for the current confirmed rules

Notes:
- current tie-breaker ordering is explicit and tested
- incomplete matches are excluded
- head-to-head currently resolves only two-team ties, which is acceptable for the present configuration but should be revisited if format rules change

## Referee Assignment Correctness

Status:
- Good

Notes:
- same-group restriction, no same-time overlap, deterministic assignment, and balancing are all covered
- warning output correctly surfaces constrained schedules

## Missing Tests

Status:
- No major gaps for the initial format

Notes:
- the core domain modules are well covered
- full integration flow exists
- the remaining notable missing area is transactional failure simulation around multi-step persistence

## Performance

Status:
- Acceptable for current scale

Notes:
- current bottlenecks are more architectural than algorithmic
- no immediate high-severity performance issue was identified

## Fix Scope For This Review

Fix now:

- server-side schedule overwrite guard
- server-side playoff regeneration guard

Defer:

- transactional consolidation for result save
- format-driven support for additional tournament layouts
- read-model optimization for large-scale traffic

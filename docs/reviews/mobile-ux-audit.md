# Mobile UX Audit

Reviewed screens:

- `/admin/tournaments`
- `/admin/tournaments/new`
- `/admin/tournaments/[id]`
- `/admin/tournaments/[id]/teams`
- `/admin/tournaments/[id]/schedule`
- `/admin/tournaments/[tournamentId]/matches/[matchId]/result`
- `/tournaments/[slug]`
- `/tournaments/[slug]/schedule`
- `/tournaments/[slug]/results`
- `/tournaments/[slug]/groups`
- `/tournaments/[slug]/playoffs`

Target device:

- approximately `360px` viewport width
- 5.5-inch phone class

Method:

- code review of current layouts, spacing, typography, and interaction sizes
- focus on readability, touch targets, overflow risk, empty/error/loading coverage, and numeric result entry

## Critical

1. Admin forms can trigger required zoom on mobile Safari
Affected routes:
- `/admin/tournaments/new`
- `/admin/tournaments/[id]/teams`
- `/admin/tournaments/[tournamentId]/matches/[matchId]/result`

Details:
- multiple form inputs and selects use `text-sm`
- on iPhone-class browsers, controls below `16px` frequently trigger auto-zoom on focus
- this slows result entry and tournament setup significantly

## High

1. Shared button and nav chip targets are not guaranteed to meet the 44px minimum
Affected routes:
- all public tournament routes
- all admin tournament routes

Details:
- shared `buttonClasses(...)` and public section navigation rely on padding and small text size
- several links are visually tappable, but not explicitly sized to `44px` minimum height

2. Schedule preview uses raw internal team IDs instead of readable names
Affected route:
- `/admin/tournaments/[id]/schedule`

Details:
- preview cards currently show internal tournament team IDs for home, away, and referee values
- on mobile this increases cognitive load and makes final confirmation error-prone

3. Long team names can compress or overflow key match cards
Affected routes:
- `/tournaments/[slug]`
- `/tournaments/[slug]/schedule`
- `/tournaments/[slug]/results`
- `/tournaments/[slug]/playoffs`
- `/admin/tournaments/[tournamentId]/matches/[matchId]/result`
- `/admin/tournaments/[id]/teams`

Details:
- several rows use `flex` layouts without `min-w-0` or explicit wrapping
- long names can push score/status badges into cramped layouts

4. Group standings page has no explicit empty state when standings are technically available but no rows exist yet
Affected route:
- `/tournaments/[slug]/groups`

Details:
- if the selected group exists but has no calculated rows yet, the screen can feel incomplete rather than informative

## Medium

1. Some admin status rows are dense on narrow screens
Affected route:
- `/admin/tournaments/[id]`

Details:
- “missing results” rows keep label and CTA in one line-first layout
- still usable, but tighter than ideal for longer match labels

2. Horizontal chip scrollers are acceptable but not ideal for discoverability
Affected routes:
- `/tournaments/[slug]/schedule`
- `/tournaments/[slug]/results`

Details:
- filter chips are scrollable and functionally valid
- users may miss off-screen options without stronger wrap or affordance

3. Loading state is global rather than tournament-contextual
Affected routes:
- all public tournament routes
- all admin tournament routes

Details:
- the app has a global loading state
- it works, but does not indicate which tournament subsection is currently loading

## Low

1. Tournament status labels are still developer-facing in some places
Affected routes:
- `/admin/tournaments`
- `/admin/tournaments/[id]`
- `/tournaments/[slug]`

Details:
- values like `in_progress` or `completed` are understandable but not fully localized/polished

2. Some empty states are functional but generic
Affected routes:
- `/tournaments/[slug]`
- `/tournaments/[slug]/schedule`
- `/tournaments/[slug]/results`
- `/tournaments/[slug]/playoffs`

Details:
- states are present and readable
- they could be more specific, but they are not blocking mobile use

## Fix Scope

Recommended mandatory fixes:

- raise mobile form control text to avoid auto-zoom
- enforce 44px minimum touch target sizing in shared buttons and section navigation
- replace internal IDs with human-readable team names in schedule preview
- harden long-name wrapping in public/admin match cards
- add explicit empty state to group standings

Recommended defer:

- richer route-specific loading states
- more discoverable non-scrolling filter layouts for wider filter sets
- further localization/polish of raw status strings

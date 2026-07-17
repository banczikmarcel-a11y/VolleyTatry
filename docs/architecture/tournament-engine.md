# Tournament Engine Architecture

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## Purpose

This document defines the architecture rules for the tournament engine before implementation begins.

The tournament engine must be built as independent modules:

1. Match Generator
2. Schedule Generator
3. Standings Calculator
4. Playoff Generator
5. Referee Assignment Generator
6. Match Result Validator

## Core architectural rules

- Domain logic must not be placed directly in React components.
- UI components must not calculate standings.
- Database queries must be separated from pure calculation logic.
- Pure tournament logic must be unit-testable without Supabase.
- Tournament formats must be extendable.
- Avoid long phase-based `if/else` chains where a rule configuration can be used.
- Use TypeScript types and discriminated unions where appropriate.

## Layering model

Recommended architecture layers:

- `domain`
  - pure tournament types, rule config, generators, validators, calculators
- `application`
  - orchestration use cases, data loading, persistence coordination
- `infrastructure`
  - Supabase queries, repositories, row mapping
- `presentation`
  - React pages and UI components

Rules:

- `presentation` may call application services or server actions
- `application` may call repositories and pure domain modules
- `domain` must not import React, Next.js, or Supabase code
- `domain` must be deterministic and side-effect free wherever possible

## Recommended folder intent

This document does not require implementation yet, but the intended separation is:

- `lib/tournaments/domain/*`
- `lib/tournaments/application/*`
- `lib/tournaments/repositories/*`
- `lib/tournaments/mappers/*`

Equivalent folder names are acceptable if they preserve the same responsibilities.

## Shared domain concepts

The engine should operate on typed tournament models rather than raw database rows.

Recommended domain types:

- `TournamentFormatKey`
- `TournamentDefinition`
- `TournamentRules`
- `TournamentTeam`
- `TournamentGroupKey`
- `TournamentStage`
- `TournamentMatchSlot`
- `ScheduledTournamentMatch`
- `TournamentResultInput`
- `GroupStandingRow`
- `RefereeAssignment`

Recommended use of discriminated unions:

- stage-specific match models
- format-specific rule configuration
- validation result types

Example direction:

```ts
type TournamentStage =
  | { kind: "group"; group: "A" | "B" | "C" | "D"; round: number }
  | { kind: "semifinal"; slot: 1 | 2 }
  | { kind: "final" }
  | { kind: "third_place" }
  | { kind: "placement"; place: 5 | 7 | 9 };
```

## Rule configuration approach

Tournament behavior should be driven by format rules, not by scattered conditionals.

Recommended model:

- one `TournamentRules` object per tournament format
- generators and validators consume rules as input
- format registration is centralized

Example responsibilities of a rules object:

- allowed groups
- group sizes
- round-robin behavior
- points model
- advancement mapping
- playoff set rules
- referee constraints

This enables:

- future addition of other tournament formats
- smaller, testable modules
- fewer hardcoded assumptions

## Module 1: Match Generator

### Responsibility

Generate the structural match definitions for a tournament before time scheduling.

This includes:

- group-stage pairings
- playoff pairings
- placement pairings
- stage metadata

### Inputs

- tournament format definition
- list of tournament teams
- group assignments
- advancement rules configuration

### Outputs

- unscheduled tournament match definitions
- stable logical identifiers for each match slot

### Must not do

- must not fetch from Supabase directly
- must not assign actual timestamps
- must not calculate standings from played results

### Dependencies

- `TournamentRules`
- typed team and group models

## Module 2: Schedule Generator

### Responsibility

Assign dates, times, court slots, or sequence positions to generated matches.

For the initial scope, it must at least support:

- ordering matches
- assigning simultaneous rounds if required by the format
- leaving enough information for referee assignment validation

### Inputs

- unscheduled tournament matches
- scheduling constraints
- available time slots
- group metadata

### Outputs

- scheduled tournament matches
- slot metadata needed by referee assignment

### Must not do

- must not calculate standings
- must not decide playoff participants from played results

### Dependencies

- match definitions from Match Generator
- scheduling constraints configuration

## Module 3: Standings Calculator

### Responsibility

Compute group standings from completed group-stage match results.

### Inputs

- tournament rules
- completed group-stage match results
- participating teams by group

### Outputs

- ordered standings rows per group
- tie-break metadata if needed for display/debugging

### Must handle

- win / draw / loss points
- sets won/lost
- rally points / balls won/lost
- only completed group-stage matches

### Must not do

- must not read directly from the database
- must not render tables
- must not mutate stored results

### Dependencies

- rules configuration
- normalized result inputs

## Module 4: Playoff Generator

### Responsibility

Generate semifinal, final, third-place, and placement pairings from standings.

### Inputs

- standings results
- tournament advancement rules

### Outputs

- resolved playoff and placement match pairings
- stage labels and slot metadata

### Must handle

- `A1 vs B2`
- `B1 vs A2`
- `A3 vs B3`
- `A4 vs B4`
- `A5 vs B5`

### Must not do

- must not validate set-level result rules
- must not schedule timestamps by itself

### Dependencies

- group standings
- advancement mapping from rules config

## Module 5: Referee Assignment Generator

### Responsibility

Assign a referee team to each eligible group-stage match.

### Inputs

- scheduled group-stage matches
- teams by group
- referee assignment rules
- existing referee assignment counts

### Outputs

- referee assignments per match
- optional diagnostics when fair assignment is impossible

### Must enforce

- referee team comes from the same group
- referee team is not playing at the same time
- assignment aims for even distribution

### Must not do

- must not assign playoff winners/losers
- must not persist assignments

### Dependencies

- scheduled matches
- rules configuration
- fairness strategy

## Module 6: Match Result Validator

### Responsibility

Validate whether submitted match results comply with tournament rules for the relevant stage.

### Inputs

- stage metadata
- tournament rules
- proposed result payload

### Outputs

- success result with normalized payload
- validation failure result with machine-readable reasons

### Must validate

For group-stage matches:

- result can be win, draw, or loss
- sets are present in valid structure
- rally points / balls are present in valid structure

For playoff and placement matches:

- no draw is allowed
- best of 3
- first to 2 sets wins
- each set goes to 15
- winner must lead by at least 2 points

### Must not do

- must not write to Supabase
- must not calculate standings

### Dependencies

- stage model
- rules configuration

## Module interaction flow

Recommended high-level flow:

1. Match Generator creates logical tournament matches.
2. Schedule Generator assigns order and timing.
3. Referee Assignment Generator assigns referee teams for group-stage matches.
4. Admin stores generated structure through repositories.
5. When results are entered, Match Result Validator validates them.
6. Standings Calculator computes group standings from completed matches.
7. Playoff Generator resolves next-round pairings from standings or completed playoff dependencies.

## Persistence boundary

Pure modules must work with plain TypeScript objects.

Repository layer responsibilities:

- load tournaments, teams, matches, and results from Supabase
- map database rows into domain inputs
- persist generated matches, referee assignments, and validated results

Pure modules must not know:

- table names
- SQL
- Supabase client APIs
- Next.js routing

## Interface direction

Exact names may change, but the engine should expose narrow interfaces similar to:

```ts
type MatchGenerator = {
  generate(definition: TournamentDefinition): TournamentMatchSlot[];
};

type ScheduleGenerator = {
  generate(input: ScheduleGenerationInput): ScheduledTournamentMatch[];
};

type StandingsCalculator = {
  calculate(input: StandingsCalculationInput): GroupStandingsResult;
};

type PlayoffGenerator = {
  generate(input: PlayoffGenerationInput): TournamentMatchSlot[];
};

type RefereeAssignmentGenerator = {
  assign(input: RefereeAssignmentInput): RefereeAssignmentResult;
};

type MatchResultValidator = {
  validate(input: MatchResultValidationInput): MatchResultValidationResult;
};
```

## Error and result modeling

Prefer typed result objects over throwing for expected business-rule failures.

Recommended direction:

```ts
type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };
```

Use thrown errors only for unexpected infrastructure failures outside pure domain logic.

## Extensibility rules

Future tournament formats must be added by:

- defining a new format key
- adding a rules configuration object
- optionally adding a format-specific generator strategy

Future formats must not require:

- rewriting React components with embedded format logic
- copying large blocks of conditional logic into server actions
- mixing SQL queries into calculation modules

## Testing expectations

Pure modules must be unit-testable with:

- static fixture inputs
- no Supabase
- no Next.js
- no browser environment

Recommended test coverage focus once implementation starts:

- round-robin group match generation
- standings ordering
- semifinal/placement pairing generation
- referee conflict prevention
- playoff result validation

## React integration rules

React components may:

- display already calculated standings
- display already generated schedules
- submit admin actions
- render validation errors returned by application services

React components must not:

- generate brackets
- compute standings
- decide tie-break order
- assign referee teams
- validate complex set rules inline

## Final architectural decision

The tournament engine will be implemented as a set of pure, independent TypeScript modules orchestrated by an application layer and backed by separate repository code.

This keeps:

- UI simple
- domain logic testable
- format behavior extensible
- Supabase concerns isolated from tournament calculation logic

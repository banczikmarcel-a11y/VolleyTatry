# Tournament Module Specification

Project: `Volejbal Tatry`  
Date: `2026-07-17`

## Purpose

This document defines the confirmed product rules for the tournament module. It is the source of truth for scope, behavior, and tournament rules in the initial implementation.

## Product goals

The tournament module must allow the application to:

- publish tournaments publicly
- show tournament schedule and results
- show group tables and playoff progress
- show final standings
- allow administrators to create tournaments and enter results

The initial implementation must support one confirmed tournament format while keeping the system extensible for future formats.

## General rules

- The application is publicly accessible.
- Anonymous visitors can view tournaments, matches, results, group tables, playoffs, and final standings.
- Only an authenticated administrator can create or modify tournaments and enter results.
- The UI must be mobile-first and usable on a 5.5-inch phone.

## Initial tournament format

Confirmed initial format name:

- `10 tímov; 2x5; semifinále; o umiestnenie`

This format is the mandatory first supported tournament format.

## Tournament structure

Core structure:

- 10 teams
- 2 groups: `A` and `B`
- 5 teams per group
- every team plays every other team in its group once

Derived implications:

- each group contains 10 group-stage matches
- the full group stage contains 20 matches total
- each team plays 4 group-stage matches

## Group-stage rules

Group-stage matches follow these rules:

- group matches are time-limited
- a group match may end as win, draw, or loss
- sets are recorded
- rally points / balls are recorded

Required recorded data per group-stage match:

- participating teams
- group identifier
- scheduled time
- referee team
- set results
- rally points / balls by set
- final match outcome: win, draw, or loss

## Group table scoring

Table points:

- win = `2`
- draw = `1`
- loss = `0`

The standings calculation must be based on completed group-stage matches only.

Minimum standings outputs:

- position
- team
- matches played
- wins
- draws
- losses
- table points
- sets won
- sets lost
- rally points / balls won
- rally points / balls lost

Tie-break logic is not yet fully confirmed in this specification and must remain configurable in the implementation.

## Advancement rules

Teams advance from groups exactly as follows:

- group positions `1` and `2` advance to semifinals
- semifinal 1: `A1 vs B2`
- semifinal 2: `B1 vs A2`
- semifinal winners play the final
- semifinal losers play for 3rd place
- `A3 vs B3` play for 5th place
- `A4 vs B4` play for 7th place
- `A5 vs B5` play for 9th place

Derived elimination/placement structure:

- 2 semifinals
- 1 final
- 1 third-place match
- 3 placement matches

This creates 7 non-group matches after the group stage.

## Playoff and placement rules

Playoff and placement matches follow these rules:

- played as best of 3 sets
- first team to win 2 sets wins
- every set is played to 15 points
- a set must be won by at least 2 points
- draws are not allowed

Required implications:

- final result must always produce one winner and one loser
- the validator must reject tied playoff/placement outcomes
- the validator must reject set results that do not satisfy the “win by 2” rule

## Referee team rules

Each group-stage match has a referee team.

Confirmed rules:

- each group-stage match has a referee team
- the referee team must come from the same group
- the referee team must not be playing at the same time
- referee duties should be distributed as evenly as possible

Implications:

- referee assignment is mandatory for every group-stage match
- referee assignment is a tournament-specific scheduling concern
- the scheduling flow should be able to validate assignment feasibility
- the system should prefer balanced referee distribution instead of repeatedly assigning the same team

This specification does not yet define mandatory referee rules for semifinals, final, or placement matches.

## Public user experience

Anonymous and signed-in non-admin visitors must be able to view:

- tournament list
- tournament overview
- groups and group tables
- full schedule
- group-stage results
- playoff and placement results
- final standings

Public pages must be readable on mobile first, with particular attention to:

- dense tables on small screens
- match lists on 5.5-inch displays
- standings that remain understandable without horizontal overflow where possible

## Admin user experience

Authenticated administrators must be able to:

- create a tournament
- edit tournament metadata
- manage tournament teams
- assign teams to groups
- generate or manage group-stage matches
- generate or manage playoff and placement matches
- assign referee teams for group-stage matches
- enter and edit results

Admin functions are not public.

## Data requirements

The module must store enough information to support:

- tournament metadata
- tournament teams
- group assignment
- match stage classification
- set scores
- rally points / balls
- standings calculation
- referee-team assignment
- final ranking determination

## Out of scope for this confirmed specification

The following are not yet confirmed and should not be assumed as fixed product rules:

- support for more than one active tournament format in the first release
- automatic tie-break hierarchy beyond points/wins/draw/loss tracking
- knockout seeding beyond the confirmed pairings
- referee assignment rules for playoff matches
- player attendance behavior for tournament matches
- integration of tournament matches into existing standalone match stats

## Acceptance baseline

The initial tournament module is considered aligned with this specification when:

- an admin can create a tournament using the confirmed format
- 10 teams can be assigned into groups `A` and `B`
- the system can represent all 20 group-stage matches
- group-stage matches can end in win, draw, or loss
- standings can be produced from recorded results
- semifinal and placement pairings follow the confirmed advancement rules
- playoff and placement matches enforce best-of-3, first-to-15, win-by-2 rules
- public users can view tournament data without authentication
- admin-only create/edit/result actions remain restricted to authenticated administrators

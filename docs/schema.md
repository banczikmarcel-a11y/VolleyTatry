# Database Schema

This schema prepares the app for a Supabase-backed team hub. The application is not connected to Supabase yet; these files define the planned PostgreSQL shape.

## Tables

- `profiles`: one row per authenticated user. The primary key is the Supabase `auth.users.id`.
- `teams`: volleyball groups or buckets. The initial seed creates `Tatry` and `Ostatní`.
- `team_memberships`: joins profiles to teams with a `role` and membership `status`.
- `matches`: scheduled events owned by one team, with an optional opponent team.
- `match_responses`: one attendance response from one profile for one match.

## Relationships

- `profiles.id` references `auth.users.id`.
- A database trigger creates a `profiles` row when Supabase Auth inserts a new user.
- `team_memberships.profile_id` references `profiles.id`.
- `team_memberships.team_id` references `teams.id`.
- `matches.team_id` references the team organizing the match.
- `matches.opponent_team_id` optionally references another team, such as `Ostatní`.
- `match_responses.match_id` references `matches.id`.
- `match_responses.profile_id` references `profiles.id`.

## Constraints

- A profile can only have one membership per team through `unique (team_id, profile_id)`.
- A profile can only submit one response per match through `unique (match_id, profile_id)`.
- Membership roles are limited to `owner`, `coach`, and `player`.
- Membership statuses are limited to `active`, `invited`, and `inactive`.
- Match statuses are limited to `scheduled`, `cancelled`, and `completed`.
- Match response statuses are limited to `available`, `unavailable`, and `maybe`.

## Admin Matches

Match administration uses these fields on `matches`:

- `match_date`: scheduled date and time.
- `location`: venue or meeting point.
- `season_year`: season bucket for filtering and reporting.
- `status`: `scheduled`, `cancelled`, or `completed`.
- `home_team_id` and `away_team_id`: the teams shown on match cards.
- `home_sets` and `away_sets`: optional set result values, required by the app when status is `completed`.

Admin access in the app means an active `team_memberships` row with role `owner` or `coach`. The RLS policies allow those users to insert and update matches for their home team.

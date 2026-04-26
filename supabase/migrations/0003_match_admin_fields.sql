alter table public.matches
  add column if not exists match_date timestamptz,
  add column if not exists season_year integer,
  add column if not exists home_team_id uuid references public.teams(id) on delete restrict,
  add column if not exists away_team_id uuid references public.teams(id) on delete restrict,
  add column if not exists home_sets integer,
  add column if not exists away_sets integer;

update public.matches
set
  match_date = coalesce(match_date, starts_at),
  season_year = coalesce(season_year, extract(year from starts_at)::integer),
  home_team_id = coalesce(home_team_id, team_id),
  away_team_id = coalesce(away_team_id, opponent_team_id)
where match_date is null
  or season_year is null
  or home_team_id is null
  or away_team_id is null;

update public.matches match
set away_team_id = (
  select team.id
  from public.teams team
  where team.id <> match.home_team_id
  order by case when team.slug = 'ostatni' then 0 else 1 end, team.name
  limit 1
)
where match.away_team_id is null;

alter table public.matches
  alter column match_date set not null,
  alter column season_year set not null,
  alter column home_team_id set not null,
  alter column away_team_id set not null;

alter table public.matches
  drop constraint if exists matches_season_year_check,
  add constraint matches_season_year_check check (season_year between 2000 and 2100),
  drop constraint if exists matches_sets_check,
  add constraint matches_sets_check check (
    (home_sets is null or home_sets >= 0)
    and (away_sets is null or away_sets >= 0)
  ),
  drop constraint if exists matches_different_home_away_teams,
  add constraint matches_different_home_away_teams check (home_team_id <> away_team_id);

create index if not exists matches_match_date_idx on public.matches(match_date);
create index if not exists matches_home_team_id_idx on public.matches(home_team_id);
create index if not exists matches_away_team_id_idx on public.matches(away_team_id);
create index if not exists matches_season_year_idx on public.matches(season_year);

alter table public.tournament_teams
drop constraint if exists tournament_teams_tournament_id_team_id_unique;

alter table public.tournament_teams
alter column team_id drop not null;

drop index if exists tournament_teams_team_id_idx;
create index if not exists tournament_teams_team_id_idx on public.tournament_teams(team_id) where team_id is not null;

create unique index if not exists tournament_teams_tournament_id_team_id_unique_idx
on public.tournament_teams(tournament_id, team_id)
where team_id is not null;

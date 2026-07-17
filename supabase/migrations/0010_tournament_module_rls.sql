alter table public.tournament_formats enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_groups enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.match_sources enable row level security;
alter table public.match_sets enable row level security;
alter table public.final_standings enable row level security;

create or replace function public.can_read_tournament(target_tournament_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tournaments tournament
    where tournament.id = target_tournament_id
      and tournament.is_public = true
  )
  or public.is_team_admin();
$$;

drop policy if exists "tournament_formats_select_public" on public.tournament_formats;
create policy "tournament_formats_select_public"
on public.tournament_formats
for select
to public
using (true);

drop policy if exists "tournament_formats_admin_write" on public.tournament_formats;
create policy "tournament_formats_admin_write"
on public.tournament_formats
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "tournaments_select_public" on public.tournaments;
create policy "tournaments_select_public"
on public.tournaments
for select
to public
using (public.can_read_tournament(id));

drop policy if exists "tournaments_admin_write" on public.tournaments;
create policy "tournaments_admin_write"
on public.tournaments
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "tournament_groups_select_public" on public.tournament_groups;
create policy "tournament_groups_select_public"
on public.tournament_groups
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "tournament_groups_admin_write" on public.tournament_groups;
create policy "tournament_groups_admin_write"
on public.tournament_groups
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "tournament_teams_select_public" on public.tournament_teams;
create policy "tournament_teams_select_public"
on public.tournament_teams
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "tournament_teams_admin_write" on public.tournament_teams;
create policy "tournament_teams_admin_write"
on public.tournament_teams
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "tournament_matches_select_public" on public.tournament_matches;
create policy "tournament_matches_select_public"
on public.tournament_matches
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "tournament_matches_admin_write" on public.tournament_matches;
create policy "tournament_matches_admin_write"
on public.tournament_matches
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "match_sources_select_public" on public.match_sources;
create policy "match_sources_select_public"
on public.match_sources
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "match_sources_admin_write" on public.match_sources;
create policy "match_sources_admin_write"
on public.match_sources
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "match_sets_select_public" on public.match_sets;
create policy "match_sets_select_public"
on public.match_sets
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "match_sets_admin_write" on public.match_sets;
create policy "match_sets_admin_write"
on public.match_sets
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

drop policy if exists "final_standings_select_public" on public.final_standings;
create policy "final_standings_select_public"
on public.final_standings
for select
to public
using (public.can_read_tournament(tournament_id));

drop policy if exists "final_standings_admin_write" on public.final_standings;
create policy "final_standings_admin_write"
on public.final_standings
for all
to authenticated
using (public.is_team_admin())
with check (public.is_team_admin());

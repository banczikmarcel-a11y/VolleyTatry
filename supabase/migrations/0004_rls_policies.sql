alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.matches enable row level security;
alter table public.match_responses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
on public.teams
for select
to authenticated
using (true);

drop policy if exists "team_memberships_select_own" on public.team_memberships;
create policy "team_memberships_select_own"
on public.team_memberships
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "matches_select_authenticated" on public.matches;
create policy "matches_select_authenticated"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "matches_insert_team_admin" on public.matches;
create policy "matches_insert_team_admin"
on public.matches
for insert
to authenticated
with check (
  exists (
    select 1
    from public.team_memberships membership
    where membership.profile_id = auth.uid()
      and membership.team_id = matches.home_team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'coach')
  )
);

drop policy if exists "matches_update_team_admin" on public.matches;
create policy "matches_update_team_admin"
on public.matches
for update
to authenticated
using (
  exists (
    select 1
    from public.team_memberships membership
    where membership.profile_id = auth.uid()
      and membership.team_id = matches.home_team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'coach')
  )
)
with check (
  exists (
    select 1
    from public.team_memberships membership
    where membership.profile_id = auth.uid()
      and membership.team_id = matches.home_team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'coach')
  )
);

drop policy if exists "match_responses_select_authenticated" on public.match_responses;
create policy "match_responses_select_authenticated"
on public.match_responses
for select
to authenticated
using (true);

drop policy if exists "match_responses_insert_own" on public.match_responses;
create policy "match_responses_insert_own"
on public.match_responses
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "match_responses_update_own" on public.match_responses;
create policy "match_responses_update_own"
on public.match_responses
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

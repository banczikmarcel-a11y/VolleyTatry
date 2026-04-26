create or replace function public.is_team_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_memberships membership
    where membership.profile_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'coach')
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_memberships membership
    where membership.profile_id = auth.uid()
      and membership.team_id = target_team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'coach')
  );
$$;

drop policy if exists "matches_insert_team_admin" on public.matches;
create policy "matches_insert_team_admin"
on public.matches
for insert
to authenticated
with check (
  public.is_team_admin()
  and home_team_id is not null
  and away_team_id is not null
  and home_team_id <> away_team_id
);

drop policy if exists "matches_update_team_admin" on public.matches;
create policy "matches_update_team_admin"
on public.matches
for update
to authenticated
using (public.is_team_admin())
with check (
  public.is_team_admin()
  and home_team_id is not null
  and away_team_id is not null
  and home_team_id <> away_team_id
);

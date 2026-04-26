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

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_team_admin());

drop policy if exists "team_memberships_select_admin" on public.team_memberships;
create policy "team_memberships_select_admin"
on public.team_memberships
for select
to authenticated
using (public.is_team_admin());

drop policy if exists "team_memberships_insert_admin" on public.team_memberships;
create policy "team_memberships_insert_admin"
on public.team_memberships
for insert
to authenticated
with check (public.can_manage_team(team_id));

drop policy if exists "team_memberships_update_admin" on public.team_memberships;
create policy "team_memberships_update_admin"
on public.team_memberships
for update
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

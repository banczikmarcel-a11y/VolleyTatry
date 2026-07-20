alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid();

alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists display_name text,
  add column if not exists role text not null default 'user',
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email_normalized'
  ) then
    execute $sql$
      alter table public.profiles
        add column email_normalized text
        generated always as (
          case
            when email is null or btrim(email) = '' then null
            else lower(btrim(email))
          end
        ) stored
    $sql$;
  end if;
end
$$;

update public.profiles
set
  auth_user_id = coalesce(auth_user_id, id),
  email = nullif(btrim(email), ''),
  display_name = coalesce(
    nullif(btrim(display_name), ''),
    nullif(btrim(full_name), ''),
    nullif(btrim(concat_ws(' ', first_name, last_name)), ''),
    nullif(btrim(email), ''),
    'Používateľ'
  ),
  role = case
    when exists (
      select 1
      from public.team_memberships membership
      where membership.profile_id = profiles.id
        and membership.status = 'active'
        and membership.role in ('owner', 'coach')
    ) then 'admin'
    else coalesce(nullif(btrim(role), ''), 'user')
  end,
  is_active = coalesce(is_active, true);

alter table public.profiles
  alter column display_name set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

create unique index if not exists profiles_auth_user_id_unique
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists profiles_email_normalized_unique
  on public.profiles(email_normalized)
  where email_normalized is not null;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_is_active_idx on public.profiles(is_active);

create or replace function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profiles.id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_active_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profiles.id
  from public.profiles
  where profiles.auth_user_id = auth.uid()
    and profiles.is_active = true
  limit 1;
$$;

create or replace function public.is_application_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.auth_user_id = auth.uid()
      and profiles.is_active = true
      and profiles.role = 'admin'
  );
$$;

create or replace function public.is_team_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_application_admin();
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_application_admin();
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = public.current_profile_id());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_application_admin());

drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_application_admin())
with check (public.is_application_admin());

drop policy if exists "team_memberships_select_own" on public.team_memberships;
create policy "team_memberships_select_own"
on public.team_memberships
for select
to authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "team_memberships_select_admin" on public.team_memberships;
create policy "team_memberships_select_admin"
on public.team_memberships
for select
to authenticated
using (public.is_application_admin());

drop policy if exists "team_memberships_insert_admin" on public.team_memberships;
create policy "team_memberships_insert_admin"
on public.team_memberships
for insert
to authenticated
with check (public.is_application_admin());

drop policy if exists "team_memberships_update_admin" on public.team_memberships;
create policy "team_memberships_update_admin"
on public.team_memberships
for update
to authenticated
using (public.is_application_admin())
with check (public.is_application_admin());

drop policy if exists "team_memberships_delete_admin" on public.team_memberships;
create policy "team_memberships_delete_admin"
on public.team_memberships
for delete
to authenticated
using (public.is_application_admin());

drop policy if exists "matches_insert_team_admin" on public.matches;
create policy "matches_insert_team_admin"
on public.matches
for insert
to authenticated
with check (public.is_application_admin());

drop policy if exists "matches_update_team_admin" on public.matches;
create policy "matches_update_team_admin"
on public.matches
for update
to authenticated
using (public.is_application_admin())
with check (public.is_application_admin());

drop policy if exists "matches_delete_admin" on public.matches;
create policy "matches_delete_admin"
on public.matches
for delete
to authenticated
using (public.is_application_admin());

drop policy if exists "match_responses_insert_own" on public.match_responses;
create policy "match_responses_insert_own"
on public.match_responses
for insert
to authenticated
with check (profile_id = public.current_profile_id());

drop policy if exists "match_responses_update_own" on public.match_responses;
create policy "match_responses_update_own"
on public.match_responses
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "match_lineups_admin_write" on public.match_lineups;
create policy "match_lineups_admin_write"
on public.match_lineups
for all
to authenticated
using (public.is_application_admin())
with check (public.is_application_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_full_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  raw_first_name text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  raw_last_name text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  derived_first_name text;
  derived_last_name text;
  resolved_display_name text;
  existing_profile_id uuid;
begin
  if raw_first_name is null and raw_last_name is null and raw_full_name is not null then
    if strpos(raw_full_name, ' ') = 0 then
      derived_first_name := raw_full_name;
      derived_last_name := null;
    else
      derived_first_name := regexp_replace(raw_full_name, '\s+\S+$', '');
      derived_last_name := regexp_replace(raw_full_name, '^.*\s+(\S+)$', '\1');
    end if;
  else
    derived_first_name := raw_first_name;
    derived_last_name := raw_last_name;
  end if;

  resolved_display_name := coalesce(
    raw_full_name,
    nullif(btrim(concat_ws(' ', derived_first_name, derived_last_name)), ''),
    nullif(btrim(new.email), ''),
    'Používateľ'
  );

  select profiles.id
  into existing_profile_id
  from public.profiles
  where profiles.auth_user_id = new.id
     or (
       new.email is not null
       and profiles.email_normalized = lower(btrim(new.email))
     )
  order by case when profiles.auth_user_id = new.id then 0 else 1 end
  limit 1;

  if existing_profile_id is null then
    insert into public.profiles (
      id,
      auth_user_id,
      email,
      display_name,
      full_name,
      first_name,
      last_name,
      avatar_url,
      role,
      is_active
    )
    values (
      gen_random_uuid(),
      new.id,
      new.email,
      resolved_display_name,
      coalesce(raw_full_name, nullif(btrim(concat_ws(' ', derived_first_name, derived_last_name)), '')),
      derived_first_name,
      derived_last_name,
      new.raw_user_meta_data ->> 'avatar_url',
      'user',
      true
    );
  else
    update public.profiles
    set
      auth_user_id = coalesce(public.profiles.auth_user_id, new.id),
      email = coalesce(new.email, public.profiles.email),
      display_name = coalesce(nullif(btrim(public.profiles.display_name), ''), resolved_display_name),
      full_name = coalesce(raw_full_name, public.profiles.full_name),
      first_name = coalesce(derived_first_name, public.profiles.first_name),
      last_name = coalesce(derived_last_name, public.profiles.last_name),
      avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', public.profiles.avatar_url),
      updated_at = now()
    where public.profiles.id = existing_profile_id;
  end if;

  return new;
end;
$$;

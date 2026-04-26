-- Assign an admin role to an existing user.
--
-- How to use:
-- 1. Open Supabase Dashboard -> SQL Editor.
-- 2. Replace the values in the "settings" CTE.
-- 3. Run the script.
--
-- Admin access in the app is granted to active memberships with role:
-- - owner
-- - coach

with settings as (
  select
    'admin@example.com'::text as user_email,
    'tatry'::text as team_slug,
    'owner'::text as admin_role
),
selected_profile as (
  select profiles.id
  from public.profiles
  join settings on lower(profiles.email) = lower(settings.user_email)
  limit 1
),
selected_team as (
  select teams.id
  from public.teams
  join settings on teams.slug = settings.team_slug
  limit 1
),
validated as (
  select
    selected_profile.id as profile_id,
    selected_team.id as team_id,
    settings.admin_role as role
  from settings
  left join selected_profile on true
  left join selected_team on true
)
insert into public.team_memberships (
  profile_id,
  team_id,
  role,
  status,
  joined_at
)
select
  profile_id,
  team_id,
  role,
  'active',
  now()
from validated
where
  profile_id is not null
  and team_id is not null
  and role in ('owner', 'coach')
on conflict (team_id, profile_id)
do update set
  role = excluded.role,
  status = 'active',
  joined_at = coalesce(public.team_memberships.joined_at, now()),
  updated_at = now()
returning
  id,
  profile_id,
  team_id,
  role,
  status,
  joined_at;

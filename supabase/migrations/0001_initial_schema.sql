create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_not_empty check (length(trim(name)) > 0),
  constraint teams_slug_not_empty check (length(trim(slug)) > 0)
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player',
  status text not null default 'active',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_memberships_unique_member unique (team_id, profile_id),
  constraint team_memberships_role_check check (role in ('owner', 'coach', 'player')),
  constraint team_memberships_status_check check (status in ('active', 'invited', 'inactive'))
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_team_id uuid references public.teams(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_title_not_empty check (length(trim(title)) > 0),
  constraint matches_status_check check (status in ('scheduled', 'cancelled', 'completed')),
  constraint matches_different_teams check (opponent_team_id is null or opponent_team_id <> team_id)
);

create table public.match_responses (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,
  note text,
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_responses_unique_response unique (match_id, profile_id),
  constraint match_responses_status_check check (status in ('available', 'unavailable', 'maybe'))
);

create index team_memberships_profile_id_idx on public.team_memberships(profile_id);
create index team_memberships_team_id_idx on public.team_memberships(team_id);
create index matches_team_id_starts_at_idx on public.matches(team_id, starts_at);
create index matches_opponent_team_id_idx on public.matches(opponent_team_id);
create index match_responses_profile_id_idx on public.match_responses(profile_id);
create index match_responses_match_id_idx on public.match_responses(match_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger team_memberships_set_updated_at
before update on public.team_memberships
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger match_responses_set_updated_at
before update on public.match_responses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

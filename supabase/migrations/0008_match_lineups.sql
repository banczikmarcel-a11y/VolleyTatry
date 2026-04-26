create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, profile_id)
);

alter table public.match_lineups enable row level security;

drop policy if exists "match_lineups_select_authenticated" on public.match_lineups;
create policy "match_lineups_select_authenticated"
on public.match_lineups
for select
to authenticated
using (true);

drop policy if exists "match_lineups_admin_write" on public.match_lineups;
create policy "match_lineups_admin_write"
on public.match_lineups
for all
to authenticated
using (false)
with check (false);

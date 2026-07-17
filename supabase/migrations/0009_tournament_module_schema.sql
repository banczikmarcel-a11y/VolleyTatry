create table if not exists public.tournament_formats (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null unique,
  description text,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_formats_key_not_empty check (length(trim(key)) > 0),
  constraint tournament_formats_key_format check (key ~ '^[a-z0-9_]+$'),
  constraint tournament_formats_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  format_id uuid not null references public.tournament_formats(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft',
  is_public boolean not null default true,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournaments_slug_not_empty check (length(trim(slug)) > 0),
  constraint tournaments_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tournaments_name_not_empty check (length(trim(name)) > 0),
  constraint tournaments_status_check check (status in ('draft', 'scheduled', 'in_progress', 'completed', 'archived')),
  constraint tournaments_date_order_check check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text,
  sort_order integer not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_groups_tournament_id_id_unique unique (tournament_id, id),
  constraint tournament_groups_tournament_id_code_unique unique (tournament_id, code),
  constraint tournament_groups_tournament_id_sort_order_unique unique (tournament_id, sort_order),
  constraint tournament_groups_code_check check (code in ('A', 'B', 'C', 'D')),
  constraint tournament_groups_sort_order_check check (sort_order between 1 and 4),
  constraint tournament_groups_name_not_empty check (name is null or length(trim(name)) > 0)
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  tournament_group_id uuid not null,
  display_name text,
  seed_number integer,
  sort_order integer,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_teams_tournament_id_id_unique unique (tournament_id, id),
  constraint tournament_teams_tournament_id_team_id_unique unique (tournament_id, team_id),
  constraint tournament_teams_group_seed_unique unique (tournament_id, tournament_group_id, seed_number),
  constraint tournament_teams_group_sort_order_unique unique (tournament_id, tournament_group_id, sort_order),
  constraint tournament_teams_display_name_not_empty check (display_name is null or length(trim(display_name)) > 0),
  constraint tournament_teams_seed_number_check check (seed_number is null or seed_number > 0),
  constraint tournament_teams_sort_order_check check (sort_order is null or sort_order > 0),
  constraint tournament_teams_group_fk foreign key (tournament_id, tournament_group_id) references public.tournament_groups(tournament_id, id) on delete restrict
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  tournament_group_id uuid,
  match_id uuid unique references public.matches(id) on delete set null,
  home_tournament_team_id uuid,
  away_tournament_team_id uuid,
  referee_tournament_team_id uuid,
  phase text not null,
  round_number integer,
  slot_number integer,
  placement_rank integer,
  bracket_key text,
  label text,
  scheduled_at timestamptz,
  location text,
  status text not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_matches_tournament_id_id_unique unique (tournament_id, id),
  constraint tournament_matches_phase_slot_unique unique (tournament_id, phase, round_number, slot_number),
  constraint tournament_matches_phase_check check (phase in ('group_stage', 'semifinal', 'final', 'bronze', 'placement')),
  constraint tournament_matches_status_check check (status in ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  constraint tournament_matches_round_number_check check (round_number is null or round_number > 0),
  constraint tournament_matches_slot_number_check check (slot_number is null or slot_number > 0),
  constraint tournament_matches_placement_rank_check check (placement_rank is null or placement_rank in (3, 5, 7, 9)),
  constraint tournament_matches_home_away_different_check check (
    home_tournament_team_id is null
    or away_tournament_team_id is null
    or home_tournament_team_id <> away_tournament_team_id
  ),
  constraint tournament_matches_referee_not_playing_check check (
    referee_tournament_team_id is null
    or (home_tournament_team_id is null or referee_tournament_team_id <> home_tournament_team_id)
    and (away_tournament_team_id is null or referee_tournament_team_id <> away_tournament_team_id)
  ),
  constraint tournament_matches_group_phase_shape_check check (
    (phase = 'group_stage' and tournament_group_id is not null and placement_rank is null)
    or (phase in ('semifinal', 'final', 'bronze') and tournament_group_id is null and placement_rank is null)
    or (phase = 'placement' and tournament_group_id is null and placement_rank in (5, 7, 9))
  ),
  constraint tournament_matches_label_not_empty check (label is null or length(trim(label)) > 0),
  constraint tournament_matches_group_fk foreign key (tournament_id, tournament_group_id) references public.tournament_groups(tournament_id, id) on delete restrict,
  constraint tournament_matches_home_team_fk foreign key (tournament_id, home_tournament_team_id) references public.tournament_teams(tournament_id, id) on delete restrict,
  constraint tournament_matches_away_team_fk foreign key (tournament_id, away_tournament_team_id) references public.tournament_teams(tournament_id, id) on delete restrict,
  constraint tournament_matches_referee_team_fk foreign key (tournament_id, referee_tournament_team_id) references public.tournament_teams(tournament_id, id) on delete restrict
);

create table if not exists public.match_sources (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  tournament_match_id uuid not null,
  participant_slot text not null,
  source_type text not null,
  source_tournament_team_id uuid,
  source_group_code text,
  source_group_position integer,
  source_tournament_match_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint match_sources_tournament_match_participant_unique unique (tournament_match_id, participant_slot),
  constraint match_sources_participant_slot_check check (participant_slot in ('home', 'away')),
  constraint match_sources_source_type_check check (source_type in ('tournament_team', 'group_position', 'match_winner', 'match_loser')),
  constraint match_sources_source_group_code_check check (source_group_code is null or source_group_code in ('A', 'B', 'C', 'D')),
  constraint match_sources_source_group_position_check check (source_group_position is null or source_group_position > 0),
  constraint match_sources_no_self_reference_check check (source_tournament_match_id is null or source_tournament_match_id <> tournament_match_id),
  constraint match_sources_source_shape_check check (
    (source_type = 'tournament_team' and source_tournament_team_id is not null and source_group_code is null and source_group_position is null and source_tournament_match_id is null)
    or (source_type = 'group_position' and source_tournament_team_id is null and source_group_code is not null and source_group_position is not null and source_tournament_match_id is null)
    or (source_type = 'match_winner' and source_tournament_team_id is null and source_group_code is null and source_group_position is null and source_tournament_match_id is not null)
    or (source_type = 'match_loser' and source_tournament_team_id is null and source_group_code is null and source_group_position is null and source_tournament_match_id is not null)
  ),
  constraint match_sources_tournament_match_fk foreign key (tournament_id, tournament_match_id) references public.tournament_matches(tournament_id, id) on delete cascade,
  constraint match_sources_source_team_fk foreign key (tournament_id, source_tournament_team_id) references public.tournament_teams(tournament_id, id) on delete restrict,
  constraint match_sources_source_match_fk foreign key (tournament_id, source_tournament_match_id) references public.tournament_matches(tournament_id, id) on delete restrict
);

create table if not exists public.match_sets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  tournament_match_id uuid not null,
  set_number integer not null,
  home_points integer not null,
  away_points integer not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint match_sets_tournament_match_set_number_unique unique (tournament_match_id, set_number),
  constraint match_sets_set_number_check check (set_number > 0),
  constraint match_sets_home_points_check check (home_points >= 0),
  constraint match_sets_away_points_check check (away_points >= 0),
  constraint match_sets_tournament_match_fk foreign key (tournament_id, tournament_match_id) references public.tournament_matches(tournament_id, id) on delete cascade
);

create table if not exists public.final_standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  tournament_team_id uuid not null,
  final_position integer not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint final_standings_tournament_team_unique unique (tournament_id, tournament_team_id),
  constraint final_standings_tournament_position_unique unique (tournament_id, final_position),
  constraint final_standings_final_position_check check (final_position > 0),
  constraint final_standings_notes_not_empty check (notes is null or length(trim(notes)) > 0),
  constraint final_standings_team_fk foreign key (tournament_id, tournament_team_id) references public.tournament_teams(tournament_id, id) on delete restrict
);

create index if not exists tournaments_format_id_idx on public.tournaments(format_id);
create index if not exists tournaments_status_idx on public.tournaments(status);
create index if not exists tournaments_is_public_idx on public.tournaments(is_public);
create index if not exists tournaments_starts_at_idx on public.tournaments(starts_at);

create index if not exists tournament_groups_tournament_id_sort_order_idx on public.tournament_groups(tournament_id, sort_order);

create index if not exists tournament_teams_tournament_group_id_idx on public.tournament_teams(tournament_group_id);
create index if not exists tournament_teams_team_id_idx on public.tournament_teams(team_id);

create index if not exists tournament_matches_tournament_phase_status_idx on public.tournament_matches(tournament_id, phase, status);
create index if not exists tournament_matches_group_scheduled_idx on public.tournament_matches(tournament_group_id, scheduled_at);
create index if not exists tournament_matches_scheduled_at_idx on public.tournament_matches(scheduled_at);
create index if not exists tournament_matches_home_team_idx on public.tournament_matches(home_tournament_team_id);
create index if not exists tournament_matches_away_team_idx on public.tournament_matches(away_tournament_team_id);
create index if not exists tournament_matches_referee_team_idx on public.tournament_matches(referee_tournament_team_id);

create index if not exists match_sources_source_match_idx on public.match_sources(source_tournament_match_id);
create index if not exists match_sources_source_team_idx on public.match_sources(source_tournament_team_id);

create index if not exists match_sets_tournament_match_id_idx on public.match_sets(tournament_match_id);

create index if not exists final_standings_tournament_position_idx on public.final_standings(tournament_id, final_position);

drop trigger if exists tournament_formats_set_updated_at on public.tournament_formats;
create trigger tournament_formats_set_updated_at
before update on public.tournament_formats
for each row execute function public.set_updated_at();

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

drop trigger if exists tournament_groups_set_updated_at on public.tournament_groups;
create trigger tournament_groups_set_updated_at
before update on public.tournament_groups
for each row execute function public.set_updated_at();

drop trigger if exists tournament_teams_set_updated_at on public.tournament_teams;
create trigger tournament_teams_set_updated_at
before update on public.tournament_teams
for each row execute function public.set_updated_at();

drop trigger if exists tournament_matches_set_updated_at on public.tournament_matches;
create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row execute function public.set_updated_at();

drop trigger if exists match_sources_set_updated_at on public.match_sources;
create trigger match_sources_set_updated_at
before update on public.match_sources
for each row execute function public.set_updated_at();

drop trigger if exists match_sets_set_updated_at on public.match_sets;
create trigger match_sets_set_updated_at
before update on public.match_sets
for each row execute function public.set_updated_at();

drop trigger if exists final_standings_set_updated_at on public.final_standings;
create trigger final_standings_set_updated_at
before update on public.final_standings
for each row execute function public.set_updated_at();

create or replace function public.handle_tournament_match_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.match_id is not null then
    delete from public.matches where id = old.match_id;
  end if;

  return old;
end;
$$;

drop trigger if exists tournament_matches_delete_base_match on public.tournament_matches;
create trigger tournament_matches_delete_base_match
after delete on public.tournament_matches
for each row execute function public.handle_tournament_match_delete();

insert into public.tournament_formats (
  key,
  name,
  description,
  rules,
  is_active
)
values (
  'ten_teams_two_groups_semifinals_placement',
  '10 tímov; 2x5; semifinále; o umiestnenie',
  '10 teams in two groups of five, semifinals for top two, and placement matches for the remaining positions.',
  jsonb_build_object(
    'team_count', 10,
    'group_count', 2,
    'allowed_group_codes', jsonb_build_array('A', 'B', 'C', 'D'),
    'teams_per_group', 5,
    'group_stage', jsonb_build_object(
      'round_robin', true,
      'points', jsonb_build_object('win', 2, 'draw', 1, 'loss', 0),
      'allows_draw', true,
      'records_sets', true,
      'records_rally_points', true
    ),
    'advancement', jsonb_build_array(
      jsonb_build_object('phase', 'semifinal', 'slot', 1, 'home', 'A1', 'away', 'B2'),
      jsonb_build_object('phase', 'semifinal', 'slot', 2, 'home', 'B1', 'away', 'A2'),
      jsonb_build_object('phase', 'bronze', 'slot', 1, 'home', 'SF1L', 'away', 'SF2L'),
      jsonb_build_object('phase', 'final', 'slot', 1, 'home', 'SF1W', 'away', 'SF2W'),
      jsonb_build_object('phase', 'placement', 'slot', 5, 'home', 'A3', 'away', 'B3'),
      jsonb_build_object('phase', 'placement', 'slot', 7, 'home', 'A4', 'away', 'B4'),
      jsonb_build_object('phase', 'placement', 'slot', 9, 'home', 'A5', 'away', 'B5')
    ),
    'playoff', jsonb_build_object(
      'best_of_sets', 3,
      'sets_to_win', 2,
      'set_target_points', 15,
      'win_by_two', true,
      'allows_draw', false
    ),
    'referee', jsonb_build_object(
      'same_group_only', true,
      'not_playing_same_time', true,
      'balance_evenly', true
    )
  ),
  true
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  rules = excluded.rules,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

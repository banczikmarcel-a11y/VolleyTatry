alter table public.tournaments
add column if not exists court_count integer not null default 1,
add column if not exists match_duration_minutes integer not null default 20,
add column if not exists break_duration_minutes integer not null default 5;

alter table public.tournaments
drop constraint if exists tournaments_court_count_check,
add constraint tournaments_court_count_check check (court_count between 1 and 8);

alter table public.tournaments
drop constraint if exists tournaments_match_duration_minutes_check,
add constraint tournaments_match_duration_minutes_check check (match_duration_minutes > 0 and match_duration_minutes <= 180);

alter table public.tournaments
drop constraint if exists tournaments_break_duration_minutes_check,
add constraint tournaments_break_duration_minutes_check check (break_duration_minutes >= 0 and break_duration_minutes <= 120);

create table if not exists public.tournament_result_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  tournament_match_id uuid not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now()),
  previous_result jsonb,
  new_result jsonb not null,
  correction_reason text,
  constraint tournament_result_audit_logs_match_fk foreign key (tournament_id, tournament_match_id) references public.tournament_matches(tournament_id, id) on delete cascade,
  constraint tournament_result_audit_logs_previous_result_object_check check (
    previous_result is null or jsonb_typeof(previous_result) = 'object'
  ),
  constraint tournament_result_audit_logs_new_result_object_check check (
    jsonb_typeof(new_result) = 'object'
  ),
  constraint tournament_result_audit_logs_correction_reason_not_empty check (
    correction_reason is null or length(trim(correction_reason)) > 0
  )
);

create index if not exists tournament_result_audit_logs_match_changed_at_idx
on public.tournament_result_audit_logs(tournament_match_id, changed_at desc);

create index if not exists tournament_result_audit_logs_tournament_idx
on public.tournament_result_audit_logs(tournament_id, changed_at desc);

create or replace function public.prevent_tournament_result_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Tournament result audit logs are immutable.';
end;
$$;

drop trigger if exists tournament_result_audit_logs_prevent_update on public.tournament_result_audit_logs;
create trigger tournament_result_audit_logs_prevent_update
before update on public.tournament_result_audit_logs
for each row execute function public.prevent_tournament_result_audit_log_mutation();

drop trigger if exists tournament_result_audit_logs_prevent_delete on public.tournament_result_audit_logs;
create trigger tournament_result_audit_logs_prevent_delete
before delete on public.tournament_result_audit_logs
for each row execute function public.prevent_tournament_result_audit_log_mutation();

alter table public.tournament_result_audit_logs enable row level security;

drop policy if exists "tournament_result_audit_logs_admin_select" on public.tournament_result_audit_logs;
create policy "tournament_result_audit_logs_admin_select"
on public.tournament_result_audit_logs
for select
to authenticated
using (public.is_team_admin());

drop policy if exists "tournament_result_audit_logs_admin_insert" on public.tournament_result_audit_logs;
create policy "tournament_result_audit_logs_admin_insert"
on public.tournament_result_audit_logs
for insert
to authenticated
with check (public.is_team_admin());

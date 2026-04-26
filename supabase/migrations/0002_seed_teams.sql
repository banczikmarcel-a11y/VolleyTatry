insert into public.teams (name, slug)
values
  ('Tatry', 'tatry'),
  ('Ostatní', 'ostatni')
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();

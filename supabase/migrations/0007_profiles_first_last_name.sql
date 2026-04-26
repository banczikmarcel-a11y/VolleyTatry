alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.profiles
set
  first_name = coalesce(
    first_name,
    case
      when full_name is null or btrim(full_name) = '' then null
      when strpos(btrim(full_name), ' ') = 0 then btrim(full_name)
      else regexp_replace(btrim(full_name), '\s+\S+$', '')
    end
  ),
  last_name = coalesce(
    last_name,
    case
      when full_name is null or btrim(full_name) = '' then null
      when strpos(btrim(full_name), ' ') = 0 then null
      else regexp_replace(btrim(full_name), '^.*\s+(\S+)$', '\1')
    end
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  raw_full_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  raw_first_name text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  raw_last_name text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  derived_first_name text;
  derived_last_name text;
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

  insert into public.profiles (id, email, full_name, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(raw_full_name, nullif(btrim(concat_ws(' ', derived_first_name, derived_last_name)), '')),
    derived_first_name,
    derived_last_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

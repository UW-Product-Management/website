create function public.list_organizers()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer() then
    raise exception 'not_organizer';
  end if;

  return query
  select organizers.user_id, profiles.email, profiles.full_name,
         organizers.created_at
  from public.organizers
  left join public.profiles on profiles.id = organizers.user_id
  order by organizers.created_at;
end;
$$;

create function public.add_organizer(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(target_email));
  target_user_id uuid;
begin
  if not public.is_organizer() then
    raise exception 'not_organizer';
  end if;

  if normalized_email is null or normalized_email !~ '^[^@\s]+@[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = normalized_email;

  if not found then
    raise exception 'user_not_found';
  end if;

  if exists (
    select 1 from public.organizers where user_id = target_user_id
  ) then
    raise exception 'already_organizer';
  end if;

  insert into public.organizers (user_id) values (target_user_id);
end;
$$;

create function public.remove_organizer(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer() then
    raise exception 'not_organizer';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'cannot_remove_self';
  end if;

  delete from public.organizers where user_id = target_user_id;

  if not found then
    raise exception 'organizer_not_found';
  end if;
end;
$$;

revoke execute on function public.list_organizers() from public, anon;
grant execute on function public.list_organizers() to authenticated;
revoke execute on function public.add_organizer(text) from public, anon;
grant execute on function public.add_organizer(text) to authenticated;
revoke execute on function public.remove_organizer(uuid) from public, anon;
grant execute on function public.remove_organizer(uuid) to authenticated;

-- 008: let a signed-in user change only their own display name (profile menu).
create or replace function set_display_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare n text := left(btrim(coalesce(new_name, '')), 80);
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if length(n) < 2 then raise exception 'Name is too short'; end if;
  update accounts set display_name = n where user_id = auth.uid();
  return n;
end $$;
revoke all on function set_display_name(text) from public, anon;
grant execute on function set_display_name(text) to authenticated;

-- Profile picture: one icon chosen from a fixed list in the app.
alter table accounts add column if not exists avatar text;
create or replace function set_avatar(new_avatar text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if new_avatar is not null and length(new_avatar) > 16 then raise exception 'Not a valid icon'; end if;
  update accounts set avatar = new_avatar where user_id = auth.uid();
  return new_avatar;
end $$;
revoke all on function set_avatar(text) from public, anon;
grant execute on function set_avatar(text) to authenticated;

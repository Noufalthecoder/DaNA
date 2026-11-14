-- 022: DaNA ID search says WHY nothing matched (same sex, already linked, own ID, not found)
-- instead of an empty list. Run after 021. Safe to re-run.
-- Still exact DaNA ID only, still rate limited; personal details are returned only for a valid match.

drop function if exists find_partner(text);
create or replace function find_partner(q text) returns table (
  person_id text, display_name text, avatar text, sex text, dana_id text, email_hint text, status text
)
language plpgsql volatile security definer set search_path = public as $$
declare
  me     text := my_person();
  my_sex text := (select p.sex from people p where p.id = my_person());
  clean  text := upper(regexp_replace(coalesce(q, ''), '\s+', '', 'g'));
  n      int;
  a      accounts;
  their  text;
  why    text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if me is null then raise exception 'Create your profile first'; end if;
  if clean ~ '^[0-9A-F]{6}$' then clean := 'DANA-' || clean; end if;
  if clean !~ '^DANA-[0-9A-F]{6}$' then
    raise exception 'Enter a DaNA ID like DANA-3F9A2C. Ask your partner for theirs.';
  end if;
  select count(*) into n from partner_lookups
   where user_id = auth.uid() and created_at > now() - interval '10 minutes';
  if n >= 10 then raise exception 'Too many searches. Wait a few minutes and try again.'; end if;

  select * into a from accounts x
   where x.role = 'couple' and x.person_id is not null
     and 'DANA-' || upper(substr(x.person_id, 3, 6)) = clean
   limit 1;
  their := (select p.sex from people p where p.id = a.person_id);

  why := case
    when a.person_id is null          then 'not_found'
    when a.person_id = me             then 'self'
    when my_sex is null or their is null then 'no_sex'
    when their = my_sex               then 'same_sex'
    when has_real_couple(a.person_id) then 'linked'
    else 'ok' end;

  insert into partner_lookups (user_id, found) values (auth.uid(), why = 'ok');

  if why = 'ok' then
    return query select a.person_id,
      split_part(btrim(a.display_name), ' ', 1)
        || coalesce(' ' || nullif(left(split_part(btrim(a.display_name), ' ', 2), 1), '') || '.', ''),
      a.avatar, their, clean, null::text, 'ok'::text;
  else
    return query select null::text, null::text, null::text, null::text, clean, null::text, why;
  end if;
end $$;
revoke all on function find_partner(text) from public, anon;
grant execute on function find_partner(text) to authenticated;

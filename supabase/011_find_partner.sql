-- 011: find your partner by full name or exact email, without exposing the member list.
-- Run after 010. Safe to re-run.
--
-- Only an exact full name (any case, extra spaces ignored) or an exact email matches:
-- typing "Ahm" or "%" returns nothing, so nobody can browse who uses DaNA.
-- Results show name, avatar and a masked email only. People already linked are left out.

create or replace function find_partner(q text) returns table (
  person_id    text,
  display_name text,
  avatar       text,
  sex          text,
  email_hint   text
)
language plpgsql stable security definer set search_path = public as $$
declare
  me    text := my_person();
  clean text := lower(regexp_replace(btrim(coalesce(q, '')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if length(clean) < 3 then return; end if;
  return query
    select a.person_id, a.display_name, a.avatar, p.sex::text,
           case when a.email is null then null
                else left(a.email, 1) || '•••' || substr(a.email, strpos(a.email, '@')) end
    from accounts a
    join people p on p.id = a.person_id
    where a.role = 'couple'
      and a.person_id is distinct from me
      and (lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) = clean or lower(a.email) = clean)
      and not exists (select 1 from couples c where a.person_id in (c.partner_a, c.partner_b))
    order by a.display_name
    limit 5;
end $$;
revoke all on function find_partner(text) from public, anon;
grant execute on function find_partner(text) to authenticated;

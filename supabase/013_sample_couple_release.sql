-- 013: accounts made before real onboarding were paired with a "Sample partner" (id p_...).
-- That fake couple must not count as "already linked": such people can be found, can send
-- and accept requests or codes, and the sample couple is removed when a real partner links.
-- Run after 012. Safe to re-run.

-- a real couple = neither partner is a sample partner
create or replace function has_real_couple(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from couples c
                 where p in (c.partner_a, c.partner_b)
                   and c.partner_a not like 'p\_%' and c.partner_b not like 'p\_%')
$$;
revoke all on function has_real_couple(text) from public, anon;
grant execute on function has_real_couple(text) to authenticated;

-- remove this person's sample couple and everything attached to it (their own results stay)
create or replace function release_sample_couple(p text) returns void
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  for cid in select c.id from couples c
             where p in (c.partner_a, c.partner_b) and (c.partner_a like 'p\_%' or c.partner_b like 'p\_%')
  loop
    update counsellor_availability set is_booked = false
     where id in (select slot_id from appointments where couple_id = cid and slot_id is not null);
    delete from appointments     where couple_id = cid;
    delete from notes            where couple_id = cid;
    delete from plans            where couple_id = cid;
    delete from partner_consents where couple_id = cid;
    delete from clinical_cases   where couple_id = cid;   -- assignments and referrals cascade
    delete from couples          where id = cid;
  end loop;
end $$;
revoke all on function release_sample_couple(text) from public, anon, authenticated;

-- linking: drop sample couples first, then refuse only if someone has a REAL partner
create or replace function link_couple(p_a text, p_b text, p_how text) returns text
language plpgsql security definer set search_path = public as $$
declare cid text := 'k_' || left(md5(p_a || p_b), 12);
begin
  if p_a = p_b then raise exception 'You cannot link with yourself'; end if;
  if not exists (select 1 from people where id = p_a) or not exists (select 1 from people where id = p_b) then
    raise exception 'Both people need a DaNA profile first';
  end if;
  if has_real_couple(p_a) or has_real_couple(p_b) then
    raise exception 'One of you is already linked to a partner';
  end if;
  perform release_sample_couple(p_a);
  perform release_sample_couple(p_b);
  insert into couples (id, partner_a, partner_b, stage, screened_on) values (cid, p_a, p_b, 'engaged', current_date);
  update accounts set title = 'Partner · engaged' where person_id in (p_a, p_b);
  perform upsert_case(cid);
  update counsellors k set active_caseload = (select count(*) from case_assignments a
    where a.counsellor_id = k.id and a.status = 'active') where true;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), 'Linked with a partner (' || p_how || ')', 'couples', cid);
  return cid;
end $$;
revoke all on function link_couple(text, text, text) from public, anon, authenticated;

create or replace function create_partner_invite() returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); c text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if has_real_couple(me) then raise exception 'You are already linked to a partner'; end if;
  select code into c from partner_invites
   where from_person = me and accepted_by is null and expires_at > now()
   order by created_at desc limit 1;
  if c is not null then return c; end if;
  loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
          from generate_series(1, 6));
    exit when not exists (select 1 from partner_invites where code = c);
  end loop;
  insert into partner_invites (code, from_person) values (c, me);
  return c;
end $$;

create or replace function accept_partner_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); inv partner_invites; cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if has_real_couple(me) then raise exception 'You are already linked to a partner'; end if;
  select * into inv from partner_invites where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'That code was not found. Check it and try again.'; end if;
  if inv.from_person = me then raise exception 'That is your own code. Send it to your partner.'; end if;
  if inv.accepted_by is not null then raise exception 'That code has already been used'; end if;
  if inv.expires_at < now() then raise exception 'That code has expired. Ask your partner for a new one.'; end if;
  cid := link_couple(inv.from_person, me, 'invite code');
  update partner_invites set accepted_by = me, accepted_at = now() where code = inv.code;
  return cid;
end $$;
revoke all on function create_partner_invite(), accept_partner_invite(text) from public, anon;
grant execute on function create_partner_invite(), accept_partner_invite(text) to authenticated;

-- search: hide only people with a REAL partner
drop function if exists find_partner(text);
create or replace function find_partner(q text) returns table (
  person_id text, display_name text, avatar text, sex text, dana_id text, email_hint text
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
           'DANA-' || upper(substr(a.person_id, 3, 6)),
           case when a.email is null then null
                else left(a.email, 1) || '•••' || substr(a.email, strpos(a.email, '@')) end
    from accounts a
    join people p on p.id = a.person_id
    where a.role = 'couple'
      and a.person_id is distinct from me
      and (lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) = clean
           or lower(a.email) = clean
           or lower('DANA-' || substr(a.person_id, 3, 6)) = clean)
      and not has_real_couple(a.person_id)
    order by a.display_name
    limit 5;
end $$;
revoke all on function find_partner(text) from public, anon;
grant execute on function find_partner(text) to authenticated;

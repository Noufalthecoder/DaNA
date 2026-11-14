-- 023: disconnect and block, done by the database so both people see the same thing.
-- Run after 022. Safe to re-run.
--   unlink_partner()          either partner ends the link; the couple and its shared data are removed for both.
--                             Each person keeps their own results.
--   block_person(id)          ends any link with them, cancels requests both ways, stops all contact.
--   unblock_person(id)        lifts my block (contact is possible again; nothing is restored).
--   my_blocks()               the people I blocked (only mine; nobody can see who blocked them).
-- A block works both ways: neither person can find, request or link with the other.

create table if not exists public.person_blocks (
  blocker    text not null references people (id),
  blocked    text not null references people (id),
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.person_blocks enable row level security;
revoke all on public.person_blocks from public, anon, authenticated;   -- functions only

create or replace function is_blocked(a text, b text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from person_blocks
                 where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;
revoke all on function is_blocked(text, text) from public, anon, authenticated;

-- remove one couple and everything attached to it (each person's own results stay)
create or replace function end_couple(cid text, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update counsellor_availability set is_booked = false
   where id in (select slot_id from appointments where couple_id = cid and slot_id is not null);
  delete from risk_assessments where couple_id = cid;
  delete from appointments     where couple_id = cid;
  delete from notes            where couple_id = cid;
  delete from plans            where couple_id = cid;
  delete from partner_consents where couple_id = cid;
  delete from clinical_cases   where couple_id = cid;   -- assignments and referrals cascade
  delete from couples          where id = cid;
  update counsellors k set active_caseload = (select count(*) from case_assignments a
    where a.counsellor_id = k.id and a.status = 'active') where true;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), why, 'couples', cid);
end $$;
revoke all on function end_couple(text, text) from public, anon, authenticated;

create or replace function unlink_partner() returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); c couples; other text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  select * into c from couples x
   where me in (x.partner_a, x.partner_b) and x.partner_a not like 'p\_%' and x.partner_b not like 'p\_%'
   limit 1;
  if not found then raise exception 'You are not linked to a partner'; end if;
  other := case when c.partner_a = me then c.partner_b else c.partner_a end;
  perform end_couple(c.id, 'Disconnected from partner');
  update connection_requests set status = 'CANCELLED', updated_at = now()
   where status = 'PENDING' and ((sender_id = me and receiver_id = other) or (sender_id = other and receiver_id = me));
  update accounts set title = null where person_id in (me, other);
  return other;
end $$;

create or replace function block_person(p text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if p is null or p = me then raise exception 'You cannot block yourself'; end if;
  if not exists (select 1 from people where id = p) then raise exception 'Person not found'; end if;
  select id into cid from couples where (partner_a = me and partner_b = p) or (partner_a = p and partner_b = me) limit 1;
  if cid is not null then
    perform end_couple(cid, 'Disconnected (blocked)');
    update accounts set title = null where person_id in (me, p);
  end if;
  update connection_requests set status = 'CANCELLED', updated_at = now()
   where status = 'PENDING' and ((sender_id = me and receiver_id = p) or (sender_id = p and receiver_id = me));
  update partner_invites set expires_at = now()
   where from_person in (me, p) and accepted_by is null and expires_at > now();
  insert into person_blocks (blocker, blocked) values (me, p) on conflict do nothing;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), 'Blocked a person', 'person_blocks', p);
  return true;
end $$;

create or replace function unblock_person(p text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me text := my_person();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  delete from person_blocks where blocker = me and blocked = p;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), 'Unblocked a person', 'person_blocks', p);
  return true;
end $$;

create or replace function my_blocks() returns table (person_id text, display_name text, dana_id text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked, coalesce(a.display_name, pp.name), 'DANA-' || upper(substr(b.blocked, 3, 6)), b.created_at
  from person_blocks b
  join people pp on pp.id = b.blocked
  left join accounts a on a.person_id = b.blocked
  where b.blocker = my_person()
  order by b.created_at desc
$$;

revoke all on function unlink_partner(), block_person(text), unblock_person(text), my_blocks() from public, anon;
grant execute on function unlink_partner(), block_person(text), unblock_person(text), my_blocks() to authenticated;

-- blocks are respected everywhere a link can start ---------------------------------------
-- patch(): edit an existing function's body; stops loudly if the expected line is not there
create or replace function pg_temp.patch(fn regprocedure, old text, new text) returns void language plpgsql as $p$
declare src text := pg_get_functiondef(fn);
begin
  if position(new in src) > 0 then return; end if;            -- already patched (safe to re-run)
  if position(old in src) = 0 then raise exception 'patch: expected text not found in %', fn; end if;
  execute replace(src, old, new);
end $p$;
-- a) search: a blocked pair looks like "not found" (does not reveal the block)
do $$ begin
  perform pg_temp.patch('find_partner(text)'::regprocedure,
    $f$when a.person_id = me             then 'self'$f$,
    $f$when a.person_id = me             then 'self'
    when is_blocked(me, a.person_id)  then 'not_found'$f$);
end $$;

-- b) the one place every link is made (requests, invite codes) refuses a blocked pair
do $$ begin
  perform pg_temp.patch('link_couple(text,text,text)'::regprocedure,
    $f$if p_a = p_b then raise exception 'You cannot link with yourself'; end if;$f$,
    $f$if p_a = p_b then raise exception 'You cannot link with yourself'; end if;
  if is_blocked(p_a, p_b) then raise exception 'You cannot link with this person'; end if;$f$);
end $$;

-- c) sending a request
do $$ begin
  perform pg_temp.patch('send_connection_request(text,text)'::regprocedure,
    $f$if has_real_couple(me) then raise exception 'You are already linked to a partner'; end if;$f$,
    $f$if is_blocked(me, p_to) then raise exception 'That DaNA ID was not found'; end if;
  if has_real_couple(me) then raise exception 'You are already linked to a partner'; end if;$f$);
end $$;

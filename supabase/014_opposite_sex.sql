-- 014: premarital pairing is one woman and one man.
-- Search shows only the opposite sex; requests, codes and linking refuse a same-sex pair.
-- Run after 013. Safe to re-run.

create or replace function opposite_sex(p_a text, p_b text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.sex <> b.sex from people a, people b where a.id = p_a and b.id = p_b), false)
$$;
revoke all on function opposite_sex(text, text) from public, anon;
grant execute on function opposite_sex(text, text) to authenticated;

-- does this profile exist? (privacy rules would hide it from a plain lookup)
create or replace function person_exists(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = p)
$$;
revoke all on function person_exists(text) from public, anon;
grant execute on function person_exists(text) to authenticated;

-- a request can only go to someone of the opposite sex (receiver given as a profile id)
drop policy if exists conn_req_send on connection_requests;
create policy conn_req_send on connection_requests for insert to authenticated
  with check (sender_id = any (my_ids()) and receiver_id is distinct from sender_id
              and status = 'PENDING' and accepted = false
              and (receiver_id is null or not person_exists(receiver_id)
                   or opposite_sex(my_person(), receiver_id)));

-- every way of linking (request or code) ends here
create or replace function link_couple(p_a text, p_b text, p_how text) returns text
language plpgsql security definer set search_path = public as $$
declare cid text := 'k_' || left(md5(p_a || p_b), 12);
begin
  if p_a = p_b then raise exception 'You cannot link with yourself'; end if;
  if not exists (select 1 from people where id = p_a) or not exists (select 1 from people where id = p_b) then
    raise exception 'Both people need a DaNA profile first';
  end if;
  if not opposite_sex(p_a, p_b) then
    raise exception 'Premarital screening links a woman and a man. Check that both profiles have the right sex.';
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

-- search: opposite sex only
drop function if exists find_partner(text);
create or replace function find_partner(q text) returns table (
  person_id text, display_name text, avatar text, sex text, dana_id text, email_hint text
)
language plpgsql stable security definer set search_path = public as $$
declare
  me     text := my_person();
  my_sex text := (select p.sex from people p where p.id = my_person());
  clean  text := lower(regexp_replace(btrim(coalesce(q, '')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if me is null then raise exception 'Create your profile first'; end if;
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
      and p.sex <> my_sex
      and (lower(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g')) = clean
           or lower(a.email) = clean
           or lower('DANA-' || substr(a.person_id, 3, 6)) = clean)
      and not has_real_couple(a.person_id)
    order by a.display_name
    limit 5;
end $$;
revoke all on function find_partner(text) from public, anon;
grant execute on function find_partner(text) to authenticated;

-- let a person correct their own sex on their profile while not yet linked
create or replace function set_my_sex(p_sex text) returns text
language plpgsql security definer set search_path = public as $$
declare me text := my_person();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if p_sex not in ('M', 'F') then raise exception 'Choose male or female'; end if;
  if has_real_couple(me) then raise exception 'You are linked to a partner; ask your counsellor to correct this'; end if;
  update people set sex = p_sex where id = me;
  return p_sex;
end $$;
revoke all on function set_my_sex(text) from public, anon;
grant execute on function set_my_sex(text) to authenticated;

-- 012: Connections requests, done properly across accounts. Run after 011. Safe to re-run.
--  * my_connection_requests(): my sent and received requests WITH both people's name,
--    avatar and DaNA ID (privacy rules hide other people's rows, so the app can't join them itself)
--  * one pending request per pair, and never to yourself

-- 1. tidy any duplicates already stored, then forbid new ones
update connection_requests r set status = 'CANCELLED', updated_at = now()
where r.status = 'PENDING'
  and exists (select 1 from connection_requests o
              where o.status = 'PENDING' and o.sender_id = r.sender_id and o.receiver_id = r.receiver_id
                and (o.created_at, o.id::text) > (r.created_at, r.id::text));
create unique index if not exists uq_conn_req_pending
  on connection_requests (sender_id, receiver_id) where status = 'PENDING';

drop policy if exists conn_req_send on connection_requests;
create policy conn_req_send on connection_requests for insert to authenticated
  with check (sender_id = any (my_ids()) and receiver_id is distinct from sender_id
              and status = 'PENDING' and accepted = false);

-- 2. my requests with names (only rows I am part of; nothing else is revealed)
drop function if exists my_connection_requests();
create or replace function my_connection_requests() returns table (
  id              uuid,
  sender_id       text,
  receiver_id     text,
  status          text,
  note            text,
  created_at      timestamptz,
  accepted_at     timestamptz,
  incoming        boolean,
  sender_name     text,
  sender_avatar   text,
  sender_dana_id  text,
  receiver_name   text,
  receiver_avatar text,
  receiver_dana_id text
)
language sql stable security definer set search_path = public as $$
  with me as (select my_ids() ids)
  select r.id, r.sender_id, r.receiver_id, r.status::text, r.note, r.created_at, r.accepted_at,
         (r.receiver_id = any (me.ids) or coalesce(lower(r.recipient_email) = any (me.ids), false)) as incoming,
         sa.display_name, sa.avatar, 'DANA-' || upper(substr(coalesce(sa.person_id, r.sender_id), 3, 6)),
         ra.display_name, ra.avatar, 'DANA-' || upper(substr(coalesce(ra.person_id, r.receiver_id), 3, 6))
  from connection_requests r cross join me
  left join accounts sa on sa.person_id = r.sender_id or sa.user_id::text = r.sender_id
  left join accounts ra on ra.person_id = r.receiver_id or ra.user_id::text = r.receiver_id
  where r.sender_id = any (me.ids) or r.receiver_id = any (me.ids)
     or coalesce(lower(r.recipient_email) = any (me.ids), false)
  order by r.created_at desc
  limit 50
$$;
revoke all on function my_connection_requests() from public, anon;
grant execute on function my_connection_requests() to authenticated;

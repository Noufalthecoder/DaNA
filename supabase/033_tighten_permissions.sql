-- 033: close three permission gaps. Run after 032 (and after 021_consultation_requests and 031_admin_manages_counsellors).
-- Safe to re-run. The app's own flows keep working; only the unsafe direct changes are blocked.
--
--   1. A counsellor could mark THEMSELVES verified (counsellors_manage allowed user_id = auth.uid()).
--      Now only an admin may change a counsellor record directly; verifying goes through manage_counsellor().
--   2. A couple could set their own consultation request to CONFIRMED.
--      Now a couple may only cancel their own request.
--   3. Any counsellor could change any couple's consultation request.
--      Now a counsellor may only answer requests sent to them (or not yet assigned to anyone).

-- 1. counsellor records: admin only (security-definer functions such as manage_counsellor are unaffected)
drop policy if exists counsellors_manage on counsellors;
create policy counsellors_manage on counsellors for update to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- the signed-in counsellor's own record id
create or replace function my_counsellor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from counsellors where user_id = auth.uid()
$$;
revoke all on function my_counsellor_id() from public, anon;
grant execute on function my_counsellor_id() to authenticated;

-- 2 + 3. consultation requests: separate rules for the couple and for the counsellor
drop policy if exists consult_req_update_counsellor on public.consultation_requests;
drop policy if exists consult_req_update_couple on public.consultation_requests;
drop policy if exists consult_req_answer_counsellor on public.consultation_requests;

create policy consult_req_update_couple on public.consultation_requests for update to authenticated
  using (couple_id = my_couple())
  with check (couple_id = my_couple() and status = 'CANCELLED');

create policy consult_req_answer_counsellor on public.consultation_requests for update to authenticated
  using (my_counsellor_id() is not null and (counsellor_id is null or counsellor_id = my_counsellor_id()))
  with check (my_counsellor_id() is not null
              and (counsellor_id is null or counsellor_id = my_counsellor_id())
              and status in ('PENDING', 'CONFIRMED', 'DECLINED'));

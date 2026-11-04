-- =====================================================================
-- Booking from real counsellor availability. Run AFTER 004_spec_v3.sql.
-- SQL Editor -> New query -> Run. Safe to re-run.
--   book_slot(slot)          couple books a free slot of a counsellor
--   cancel_appointment(id)   couple cancels; the slot is freed
--   complete_appointment(id) counsellor marks a session done
-- Emergency-buffer slots can only be booked by Tier 1 (urgent) couples.
-- =====================================================================
alter table appointments add column if not exists slot_id uuid references counsellor_availability (id);

create or replace function book_slot(p_slot uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare cid text := my_couple(); s counsellor_availability; c clinical_cases; appt bigint;
begin
  if cid is null then raise exception 'Only a couple member can book'; end if;
  if exists (select 1 from appointments where couple_id = cid and status = 'booked') then
    raise exception 'You already have a session booked. Cancel it first to choose another time.';
  end if;
  select * into s from counsellor_availability where id = p_slot for update;
  if not found or s.is_booked or s.slot_start < now() then raise exception 'That time is no longer available'; end if;
  select * into c from clinical_cases where couple_id = cid;
  if s.is_emergency_buffer and coalesce(c.triage_tier, 4) <> 1 then
    raise exception 'That time is reserved for urgent cases';
  end if;
  update counsellor_availability set is_booked = true where id = p_slot;
  insert into appointments (couple_id, starts_at, status, case_id, counsellor_id, slot_id, meeting_type)
  values (cid, s.slot_start, 'booked', c.id, s.counsellor_id, p_slot, 'video')
  returning id into appt;
  return appt;
end $$;

create or replace function cancel_appointment(p_appt bigint) returns void
language plpgsql security definer set search_path = public as $$
declare a appointments;
begin
  select * into a from appointments where id = p_appt;
  if not found or a.couple_id is distinct from my_couple() then raise exception 'Not your appointment'; end if;
  update appointments set status = 'cancelled' where id = p_appt;
  update counsellor_availability set is_booked = false where id = a.slot_id;
end $$;

create or replace function complete_appointment(p_appt bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'counsellor' then raise exception 'Only a counsellor can complete a session'; end if;
  update appointments set status = 'done' where id = p_appt and status = 'booked';
  update clinical_cases set workflow_status = 'counselled', updated_at = now()
  where id = (select case_id from appointments where id = p_appt);
end $$;

grant execute on function book_slot(uuid), cancel_appointment(bigint), complete_appointment(bigint) to authenticated;

-- couples book through book_slot() only; remove the broader update rule from 004
drop policy if exists avail_manage on counsellor_availability;
create policy avail_manage on counsellor_availability for update to authenticated
  using (exists (select 1 from counsellors k where k.id = counsellor_availability.counsellor_id and k.user_id = auth.uid()));

-- link appointments booked before this upgrade to their case and counsellor
update appointments a set case_id = cc.id
from clinical_cases cc where cc.couple_id = a.couple_id and a.case_id is null;
update appointments a set counsellor_id = ca.counsellor_id
from case_assignments ca where ca.case_id = a.case_id and a.counsellor_id is null and ca.status = 'active';

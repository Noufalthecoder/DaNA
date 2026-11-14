-- =====================================================================
-- 021: Consultation Requests & Clinical Confirmation Workflow
-- Mirrors the connection_requests architecture for appointments.
-- Run in Supabase SQL Editor. Safe to re-run.
-- =====================================================================

-- 1. Create consultation_requests table
create table if not exists public.consultation_requests (
  id                    uuid primary key default gen_random_uuid(),
  couple_id             text not null references public.couples (id) on delete cascade,
  requester_id          text not null references public.people (id),
  counsellor_id         uuid references public.counsellors (id),
  slot_id               uuid references public.counsellor_availability (id),
  requested_starts_at   timestamptz not null,
  requested_ends_at     timestamptz,
  modality              varchar(20) not null default 'online' check (modality in ('online', 'offline')),
  topic                 varchar(255) not null default 'Pre-marital genetic counselling',
  status                varchar(24) not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED')),
  patient_notes         text,
  counsellor_notes      text,
  appointment_id        bigint references public.appointments (id),
  meet_link             text,
  created_at            timestamptz not null default now(),
  responded_at          timestamptz,
  responded_by          uuid references auth.users (id)
);

create index if not exists idx_consult_req_couple on public.consultation_requests (couple_id, status);
create index if not exists idx_consult_req_counsellor on public.consultation_requests (counsellor_id, status);
create index if not exists idx_consult_req_status on public.consultation_requests (status);

-- 2. Extend appointments and counsellor_availability
alter table public.appointments add column if not exists request_id uuid references public.consultation_requests (id);
alter table public.appointments add column if not exists confirmed_at timestamptz;
alter table public.appointments add column if not exists confirmed_by uuid references public.counsellors (id);
alter table public.appointments add column if not exists meet_link text;

alter table public.counsellor_availability add column if not exists is_held boolean not null default false;
alter table public.counsellor_availability add column if not exists held_for_request_id uuid references public.consultation_requests (id);

-- 3. Row Level Security (RLS)
alter table public.consultation_requests enable row level security;

-- Couple members can read their own couple's requests
drop policy if exists consult_req_read_couple on public.consultation_requests;
create policy consult_req_read_couple on public.consultation_requests for select to authenticated
  using (
    couple_id = my_couple() or
    exists (select 1 from counsellors k where k.user_id = auth.uid()) or
    my_role() = 'admin'
  );

-- Couple members can insert consultation requests
drop policy if exists consult_req_insert_couple on public.consultation_requests;
create policy consult_req_insert_couple on public.consultation_requests for insert to authenticated
  with check (
    couple_id = my_couple() and
    status = 'PENDING'
  );

-- Counsellor can update requests (to confirm or decline)
drop policy if exists consult_req_update_counsellor on public.consultation_requests;
create policy consult_req_update_counsellor on public.consultation_requests for update to authenticated
  using (
    exists (select 1 from counsellors k where k.user_id = auth.uid()) or
    couple_id = my_couple()
  );

-- 4. RPC: request_consultation (Couple initiates request)
create or replace function request_consultation(
  p_slot uuid,
  p_modality text default 'online',
  p_topic text default 'Pre-marital genetic counselling',
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  cid text := my_couple();
  me text := my_person();
  s counsellor_availability;
  req_id uuid;
begin
  if cid is null then raise exception 'Only an authenticated couple member can request a consultation'; end if;

  -- Verify no duplicate pending or active booking
  if exists (select 1 from consultation_requests where couple_id = cid and status = 'PENDING') then
    raise exception 'You already have a consultation request awaiting confirmation.';
  end if;
  if exists (select 1 from appointments where couple_id = cid and status = 'booked') then
    raise exception 'You already have an active booked consultation. Cancel it first to choose another time.';
  end if;

  -- Lock and check slot
  select * into s from counsellor_availability where id = p_slot for update;
  if not found or s.is_booked or s.is_held or s.slot_start < now() then
    raise exception 'The selected slot is no longer available';
  end if;

  -- Mark slot as held for this request
  req_id := gen_random_uuid();
  update counsellor_availability
  set is_held = true, held_for_request_id = req_id
  where id = p_slot;

  -- Insert consultation request
  insert into consultation_requests (
    id, couple_id, requester_id, counsellor_id, slot_id,
    requested_starts_at, requested_ends_at, modality, topic,
    status, patient_notes, meet_link
  ) values (
    req_id, cid, me, s.counsellor_id, p_slot,
    s.slot_start, s.slot_end, coalesce(p_modality, 'online'), coalesce(p_topic, 'Pre-marital genetic counselling'),
    'PENDING', p_notes,
    case when p_modality = 'offline' then null else 'https://meet.google.com/dan-' || cid || '-' || substr(md5(random()::text), 1, 4) end
  );

  return req_id;
end $$;

-- 5. RPC: confirm_consultation_request (Counsellor confirms and creates clinical appointment)
create or replace function confirm_consultation_request(p_request_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  req consultation_requests;
  c clinical_cases;
  appt_id bigint;
  k counsellors;
begin
  if my_role() <> 'counsellor' then
    raise exception 'Only a licensed counsellor can confirm appointments.';
  end if;

  select * into k from counsellors where user_id = auth.uid();

  select * into req from consultation_requests where id = p_request_id for update;
  if not found then raise exception 'Consultation request not found'; end if;
  if req.status <> 'PENDING' then raise exception 'Request has already been processed (status: %)', req.status; end if;

  select * into c from clinical_cases where couple_id = req.couple_id;

  -- Insert confirmed clinical appointment record
  insert into appointments (
    couple_id, starts_at, status, case_id, counsellor_id,
    slot_id, meeting_type, request_id, confirmed_at, confirmed_by, meet_link
  ) values (
    req.couple_id, req.requested_starts_at, 'booked', c.id, coalesce(req.counsellor_id, k.id),
    req.slot_id, req.modality, p_request_id, now(), k.id, req.meet_link
  ) returning id into appt_id;

  -- Update consultation request to CONFIRMED
  update consultation_requests
  set status = 'CONFIRMED',
      appointment_id = appt_id,
      responded_at = now(),
      responded_by = auth.uid(),
      counsellor_id = coalesce(req.counsellor_id, k.id)
  where id = p_request_id;

  -- Free hold and mark slot booked in availability table
  if req.slot_id is not null then
    update counsellor_availability
    set is_booked = true, is_held = false, held_for_request_id = null
    where id = req.slot_id;
  end if;

  return appt_id;
end $$;

-- 6. RPC: decline_consultation_request (Counsellor declines request and releases slot)
create or replace function decline_consultation_request(
  p_request_id uuid,
  p_reason text default 'Schedule conflict'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  req consultation_requests;
begin
  if my_role() <> 'counsellor' then
    raise exception 'Only a counsellor can decline appointment requests.';
  end if;

  select * into req from consultation_requests where id = p_request_id for update;
  if not found then raise exception 'Consultation request not found'; end if;

  update consultation_requests
  set status = 'DECLINED',
      counsellor_notes = p_reason,
      responded_at = now(),
      responded_by = auth.uid()
  where id = p_request_id;

  if req.slot_id is not null then
    update counsellor_availability
    set is_held = false, held_for_request_id = null
    where id = req.slot_id;
  end if;
end $$;

-- 7. RPC: cancel_consultation_request (Couple cancels pending request)
create or replace function cancel_consultation_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  req consultation_requests;
begin
  select * into req from consultation_requests where id = p_request_id for update;
  if not found or req.couple_id is distinct from my_couple() then
    raise exception 'Unauthorized to cancel this request';
  end if;

  update consultation_requests
  set status = 'CANCELLED',
      responded_at = now()
  where id = p_request_id;

  if req.slot_id is not null then
    update counsellor_availability
    set is_held = false, held_for_request_id = null
    where id = req.slot_id;
  end if;
end $$;

-- 8. Grant permissions
grant execute on function request_consultation(uuid, text, text, text) to authenticated;
grant execute on function confirm_consultation_request(uuid) to authenticated;
grant execute on function decline_consultation_request(uuid, text) to authenticated;
grant execute on function cancel_consultation_request(uuid) to authenticated;

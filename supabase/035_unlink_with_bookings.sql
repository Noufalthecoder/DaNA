-- 035: Disconnect failed for any couple that had booked a counsellor ("appointments ... still referenced from
-- consultation_requests"). end_couple() deletes the couple's appointments, but the consultation request still
-- pointed at the appointment (and the appointment and held slot pointed back at the request).
-- Fix: these cross-links now let go automatically (ON DELETE SET NULL); the requests themselves are removed with
-- the couple (couple_id ... on delete cascade). Run after 034. Safe to re-run.

do $$
declare r record;
begin
  for r in
    select con.conname, rel.relname as tbl, att.attname as col, frel.relname as ref
    from pg_constraint con
    join pg_class rel  on rel.oid = con.conrelid
    join pg_class frel on frel.oid = con.confrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f' and rel.relnamespace = 'public'::regnamespace
      and (rel.relname, att.attname) in (('consultation_requests', 'appointment_id'),
                                         ('appointments', 'request_id'),
                                         ('counsellor_availability', 'held_for_request_id'))
  loop
    execute format('alter table public.%I drop constraint %I', r.tbl, r.conname);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I (id) on delete set null',
                   r.tbl, r.conname, r.col, r.ref);
  end loop;
end $$;

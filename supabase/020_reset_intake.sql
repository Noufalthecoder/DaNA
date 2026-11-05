-- =====================================================================
-- 020_reset_intake.sql
-- Enables resetting premarital screening intake & demo journey state
-- Can be called securely by authenticated users. Safe to re-run.
-- =====================================================================

create or replace function reset_my_intake() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me text := my_person();
  uid uuid := auth.uid();
begin
  -- Clear people intake timestamp & UAE PASS link flags
  if me is not null then
    update people
       set intake_completed_at = null,
           uaepass_linked_at = null,
           uaepass_via = null
     where id = me;

    -- Clear person_details if any
    delete from person_details where person_id = me;
  end if;

  -- Reset screening row for this user or person
  if uid is not null then
    delete from screening where user_id = uid;
    update accounts set title = 'New member' where user_id = uid;
  end if;

  if me is not null then
    delete from screening where person_id = me;
  end if;

  return true;
end $$;

revoke all on function reset_my_intake() from public, anon;
grant execute on function reset_my_intake() to authenticated;


-- 007: sync_cases updated every counsellor without a WHERE clause; Supabase's safeupdate blocks that via the API.
create or replace function sync_cases() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; c record;
begin
  if auth.uid() is not null and coalesce(my_role(), '') not in ('counsellor', 'admin') then
    raise exception 'Only staff can recompute cases';
  end if;
  for c in select id from couples loop perform upsert_case(c.id); n := n + 1; end loop;
  update counsellors k set active_caseload = (select count(*) from case_assignments a where a.counsellor_id = k.id and a.status = 'active') where true;
  return n;
end $$;

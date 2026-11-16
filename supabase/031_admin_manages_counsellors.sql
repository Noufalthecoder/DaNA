-- =====================================================================
-- 031: An admin handles the counsellors of their own area. Run AFTER 030. Safe to re-run.
--
--   - Counsellors with no clinic location are visible to nationwide admins only.
--     A regional admin sees a new counsellor once they have chosen a clinic in the admin's area.
--   - manage_counsellor(): verify, pause and re-activate, inside the admin's area, with an audit entry.
-- =====================================================================

-- a place-less record belongs to nobody's area, so only a nationwide admin may see or change it
create or replace function in_admin_scope(p bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when a.role <> 'admin' then false
      when a.scope_level = 'national' then true
      when p is null then false
      when a.scope_level = 'emirate' then loc_emirate(p) is not distinct from loc_emirate(a.location_id)
      else p = a.location_id
    end
    from accounts a where a.user_id = auth.uid()), false)
$$;

create or replace function manage_counsellor(p_counsellor uuid, p_action text, p_reason text default null) returns text
language plpgsql security definer set search_path = public as $$
declare k counsellors; new_status text; verb text;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only a DoH admin can manage counsellors'; end if;
  if p_action not in ('verify', 'activate', 'pause') then raise exception 'Choose verify, activate or pause'; end if;
  select * into k from counsellors where id = p_counsellor for update;
  if not found then raise exception 'Counsellor not found'; end if;
  if not in_admin_scope(k.location_id) then raise exception 'That counsellor is outside your area'; end if;

  if p_action = 'verify' then
    if k.credentials_verified then raise exception 'Already verified'; end if;
    if k.location_id is null then raise exception 'The counsellor must choose a clinic location first'; end if;
    update counsellors set credentials_verified = true, status = 'active' where id = k.id;
    update accounts set title = 'Genetic counsellor' where user_id = k.user_id and title ilike '%pending verification%';
    new_status := 'active'; verb := 'Verified';
  elsif p_action = 'activate' then
    if not k.credentials_verified then raise exception 'Verify the counsellor first'; end if;
    update counsellors set status = 'active' where id = k.id;
    new_status := 'active'; verb := 'Activated';
  else
    update counsellors set status = 'away' where id = k.id;
    new_status := 'away'; verb := 'Paused';
  end if;

  perform _audit(verb || ' counsellor: ' || k.name || ' (' || coalesce(loc_label(k.location_id), 'no clinic') || ')'
                 || case when p_reason is not null then ' - ' || left(p_reason, 200) else '' end,
                 'counsellors', k.id::text, jsonb_build_object('action', p_action, 'status', new_status));
  return new_status;
end $$;

revoke all on function manage_counsellor(uuid, text, text) from public, anon;
grant execute on function manage_counsellor(uuid, text, text) to authenticated;

-- 029: UAE PASS identity + one-screen intake. Run after 028. Safe to re-run.
--
-- After sign-in (UAE PASS, or email/Google + linking UAE PASS once) the person sees their UAE PASS
-- details already filled in and read-only, consents per group, adds only what DaNA needs, and submits once.
--   uaepass_identity     the verified identity attributes received from UAE PASS (one row per person)
--   link_uaepass()       links UAE PASS to this account and stores the attributes.
--                        SIMULATED: real UAE PASS (OpenID Connect via TDRA) is not connected yet, so the
--                        attributes are synthetic and marked source = 'uaepass_simulated'. Swapping in real
--                        UAE PASS only changes this function's body.
--   my_identity()        my identity attributes
--   submit_intake()      consent (with the groups the person agreed to) + details, in one transaction

create table if not exists uaepass_identity (
  person_id      text primary key references people (id) on delete cascade,
  uaepass_sub    text not null unique,             -- UAE PASS subject identifier
  full_name_en   text not null,
  full_name_ar   text,
  emirates_id    text not null check (emirates_id ~ '^784-\d{4}-\d{7}-\d$'),
  date_of_birth  date not null,
  sex            char(1) check (sex in ('M', 'F')),
  nationality    text not null,
  mobile         text check (mobile is null or mobile ~ '^\+971\d{8,9}$'),
  email          text,
  user_type      text not null default 'SOP3',       -- UAE PASS assurance level (SOP3 = verified in person)
  source         text not null default 'uaepass_simulated' check (source in ('uaepass', 'uaepass_simulated')),
  verified_at    timestamptz not null default now()
);
alter table uaepass_identity enable row level security;
drop policy if exists identity_own on uaepass_identity;
create policy identity_own on uaepass_identity for select to authenticated
  using (person_id = my_person() or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor')));
revoke all on uaepass_identity from anon;
revoke insert, update, delete on uaepass_identity from authenticated;
grant select on uaepass_identity to authenticated;

alter table consents add column if not exists scopes jsonb;   -- which groups the person agreed to share

create or replace function link_uaepass(p_via_uaepass_signin boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me   text := my_person();
  acc  accounts;
  h    text;
  yr   int;
  dob  date;
  eid  text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if exists (select 1 from uaepass_identity where person_id = me) then
    return (select to_jsonb(i) from uaepass_identity i where person_id = me);
  end if;
  select * into acc from accounts where user_id = auth.uid();
  -- simulated attributes, stable for this account (real UAE PASS returns them in the ID token)
  h   := md5(auth.uid()::text);
  yr  := 1988 + (('x' || substr(h, 1, 4))::bit(16)::int % 15);
  dob := make_date(yr, 1 + (('x' || substr(h, 5, 2))::bit(8)::int % 12), 1 + (('x' || substr(h, 7, 2))::bit(8)::int % 28));
  eid := '784-' || yr || '-' || lpad(((('x' || substr(h, 9, 8))::bit(32)::bigint & 2147483647) % 10000000)::text, 7, '0')
         || '-' || ((('x' || substr(h, 17, 2))::bit(8)::int) % 10);
  insert into uaepass_identity (person_id, uaepass_sub, full_name_en, emirates_id, date_of_birth, sex, nationality, mobile, email)
  values (me, 'sim-' || substr(h, 1, 20), coalesce(acc.display_name, 'DaNA member'), eid, dob,
          (select sex from people where id = me), 'United Arab Emirates',
          '+9715' || lpad(((('x' || substr(h, 19, 8))::bit(32)::bigint & 2147483647) % 100000000)::text, 8, '0'),
          acc.email);
  update people set uaepass_linked_at = now(), uaepass_via = case when p_via_uaepass_signin then 'uaepass' else 'linked' end
   where id = me;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), acc.display_name,
          case when p_via_uaepass_signin then 'Signed in with UAE PASS (simulated)' else 'Linked UAE PASS to the account (simulated)' end,
          'uaepass_identity', me);
  return (select to_jsonb(i) from uaepass_identity i where person_id = me);
end $$;
revoke all on function link_uaepass(boolean) from public, anon;
grant execute on function link_uaepass(boolean) to authenticated;

create or replace function my_identity() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(i) from uaepass_identity i where person_id = my_person()
$$;
revoke all on function my_identity() from public, anon;
grant execute on function my_identity() to authenticated;

-- consent + details together; Malaffi is fetched by the API right after (it checks this consent)
create or replace function submit_intake(p_scopes jsonb, p_details jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); t timestamptz := now();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  if not exists (select 1 from uaepass_identity where person_id = me) then raise exception 'Link UAE PASS first'; end if;
  if coalesce((p_scopes->>'identity')::boolean, false) is not true or coalesce((p_scopes->>'results')::boolean, false) is not true then
    raise exception 'Your identity and your premarital results are needed to explain your result. Tick both to continue.';
  end if;
  if coalesce(p_details->>'marital_status', '') = '' then raise exception 'Choose your marital status'; end if;

  insert into consents (person_id, kind, granted, version, updated_at, scopes)
  values (me, 'malaffi_access', true, 'malaffi-consent-v2', t,
          jsonb_build_object('identity', true, 'results', true, 'contact', coalesce((p_scopes->>'contact')::boolean, false)))
  on conflict (person_id, kind) do update set granted = true, version = excluded.version, updated_at = t,
    revoked_at = null, scopes = excluded.scopes;
  perform save_my_details(p_details);
  insert into audit_log (actor, actor_name, action, resource_type, resource_id, metadata)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          'Gave consent (malaffi-consent-v2) and saved screening details', 'consents', me,
          jsonb_build_object('scopes', p_scopes));
  return t;
end $$;
revoke all on function submit_intake(jsonb, jsonb) from public, anon;
grant execute on function submit_intake(jsonb, jsonb) to authenticated;

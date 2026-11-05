-- 019: consent before Malaffi, and the details Malaffi does not hold. Run after 018. Safe to re-run.
--
-- Malaffi is reached through UAE PASS identity. A person who signed in with Google or email first
-- links UAE PASS (simulated in this prototype), then consents; only then may the API fetch Malaffi.
-- Everything else we need (marital status, pregnancy, relationship to partner, family history,
-- language) is not in Malaffi, so the person tells us once, in person_details.

-- 1. a Malaffi-access consent kind --------------------------------------------------------
alter table consents drop constraint if exists consents_kind_check;
alter table consents add constraint consents_kind_check
  check (kind in ('share_partner', 'share_counsellor', 'faith_cards', 'malaffi_access'));

alter table people add column if not exists uaepass_linked_at timestamptz;
alter table people add column if not exists uaepass_via text check (uaepass_via in ('uaepass', 'linked'));

-- consent screen: link UAE PASS (when signed in another way) and allow Malaffi access
create or replace function grant_malaffi_consent(p_signed_in_with_uaepass boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare me text := my_person(); t timestamptz := now();
begin
  if me is null then raise exception 'Create your profile first'; end if;
  update people set uaepass_linked_at = coalesce(uaepass_linked_at, t),
                    uaepass_via = case when p_signed_in_with_uaepass then 'uaepass' else 'linked' end
   where id = me;
  insert into consents (person_id, kind, granted, version, updated_at)
  values (me, 'malaffi_access', true, 'malaffi-consent-v1', t)
  on conflict (person_id, kind) do update set granted = true, version = excluded.version, updated_at = t, revoked_at = null;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()),
          case when p_signed_in_with_uaepass then 'Gave consent to fetch results from Malaffi'
               else 'Linked UAE PASS and gave consent to fetch results from Malaffi' end,
          'consents', me);
  return t;
end $$;
revoke all on function grant_malaffi_consent(boolean) from public, anon;
grant execute on function grant_malaffi_consent(boolean) to authenticated;

-- 2. what Malaffi does not hold ----------------------------------------------------------
create table if not exists person_details (
  person_id          text primary key references people (id) on delete cascade,
  marital_status     text not null check (marital_status in ('single', 'engaged', 'married')),
  wedding_date       date,
  pregnant           boolean not null default false,
  pregnancy_weeks    int check (pregnancy_weeks between 1 and 42),
  related_to_partner text not null default 'no' check (related_to_partner in ('no', 'first_cousin', 'second_cousin', 'other_relative', 'not_sure')),
  family_history     text[] not null default '{}',   -- e.g. {thalassaemia, sickle_cell, hearing_loss}
  family_notes       text check (char_length(family_notes) <= 500),
  affected_child     boolean not null default false,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ar', 'ur')),
  updated_at         timestamptz not null default now(),
  check (not pregnant or pregnancy_weeks is not null)
);
alter table person_details enable row level security;
drop policy if exists details_own on person_details;
create policy details_own on person_details for select to authenticated
  using (person_id = my_person() or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor')));
revoke all on person_details from anon;
grant select on person_details to authenticated;                         -- rows limited by details_own
revoke insert, update, delete on person_details from authenticated;      -- written by save_my_details only

create or replace function save_my_details(p jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  me  text := my_person();
  sx  char(1);
  t   timestamptz := now();
  preg boolean := coalesce((p->>'pregnant')::boolean, false);
  wks int := nullif(p->>'pregnancy_weeks', '')::int;
  cid text;
begin
  if me is null then raise exception 'Create your profile first'; end if;
  select sex into sx from people where id = me;
  if sx = 'M' then preg := false; wks := null; end if;          -- pregnancy is recorded for women only
  if not preg then wks := null; end if;
  insert into person_details as d (person_id, marital_status, wedding_date, pregnant, pregnancy_weeks, related_to_partner,
                                   family_history, family_notes, affected_child, preferred_language, updated_at)
  values (me, p->>'marital_status', nullif(p->>'wedding_date', '')::date, preg, wks,
          coalesce(p->>'related_to_partner', 'no'),
          coalesce(array(select jsonb_array_elements_text(p->'family_history')), '{}'),
          nullif(btrim(coalesce(p->>'family_notes', '')), ''),
          coalesce((p->>'affected_child')::boolean, false), coalesce(p->>'preferred_language', 'en'), t)
  on conflict (person_id) do update set
    marital_status = excluded.marital_status, wedding_date = excluded.wedding_date, pregnant = excluded.pregnant,
    pregnancy_weeks = excluded.pregnancy_weeks, related_to_partner = excluded.related_to_partner,
    family_history = excluded.family_history, family_notes = excluded.family_notes,
    affected_child = excluded.affected_child, preferred_language = excluded.preferred_language, updated_at = t;
  update people set intake_completed_at = t where id = me;

  -- a pregnancy changes the couple's priority (tier 1 when both carry the same change)
  select id into cid from couples where me in (partner_a, partner_b);
  if cid is not null and sx = 'F' then
    update couples set pregnant_weeks = wks, stage = case when (p->>'marital_status') = 'married' then 'married' else stage end where id = cid;
    perform upsert_case(cid);
  end if;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id)
  values (auth.uid(), (select display_name from accounts where user_id = auth.uid()), 'Saved screening details', 'person_details', me);
  return t;
end $$;
revoke all on function save_my_details(jsonb) from public, anon;
grant execute on function save_my_details(jsonb) to authenticated;

-- 3. journey state now includes consent and details ------------------------------------------
drop function if exists my_journey();
create or replace function my_journey() returns table (
  sex text, sex_confirmed boolean, intake_completed_at timestamptz,
  malaffi_consent boolean, uaepass_linked_at timestamptz, details jsonb
)
language sql stable security definer set search_path = public as $$
  select p.sex::text, p.sex_confirmed, p.intake_completed_at,
         coalesce((select c.granted from consents c where c.person_id = p.id and c.kind = 'malaffi_access'), false),
         p.uaepass_linked_at,
         (select to_jsonb(d) - 'person_id' from person_details d where d.person_id = p.id)
  from people p where p.id = my_person()
$$;
revoke all on function my_journey() from public, anon;
grant execute on function my_journey() to authenticated;

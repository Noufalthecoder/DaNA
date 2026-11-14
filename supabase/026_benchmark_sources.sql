-- 026: every benchmark threshold gets a source record with a link and review status. Run after 025. Safe to re-run.
-- risk_benchmarks.sources (the text shown today) stays; this adds the reviewable record beside it.
-- Links are starting references for expert review; status stays 'needs_review' until a professional signs off.

create table if not exists benchmark_sources (
  key            text primary key,               -- the risk_benchmarks column, e.g. hb_min_g_dl
  citation       text not null,
  url            text check (url is null or url ~ '^https://'),
  review_status  text not null default 'needs_review'
                 check (review_status in ('needs_review', 'needs_local_confirmation', 'verified')),
  note           text,
  version        int  not null default 1,
  updated_at     timestamptz not null default now(),
  updated_by_name text not null default 'Initial setup'
);
alter table benchmark_sources enable row level security;
drop policy if exists bench_sources_read on benchmark_sources;
create policy bench_sources_read on benchmark_sources for select to authenticated using (true);
revoke insert, update, delete on benchmark_sources from anon, authenticated;

insert into benchmark_sources (key, citation, url, review_status, note) values
  ('hb_min_g_dl',                    'WHO 2024 guideline on haemoglobin cutoffs to define anaemia', 'https://www.who.int/publications/i/item/9789240088542', 'needs_review', null),
  ('mcv_min_fl',                     'UAE study definition of beta-thalassaemia trait (MCV < 80 fL)', null, 'needs_review', 'Add the exact study reference'),
  ('mch_min_pg',                     'BSH 2023 guideline: significant haemoglobinopathies', 'https://b-s-h.org.uk/guidelines', 'needs_review', null),
  ('hba2_carrier_min_pct',           'BSH 2023 guideline: significant haemoglobinopathies', 'https://b-s-h.org.uk/guidelines', 'needs_review', null),
  ('hba2_review_above_pct',          'BSH 2023 guideline: significant haemoglobinopathies', 'https://b-s-h.org.uk/guidelines', 'needs_review', null),
  ('hbf_review_min_pct',             'NHS laboratory reference (Sheffield)', null, 'needs_local_confirmation', 'Lab-level value, not a national standard'),
  ('ferritin_min_ug_l',              'WHO 2020 guideline on ferritin concentrations', 'https://www.who.int/publications/i/item/9789240000124', 'needs_local_confirmation', 'Confirm against the WHO table'),
  ('ferritin_inflammation_min_ug_l', 'WHO 2020 guideline on ferritin concentrations', 'https://www.who.int/publications/i/item/9789240000124', 'needs_review', null),
  ('g6pd_deficient_below_pct',       'WHO guidelines for malaria', 'https://www.who.int/publications/i/item/guidelines-for-malaria', 'needs_review', null),
  ('g6pd_intermediate_below_pct',    'WHO guidelines for malaria (2024 text: 30-70%)', 'https://www.who.int/publications/i/item/guidelines-for-malaria', 'needs_review', 'Earlier text used 30-80%'),
  ('rubella_igg_immune_min_iu_ml',   'WHO laboratory manual and CLSI (10 IU/mL)', null, 'needs_local_confirmation', 'Assays vary; use the lab''s own cut-off'),
  ('rhd_negative_check',             'NICE TA156: routine antenatal anti-D prophylaxis', 'https://www.nice.org.uk/guidance/ta156', 'needs_local_confirmation', 'Confirm the UAE protocol'),
  ('infection_markers',              'UAE premarital screening programme: HIV, hepatitis B, hepatitis C, syphilis', null, 'needs_review', 'Add the MOHAP / DoH programme reference'),
  ('genetic_panel_min_genes',        'MOHAP and DoH Abu Dhabi premarital genetic screening (570 genes, 840+ conditions)', null, 'needs_review', 'Add the official announcement reference')
on conflict (key) do nothing;

create or replace function update_benchmark_source(p_key text, p_changes jsonb, p_reason text, p_expected_version int)
returns benchmark_sources
language plpgsql security definer set search_path = public as $$
declare cur benchmark_sources; nxt benchmark_sources; bad text;
begin
  if my_role() is distinct from 'admin' then raise sqlstate 'PT403' using message = 'Only the programme admin can change sources'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then raise sqlstate 'PT422' using message = 'Give a reason of at least 10 characters'; end if;
  select k into bad from jsonb_object_keys(p_changes) k where k not in ('citation', 'url', 'review_status', 'note') limit 1;
  if bad is not null then raise sqlstate 'PT422' using message = format('%s cannot be edited', bad); end if;
  select * into cur from benchmark_sources where key = p_key for update;
  if not found then raise sqlstate 'PT404' using message = 'No such benchmark'; end if;
  if cur.version <> p_expected_version then
    raise sqlstate 'PT409' using message = format('This source is now at version %s. Reload and try again.', cur.version);
  end if;
  nxt := jsonb_populate_record(cur, p_changes);
  update benchmark_sources set citation = nxt.citation, url = nxt.url, review_status = nxt.review_status, note = nxt.note,
    version = cur.version + 1, updated_at = now(),
    updated_by_name = coalesce((select display_name from accounts where user_id = auth.uid()), 'Admin')
  where key = p_key returning * into nxt;
  insert into audit_log (actor, actor_name, action, resource_type, resource_id, metadata)
  values (auth.uid(), nxt.updated_by_name, format('Edited the source for %s (now version %s)', p_key, nxt.version),
          'benchmark_sources', p_key, jsonb_build_object('before', to_jsonb(cur), 'after', to_jsonb(nxt), 'reason', btrim(p_reason)));
  return nxt;
end $$;
revoke all on function update_benchmark_source(text, jsonb, text, int) from public, anon;
grant execute on function update_benchmark_source(text, jsonb, text, int) to authenticated;

-- 025: configurable, source-backed gene panel (benchmarking phase 1). Run after 024. Safe to re-run.
--
-- The genes DaNA can interpret now live in the database, not in code:
--   genes                 one row per gene: condition, inheritance, identifiers, transcript, source, review status, active
--   gene_panel_snapshots  append-only history; a trigger records every change (who, when, why, what)
--   update_panel_gene()   admin only, reason required, version checked (same rules as risk benchmarks)
--   panel_info()          the active panel + the lab panel size, for the app and the API
-- The lab panel size ("570 genes") stays in risk_benchmarks.genetic_panel_min_genes and is read from there.
-- Sources are references for expert review: review_status starts at 'needs_review' until a
-- genetics professional signs them off. Nothing here is fetched from ClinVar/ClinGen yet (phase 2).

alter table genes add column if not exists hgnc_id        text;
alter table genes add column if not exists ncbi_gene_id   text;
alter table genes add column if not exists transcript     text;          -- MANE Select / lab reference transcript
alter table genes add column if not exists active         boolean not null default true;
alter table genes add column if not exists source         text;          -- reference for the gene-condition link
alter table genes add column if not exists source_url     text;
alter table genes add column if not exists review_status  text not null default 'needs_review';
alter table genes add column if not exists version        int  not null default 1;
alter table genes add column if not exists updated_at     timestamptz not null default now();
alter table genes add column if not exists updated_by_name text not null default 'Initial setup';
alter table genes add column if not exists update_reason  text not null default 'Initial panel';
alter table genes drop constraint if exists genes_review_status_check;
alter table genes add constraint genes_review_status_check check (review_status in ('needs_review', 'verified', 'retired'));
alter table genes drop constraint if exists genes_source_url_check;
alter table genes add constraint genes_source_url_check check (source_url is null or source_url ~ '^https://');

-- identifiers and references for the starting genes (review_status stays needs_review until signed off)
update genes g set hgnc_id = v.hgnc, ncbi_gene_id = v.ncbi, transcript = v.tx, source = v.src, source_url = v.url
from (values
  ('HBB',  'HGNC:4827',  '3043', 'NM_000518.5',    'GeneReviews: Beta-Thalassemia (NBK1426)',                         'https://www.ncbi.nlm.nih.gov/books/NBK1426/'),
  ('GJB2', 'HGNC:4284',  '2706', 'NM_004004.6',    'GeneReviews: Nonsyndromic Hearing Loss and Deafness, DFNB1 (NBK1272)', 'https://www.ncbi.nlm.nih.gov/books/NBK1272/'),
  ('SMN1', 'HGNC:11117', '6606', 'NM_000344.4',    'GeneReviews: Spinal Muscular Atrophy (NBK1352)',                  'https://www.ncbi.nlm.nih.gov/books/NBK1352/'),
  ('CFTR', 'HGNC:1884',  '1080', 'NM_000492.4',    'GeneReviews: Cystic Fibrosis (NBK1250)',                          'https://www.ncbi.nlm.nih.gov/books/NBK1250/'),
  ('G6PD', 'HGNC:4057',  '2539', 'NM_001360016.2', 'OMIM 305900: G6PD deficiency',                                    'https://omim.org/entry/305900')
) as v(sym, hgnc, ncbi, tx, src, url)
where g.symbol = v.sym and g.source is null;

-- ---------- history: every change is snapshotted ----------
create table if not exists gene_panel_snapshots (
  id          bigint generated always as identity primary key,
  symbol      text not null,
  version     int  not null,
  action      text not null check (action in ('seed', 'add', 'edit', 'direct')),
  gene        jsonb not null,
  changes     jsonb not null default '{}',
  reason      text not null,
  actor_name  text not null,
  created_at  timestamptz not null default now(),
  unique (symbol, version)
);
alter table gene_panel_snapshots enable row level security;
drop policy if exists gene_snapshots_read on gene_panel_snapshots;
create policy gene_snapshots_read on gene_panel_snapshots for select to authenticated
  using (my_role() in ('admin', 'counsellor'));

create or replace function gene_panel_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.symbol <> old.symbol then raise exception 'A gene symbol cannot be renamed; retire it and add the new one'; end if;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  new.updated_by_name := coalesce((select display_name from accounts where user_id = auth.uid()), 'Database administrator');
  new.update_reason := coalesce(nullif(current_setting('dana.change_reason', true), ''), 'Direct database edit, no reason given');
  return new;
end $$;

create or replace function gene_panel_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
declare diff jsonb := '{}';
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}') into diff
    from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('version', 'updated_at', 'updated_by_name', 'update_reason');
  end if;
  insert into gene_panel_snapshots (symbol, version, action, gene, changes, reason, actor_name)
  values (new.symbol, new.version,
          coalesce(nullif(current_setting('dana.change_action', true), ''), case when tg_op = 'INSERT' then 'seed' else 'direct' end),
          to_jsonb(new), diff, new.update_reason, new.updated_by_name)
  on conflict (symbol, version) do nothing;
  return null;
end $$;

drop trigger if exists genes_stamp on genes;
drop trigger if exists genes_snapshot on genes;
create trigger genes_stamp before insert or update on genes for each row execute function gene_panel_stamp();
create trigger genes_snapshot after insert or update on genes for each row execute function gene_panel_snapshot();

-- starting snapshot for genes that have none yet
insert into gene_panel_snapshots (symbol, version, action, gene, reason, actor_name)
select g.symbol, g.version, 'seed', to_jsonb(g), 'Initial panel', 'Initial setup' from genes g
on conflict (symbol, version) do nothing;

-- genes are deleted never; they are retired (active = false), so old reports still resolve
create or replace function genes_no_delete() returns trigger language plpgsql as $$
begin raise exception 'Genes are never deleted. Set active = false (retire) instead.'; end $$;
drop trigger if exists genes_no_delete on genes;
create trigger genes_no_delete before delete on genes for each row execute function genes_no_delete();

-- ---------- edits: admin only, reason required, version checked ----------
create or replace function update_panel_gene(p_symbol text, p_changes jsonb, p_reason text, p_expected_version int)
returns genes
language plpgsql security definer set search_path = public as $$
declare cur genes; nxt genes; bad text; sym text := upper(btrim(coalesce(p_symbol, '')));
begin
  if my_role() is distinct from 'admin' then
    raise sqlstate 'PT403' using message = 'Only the programme admin can change the gene panel';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    raise sqlstate 'PT422' using message = 'Give a reason of at least 10 characters';
  end if;
  if sym !~ '^[A-Z0-9-]{2,15}$' then raise sqlstate 'PT422' using message = 'Gene symbol looks wrong (use the HGNC symbol, e.g. HBB)'; end if;
  select k into bad from jsonb_object_keys(p_changes) k
   where k not in ('condition', 'inheritance', 'hgnc_id', 'ncbi_gene_id', 'transcript', 'active', 'source', 'source_url', 'review_status')
   limit 1;
  if bad is not null then raise sqlstate 'PT422' using message = format('%s cannot be edited', bad); end if;

  perform set_config('dana.change_reason', btrim(p_reason), true);
  select * into cur from genes where symbol = sym for update;
  if not found then
    -- adding a gene: condition, inheritance and a source are required
    if p_expected_version is distinct from 0 then raise sqlstate 'PT404' using message = 'No such gene; pass expected_version 0 to add it'; end if;
    if coalesce(p_changes->>'condition', '') = '' or coalesce(p_changes->>'inheritance', '') not in ('AR', 'XL')
       or coalesce(p_changes->>'source', '') = '' then
      raise sqlstate 'PT422' using message = 'A new gene needs condition, inheritance (AR or XL) and a source';
    end if;
    perform set_config('dana.change_action', 'add', true);
    insert into genes (symbol, condition, inheritance, hgnc_id, ncbi_gene_id, transcript, active, source, source_url, review_status)
    values (sym, p_changes->>'condition', p_changes->>'inheritance', p_changes->>'hgnc_id', p_changes->>'ncbi_gene_id',
            p_changes->>'transcript', coalesce((p_changes->>'active')::boolean, true), p_changes->>'source',
            p_changes->>'source_url', coalesce(p_changes->>'review_status', 'needs_review'))
    returning * into nxt;
  else
    if cur.version <> p_expected_version then
      raise sqlstate 'PT409' using message = format('This gene is now at version %s. Reload and try again.', cur.version);
    end if;
    nxt := jsonb_populate_record(cur, p_changes);
    if to_jsonb(nxt) = to_jsonb(cur) then raise sqlstate 'PT422' using message = 'Nothing changed'; end if;
    perform set_config('dana.change_action', 'edit', true);
    update genes set condition = nxt.condition, inheritance = nxt.inheritance, hgnc_id = nxt.hgnc_id,
      ncbi_gene_id = nxt.ncbi_gene_id, transcript = nxt.transcript, active = nxt.active, source = nxt.source,
      source_url = nxt.source_url, review_status = nxt.review_status
    where symbol = sym returning * into nxt;
  end if;

  insert into audit_log (actor, actor_name, action, resource_type, resource_id, metadata)
  values (auth.uid(), nxt.updated_by_name,
          format('%s gene %s in the panel (now version %s)', case when cur.symbol is null then 'Added' else 'Edited' end, sym, nxt.version),
          'genes', sym, jsonb_build_object('version', nxt.version, 'reason', btrim(p_reason)));
  return nxt;
end $$;
revoke all on function update_panel_gene(text, jsonb, text, int) from public, anon;
grant execute on function update_panel_gene(text, jsonb, text, int) to authenticated;

-- ---------- what the app and the API read ----------
create or replace function panel_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'lab_panel_genes', (select max(genetic_panel_min_genes) from risk_benchmarks),
    'genes', coalesce((select jsonb_agg(to_jsonb(g) - 'update_reason' order by g.symbol) from genes g), '[]'))
$$;
revoke all on function panel_info() from public, anon;
grant execute on function panel_info() to authenticated;

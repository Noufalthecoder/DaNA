-- =====================================================================
-- DaNA database schema (PostgreSQL / Supabase)
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Synthetic data only. Privacy rules (row-level security) are at the end.
-- =====================================================================

-- ---------- reference data ----------
create table if not exists genes (
  symbol       text primary key,                  -- e.g. HBB
  condition    text not null,                     -- e.g. Beta-thalassaemia
  inheritance  text not null check (inheritance in ('AR', 'XL'))  -- autosomal recessive / X-linked
);

-- ---------- people and logins ----------
-- people = anyone in a couple (they may or may not have a demo login)
create table if not exists people (
  id          text primary key,                   -- e.g. 'khalid'
  name        text not null,
  short_name  text not null,
  sex         char(1) not null check (sex in ('M', 'F')),
  birth_year  int,
  language    text not null default 'ar' check (language in ('ar', 'en'))
);

-- accounts = a Supabase login (stand-in for UAE PASS) linked to a role
create table if not exists accounts (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  role          text not null check (role in ('couple', 'counsellor', 'admin')),
  person_id     text references people (id),      -- only for the couple role
  display_name  text not null,
  title         text
);

create table if not exists couples (
  id              text primary key,               -- e.g. 'c1'
  partner_a       text not null references people (id),
  partner_b       text not null references people (id),
  stage           text not null check (stage in ('engaged', 'married')),
  pregnant_weeks  int check (pregnant_weeks between 1 and 42),  -- only stored with consent
  screened_on     date not null
);

-- ---------- genetic results (summary only; the full record stays in Malaffi) ----------
create table if not exists results (
  person_id    text primary key references people (id),
  gene         text references genes (symbol),    -- null = nothing found
  lab          text not null default 'Synthetic lab',
  reported_on  date not null,
  malaffi_ref  text                               -- pointer to the source record
);

-- ---------- what the person allows ----------
create table if not exists consents (
  person_id   text not null references people (id),
  kind        text not null check (kind in ('share_partner', 'share_counsellor', 'faith_cards')),
  granted     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (person_id, kind)
);

-- ---------- the couple's plan ----------
create table if not exists plans (
  couple_id    text primary key references couples (id),
  choice       text not null check (choice in ('IVF with embryo testing', 'Prenatal testing', 'Proceed fully informed')),
  chosen_by    text references people (id),
  chosen_at    timestamptz not null default now(),
  approved_by  uuid references auth.users (id),
  approved_at  timestamptz
);

-- ---------- Sila alerts: relationship only. No name, no phone number. ----------
create table if not exists sila_alerts (
  id            bigint generated always as identity primary key,
  sender        text not null references people (id),
  relationship  text not null,                    -- e.g. 'Brother'
  sent_at       timestamptz not null default now(),
  status        text not null default 'sent' check (status in ('sent', 'opened', 'booked'))
);

create table if not exists appointments (
  id          bigint generated always as identity primary key,
  couple_id   text not null references couples (id),
  starts_at   timestamptz not null,
  status      text not null default 'booked' check (status in ('booked', 'cancelled', 'done'))
);

create table if not exists notes (
  id          bigint generated always as identity primary key,
  couple_id   text not null references couples (id),
  author      uuid not null default auth.uid() references auth.users (id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists content_cards (
  id          text primary key,
  title       text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  reviewer    text,
  updated_at  timestamptz not null default now()
);

-- append-only: there is no update or delete rule, so nobody can change history
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid not null default auth.uid(),
  actor_name  text not null,
  action      text not null
);

-- =====================================================================
-- Helper functions used by the privacy rules
-- =====================================================================
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from accounts where user_id = auth.uid()
$$;

create or replace function my_person() returns text
language sql stable security definer set search_path = public as $$
  select person_id from accounts where user_id = auth.uid()
$$;

create or replace function my_couple() returns text
language sql stable security definer set search_path = public as $$
  select id from couples where my_person() in (partner_a, partner_b)
$$;

create or replace function my_partner() returns text
language sql stable security definer set search_path = public as $$
  select case when partner_a = my_person() then partner_b else partner_a end
  from couples where id = my_couple()
$$;

create or replace function has_consent(p text, k text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select granted from consents where person_id = p and kind = k), false)
$$;

-- DoH sees totals only, never individual records
create or replace function programme_stats()
returns table (couples_screened bigint, same_gene_couples bigint, alerts_sent bigint, plans_approved bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from couples),
    (select count(*) from couples c join results ra on ra.person_id = c.partner_a join results rb on rb.person_id = c.partner_b
       where ra.gene is not null and ra.gene = rb.gene),
    (select count(*) from sila_alerts),
    (select count(*) from plans where approved_at is not null)
  where my_role() = 'admin'
$$;

-- =====================================================================
-- Row-level security: who can see and change what
-- =====================================================================
alter table genes          enable row level security;
alter table people         enable row level security;
alter table accounts       enable row level security;
alter table couples        enable row level security;
alter table results        enable row level security;
alter table consents       enable row level security;
alter table plans          enable row level security;
alter table sila_alerts    enable row level security;
alter table appointments   enable row level security;
alter table notes          enable row level security;
alter table content_cards  enable row level security;
alter table audit_log      enable row level security;

-- reference data: any signed-in user can read
create policy genes_read on genes for select to authenticated using (true);

-- accounts: you see your own; staff see all
create policy accounts_read on accounts for select to authenticated
  using (user_id = auth.uid() or my_role() in ('counsellor', 'admin'));

-- people and couples: yourself and your partner; the counsellor sees everyone
create policy people_read on people for select to authenticated
  using (id in (my_person(), my_partner()) or my_role() = 'counsellor');
create policy couples_read on couples for select to authenticated
  using (id = my_couple() or my_role() = 'counsellor');

-- results: your own; your partner's only if they consented; the counsellor only with consent
create policy results_read on results for select to authenticated
  using (
    person_id = my_person()
    or (person_id = my_partner() and has_consent(person_id, 'share_partner'))
    or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor'))
  );

-- consents: only you can see and change yours
create policy consents_read on consents for select to authenticated using (person_id = my_person());
create policy consents_write on consents for insert to authenticated with check (person_id = my_person());
create policy consents_update on consents for update to authenticated using (person_id = my_person());

-- plans: the couple chooses; the counsellor reads and approves
create policy plans_read on plans for select to authenticated
  using (couple_id = my_couple() or my_role() = 'counsellor');
create policy plans_choose on plans for insert to authenticated with check (couple_id = my_couple());
create policy plans_change on plans for update to authenticated
  using (couple_id = my_couple() or my_role() = 'counsellor');

-- Sila alerts: you see the ones you sent; DoH sees totals through programme_stats()
create policy alerts_read on sila_alerts for select to authenticated using (sender = my_person());
create policy alerts_send on sila_alerts for insert to authenticated with check (sender = my_person());

-- appointments: the couple books; the counsellor sees all
create policy appts_read on appointments for select to authenticated
  using (couple_id = my_couple() or my_role() = 'counsellor');
create policy appts_book on appointments for insert to authenticated with check (couple_id = my_couple());
create policy appts_change on appointments for update to authenticated
  using (couple_id = my_couple() or my_role() = 'counsellor');

-- notes: counsellor only (private clinical notes)
create policy notes_read on notes for select to authenticated using (my_role() = 'counsellor');
create policy notes_write on notes for insert to authenticated with check (my_role() = 'counsellor' and author = auth.uid());

-- content: everyone reads approved cards; DoH reviews
create policy cards_read on content_cards for select to authenticated
  using (status = 'approved' or my_role() = 'admin');
create policy cards_review on content_cards for update to authenticated using (my_role() = 'admin');

-- audit log: everyone writes their own entries; you read your own; DoH reads all
create policy audit_write on audit_log for insert to authenticated with check (actor = auth.uid());
create policy audit_read on audit_log for select to authenticated
  using (actor = auth.uid() or my_role() = 'admin');

grant execute on function programme_stats() to authenticated;

-- =====================================================================
-- DaNA demo data. Every name and result is invented.
-- Run AFTER schema.sql, and AFTER creating the 4 demo logins
-- (Authentication -> Users -> Add user), see supabase/SETUP.md.
-- Safe to run more than once.
-- =====================================================================

insert into genes (symbol, condition, inheritance) values
  ('HBB',  'Beta-thalassaemia',       'AR'),
  ('GJB2', 'Inherited hearing loss',  'AR'),
  ('SMN1', 'Spinal muscular atrophy', 'AR'),
  ('CFTR', 'Cystic fibrosis',         'AR'),
  ('G6PD', 'G6PD deficiency',         'XL')
on conflict (symbol) do nothing;

insert into people (id, name, short_name, sex, birth_year) values
  ('khalid', 'Khalid Al Mansoori', 'Khalid', 'M', 1998),
  ('fatima', 'Fatima Al Hammadi',  'Fatima', 'F', 2000),
  ('ahmed',  'Ahmed Al Ketbi',     'Ahmed',  'M', 1995),
  ('noura',  'Noura Al Ketbi',     'Noura',  'F', 1997),
  ('saeed',  'Saeed Al Nuaimi',    'Saeed',  'M', 1999),
  ('maryam', 'Maryam Al Shamsi',   'Maryam', 'F', 2001),
  ('omar',   'Omar Al Dhaheri',    'Omar',   'M', 1994),
  ('latifa', 'Latifa Al Mazrouei', 'Latifa', 'F', 1996),
  ('rashid', 'Rashid Al Suwaidi',  'Rashid', 'M', 1997),
  ('aisha',  'Aisha Al Falasi',    'Aisha',  'F', 1999),
  ('hamdan', 'Hamdan Al Qubaisi',  'Hamdan', 'M', 2000),
  ('shamma', 'Shamma Al Zaabi',    'Shamma', 'F', 2002)
on conflict (id) do nothing;

insert into couples (id, partner_a, partner_b, stage, pregnant_weeks, screened_on) values
  ('c1', 'khalid', 'fatima', 'engaged', null, '2026-10-12'),
  ('c2', 'ahmed',  'noura',  'married', 11,   '2026-09-02'),
  ('c3', 'saeed',  'maryam', 'engaged', null, '2026-10-20'),
  ('c4', 'omar',   'latifa', 'married', null, '2026-08-15'),
  ('c5', 'rashid', 'aisha',  'engaged', null, '2026-10-28'),
  ('c6', 'hamdan', 'shamma', 'engaged', null, '2026-10-30')
on conflict (id) do nothing;

insert into results (person_id, gene, reported_on, malaffi_ref) values
  ('khalid', 'HBB',  '2026-10-12', 'demo/DiagnosticReport/1001'),
  ('fatima', 'HBB',  '2026-10-12', 'demo/DiagnosticReport/1002'),
  ('ahmed',  'GJB2', '2026-09-02', 'demo/DiagnosticReport/1003'),
  ('noura',  'GJB2', '2026-09-02', 'demo/DiagnosticReport/1004'),
  ('saeed',  'SMN1', '2026-10-20', 'demo/DiagnosticReport/1005'),
  ('maryam', null,   '2026-10-20', 'demo/DiagnosticReport/1006'),
  ('omar',   null,   '2026-08-15', 'demo/DiagnosticReport/1007'),
  ('latifa', 'G6PD', '2026-08-15', 'demo/DiagnosticReport/1008'),
  ('rashid', 'CFTR', '2026-10-28', 'demo/DiagnosticReport/1009'),
  ('aisha',  'CFTR', '2026-10-28', 'demo/DiagnosticReport/1010'),
  ('hamdan', null,   '2026-10-30', 'demo/DiagnosticReport/1011'),
  ('shamma', null,   '2026-10-30', 'demo/DiagnosticReport/1012')
on conflict (person_id) do nothing;

-- everyone starts with all consents given (they can withdraw in the app)
insert into consents (person_id, kind, granted)
select p.id, k.kind, true
from people p cross join (values ('share_partner'), ('share_counsellor'), ('faith_cards')) as k(kind)
on conflict (person_id, kind) do nothing;

insert into content_cards (id, title, status, reviewer) values
  ('f1', 'Tie your camel, then trust in Allah',            'approved', 'Scholar panel'),
  ('f2', 'Is genetic testing permitted?',                  'approved', 'Scholar panel'),
  ('f3', 'IVF with embryo testing: what scholars say',     'pending',  null),
  ('f4', 'Caring for kin (Silat al-rahim) and Sila alerts','pending',  null)
on conflict (id) do nothing;

-- link the 4 demo logins (created in the dashboard) to their roles
insert into accounts (user_id, role, person_id, display_name, title)
select u.id, a.role, a.person_id, a.display_name, a.title
from auth.users u
join (values
  ('khalid@dana.demo', 'couple',     'khalid', 'Khalid Al Mansoori',   'Partner · engaged'),
  ('fatima@dana.demo', 'couple',     'fatima', 'Fatima Al Hammadi',    'Partner · engaged'),
  ('mariam@dana.demo', 'counsellor', null,     'Dr. Mariam Al Hosani', 'Genetic counsellor'),
  ('doh@dana.demo',    'admin',      null,     'Programme team',       'DoH premarital programme')
) as a(email, role, person_id, display_name, title) on a.email = u.email
on conflict (user_id) do nothing;

-- check: this should return 4 rows. If it returns fewer, a login is missing or its email is misspelled.
select a.display_name, a.role, u.email from accounts a join auth.users u on u.id = a.user_id;

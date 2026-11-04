/*
  Synthetic demo data. Every name and result here is invented.
  Owner: Platform (see docs/TEAM.md). Other modules read from here, never write.
*/

export const GENES = {
  HBB: { condition: 'Beta-thalassaemia', inheritance: 'AR' },
  GJB2: { condition: 'Inherited hearing loss', inheritance: 'AR' },
  SMN1: { condition: 'Spinal muscular atrophy', inheritance: 'AR' },
  CFTR: { condition: 'Cystic fibrosis', inheritance: 'AR' },
  G6PD: { condition: 'G6PD deficiency', inheritance: 'XL' },
};

/* people: `carrier` is a gene symbol, or null when nothing was found */
export const PEOPLE = {
  khalid: { name: 'Khalid Al Mansoori', short: 'Khalid', sex: 'M', carrier: 'HBB' },
  fatima: { name: 'Fatima Al Hammadi', short: 'Fatima', sex: 'F', carrier: 'HBB' },
  ahmed: { name: 'Ahmed Al Ketbi', short: 'Ahmed', sex: 'M', carrier: 'GJB2' },
  noura: { name: 'Noura Al Ketbi', short: 'Noura', sex: 'F', carrier: 'GJB2' },
  saeed: { name: 'Saeed Al Nuaimi', short: 'Saeed', sex: 'M', carrier: 'SMN1' },
  maryam: { name: 'Maryam Al Shamsi', short: 'Maryam', sex: 'F', carrier: null },
  omar: { name: 'Omar Al Dhaheri', short: 'Omar', sex: 'M', carrier: null },
  latifa: { name: 'Latifa Al Mazrouei', short: 'Latifa', sex: 'F', carrier: 'G6PD' },
  rashid: { name: 'Rashid Al Suwaidi', short: 'Rashid', sex: 'M', carrier: 'CFTR' },
  aisha: { name: 'Aisha Al Falasi', short: 'Aisha', sex: 'F', carrier: 'CFTR' },
  hamdan: { name: 'Hamdan Al Qubaisi', short: 'Hamdan', sex: 'M', carrier: null },
  shamma: { name: 'Shamma Al Zaabi', short: 'Shamma', sex: 'F', carrier: null },
};

export const COUPLES = [
  { id: 'c1', a: 'khalid', b: 'fatima', stage: 'Engaged', pregnantWeeks: null, screened: '2026-10-12' },
  { id: 'c2', a: 'ahmed', b: 'noura', stage: 'Married', pregnantWeeks: 11, screened: '2026-09-02' },
  { id: 'c3', a: 'saeed', b: 'maryam', stage: 'Engaged', pregnantWeeks: null, screened: '2026-10-20' },
  { id: 'c4', a: 'omar', b: 'latifa', stage: 'Married', pregnantWeeks: null, screened: '2026-08-15' },
  { id: 'c5', a: 'rashid', b: 'aisha', stage: 'Engaged', pregnantWeeks: null, screened: '2026-10-28' },
  { id: 'c6', a: 'hamdan', b: 'shamma', stage: 'Engaged', pregnantWeeks: null, screened: '2026-10-30' },
];

/* relatives who could be invited through Sila alerts, per person */
export const RELATIVES = {
  khalid: [
    { id: 'r1', label: 'Brother', chance: '1 in 2' },
    { id: 'r2', label: 'Sister', chance: '1 in 2' },
    { id: 'r3', label: 'Cousin (father’s side)', chance: '1 in 4' },
  ],
  fatima: [
    { id: 'r4', label: 'Sister', chance: '1 in 2' },
    { id: 'r5', label: 'Brother', chance: '1 in 2' },
  ],
};

const DEFAULT_RELATIVES = [
  { id: 'd1', label: 'Brother', chance: '1 in 2' },
  { id: 'd2', label: 'Sister', chance: '1 in 2' },
  { id: 'd3', label: 'First cousin', chance: '1 in 4' },
];
export const relativesFor = (personId) => RELATIVES[personId] || DEFAULT_RELATIVES;

/* demo accounts, one per role. Relatives never log in: they get an invite link. */
export const ACCOUNTS = [
  { id: 'khalid', role: 'couple', name: 'Khalid Al Mansoori', title: 'Partner · engaged', couple: 'c1' },
  { id: 'fatima', role: 'couple', name: 'Fatima Al Hammadi', title: 'Partner · engaged', couple: 'c1' },
  { id: 'mariam', role: 'counsellor', name: 'Dr. Mariam Al Hosani', title: 'Genetic counsellor' },
  { id: 'doh', role: 'admin', name: 'Programme team', title: 'DoH premarital programme' },
];

/* counsellor slots a couple can book (Gulf time) */
export const SLOTS = [
  { label: 'Sun 9 Nov · 10:00', iso: '2026-11-09T10:00:00+04:00' },
  { label: 'Mon 10 Nov · 13:30', iso: '2026-11-10T13:30:00+04:00' },
  { label: 'Tue 11 Nov · 17:00', iso: '2026-11-11T17:00:00+04:00' },
  { label: 'Wed 12 Nov · 11:00', iso: '2026-11-12T11:00:00+04:00' },
];

/* monthly screenings for the DoH overview (synthetic) */
export const MONTHLY = [
  { m: 'May', n: 1180 }, { m: 'Jun', n: 1320 }, { m: 'Jul', n: 1090 },
  { m: 'Aug', n: 1460 }, { m: 'Sep', n: 1610 }, { m: 'Oct', n: 1745 },
];

export const FAITH_CARDS = [
  { id: 'f1', title: 'Tie your camel, then trust in Allah', status: 'approved', reviewer: 'Sheikh A. (scholar panel)' },
  { id: 'f2', title: 'Is genetic testing permitted?', status: 'approved', reviewer: 'Sheikh A. (scholar panel)' },
  { id: 'f3', title: 'IVF with embryo testing: what scholars say', status: 'pending', reviewer: '' },
  { id: 'f4', title: 'Caring for kin (Silat al-rahim) and Sila alerts', status: 'pending', reviewer: '' },
];

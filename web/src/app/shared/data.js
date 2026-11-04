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
  maryam: { name: 'Maryam Al Shamsi', short: 'Maryam', sex: 'F', carrier: null, vus: 'SMN1' },
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

/* offline copy of the validated lab reports (the live app reads genetic_reports + genetic_variants) */
const LAB = { lab: 'Abu Dhabi Genomics Lab (simulated)', accreditation: 'CAP-0000000', panel: '570 genes (Abu Dhabi premarital panel)', verified: true,
  limitations: 'A negative result lowers, but does not remove, the chance of carrying a variant.' };
const V = (gene, hgvs_c, hgvs_p, sig = 'pathogenic') => ({ gene, hgvs_c, hgvs_p, zygosity: 'heterozygous', significance: sig, source: 'ClinVar' });
export const DEMO_REPORTS = {
  khalid: { ...LAB, id: 'DEMO-KHALID', date: '2026-10-12', variants: [V('HBB', 'c.20A>T', 'p.Glu7Val')] },
  fatima: { ...LAB, id: 'DEMO-FATIMA', date: '2026-10-12', variants: [V('HBB', 'c.92+1G>A', null)] },
  ahmed: { ...LAB, id: 'DEMO-AHMED', date: '2026-09-02', variants: [V('GJB2', 'c.35delG', 'p.Gly12fs')] },
  noura: { ...LAB, id: 'DEMO-NOURA', date: '2026-09-02', variants: [V('GJB2', 'c.35delG', 'p.Gly12fs')] },
  saeed: { ...LAB, id: 'DEMO-SAEED', date: '2026-10-20', variants: [V('SMN1', 'c.840C>T', null)] },
  maryam: { ...LAB, id: 'DEMO-MARYAM', date: '2026-10-20', variants: [V('SMN1', 'c.275G>C', 'p.Trp92Ser', 'vus')] },
  omar: { ...LAB, id: 'DEMO-OMAR', date: '2026-08-15', variants: [] },
  latifa: { ...LAB, id: 'DEMO-LATIFA', date: '2026-08-15', variants: [V('G6PD', 'c.563C>T', 'p.Ser188Phe')] },
  rashid: { ...LAB, id: 'DEMO-RASHID', date: '2026-10-28', variants: [V('CFTR', 'c.1521_1523delCTT', 'p.Phe508del')] },
  aisha: { ...LAB, id: 'DEMO-AISHA', date: '2026-10-28', variants: [V('CFTR', 'c.1521_1523delCTT', 'p.Phe508del')] },
  hamdan: { ...LAB, id: 'DEMO-HAMDAN', date: '2026-10-30', variants: [] },
  shamma: { ...LAB, id: 'DEMO-SHAMMA', date: '2026-10-30', variants: [] },
};

export const REFERRAL_DESTINATIONS = ['IVF / PGT-M', 'Fetal medicine', 'Haematology', 'Paediatrics', 'Other'];

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

/* Verified synthetic data for UAE PASS & Malaffi auto-fill */
export const SYNTHETIC_INTAKES = {
  fatima: {
    personal: {
      fullName: 'Fatima Al Hammadi',
      fullNameAr: 'فاطمة الحمادي',
      emiratesId: '784-1998-3482910-2',
      dob: '1998-04-14',
      gender: 'Female',
      phone: '+971 50 492 8173',
      email: 'fatima.alhammadi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
    },
    medical: {
      bloodGroup: 'O+',
      conditions: 'Mild iron-deficiency anemia',
      medications: 'Folic acid supplements (0.4mg daily)',
      surgeries: 'Appendectomy (2018 at Cleveland Clinic Abu Dhabi)',
      allergies: 'Penicillin (mild skin rash)',
    },
    family: [
      { id: 1, relation: 'Mother', condition: 'Type 2 Diabetes', cancerHistory: 'None' },
      { id: 2, relation: 'Maternal Uncle', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None' },
      { id: 3, relation: 'Paternal Grandmother', condition: 'Hypertension', cancerHistory: 'Colorectal (age 72)' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin (Maternal grandmothers are sisters)',
      weddingDate: '2027-02-15',
      previousScreening: 'no',
    },
    consent: {
      malaffiSync: true,
      partnerShare: true,
      counsellorAccess: true,
      anonymizedResearch: false,
    },
  },
  khalid: {
    personal: {
      fullName: 'Khalid Al Mansoori',
      fullNameAr: 'خالد المنصوري',
      emiratesId: '784-1995-1829304-1',
      dob: '1995-09-22',
      gender: 'Male',
      phone: '+971 52 839 1029',
      email: 'khalid.almansoori@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
    },
    medical: {
      bloodGroup: 'A+',
      conditions: 'None reported',
      medications: 'None',
      surgeries: 'None',
      allergies: 'None',
    },
    family: [
      { id: 1, relation: 'Paternal Grandfather', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None' },
      { id: 2, relation: 'Brother', condition: 'Unexplained childhood anemia', cancerHistory: 'None' },
      { id: 3, relation: 'Paternal Aunt', condition: 'None', cancerHistory: 'Breast cancer (age 58)' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin (Maternal grandmothers are sisters)',
      weddingDate: '2027-02-15',
      previousScreening: 'no',
    },
    consent: {
      malaffiSync: true,
      partnerShare: true,
      counsellorAccess: true,
      anonymizedResearch: false,
    },
  },
};


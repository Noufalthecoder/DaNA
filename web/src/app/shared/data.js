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

/* Real accounts are never listed here: the database provides them (privacy rules apply). */
export const SUPABASE_ACCOUNTS = [];

/* people: `carrier` is a gene symbol, or null when nothing was found */
export const PEOPLE = {
  khalid: { name: 'Khalid Al Mansoori', short: 'Khalid', username: 'khalid', danaId: 'DANA-7701', sex: 'M', carrier: 'HBB' },
  fatima: { name: 'Fatima Al Hammadi', short: 'Fatima', username: 'fatima', danaId: 'DANA-8822', sex: 'F', carrier: 'HBB' },
  ahmed: { name: 'Ahmed Al Ketbi', short: 'Ahmed', username: 'ahmed', danaId: 'DANA-3319', sex: 'M', carrier: 'GJB2' },
  noura: { name: 'Noura Al Ketbi', short: 'Noura', username: 'noura', danaId: 'DANA-4412', sex: 'F', carrier: 'GJB2' },
  saeed: { name: 'Saeed Al Nuaimi', short: 'Saeed', username: 'saeed', danaId: 'DANA-5590', sex: 'M', carrier: 'SMN1' },
  maryam: { name: 'Maryam Al Shamsi', short: 'Maryam', username: 'maryam', danaId: 'DANA-6623', sex: 'F', carrier: null, vus: 'SMN1' },
  omar: { name: 'Omar Al Dhaheri', short: 'Omar', username: 'omar', danaId: 'DANA-2211', sex: 'M', carrier: null },
  latifa: { name: 'Latifa Al Mazrouei', short: 'Latifa', username: 'latifa', danaId: 'DANA-1198', sex: 'F', carrier: 'G6PD' },
  rashid: { name: 'Rashid Al Suwaidi', short: 'Rashid', username: 'rashid', danaId: 'DANA-9944', sex: 'M', carrier: 'CFTR' },
  aisha: { name: 'Aisha Al Falasi', short: 'Aisha', username: 'aisha', danaId: 'DANA-8833', sex: 'F', carrier: 'CFTR' },
  hamdan: { name: 'Hamdan Al Qubaisi', short: 'Hamdan', username: 'hamdan', danaId: 'DANA-5577', sex: 'M', carrier: null },
  shamma: { name: 'Shamma Al Zaabi', short: 'Shamma', username: 'shamma', danaId: 'DANA-6688', sex: 'F', carrier: null },

  // Registered users from Supabase accounts
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
    danaId: 'DANA-2026-34829',
    personal: {
      danaId: 'DANA-2026-34829',
      fullName: 'Fatima Al Hammadi',
      fullNameAr: 'فاطمة الحمادي',
      emiratesId: '784-1998-3482910-2',
      dob: '1998-04-14',
      gender: 'Female',
      phone: '+971 50 492 8173',
      email: 'fatima.alhammadi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Khalid Al Mansoori',
      maritalStatus: 'Preconception',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'O+',
      conditions: 'Mild iron-deficiency anemia; Beta-thalassaemia minor trait',
      medications: 'Folic acid supplements (0.4mg daily); Ferrous bisglycinate (28mg daily)',
      surgeries: 'Appendectomy (2018 at Cleveland Clinic Abu Dhabi)',
      allergies: 'Penicillin (mild skin rash)',
    },
    family: [
      { id: 1, relation: 'Mother', name: 'Mariam Al Hammadi', condition: 'Type 2 Diabetes', cancerHistory: 'None' },
      { id: 2, relation: 'Maternal Uncle', name: 'Sultan Al Hammadi', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None' },
      { id: 3, relation: 'Paternal Grandmother', name: 'Salama Al Hammadi', condition: 'Hypertension', cancerHistory: 'Colorectal (age 72)' },
      { id: 4, relation: 'Partner / Second Cousin', name: 'Khalid Al Mansoori', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin (Maternal grandmothers are sisters)',
      weddingDate: '2027-02-15',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  khalid: {
    danaId: 'DANA-2026-18293',
    personal: {
      danaId: 'DANA-2026-18293',
      fullName: 'Khalid Al Mansoori',
      fullNameAr: 'خالد المنصوري',
      emiratesId: '784-1995-1829304-1',
      dob: '1995-09-22',
      gender: 'Male',
      phone: '+971 52 839 1029',
      email: 'khalid.almansoori@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Fatima Al Hammadi',
      maritalStatus: 'Preconception',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'A+',
      conditions: 'Mild microcytic red blood cells (consistent with Beta-thalassaemia carrier status); seasonal allergic rhinitis',
      medications: 'Vitamin D3 (50,000 IU monthly maintenance); Loratadine (10mg as needed for dust allergies)',
      surgeries: 'Arthroscopic right knee meniscus repair (2021 at Sheikh Shakhbout Medical City, Abu Dhabi)',
      allergies: 'Sulfa antibiotics (cutaneous rash); Tree nuts (mild oral tingling)',
    },
    family: [
      { id: 1, relation: 'Paternal Grandfather', name: 'Rashid Al Mansoori Sr.', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None' },
      { id: 2, relation: 'Brother', name: 'Salem Al Mansoori', condition: 'Unexplained childhood anemia', cancerHistory: 'None' },
      { id: 3, relation: 'Paternal Aunt', name: 'Moza Al Mansoori', condition: 'None', cancerHistory: 'Breast cancer (age 58)' },
      { id: 4, relation: 'Maternal Grandmother', name: 'Shaikha Al Mansoori', condition: 'Hypertension', cancerHistory: 'None' },
      { id: 5, relation: 'Partner / Second Cousin', name: 'Fatima Al Hammadi', condition: 'Beta-thalassaemia trait (Carrier)', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin (Maternal grandmothers are sisters)',
      weddingDate: '2027-02-15',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  ahmed: {
    danaId: 'DANA-2026-72810',
    personal: {
      danaId: 'DANA-2026-72810',
      fullName: 'Ahmed Al Ketbi',
      fullNameAr: 'أحمد الكتبي',
      emiratesId: '784-1994-7281039-3',
      dob: '1994-11-18',
      gender: 'Male',
      phone: '+971 50 319 8241',
      email: 'ahmed.alketbi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Al Ain',
      partnerName: 'Noura Al Ketbi',
      maritalStatus: 'Married',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'B+',
      conditions: 'Mild bilateral high-frequency sensorineural hearing threshold dip (GJB2 carrier); essential hypertension',
      medications: 'Amlodipine (5mg daily); Omega-3 fish oil (1000mg daily)',
      surgeries: 'Childhood tonsillectomy and adenoidectomy (T&A) (Sheikh Khalifa Medical City)',
      allergies: 'Amoxicillin / Clavulanate (urticaria)',
    },
    family: [
      { id: 1, relation: 'Maternal Aunt', name: 'Latifa Al Ketbi', condition: 'Congenital non-syndromic hearing impairment', cancerHistory: 'None' },
      { id: 2, relation: 'Father', name: 'Sultan Al Ketbi', condition: 'Hypertension', cancerHistory: 'None' },
      { id: 3, relation: 'Brother', name: 'Mansoor Al Ketbi', condition: 'None', cancerHistory: 'None' },
      { id: 4, relation: 'Partner / First Cousin', name: 'Noura Al Ketbi', condition: 'GJB2 carrier', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'First cousin once removed',
      weddingDate: '',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '1-3 years',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'yes',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  noura: {
    danaId: 'DANA-2026-51920',
    personal: {
      danaId: 'DANA-2026-51920',
      fullName: 'Noura Al Ketbi',
      fullNameAr: 'نورة الكتبي',
      emiratesId: '784-1996-5192048-1',
      dob: '1996-03-12',
      gender: 'Female',
      phone: '+971 55 921 7384',
      email: 'noura.alketbi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Al Ain',
      partnerName: 'Ahmed Al Ketbi',
      maritalStatus: 'Married',
      pregnancyStatus: 'yes',
    },
    medical: {
      bloodGroup: 'B+',
      conditions: 'First-trimester active pregnancy (11 weeks); mild gestational morning sickness; GJB2 carrier',
      medications: 'Prenatal multivitamins with DHA; Folic acid (5mg high-dose preconceptual); Vitamin B6',
      surgeries: 'Diagnostic laparoscopy for ovarian cyst (2022 at Danat Al Emarat Hospital, Abu Dhabi)',
      allergies: 'Sulfa-based medications (erythema)',
    },
    family: [
      { id: 1, relation: 'Mother', name: 'Mariam Al Ketbi', condition: 'Hypothyroidism', cancerHistory: 'None' },
      { id: 2, relation: 'Cousin', name: 'Hamad Al Ketbi', condition: 'Childhood hearing loss requiring bilateral cochlear implants', cancerHistory: 'None' },
      { id: 3, relation: 'Partner / First Cousin', name: 'Ahmed Al Ketbi', condition: 'GJB2 carrier', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'yes',
      gestationalWeeks: '11',
      isConsanguineous: 'yes',
      relationToPartner: 'First cousin once removed',
      weddingDate: '',
      courtScheduled: 'no',
      timeSensitivity: 'urgent',
      marriageDuration: '1-3 years',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'yes',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  saeed: {
    danaId: 'DANA-2026-92810',
    personal: {
      danaId: 'DANA-2026-92810',
      fullName: 'Saeed Al Nuaimi',
      fullNameAr: 'سعيد النعيمي',
      emiratesId: '784-1993-9281047-5',
      dob: '1993-07-09',
      gender: 'Male',
      phone: '+971 50 812 4910',
      email: 'saeed.alnuaimi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Maryam Al Shamsi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'O+',
      conditions: 'Exercise-induced bronchospasm; asymptomatic SMN1 carrier status (spinal muscular atrophy)',
      medications: 'Salbutamol HFA inhaler (100mcg as needed prior to sports); Vitamin D3 (1000 IU daily)',
      surgeries: 'Septoplasty and inferior turbinate reduction (2022 at Mediclinic Airport Road, Abu Dhabi)',
      allergies: 'Ibuprofen / NSAIDs (facial puffiness and wheezing)',
    },
    family: [
      { id: 1, relation: 'Mother', name: 'Fatima Al Nuaimi', condition: 'Type 2 Diabetes', cancerHistory: 'None' },
      { id: 2, relation: 'First Cousin (Maternal)', name: 'Zayed Al Nuaimi', condition: 'Spinal Muscular Atrophy Type 2 (SMA)', cancerHistory: 'None' },
      { id: 3, relation: 'Partner / First Cousin', name: 'Maryam Al Shamsi', condition: 'SMN1 VUS', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'First cousin (Paternal uncle’s daughter)',
      weddingDate: '2026-12-20',
      courtScheduled: 'yes',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  maryam: {
    danaId: 'DANA-2026-83910',
    personal: {
      danaId: 'DANA-2026-83910',
      fullName: 'Maryam Al Shamsi',
      fullNameAr: 'مريم الشامسي',
      emiratesId: '784-1995-8391028-2',
      dob: '1995-12-04',
      gender: 'Female',
      phone: '+971 52 481 9203',
      email: 'maryam.alshamsi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Saeed Al Nuaimi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'A+',
      conditions: 'Mild hypovitaminosis D; episodic tension-type headaches',
      medications: 'Cholecalciferol (Vitamin D3 2,000 IU daily); Paracetamol (500mg as needed); Folic acid (0.4mg daily)',
      surgeries: 'Impacted wisdom teeth extraction (2020 at Cleveland Clinic Abu Dhabi)',
      allergies: 'Latex (mild contact urticaria)',
    },
    family: [
      { id: 1, relation: 'Paternal Grandmother', name: 'Salama Al Shamsi', condition: 'Rheumatoid Arthritis', cancerHistory: 'Breast cancer (age 68)' },
      { id: 2, relation: 'Father', name: 'Khalfan Al Shamsi', condition: 'Dyslipidemia', cancerHistory: 'None' },
      { id: 3, relation: 'Partner / First Cousin', name: 'Saeed Al Nuaimi', condition: 'SMN1 carrier', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'First cousin (Paternal aunt’s son)',
      weddingDate: '2026-12-20',
      courtScheduled: 'yes',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  omar: {
    danaId: 'DANA-2026-64019',
    personal: {
      danaId: 'DANA-2026-64019',
      fullName: 'Omar Al Dhaheri',
      fullNameAr: 'عمر الظاهري',
      emiratesId: '784-1992-6401928-6',
      dob: '1992-05-16',
      gender: 'Male',
      phone: '+971 50 193 8472',
      email: 'omar.aldhaheri@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Latifa Al Mazrouei',
      maritalStatus: 'Married',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'AB+',
      conditions: 'Mild familial hypercholesterolemia (diet-controlled); negative premarital genetic carrier panel',
      medications: 'CoQ10 (100mg daily); Omega-3 fatty acids (1000mg daily)',
      surgeries: 'Laparoscopic cholecystectomy (2023 at Burjeel Medical City, Abu Dhabi)',
      allergies: 'House dust mites and Bermuda grass pollen',
    },
    family: [
      { id: 1, relation: 'Father', name: 'Mohammed Al Dhaheri', condition: 'Coronary artery disease (stented at age 56)', cancerHistory: 'None' },
      { id: 2, relation: 'Paternal Uncle', name: 'Ali Al Dhaheri', condition: 'Type 2 Diabetes', cancerHistory: 'None' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'no',
      relationToPartner: 'Non-consanguineous',
      weddingDate: '',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '1-3 years',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'yes',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  latifa: {
    danaId: 'DANA-2026-47291',
    personal: {
      danaId: 'DANA-2026-47291',
      fullName: 'Latifa Al Mazrouei',
      fullNameAr: 'لطيفة المزروعي',
      emiratesId: '784-1994-4729103-4',
      dob: '1994-08-25',
      gender: 'Female',
      phone: '+971 55 382 9104',
      email: 'latifa.almazrouei@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Omar Al Dhaheri',
      maritalStatus: 'Married',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'O-',
      conditions: 'Asymptomatic G6PD deficiency carrier (X-linked); advised to avoid oxidative drugs and fava beans',
      medications: 'Folic acid (0.4mg daily); Methylcobalamin B12 (1000mcg weekly)',
      surgeries: 'None reported',
      allergies: 'Nitrofurantoin, Primaquine, Rasburicase, Fava beans (Favism risk due to G6PD carrier status)',
    },
    family: [
      { id: 1, relation: 'Brother', name: 'Suhail Al Mazrouei', condition: 'G6PD Deficiency (severe favism in early childhood)', cancerHistory: 'None' },
      { id: 2, relation: 'Maternal Grandfather', name: 'Humaid Al Mazrouei', condition: 'Favism / G6PD Deficiency', cancerHistory: 'None' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'no',
      relationToPartner: 'Non-consanguineous',
      weddingDate: '',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '1-3 years',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'yes',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  rashid: {
    danaId: 'DANA-2026-38291',
    personal: {
      danaId: 'DANA-2026-38291',
      fullName: 'Rashid Al Suwaidi',
      fullNameAr: 'راشد السويدي',
      emiratesId: '784-1996-3829105-8',
      dob: '1996-01-30',
      gender: 'Male',
      phone: '+971 50 729 1840',
      email: 'rashid.alsuwaidi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Dubai',
      partnerName: 'Aisha Al Falasi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'B+',
      conditions: 'Chronic allergic rhinosinusitis with recurrent nasal polyposis; CFTR delta-F508 heterozygous carrier',
      medications: 'Fluticasone propionate nasal spray (50mcg daily); Levocetirizine (5mg as needed)',
      surgeries: 'Functional endoscopic sinus surgery (FESS) (2024 at Cleveland Clinic Abu Dhabi)',
      allergies: 'Aspirin and NSAIDs (respiratory hypersensitivity)',
    },
    family: [
      { id: 1, relation: 'Mother', name: 'Mariam Al Suwaidi', condition: 'Bronchial asthma', cancerHistory: 'None' },
      { id: 2, relation: 'Paternal Cousin', name: 'Khalifa Al Suwaidi', condition: 'Cystic Fibrosis (CFTR compound heterozygous)', cancerHistory: 'None' },
      { id: 3, relation: 'Partner / Second Cousin', name: 'Aisha Al Falasi', condition: 'CFTR carrier', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin',
      weddingDate: '2027-01-10',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  aisha: {
    danaId: 'DANA-2026-29104',
    personal: {
      danaId: 'DANA-2026-29104',
      fullName: 'Aisha Al Falasi',
      fullNameAr: 'عائشة الفلاسي',
      emiratesId: '784-1997-2910482-9',
      dob: '1997-10-14',
      gender: 'Female',
      phone: '+971 52 918 2736',
      email: 'aisha.alfalasi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Dubai',
      partnerName: 'Rashid Al Suwaidi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'A-',
      conditions: 'Gastroesophageal reflux disease (GERD); CFTR heterozygous carrier',
      medications: 'Esomeprazole (20mg daily PRN); Folic acid (0.4mg daily); Multivitamin complex',
      surgeries: 'Diagnostic upper endoscopy (2023 at NMC Royal Hospital, Abu Dhabi)',
      allergies: 'Ciprofloxacin (severe gastrointestinal cramping)',
    },
    family: [
      { id: 1, relation: 'Maternal Uncle', name: 'Hazza Al Falasi', condition: 'Chronic bronchiectasis / Cystic fibrosis carrier', cancerHistory: 'None' },
      { id: 2, relation: 'Sister', name: 'Hind Al Falasi', condition: 'Mild asthma', cancerHistory: 'None' },
      { id: 3, relation: 'Partner / Second Cousin', name: 'Rashid Al Suwaidi', condition: 'CFTR carrier', cancerHistory: 'None', isPartner: true },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'yes',
      relationToPartner: 'Second cousin',
      weddingDate: '2027-01-10',
      courtScheduled: 'no',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  hamdan: {
    danaId: 'DANA-2026-91823',
    personal: {
      danaId: 'DANA-2026-91823',
      fullName: 'Hamdan Al Qubaisi',
      fullNameAr: 'حمدان القبيسي',
      emiratesId: '784-1993-9182304-1',
      dob: '1993-02-18',
      gender: 'Male',
      phone: '+971 50 638 2910',
      email: 'hamdan.alqubaisi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Shamma Al Zaabi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'O+',
      conditions: 'Intermittent mechanical lumbar back strain; mild hyperuricemia (dietary controlled)',
      medications: 'Topical diclofenac gel PRN; Tart cherry extract supplement',
      surgeries: 'Left ankle ligament reconstruction (2019 at Healthpoint Hospital, Abu Dhabi)',
      allergies: 'None reported (NKDA)',
    },
    family: [
      { id: 1, relation: 'Father', name: 'Saeed Al Qubaisi', condition: 'Gout / hyperuricemia', cancerHistory: 'None' },
      { id: 2, relation: 'Maternal Grandmother', name: 'Fatima Al Qubaisi', condition: 'Hypertension', cancerHistory: 'None' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'no',
      relationToPartner: 'Non-consanguineous',
      weddingDate: '2026-11-28',
      courtScheduled: 'yes',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
  shamma: {
    danaId: 'DANA-2026-84920',
    personal: {
      danaId: 'DANA-2026-84920',
      fullName: 'Shamma Al Zaabi',
      fullNameAr: 'شما الزعابي',
      emiratesId: '784-1995-8492013-7',
      dob: '1995-06-27',
      gender: 'Female',
      phone: '+971 55 839 2014',
      email: 'shamma.alzaabi@example.ae',
      nationality: 'United Arab Emirates',
      city: 'Abu Dhabi',
      partnerName: 'Hamdan Al Qubaisi',
      maritalStatus: 'Engaged',
      pregnancyStatus: 'no',
    },
    medical: {
      bloodGroup: 'A+',
      conditions: 'Subclinical hypothyroidism (euthyroid on low-dose replacement); mild iron deficiency',
      medications: 'Levothyroxine (25mcg daily); Folic acid (0.4mg daily); Ferrous sulfate',
      surgeries: 'None reported',
      allergies: 'Cephalosporins (mild urticarial rash)',
    },
    family: [
      { id: 1, relation: 'Mother', name: 'Mouza Al Zaabi', condition: 'Hashimoto thyroiditis', cancerHistory: 'None' },
      { id: 2, relation: 'Maternal Aunt', name: 'Afra Al Zaabi', condition: 'Hypothyroidism', cancerHistory: 'None' },
    ],
    compliance: {
      isPregnant: 'no',
      gestationalWeeks: '',
      isConsanguineous: 'no',
      relationToPartner: 'Non-consanguineous',
      weddingDate: '2026-11-28',
      courtScheduled: 'yes',
      timeSensitivity: 'standard',
      marriageDuration: '',
      hasChildren: 'no',
      reproductiveGoal: 'preconception',
      previousScreening: 'no',
      recurrentLossHistory: 'no',
      uaeResidencyStatus: 'yes',
    },
    consent: {
      malaffiSync: false,
      partnerShare: false,
      counsellorAccess: false,
      anonymizedResearch: false,
    },
  },
};

export function generateDanaId(idOrSeed = '') {
  const s = String(idOrSeed).toLowerCase();
  if (s.includes('fatima')) return 'DANA-2026-34829';
  if (s.includes('khalid')) return 'DANA-2026-18293';
  if (s.includes('ahmed')) return 'DANA-2026-72810';
  if (s.includes('noura')) return 'DANA-2026-51920';
  if (s.includes('saeed')) return 'DANA-2026-92810';
  if (s.includes('maryam')) return 'DANA-2026-83910';
  if (s.includes('omar')) return 'DANA-2026-64019';
  if (s.includes('latifa')) return 'DANA-2026-47291';
  if (s.includes('rashid')) return 'DANA-2026-38291';
  if (s.includes('aisha')) return 'DANA-2026-29104';
  if (s.includes('hamdan')) return 'DANA-2026-91823';
  if (s.includes('shamma')) return 'DANA-2026-84920';

  if (!idOrSeed) return `DANA-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash % 90000) + 10000;
  return `DANA-2026-${num}`;
}

export function getSyntheticIntake(id) {
  const key = String(id || '').toLowerCase();
  const matchedKey = Object.keys(SYNTHETIC_INTAKES).find((k) => key.includes(k));
  const data = (matchedKey && SYNTHETIC_INTAKES[matchedKey])
    || SYNTHETIC_INTAKES[id]
    || (PEOPLE[id]?.sex === 'M' ? SYNTHETIC_INTAKES.khalid : SYNTHETIC_INTAKES.fatima);
  return {
    completed: false,
    mode: 'uae_pass',
    danaId: data?.danaId || generateDanaId(id),
    submittedAt: null,
    ...data,
  };
}

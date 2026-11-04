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

/* 21 Live Accounts from Supabase Database (accounts table) */
export const SUPABASE_ACCOUNTS = [
  { user_id: '00e55974-7b43-4831-bddf-c3c113b62c51', role: 'couple', person_id: 'u_00e559747b43', display_name: 'Karthikeyan', title: 'Partner · engaged (sample journey)', email: 'karthi@gmail.com' },
  { user_id: '049656ea-3047-493c-ba49-cd0810cd259c', role: 'couple', person_id: 'u_049656ea3047', display_name: 'Mubashira', title: 'Partner · engaged (sample journey)', email: 'mubashira@gmail.com' },
  { user_id: '0a5d2e44-26ca-4d20-b449-076c33c2775b', role: 'couple', person_id: 'u_0a5d2e4426ca', display_name: 'Noufaldemo', title: 'Partner · engaged (sample journey)', email: 'devendranprabhakar2007@gmail.com' },
  { user_id: '0e0d677b-677c-4546-aa3e-2fc962979088', role: 'couple', person_id: 'u_0e0d677b677c', display_name: 'API Check', title: 'Partner · engaged (sample journey)', email: 'dana.api.check+1793782648@gmail.com' },
  { user_id: '14579163-9d60-4ed2-8f33-0e3717230093', role: 'admin', person_id: 'doh', display_name: 'Programme team', title: 'DoH premarital programme', email: 'doh@dana.demo' },
  { user_id: '25f9d5a9-e44c-466c-9d86-85bd84fa53df', role: 'couple', person_id: 'u_25f9d5a9e44c', display_name: 'Noufal Noufal', title: 'Partner · engaged (sample journey)', email: 'garena123official@gmail.com' },
  { user_id: '311b1864-de4e-4e5b-a59a-8166de9320b8', role: 'couple', person_id: 'u_311b1864de4e', display_name: 'Noufal Noufal', title: 'Partner · engaged (sample journey)', email: 'vagirahamed@gmail.com' },
  { user_id: '44359735-c612-498e-afde-0f58b12a0a5a', role: 'couple', person_id: 'u_44359735c612', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781239@gmail.com' },
  { user_id: '4570b5ad-9e62-469e-a845-0750f6678d14', role: 'couple', person_id: 'u_4570b5ad9e62', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781300@gmail.com' },
  { user_id: '4a1d4c23-344f-4d64-9e14-cdb4afc101e1', role: 'couple', person_id: 'u_4a1d4c23344f', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781372@gmail.com' },
  { user_id: '7f7b1bf6-eb18-40ff-ac55-44378606d46d', role: 'couple', person_id: 'u_7f7b1bf6eb18', display_name: 'DEVENDRAN P', title: 'Partner · engaged (sample journey)', email: 'devendranp.it2024@citchennai.net' },
  { user_id: '92dc8f17-e9c7-49cc-8f16-58f171747bc3', role: 'couple', person_id: 'khalid', display_name: 'Khalid Al Mansoori', title: 'Partner · engaged', email: 'khalid@dana.demo' },
  { user_id: '9c8e15a8-be65-498a-86bc-7a21a4d51b62', role: 'couple', person_id: 'u_9c8e15a8be65', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793780776@gmail.com' },
  { user_id: '9fa5cc44-ac80-4aaa-a36a-de31209352a1', role: 'couple', person_id: 'u_9fa5cc44ac80', display_name: 'Noufaldemolatest', title: 'Partner · engaged (sample journey)', email: 'noufal@demo' },
  { user_id: 'b0992703-40a3-483e-8fac-ff81ce187f68', role: 'counsellor', person_id: 'mariam', display_name: 'Dr. Mariam Al Hosani', title: 'Genetic counsellor', email: 'mariam@dana.demo' },
  { user_id: 'b573d102-52bb-45b0-8c78-6f011a51a9c5', role: 'couple', person_id: 'u_b573d10252bb', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781438@gmail.com' },
  { user_id: 'be2d29a7-8a06-4c80-ba18-091bdabcb7f6', role: 'couple', person_id: 'u_be2d29a78a06', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781061@gmail.com' },
  { user_id: 'cedcb625-5655-4ced-80ea-3e7f938929a9', role: 'couple', person_id: 'fatima', display_name: 'Fatima Al Hammadi', title: 'Partner · engaged', email: 'fatima@dana.demo' },
  { user_id: 'dc210e37-1ffd-415e-83de-4422603ce87a', role: 'couple', person_id: 'u_dc210e371ffd', display_name: 'HARI PANDI', title: 'Partner · engaged (sample journey)', email: 'haripandin.it2024@citchennai.net' },
  { user_id: 'e4dea6e8-b101-44c4-a474-93d9eec3bc59', role: 'couple', person_id: 'u_e4dea6e8b101', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781328@gmail.com' },
  { user_id: 'fc66eb27-288f-4340-bfb5-fe34f4bb8f7e', role: 'couple', person_id: 'u_fc66eb27288f', display_name: 'MOHAMMED NOUFAL V IT', title: 'Partner · engaged (sample journey)', email: 'mohammednoufalv.it2024@citchennai.net' },
];

/* people: `carrier` is a gene symbol, or null when nothing was found */
export const PEOPLE = {
  khalid: { name: 'Khalid Al Mansoori', short: 'Khalid', username: 'khalid', danaId: 'DANA-7701', sex: 'M', carrier: 'HBB' },
  fatima: { name: 'Fatima Al Hammadi', short: 'Fatima', username: 'fatima', danaId: 'DANA-8822', sex: 'F', carrier: 'HBB' },
  ahmed: { name: 'Ahmed Al Ketbi', short: 'Ahmed', username: 'ahmed', danaId: 'DANA-3319', sex: 'M', carrier: 'GJB2' },
  noura: { name: 'Noura Al Ketbi', short: 'Noura', username: 'noura', danaId: 'DANA-4412', sex: 'F', carrier: 'GJB2' },
  saeed: { name: 'Saeed Al Nuaimi', short: 'Saeed', username: 'saeed', danaId: 'DANA-5590', sex: 'M', carrier: 'SMN1' },
  maryam: { name: 'Maryam Al Shamsi', short: 'Maryam', username: 'maryam', danaId: 'DANA-6623', sex: 'F', carrier: null },
  omar: { name: 'Omar Al Dhaheri', short: 'Omar', username: 'omar', danaId: 'DANA-2211', sex: 'M', carrier: null },
  latifa: { name: 'Latifa Al Mazrouei', short: 'Latifa', username: 'latifa', danaId: 'DANA-1198', sex: 'F', carrier: 'G6PD' },
  rashid: { name: 'Rashid Al Suwaidi', short: 'Rashid', username: 'rashid', danaId: 'DANA-9944', sex: 'M', carrier: 'CFTR' },
  aisha: { name: 'Aisha Al Falasi', short: 'Aisha', username: 'aisha', danaId: 'DANA-8833', sex: 'F', carrier: 'CFTR' },
  hamdan: { name: 'Hamdan Al Qubaisi', short: 'Hamdan', username: 'hamdan', danaId: 'DANA-5577', sex: 'M', carrier: null },
  shamma: { name: 'Shamma Al Zaabi', short: 'Shamma', username: 'shamma', danaId: 'DANA-6688', sex: 'F', carrier: null },

  // Registered users from Supabase accounts
  u_00e559747b43: { name: 'Karthikeyan', short: 'Karthikeyan', username: 'karthikeyan', danaId: 'DANA-KARTHI', sex: 'M', carrier: null, email: 'karthi@gmail.com' },
  u_049656ea3047: { name: 'Mubashira', short: 'Mubashira', username: 'mubashira', danaId: 'DANA-MUBASHIRA', sex: 'F', carrier: null, email: 'mubashira@gmail.com' },
  u_0a5d2e4426ca: { name: 'Noufaldemo', short: 'Noufal', username: 'noufaldemo', danaId: 'DANA-NOUFAL1', sex: 'M', carrier: null, email: 'devendranprabhakar2007@gmail.com' },
  u_0e0d677b677c: { name: 'API Check', short: 'API Check', username: 'apicheck', danaId: 'DANA-API', sex: 'M', carrier: null, email: 'dana.api.check+1793782648@gmail.com' },
  u_25f9d5a9e44c: { name: 'Noufal Noufal', short: 'Noufal', username: 'noufal2', danaId: 'DANA-NOUFAL2', sex: 'M', carrier: null, email: 'garena123official@gmail.com' },
  u_311b1864de4e: { name: 'Noufal Noufal', short: 'Noufal', username: 'noufal3', danaId: 'DANA-NOUFAL3', sex: 'M', carrier: null, email: 'vagirahamed@gmail.com' },
  u_7f7b1bf6eb18: { name: 'DEVENDRAN P', short: 'Devendran', username: 'devendran', danaId: 'DANA-DEVENDRAN', sex: 'M', carrier: null, email: 'devendranp.it2024@citchennai.net' },
  u_9fa5cc44ac80: { name: 'Noufaldemolatest', short: 'Noufal', username: 'noufaldemolatest', danaId: 'DANA-NOUFAL4', sex: 'M', carrier: null, email: 'noufal@demo' },
  u_dc210e371ffd: { name: 'HARI PANDI', short: 'Hari', username: 'haripandi', danaId: 'DANA-HARIPANDI', sex: 'M', carrier: null, email: 'haripandin.it2024@citchennai.net' },
  u_fc66eb27288f: { name: 'MOHAMMED NOUFAL V IT', short: 'Mohammed Noufal', username: 'mohammednoufal', danaId: 'DANA-MOHAMMED', sex: 'M', carrier: null, email: 'mohammednoufalv.it2024@citchennai.net' },
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

/* demo accounts, one per role. Relatives never log in: they get an invite link. */
export const ACCOUNTS = [
  { id: 'khalid', role: 'couple', name: 'Khalid Al Mansoori', title: 'Partner · engaged', couple: 'c1' },
  { id: 'fatima', role: 'couple', name: 'Fatima Al Hammadi', title: 'Partner · engaged', couple: 'c1' },
  { id: 'mariam', role: 'counsellor', name: 'Dr. Mariam Al Hosani', title: 'Genetic counsellor' },
  { id: 'doh', role: 'admin', name: 'Programme team', title: 'DoH premarital programme' },
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

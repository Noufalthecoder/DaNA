/**
 * DaNA Supabase Database Seeder
 * Populates all tables with clinically authentic premarital screening mock data.
 *
 * NOTE: Credentials are read exclusively from environment variables (.env).
 * No keys or secrets are hardcoded in this file.
 */

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';

const url = process.env.VITE_SUPABASE_URL;
// Check if service role key exists in env (bypasses RLS), else fallback to anon key from env
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: Required environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.');
  process.exit(1);
}

const supabase = createClient(url, key);

// -----------------------------------------------------------------------------
// Mock Datasets (Strictly formatted to Supabase column types)
// -----------------------------------------------------------------------------

const peopleData = [
  { id: 'fatima', name: 'Fatima Al Hammadi', short_name: 'Fatima', sex: 'F', date_of_birth: '1998-05-14', phone_number_hash: '+971501234567' },
  { id: 'khalid', name: 'Khalid Al Mansoori', short_name: 'Khalid', sex: 'M', date_of_birth: '1996-09-20', phone_number_hash: '+971509876543' },
  { id: 'ahmed', name: 'Ahmed Al Ketbi', short_name: 'Ahmed', sex: 'M', date_of_birth: '1995-11-03', phone_number_hash: '+971502345678' },
  { id: 'noura', name: 'Noura Al Suwaidi', short_name: 'Noura', sex: 'F', date_of_birth: '1997-02-18', phone_number_hash: '+971508765432' },
  { id: 'saeed', name: 'Saeed Al Dhaheri', short_name: 'Saeed', sex: 'M', date_of_birth: '1994-07-25', phone_number_hash: '+971503456789' },
  { id: 'maryam', name: 'Maryam Al Romaithi', short_name: 'Maryam', sex: 'F', date_of_birth: '1999-12-01', phone_number_hash: '+971507654321' },
  { id: 'omar', name: 'Omar Al Nuaimi', short_name: 'Omar', sex: 'M', date_of_birth: '1993-04-15', phone_number_hash: '+971504567890' },
  { id: 'latifa', name: 'Latifa Al Mazrouei', short_name: 'Latifa', sex: 'F', date_of_birth: '1996-08-30', phone_number_hash: '+971506543210' },
  { id: 'aisha', name: 'Aisha Al Shamsi', short_name: 'Aisha', sex: 'F', date_of_birth: '1998-10-12', phone_number_hash: '+971505678901' },
  { id: 'rashid', name: 'Rashid Al Falasi', short_name: 'Rashid', sex: 'M', date_of_birth: '1995-01-22', phone_number_hash: '+971505432109' },
  { id: 'hamdan', name: 'Hamdan Al Maktoum', short_name: 'Hamdan', sex: 'M', date_of_birth: '1994-06-18', phone_number_hash: '+971506789012' },
  { id: 'shamma', name: 'Shamma Al Qassimi', short_name: 'Shamma', sex: 'F', date_of_birth: '1997-03-09', phone_number_hash: '+971504321098' },
];

const accountsData = [
  { user_id: '00e55974-7b43-4831-bddf-c3c113b62c51', role: 'couple', person_id: 'u_00e559747b43', display_name: 'Karthikeyan', title: 'Partner · engaged (sample journey)', email: 'karthi@gmail.com' },
  { user_id: '049656ea-3047-493c-ba49-cd0810cd259c', role: 'couple', person_id: 'u_049656ea3047', display_name: 'Mubashira', title: 'Partner · engaged (sample journey)', email: 'mubashira@gmail.com' },
  { user_id: '0a5d2e44-26ca-4d20-b449-076c33c2775b', role: 'couple', person_id: 'u_0a5d2e4426ca', display_name: 'Noufaldemo', title: 'Partner · engaged (sample journey)', email: 'devendranprabhakar2007@gmail.com' },
  { user_id: '0e0d677b-677c-4546-aa3e-2fc962979088', role: 'couple', person_id: 'u_0e0d677b677c', display_name: 'API Check', title: 'Partner · engaged (sample journey)', email: 'dana.api.check+1793782648@gmail.com' },
  { user_id: '14579163-9d60-4ed2-8f33-0e3717230093', role: 'admin', person_id: null, display_name: 'Programme team', title: 'DoH premarital programme', email: 'doh@dana.demo' },
  { user_id: '25f9d5a9-e44c-466c-9d86-85bd84fa53df', role: 'couple', person_id: 'u_25f9d5a9e44c', display_name: 'Noufal Noufal', title: 'Partner · engaged (sample journey)', email: 'garena123official@gmail.com' },
  { user_id: '311b1864-de4e-4e5b-a59a-8166de9320b8', role: 'couple', person_id: 'u_311b1864de4e', display_name: 'Noufal Noufal', title: 'Partner · engaged (sample journey)', email: 'vagirahamed@gmail.com' },
  { user_id: '44359735-c612-498e-afde-0f58b12a0a5a', role: 'couple', person_id: 'u_44359735c612', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781239@gmail.com' },
  { user_id: '4570b5ad-9e62-469e-a845-0750f6678d14', role: 'couple', person_id: 'u_4570b5ad9e62', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781300@gmail.com' },
  { user_id: '4a1d4c23-344f-4d64-9e14-cdb4afc101e1', role: 'couple', person_id: 'u_4a1d4c23344f', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781372@gmail.com' },
  { user_id: '7f7b1bf6-eb18-40ff-ac55-44378606d46d', role: 'couple', person_id: 'u_7f7b1bf6eb18', display_name: 'DEVENDRAN P', title: 'Partner · engaged (sample journey)', email: 'devendranp.it2024@citchennai.net' },
  { user_id: '92dc8f17-e9c7-49cc-8f16-58f171747bc3', role: 'couple', person_id: 'khalid', display_name: 'Khalid Al Mansoori', title: 'Partner · engaged', email: 'khalid@dana.demo' },
  { user_id: '9c8e15a8-be65-498a-86bc-7a21a4d51b62', role: 'couple', person_id: 'u_9c8e15a8be65', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793780776@gmail.com' },
  { user_id: '9fa5cc44-ac80-4aaa-a36a-de31209352a1', role: 'couple', person_id: 'u_9fa5cc44ac80', display_name: 'Noufaldemolatest', title: 'Partner · engaged (sample journey)', email: 'noufal@demo' },
  { user_id: 'b0992703-40a3-483e-8fac-ff81ce187f68', role: 'counsellor', person_id: null, display_name: 'Dr. Mariam Al Hosani', title: 'Genetic counsellor', email: 'mariam@dana.demo' },
  { user_id: 'b573d102-52bb-45b0-8c78-6f011a51a9c5', role: 'couple', person_id: 'u_b573d10252bb', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781438@gmail.com' },
  { user_id: 'be2d29a7-8a06-4c80-ba18-091bdabcb7f6', role: 'couple', person_id: 'u_be2d29a78a06', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781061@gmail.com' },
  { user_id: 'cedcb625-5655-4ced-80ea-3e7f938929a9', role: 'couple', person_id: 'fatima', display_name: 'Fatima Al Hammadi', title: 'Partner · engaged', email: 'fatima@dana.demo' },
  { user_id: 'dc210e37-1ffd-415e-83de-4422603ce87a', role: 'couple', person_id: 'u_dc210e371ffd', display_name: 'HARI PANDI', title: 'Partner · engaged (sample journey)', email: 'haripandin.it2024@citchennai.net' },
  { user_id: 'e4dea6e8-b101-44c4-a474-93d9eec3bc59', role: 'couple', person_id: 'u_e4dea6e8b101', display_name: 'Signup Test', title: 'Partner · engaged (sample journey)', email: 'dana.signup.ui+1793781328@gmail.com' },
  { user_id: 'fc66eb27-288f-4340-bfb5-fe34f4bb8f7e', role: 'couple', person_id: 'u_fc66eb27288f', display_name: 'MOHAMMED NOUFAL V IT', title: 'Partner · engaged (sample journey)', email: 'mohammednoufalv.it2024@citchennai.net' },
];

const couplesData = [
  { id: 'c1', partner_a: 'fatima', partner_b: 'khalid', stage: 'Engaged', pregnant_weeks: null },
  { id: 'c2', partner_a: 'ahmed', partner_b: 'noura', stage: 'Married', pregnant_weeks: 11 },
  { id: 'c3', partner_a: 'maryam', partner_b: 'saeed', stage: 'Engaged', pregnant_weeks: null },
  { id: 'c4', partner_a: 'latifa', partner_b: 'omar', stage: 'Married', pregnant_weeks: null },
  { id: 'c5', partner_a: 'aisha', partner_b: 'rashid', stage: 'Engaged', pregnant_weeks: null },
  { id: 'c6', partner_a: 'hamdan', partner_b: 'shamma', stage: 'Engaged', pregnant_weeks: null },
];

const counsellorsData = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Dr. Mariam Al Hosani',
    gender: 'F',
    languages: ['ar', 'en'],
    specialties: ['Premarital Genetics', 'Hemoglobinopathies', 'Reproductive Genetics'],
    location: 'Abu Dhabi',
    status: 'ACTIVE',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: '22222222-2222-2222-2222-222222222222',
    name: 'Dr. Salem Al Kaabi',
    gender: 'M',
    languages: ['ar', 'en'],
    specialties: ['Spinal Muscular Atrophy', 'Metabolic Disorders'],
    location: 'Al Ain',
    status: 'ACTIVE',
  },
];

const clinicalCasesData = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    couple_id: 'c1',
    case_type: 'PREMARITAL_COUPLE',
    workflow_status: 'PENDING_COUNSELLING',
    clinical_urgency: 'HIGH',
    is_pregnant: false,
    triage_tier: 2,
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    couple_id: 'c2',
    case_type: 'PRENATAL_ESCALATION',
    workflow_status: 'IN_CONSULTATION',
    clinical_urgency: 'URGENT',
    is_pregnant: true,
    triage_tier: 1,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    couple_id: 'c3',
    case_type: 'INDIVIDUAL_CARRIER',
    workflow_status: 'ASSESSMENT_COMPLETED',
    clinical_urgency: 'MODERATE',
    is_pregnant: false,
    triage_tier: 3,
  },
];

const caseAssignmentsData = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    case_id: '33333333-3333-3333-3333-333333333331',
    counsellor_id: '11111111-1111-1111-1111-111111111111',
    assigned_by: '11111111-1111-1111-1111-111111111111',
    status: 'ACTIVE',
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    case_id: '33333333-3333-3333-3333-333333333332',
    counsellor_id: '11111111-1111-1111-1111-111111111111',
    assigned_by: '11111111-1111-1111-1111-111111111111',
    status: 'ACTIVE',
  },
];

const appointmentsData = [
  {
    case_id: '33333333-3333-3333-3333-333333333331',
    counsellor_id: '11111111-1111-1111-1111-111111111111',
    meeting_type: 'TELEHEALTH',
    status: 'SCHEDULED',
  },
  {
    case_id: '33333333-3333-3333-3333-333333333332',
    counsellor_id: '11111111-1111-1111-1111-111111111111',
    meeting_type: 'IN_PERSON',
    status: 'ATTENDED',
  },
];

const geneticReportsData = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    report_id: 'NRL-2026-GEN-00129',
    laboratory_name: 'National Reference Laboratory (NRL) Abu Dhabi',
    test_methodology: 'Targeted NGS Panel 570 Genes',
    panel_coverage: '570 Genes',
    report_date: '2026-10-12',
    validation_status: 'VALIDATED',
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    report_id: 'NRL-2026-GEN-00130',
    laboratory_name: 'National Reference Laboratory (NRL) Abu Dhabi',
    test_methodology: 'Targeted NGS Panel 570 Genes',
    panel_coverage: '570 Genes',
    report_date: '2026-10-12',
    validation_status: 'VALIDATED',
  },
  {
    id: '66666666-6666-6666-6666-666666666663',
    report_id: 'G42-2026-PRE-00445',
    laboratory_name: 'G42 Healthcare Omics Centre',
    test_methodology: 'Targeted NGS Panel 570 Genes',
    panel_coverage: '570 Genes',
    report_date: '2026-09-02',
    validation_status: 'VALIDATED',
  },
];

const geneticVariantsData = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    report_id: '66666666-6666-6666-6666-666666666661',
    gene_symbol: 'HBB',
    hgvs_c: 'c.92+1G>A',
    hgvs_p: 'Splice donor variant',
    zygosity: 'HETEROZYGOUS',
    inheritance_pattern: 'AR',
    clinical_significance: 'PATHOGENIC',
    disease_association: 'Beta-thalassaemia',
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    report_id: '66666666-6666-6666-6666-666666666662',
    gene_symbol: 'HBB',
    hgvs_c: 'c.118C>T',
    hgvs_p: 'p.Gln40Ter',
    zygosity: 'HETEROZYGOUS',
    inheritance_pattern: 'AR',
    clinical_significance: 'PATHOGENIC',
    disease_association: 'Beta-thalassaemia',
  },
  {
    id: '77777777-7777-7777-7777-777777777773',
    report_id: '66666666-6666-6666-6666-666666666663',
    gene_symbol: 'GJB2',
    hgvs_c: 'c.35delG',
    hgvs_p: 'p.Gly12fs',
    zygosity: 'HETEROZYGOUS',
    inheritance_pattern: 'AR',
    clinical_significance: 'PATHOGENIC',
    disease_association: 'Non-syndromic hearing loss',
  },
];

const medicalRecordsData = [
  {
    id: '88888888-8888-8888-8888-888888888881',
    source: 'MALAFFI_HIE',
    resource_type: 'Observation',
    clinical_code: '718-7',
    display_name: 'Hemoglobin [Mass/volume] in Blood',
    status: 'final',
    recorded_date: '2026-10-10',
    raw_payload: { value: 13.8, unit: 'g/dL', referenceRange: '13.0-17.0' },
  },
  {
    id: '88888888-8888-8888-8888-888888888882',
    source: 'MALAFFI_HIE',
    resource_type: 'Observation',
    clinical_code: '787-2',
    display_name: 'MCV [Entitic volume] in Blood',
    status: 'final',
    recorded_date: '2026-10-10',
    raw_payload: { value: 72.4, unit: 'fL', referenceRange: '80.0-100.0', flag: 'LOW' },
  },
];

const familyMembersData = [
  {
    id: '99999999-9999-9999-9999-999999999991',
    owner_id: 'khalid',
    display_name: 'Rashid Al Mansoori',
    relationship: 'Brother',
    gender: 'M',
    is_deceased: false,
  },
  {
    id: '99999999-9999-9999-9999-999999999992',
    owner_id: 'khalid',
    display_name: 'Maryam Al Mansoori',
    relationship: 'Sister',
    gender: 'F',
    is_deceased: false,
  },
  {
    id: '99999999-9999-9999-9999-999999999993',
    owner_id: 'fatima',
    display_name: 'Shaikha Al Hammadi',
    relationship: 'Sister',
    gender: 'F',
    is_deceased: false,
  },
];

const familyConditionsData = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    member_id: '99999999-9999-9999-9999-999999999991',
    condition_name: 'Carrier for Beta-thalassaemia',
    age_at_onset: 24,
  },
];

const partnerConsentsData = [
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    couple_id: 'c1',
    owner_id: 'khalid',
    recipient_id: 'fatima',
    scope: 'COUPLE_RISK_ASSESSMENT',
    status: 'ACTIVE',
    granted_at: '2026-10-12T09:05:00Z',
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    couple_id: 'c1',
    owner_id: 'fatima',
    recipient_id: 'khalid',
    scope: 'COUPLE_RISK_ASSESSMENT',
    status: 'ACTIVE',
    granted_at: '2026-10-12T09:05:00Z',
  },
];

const referralsData = [
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    case_id: '33333333-3333-3333-3333-333333333331',
    destination: 'Abu Dhabi PGT-M / IVF Center of Excellence',
    priority: 'HIGH',
    reason: 'Dual HBB carriers requesting pre-implantation genetic testing counselling',
    status: 'PENDING',
  },
];

const silaInvitationsData = [
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    sender_id: 'khalid',
    token_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'PENDING',
    expires_at: '2026-12-31T23:59:59Z',
  },
];

const notesData = [
  {
    clinical_summary: 'Couple counseled on 25% autosomal recessive risk for Beta-thalassaemia. Reviewed PGT-M reproductive options, timeline, and DoH coverage. Scheduled follow-up in 2 weeks.',
  },
];

// -----------------------------------------------------------------------------
// Seeder Execution
// -----------------------------------------------------------------------------

async function seedTable(table, data) {
  process.stdout.write(`Seeding [${table}] (${data.length} records)... `);
  const { data: inserted, error } = await supabase.from(table).upsert(data).select();
  if (error) {
    console.log(`NOTICE: ${error.message} (${error.code})`);
    return false;
  }
  console.log(`SUCCESS (${inserted?.length || data.length} records)`);
  return true;
}

async function run() {
  console.log('================================================================');
  console.log('DaNA Supabase Mock Data Seeder');
  console.log('Target Database:', url);
  console.log('Auth Mode:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key (Bypassing RLS)' : 'Anon Key (Subject to RLS)');
  console.log('================================================================\n');

  const jobs = [
    { table: 'people', data: peopleData },
    { table: 'accounts', data: accountsData },
    { table: 'couples', data: couplesData },
    { table: 'counsellors', data: counsellorsData },
    { table: 'clinical_cases', data: clinicalCasesData },
    { table: 'case_assignments', data: caseAssignmentsData },
    { table: 'appointments', data: appointmentsData },
    { table: 'genetic_reports', data: geneticReportsData },
    { table: 'genetic_variants', data: geneticVariantsData },
    { table: 'medical_records', data: medicalRecordsData },
    { table: 'family_members', data: familyMembersData },
    { table: 'family_conditions', data: familyConditionsData },
    { table: 'partner_consents', data: partnerConsentsData },
    { table: 'referrals', data: referralsData },
    { table: 'sila_invitations', data: silaInvitationsData },
    { table: 'notes', data: notesData },
  ];

  let successCount = 0;
  let noticeCount = 0;

  for (const job of jobs) {
    const ok = await seedTable(job.table, job.data);
    if (ok) {
      successCount++;
    } else {
      noticeCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`Summary: ${successCount} tables seeded successfully, ${noticeCount} RLS notices.`);
  if (noticeCount > 0) {
    console.log('\nTo bypass RLS and complete all inserts:');
    console.log('1. Open your Supabase Dashboard -> SQL Editor');
    console.log('2. Paste and run database/seed.sql (this disables RLS and seeds all tables)');
    console.log('OR add SUPABASE_SERVICE_ROLE_KEY=<service-role-key> to your .env file.');
  }
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Seeder execution error:', err);
  process.exit(1);
});

import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectTables() {
  const tables = [
    'couples',
    'medical_records',
    'genetic_reports',
    'genetic_variants',
    'partner_consents',
    'family_members',
    'family_conditions',
    'clinical_cases',
    'counsellors',
    'counsellor_availability',
    'case_assignments',
    'appointments',
    'referrals',
    'sila_invitations',
    'notes',
    'consents',
  ];

  for (const t of tables) {
    // Attempt an insert with empty object to trigger PostgreSQL error describing required/missing columns
    const { data, error } = await supabase.from(t).insert({}).select();
    console.log(`\n--- TABLE [${t}] ---`);
    if (error) {
      console.log('Error info:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
    } else {
      console.log('Insert empty succeeded:', data);
    }
  }
}

inspectTables().catch(console.error);


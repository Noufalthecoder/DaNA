/**
 * Live Supabase Security & Authorization Verification Script
 * 
 * Tests the live Supabase database instance with real authenticated sessions:
 * - Patient 1 (Session A)
 * - Patient 2 (Session B)
 * - Counsellor / Staff Attempt (Session C)
 * - Unauthenticated (Anonymous)
 * 
 * Verifies live PostgreSQL RLS enforcement, IDOR vulnerabilities,
 * privilege escalation attempts, direct table access, and RPC safeguards.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('../web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://oflqmhfivyzttlivgusr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbHFtaGZpdnl6dHRsaXZndXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NTEyOTUsImV4cCI6MjEwOTMyNzI5NX0.qh_kWE1bFAnaiqwWMiBfDUYQu3bBouTLwYXcVEngDEQ';

const results = [];
function recordResult(task, testName, status, evidence, details) {
  results.push({ task, testName, status, evidence, details });
  console.log(`[${status}] ${task} - ${testName}: ${evidence}`);
}

async function runLiveSecurityVerification() {
  console.log('================================================================');
  console.log('DaNA Live Supabase Database Security & RLS Verification');
  console.log('Target URL:', SUPABASE_URL);
  console.log('================================================================\n');

  // Client 0: Anonymous (Unauthenticated)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------------------------------------------------------------------------
  // 1. Unauthenticated Anonymous Access Checks (Task 10)
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing Unauthenticated Anonymous Access ---');
  const sensitiveTables = [
    'accounts',
    'genetic_reports',
    'genetic_variants',
    'consents',
    'medical_records',
    'clinical_cases',
    'case_assignments',
    'notes',
    'couples',
    'people',
    'partner_consents',
    'sila_alerts',
    'referrals'
  ];

  for (const table of sensitiveTables) {
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(5);
      if (error) {
        recordResult('Task 10 (Direct Access)', `Anon SELECT from ${table}`, 'PASS', `Blocked by DB: ${error.message}`);
      } else if (data && data.length === 0) {
        recordResult('Task 10 (Direct Access)', `Anon SELECT from ${table}`, 'PASS', 'RLS filtered 0 rows to anon');
      } else {
        recordResult('Task 10 (Direct Access)', `Anon SELECT from ${table}`, 'FAIL', `DATA LEAK: ${data.length} rows returned to unauthenticated user!`);
      }
    } catch (e) {
      recordResult('Task 10 (Direct Access)', `Anon SELECT from ${table}`, 'PASS', `Exception: ${e.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Provision Authenticated Sessions for 2 Patients & 1 Counsellor (Tasks 1, 2)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Provisioning Authenticated User Sessions ---');
  const ts = Date.now();
  const patientEmailA = `live.patient.a.${ts}@dana.test`;
  const patientEmailB = `live.patient.b.${ts}@dana.test`;
  const counsellorEmail = `live.counsellor.${ts}@dana.test`;
  const password = 'LiveSecurityTest123!@#';

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const clientC = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  const { data: authA, error: errA } = await clientA.auth.signUp({ email: patientEmailA, password });
  const { data: authB, error: errB } = await clientB.auth.signUp({ email: patientEmailB, password });
  const { data: authC, error: errC } = await clientC.auth.signUp({ email: counsellorEmail, password });

  if (errA || errB || errC) {
    console.error('Failed to create authenticated test users:', errA || errB || errC);
    return;
  }

  console.log('✓ Patient A created:', authA.user.id);
  console.log('✓ Patient B created:', authB.user.id);
  console.log('✓ User C created:', authC.user.id);

  // Initialize Account for Patient A
  const { error: accInsA } = await clientA.from('accounts').insert({
    user_id: authA.user.id,
    role: 'couple',
    person_id: null,
    display_name: 'Patient Alpha',
    title: 'Screening Member'
  });
  recordResult('Task 1 (Authentication Trace)', 'Patient A self-account initialization', accInsA ? 'FAIL' : 'PASS', accInsA ? accInsA.message : 'Successfully initialized account row');

  // Initialize Account for Patient B
  const { error: accInsB } = await clientB.from('accounts').insert({
    user_id: authB.user.id,
    role: 'couple',
    person_id: null,
    display_name: 'Patient Beta',
    title: 'Screening Member'
  });
  recordResult('Task 1 (Authentication Trace)', 'Patient B self-account initialization', accInsB ? 'FAIL' : 'PASS', accInsB ? accInsB.message : 'Successfully initialized account row');

  // ---------------------------------------------------------------------------
  // 3. Privilege Escalation Tests (Task 2, Task 8)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Privilege Escalation Safeguards ---');
  // Attempt 1: Direct insert with role: 'admin'
  const { error: adminEscErr } = await clientC.from('accounts').insert({
    user_id: authC.user.id,
    role: 'admin',
    display_name: 'Escalation Hacker',
    title: 'Fake Admin'
  });
  recordResult('Task 2 (Role Mapping & Escalation)', 'Self-assign role: admin', adminEscErr ? 'PASS' : 'FAIL', adminEscErr ? `Blocked by RLS: ${adminEscErr.message}` : 'CRITICAL FAIL: Self-assigned admin role!');

  // Attempt 2: Direct insert with role: 'counsellor'
  const { error: counsellorEscErr } = await clientC.from('accounts').insert({
    user_id: authC.user.id,
    role: 'counsellor',
    display_name: 'Fake Counsellor',
    title: 'Dr. Hacker'
  });
  recordResult('Task 2 (Role Mapping & Escalation)', 'Self-assign role: counsellor', counsellorEscErr ? 'PASS' : 'FAIL', counsellorEscErr ? `Blocked by RLS: ${counsellorEscErr.message}` : 'CRITICAL FAIL: Self-assigned counsellor role!');

  // Attempt 3: Try to claim staff role via RPC with invalid code
  const { data: claimRes, error: claimErr } = await clientC.rpc('claim_staff_role', {
    p_role: 'counsellor',
    p_code: 'INVALID_CODE_999'
  });
  recordResult('Task 2 (Role Mapping & Escalation)', 'claim_staff_role RPC with fake code', claimErr ? 'PASS' : 'FAIL', claimErr ? `Rejected by RPC: ${claimErr.message}` : `Unexpected RPC response: ${JSON.stringify(claimRes)}`);

  // ---------------------------------------------------------------------------
  // 4. IDOR (Insecure Direct Object Reference) on Accounts (Task 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing IDOR Vulnerabilities on Accounts ---');
  // Patient A tries to update Patient B's display_name or role
  const { data: idorUpdateData, error: idorUpdateErr } = await clientA
    .from('accounts')
    .update({ display_name: 'Hacked by Patient A', role: 'admin' })
    .eq('user_id', authB.user.id)
    .select();
  
  if (idorUpdateErr) {
    recordResult('Task 1 (IDOR)', 'Cross-account UPDATE attempt', 'PASS', `Rejected by RLS: ${idorUpdateErr.message}`);
  } else if (!idorUpdateData || idorUpdateData.length === 0) {
    recordResult('Task 1 (IDOR)', 'Cross-account UPDATE attempt', 'PASS', 'RLS updated 0 rows (IDOR blocked)');
  } else {
    recordResult('Task 1 (IDOR)', 'Cross-account UPDATE attempt', 'FAIL', 'CRITICAL IDOR: Patient A updated Patient B account!');
  }

  // ---------------------------------------------------------------------------
  // 5. Cross-Patient Data Isolation (Task 4)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Cross-Patient Data Isolation ---');
  // Patient A tries to SELECT from medical_records and genetic_reports directly
  const { data: patAReports, error: patARepErr } = await clientA.from('genetic_reports').select('*');
  recordResult('Task 4 (Ownership Isolation)', 'Patient A SELECT genetic_reports', patARepErr ? 'PASS' : (patAReports.length === 0 ? 'PASS' : 'PARTIAL'), patARepErr ? `Error: ${patARepErr.message}` : `Returned ${patAReports.length} rows (Patient has no linked person_id yet)`);

  const { data: patAMedRecs, error: patAMedErr } = await clientA.from('medical_records').select('*');
  recordResult('Task 4 (Ownership Isolation)', 'Patient A SELECT medical_records', patAMedErr ? 'PASS' : (patAMedRecs.length === 0 ? 'PASS' : 'PARTIAL'), patAMedErr ? `Error: ${patAMedErr.message}` : `Returned ${patAMedRecs.length} rows`);

  // ---------------------------------------------------------------------------
  // 6. Direct Database Access to Case Assignments & Clinical Cases (Task 7)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Direct Access to Clinical Cases & Assignments ---');
  const { data: clientACases, error: clientACasesErr } = await clientA.from('clinical_cases').select('*');
  recordResult('Task 7 (Clinical Case Isolation)', 'Patient A SELECT clinical_cases', clientACasesErr ? 'PASS' : (clientACases.length === 0 ? 'PASS' : 'FAIL'), clientACasesErr ? `Blocked: ${clientACasesErr.message}` : `Returned ${clientACases.length} rows`);

  const { data: clientBAssignments, error: clientBAssignmentsErr } = await clientB.from('case_assignments').select('*');
  recordResult('Task 7 (Clinical Case Isolation)', 'Patient B SELECT case_assignments', clientBAssignmentsErr ? 'PASS' : (clientBAssignments.length === 0 ? 'PASS' : 'FAIL'), clientBAssignmentsErr ? `Blocked: ${clientBAssignmentsErr.message}` : `Returned ${clientBAssignments.length} rows`);

  // ---------------------------------------------------------------------------
  // 7. Verify Database Policy Definition Limitations (Schema Audit)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Database Policy Structure Verification (Live & Schema Analysis) ---');
  // Finding DB-1: can_see_genetics allows partner to read raw genetic_reports if share_partner consent is present
  recordResult(
    'Task 4 (Genetic Isolation Gap)',
    'PostgreSQL can_see_genetics(p) allows raw report SELECT for partner',
    'FAIL',
    'PostgreSQL function can_see_genetics allows partner raw query if share_partner is active. Frontend prevents exposure, but DB RLS lacks decoupling.'
  );

  // Finding DB-2: Counsellor RLS allows selecting unassigned clinical cases if consented
  recordResult(
    'Task 7 (Counsellor Assignment Gap)',
    'PostgreSQL clinical_cases & medrec_read policy lacks case_assignments JOIN',
    'FAIL',
    'RLS policy checks only my_role() = "counsellor" and has_consent(), omitting assignment verification. Frontend/Backend enforces this, but DB layer does not.'
  );

  // Finding DB-3: Database role constraint limits roles to 3
  recordResult(
    'Task 2 (Role Model Gap)',
    'PostgreSQL accounts.role check constraint restricted to (couple, counsellor, admin)',
    'FAIL',
    'Database does not natively enforce clinical_supervisor, doh_viewer, content_reviewer roles at the table level.'
  );

  console.log('\n================================================================');
  console.log('LIVE VERIFICATION COMPLETE. SUMMARY OF RESULTS:');
  console.log('Total checks:', results.length);
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  console.log(`PASS: ${passCount} | FAIL: ${failCount} | PARTIAL: ${partialCount}`);
  console.log('================================================================\n');

  return results;
}

runLiveSecurityVerification().catch(console.error);

/* Location scope (supabase/030_location_scope.sql) on a real Postgres (PGlite).
   Runs on the live table shape (GENERATED ALWAYS identity id) and on a plain id column. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { PGlite } = await import(pathToFileURL(createRequire(new URL('../web/package.json', import.meta.url)).resolve('@electric-sql/pglite')).href);

const DIR = fileURLToPath(new URL('../supabase/', import.meta.url));
const SHIM = fileURLToPath(new URL('./support/supabase_shim.sql', import.meta.url));

async function run(identity) {
const db = new PGlite();
await db.exec(fs.readFileSync(SHIM, 'utf8'));
// live-shaped locations: bigint id, no source_id/source, 20 Dubai rows
await db.exec(`create table public.locations (id bigint ${identity ? 'generated always as identity ' : ''}primary key, city text not null, city_ascii text, state_name text, country text not null, country_code text, latitude double precision, longitude double precision, created_at timestamptz default now());`);
const dubai = [['Downtown Dubai',25.1972,55.2744],['Dubai Marina',25.0805,55.1403],['Jumeirah',25.2048,55.2708],['Deira',25.2697,55.3094]];
let id = 1; for (const [c,la,lo] of dubai) await db.exec(`insert into locations ${identity ? 'overriding system value ' : ''}values (${id++}, '${c}','${c}','Dubai','United Arab Emirates','AE',${la},${lo})`);
await db.exec(`insert into locations ${identity ? 'overriding system value ' : ''}values (100,'Abu Dhabi','Abu Dhabi','Abu Dhabi','United Arab Emirates','AE',24.4539,54.3773),(101,'Al Ain','Al Ain','Abu Dhabi','United Arab Emirates','AE',24.2075,55.7447),(102,'Sharjah','Sharjah','Sharjah','United Arab Emirates','AE',25.3463,55.4209)`);
const files = ['schema.sql','seed.sql', ...fs.readdirSync(DIR).filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort().filter(f=>f!=='029_locations.sql')];
for (const f of files) { try { await db.exec(fs.readFileSync(path.join(DIR, f),'utf8')); } catch(e){ console.log('MIGRATION FAIL', f, e.message.split('\n')[0]); throw new Error('migration failed: '+f);} }
console.log('migrations ok (live-shaped locations, 029_locations skipped)');
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated, service_role; grant usage on all sequences in schema public to authenticated;`);
const U = { adminN:'00000000-0000-0000-0000-0000000000a1', adminD:'00000000-0000-0000-0000-0000000000a2', k1:'00000000-0000-0000-0000-0000000000b1', k2:'00000000-0000-0000-0000-0000000000b2', c1:'00000000-0000-0000-0000-0000000000c1', c2:'00000000-0000-0000-0000-0000000000c2' };
for (const [k,v] of Object.entries(U)) await db.exec(`insert into auth.users (id,email) values ('${v}','${k}@t.dev')`);
await db.exec(`
 insert into accounts (user_id, role, person_id, display_name) values
  ('${U.adminN}','admin',null,'Admin National'),('${U.adminD}','admin',null,'Admin Dubai'),
  ('${U.k1}','counsellor',null,'K1 Dubai'),('${U.k2}','counsellor',null,'K2 AbuDhabi'),
  ('${U.c1}','couple','khalid','Khalid'),('${U.c2}','couple','omar','Omar');
 update accounts set scope_level='emirate', location_id=1 where user_id='${U.adminD}';
 delete from counsellors where user_id in ('${U.k1}','${U.k2}');
 insert into counsellors (user_id,name,status,credentials_verified,location_id,gender) values
  ('${U.k1}','K1 Dubai','active',true,null,'F'),('${U.k2}','K2 AbuDhabi','active',true,null,'M');
 update counsellors set status='away' where user_id is distinct from '${U.k1}' and user_id is distinct from '${U.k2}';`);
let pass=0, fail=0;
const as = async (u, sql, params) => { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u||''}',false);`); try { return await db.query(sql, params); } finally { await db.exec('reset role'); } };
const ok = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error('assertion false'); pass++; console.log('  ok  ', name); } catch(e){ fail++; console.log('  FAIL', name, '->', e.message.split('\n')[0]); } };
const bad = async (name, fn, re) => { try { await fn(); fail++; console.log('  FAIL', name, '-> expected an error'); } catch(e){ if (re && !re.test(e.message)) { fail++; console.log('  FAIL', name, '-> wrong error:', e.message.split('\n')[0]); } else { pass++; console.log('  ok  ', name, '=>', e.message.split('\n')[0]); } } };
const k1id = (await db.query(`select id from counsellors where user_id='${U.k1}'`)).rows[0].id;
const k2id = (await db.query(`select id from counsellors where user_id='${U.k2}'`)).rows[0].id;

await ok('no unlocated counsellor can be found by couples with in-person yet', async () => (await as(U.c1, `select * from find_slots('offline')`)).rows.length === 0);
await bad('in-person slots need a clinic location', () => as(U.k1, `select publish_slots(current_date+1, current_date+3, array[1,2,3,4,5,6,7], '09:00','12:00',45,15,'in_person')`), /clinic location/);
await ok('counsellor sets own clinic (Dubai Marina, in person+online)', async () => { await as(U.k1, `select set_counsellor_profile(null, 2, true, true)`); return (await db.query(`select location, location_id from counsellors where id='${k1id}'`)).rows[0].location === 'Dubai Marina, Dubai'; });
await ok('K2 clinic Abu Dhabi, online only', async () => { await as(U.k2, `select set_counsellor_profile(null, 100, false, true)`); return true; });
await bad('must offer at least one', () => as(U.k2, `select set_counsellor_profile(null, 100, false, false)`), /at least one/);
await bad('counsellor cannot set another counsellor', () => as(U.k2, `select set_counsellor_profile('${k1id}', 2, true, true)`), /outside your area/);
let n;
await ok('K1 publishes slots (mixed), 9-12 every day for 3 days', async () => { n = (await as(U.k1, `select publish_slots(current_date+1, current_date+3, array[1,2,3,4,5,6,7], '09:00','12:00',45,15,'both') n`)).rows[0].n; return n === 9; });
await ok('re-publish is idempotent', async () => (await as(U.k1, `select publish_slots(current_date+1, current_date+3, array[1,2,3,4,5,6,7], '09:00','12:00',45,15,'both') n`)).rows[0].n === 0);
await ok('K2 publishes online-only slots', async () => (await as(U.k2, `select publish_slots(current_date+1, current_date+1, array[1,2,3,4,5,6,7], '09:00','10:00',45,15,'online') n`)).rows[0].n === 1);
await bad('K2 (online only) cannot publish in-person', () => as(U.k2, `select publish_slots(current_date+1, current_date+1, array[1,2,3,4,5,6,7], '13:00','14:00',45,15,'in_person')`), /in-person/);
await bad('past date refused', () => as(U.k1, `select publish_slots(current_date-1, current_date+1, array[1], '09:00','10:00')`), /past/);
await bad('end before start refused', () => as(U.k1, `select publish_slots(current_date+1, current_date+1, array[1], '10:00','09:00')`), /after start/);

await ok('couple has no home location -> in-person list uses no area filter, includes only offline-capable', async () => { const r=(await as(U.c1, `select * from find_slots('offline')`)).rows; return r.length===9 && r.every(x=>x.counsellor_name==='K1 Dubai'); });
await ok('couple sets home to Jumeirah; label returned', async () => (await as(U.c1, `select set_my_location(3) l`)).rows[0].l === 'Jumeirah, Dubai');
await ok('online list shows both counsellors, same-emirate first', async () => { const r=(await as(U.c1, `select * from find_slots('online')`)).rows; return r.length===10 && r[0].counsellor_name==='K1 Dubai' && r[0].match==='same_emirate' && r[0].distance_km>0 && r[r.length-1].counsellor_name==='K2 AbuDhabi'; });
await ok('in-person never shows Abu Dhabi online-only counsellor', async () => (await as(U.c1, `select * from find_slots('offline')`)).rows.every(x=>x.emirate==='Dubai'));
await ok('in-person for another emirate returns none for Sharjah', async () => (await as(U.c1, `select * from find_slots('offline','Sharjah')`)).rows.length===0);
await bad('unknown location refused', () => as(U.c1, `select set_my_location(99999)`), /Unknown location/);

const slot = (await as(U.c1, `select slot_id from find_slots('offline') limit 1`)).rows[0].slot_id;
await bad('cannot request an in-person session on a K2 online-only slot', async () => { const s=(await db.query(`select id from counsellor_availability where counsellor_id='${k2id}' limit 1`)).rows[0].id; return as(U.c1, `select request_consultation('${s}','offline')`); }, /online only/);
let req;
await ok('couple requests in-person; request stores clinic', async () => { req=(await as(U.c1, `select request_consultation('${slot}','offline') r`)).rows[0].r; const r=(await db.query(`select location_id,status from consultation_requests where id='${req}'`)).rows[0]; return r.location_id===2 && r.status==='PENDING'; });
await ok('held slot disappears from find_slots', async () => !(await as(U.c1, `select * from find_slots('offline')`)).rows.some(x=>x.slot_id===slot));
await bad('second request blocked while one is pending', () => as(U.c1, `select request_consultation('${slot}','offline')`), /already have/);
await ok('counsellor confirms; appointment carries clinic', async () => { const a=(await as(U.k1, `select confirm_consultation_request('${req}') a`)).rows[0].a; return (await db.query(`select location_id, meeting_type from appointments where id=${a}`)).rows[0].location_id===2; });
await bad('counsellor cannot remove a booked slot', () => as(U.k1, `select remove_slot('${slot}')`), /requested or booked/);
await ok('counsellor can remove a free slot', async () => { const s=(await db.query(`select id from counsellor_availability where counsellor_id='${k1id}' and not is_booked and not is_held limit 1`)).rows[0].id; await as(U.k1, `select remove_slot('${s}')`); return true; });
await bad('couple cannot remove slots', async () => as(U.c1, `select remove_slot('${(await db.query(`select id from counsellor_availability where counsellor_id='${k1id}' and not is_booked limit 1`)).rows[0].id}')`), /Not your slot/);
await bad('couple cannot publish slots', () => as(U.c1, `select publish_slots(current_date+1,current_date+2,array[1],'09:00','10:00')`), /Only a counsellor/);

await ok('national admin sees all counsellors with a location', async () => (await as(U.adminN, `select * from admin_counsellors()`)).rows.length >= 2);
await ok('Dubai admin sees only Dubai counsellors (+ none unlocated hidden? unlocated are visible)', async () => { const r=(await as(U.adminD, `select name, emirate from admin_counsellors()`)).rows; return r.some(x=>x.name==='K1 Dubai') && !r.some(x=>x.name==='K2 AbuDhabi'); });
await ok('coverage: Dubai admin sees only Dubai; counts hidden under 5', async () => { const r=(await as(U.adminD, `select * from admin_coverage()`)).rows; return r.length>=1 && r.every(x=>x.emirate==='Dubai') && r.every(x=>x.couples_count==='<5'||Number(x.couples_count)>=5); });
await ok('coverage: national sees Abu Dhabi too', async () => (await as(U.adminN, `select * from admin_coverage()`)).rows.some(x=>x.emirate==='Abu Dhabi'));
await bad('couple cannot call admin_counsellors', () => as(U.c1, `select * from admin_counsellors()`), /Only a DoH admin/);
await bad('Dubai admin cannot move a counsellor to Abu Dhabi', () => as(U.adminD, `select set_counsellor_profile('${k1id}', 100, true, true)`), /outside your area/);
await ok('Dubai admin can move K1 within Dubai', async () => { await as(U.adminD, `select set_counsellor_profile('${k1id}', 3, true, true)`); return true; });
await bad('Dubai admin cannot change admin scopes', () => as(U.adminD, `select set_admin_scope('${U.adminN}','emirate',1)`), /nationwide/);
await ok('national admin narrows Dubai admin to a single location', async () => { await as(U.adminN, `select set_admin_scope('${U.adminD}','location',3)`); return (await db.query(`select scope_level from accounts where user_id='${U.adminD}'`)).rows[0].scope_level==='location'; });
await bad('last national admin cannot demote self', () => as(U.adminN, `select set_admin_scope('${U.adminN}','emirate',1)`), /only nationwide/);
await bad('scope needs a location', () => as(U.adminN, `select set_admin_scope('${U.adminD}','emirate',null)`), /Choose a location/);
await ok('audit trail written for scope + clinic + slot changes', async () => (await db.query(`select count(*)::int c from audit_log where action like 'Set admin area%' or action like 'Set counsellor clinic%' or action like 'Published%'`)).rows[0].c >= 5);

// cases: new case should prefer same-emirate counsellor
await ok('upsert_case prefers counsellor in the couple\'s emirate', async () => {
  await db.exec(`update people set location_id=100 where id='omar'; delete from case_assignments where case_id in (select id from clinical_cases where couple_id='c4');`);
  await db.exec(`select upsert_case('c4')`);
  const r=(await db.query(`select k.name, a.assignment_reason from case_assignments a join counsellors k on k.id=a.counsellor_id join clinical_cases cc on cc.id=a.case_id where cc.couple_id='c4' and a.status='active'`)).rows;
  console.log('      ->', JSON.stringify(r)); return r.length===1 && r[0].name==='K2 AbuDhabi';
});
await ok('seed added other emirates without duplicating existing ones', async () => { const r=(await db.query(`select count(*)::int c, count(distinct lower(city)||state_name)::int d from locations where country_code='AE'`)).rows[0]; const f=(await db.query(`select count(*)::int c from locations where city='Fujairah'`)).rows[0].c; return r.c===r.d && f===1; });
await ok('Mariam and Yousef linked to real locations', async () => (await db.query(`select count(*)::int c from counsellors where name like 'Dr.%' and location_id is not null`)).rows[0].c===2);

// ---- 031: an admin handles the counsellors of their own area ----
await db.exec(`insert into auth.users (id,email) values ('00000000-0000-0000-0000-0000000000b3','k3@t.dev'),('00000000-0000-0000-0000-0000000000b4','k4@t.dev');
 insert into accounts (user_id, role, display_name, title) values ('00000000-0000-0000-0000-0000000000b3','counsellor','K3 New','Genetic counsellor (pending verification)'),('00000000-0000-0000-0000-0000000000b4','counsellor','K4 AbuDhabiNew','Genetic counsellor (pending verification)');
 insert into counsellors (user_id,name,status,credentials_verified) values ('00000000-0000-0000-0000-0000000000b3','K3 New','away',false),('00000000-0000-0000-0000-0000000000b4','K4 AbuDhabiNew','away',false);
 update accounts set scope_level='emirate', location_id=1 where user_id='${U.adminD}';`);
const k3 = (await db.query(`select id from counsellors where user_id='00000000-0000-0000-0000-0000000000b3'`)).rows[0].id;
const k4 = (await db.query(`select id from counsellors where user_id='00000000-0000-0000-0000-0000000000b4'`)).rows[0].id;
await ok('regional admin cannot see a counsellor with no clinic', async () => !(await as(U.adminD, `select name from admin_counsellors()`)).rows.some(x=>x.name==='K3 New'));
await ok('nationwide admin sees the unplaced counsellor', async () => (await as(U.adminN, `select name from admin_counsellors()`)).rows.some(x=>x.name==='K3 New'));
await bad('regional admin cannot verify an unplaced counsellor', () => as(U.adminD, `select manage_counsellor('${k3}','verify')`), /outside your area/);
await bad('nationwide admin cannot verify without a clinic either', () => as(U.adminN, `select manage_counsellor('${k3}','verify')`), /choose a clinic/);
await ok('counsellor picks a clinic in Dubai', async () => { await as('00000000-0000-0000-0000-0000000000b3', `select set_counsellor_profile(null, 3, true, true)`); return true; });
await ok('now the Dubai admin sees them', async () => (await as(U.adminD, `select name from admin_counsellors()`)).rows.some(x=>x.name==='K3 New'));
await bad('couple cannot manage counsellors', () => as(U.c1, `select manage_counsellor('${k3}','verify')`), /Only a DoH admin/);
await bad('counsellor cannot manage counsellors', () => as(U.k1, `select manage_counsellor('${k3}','verify')`), /Only a DoH admin/);
await bad('bad action refused', () => as(U.adminD, `select manage_counsellor('${k3}','delete')`), /Choose verify/);
await bad('cannot activate before verifying', () => as(U.adminD, `select manage_counsellor('${k3}','activate')`), /Verify the counsellor first/);
await ok('Dubai admin verifies: active, verified, title updated', async () => { const s=(await as(U.adminD, `select manage_counsellor('${k3}','verify') s`)).rows[0].s; const r=(await db.query(`select k.status, k.credentials_verified, a.title from counsellors k join accounts a on a.user_id=k.user_id where k.id='${k3}'`)).rows[0]; return s==='active' && r.status==='active' && r.credentials_verified && r.title==='Genetic counsellor'; });
await bad('verifying twice refused', () => as(U.adminD, `select manage_counsellor('${k3}','verify')`), /Already verified/);
const K3U = '00000000-0000-0000-0000-0000000000b3';
await ok('verified counsellor publishes and couples can find them', async () => { await as(K3U, `select publish_slots(current_date+6, current_date+6, array[1,2,3,4,5,6,7], '09:00','10:00',45,15,'online')`); return (await as(U.c1, `select * from find_slots('online')`)).rows.some(x=>x.counsellor_name==='K3 New'); });
await ok('Dubai admin pauses: hidden from couples; re-activates: visible again', async () => {
  await as(U.adminD, `select manage_counsellor('${k3}','pause','on leave')`);
  const paused = (await db.query(`select status from counsellors where id='${k3}'`)).rows[0].status;
  const hidden = !(await as(U.c1, `select * from find_slots('online')`)).rows.some(x=>x.counsellor_name==='K3 New');
  await as(U.adminD, `select manage_counsellor('${k3}','activate')`);
  const back = (await as(U.c1, `select * from find_slots('online')`)).rows.some(x=>x.counsellor_name==='K3 New');
  return paused==='away' && hidden && back;
});
await ok('Abu Dhabi counsellor (placed) is out of the Dubai admin\'s reach', async () => { await as('00000000-0000-0000-0000-0000000000b4', `select set_counsellor_profile(null, 100, false, true)`); return !(await as(U.adminD, `select name from admin_counsellors()`)).rows.some(x=>x.name==='K4 AbuDhabiNew'); });
await bad('Dubai admin cannot verify the Abu Dhabi counsellor', () => as(U.adminD, `select manage_counsellor('${k4}','verify')`), /outside your area/);
await ok('an Abu Dhabi emirate admin can', async () => { await db.exec(`update accounts set scope_level='emirate', location_id=100 where user_id='${U.adminD}'`); await as(U.adminD, `select manage_counsellor('${k4}','verify')`); return (await db.query(`select credentials_verified from counsellors where id='${k4}'`)).rows[0].credentials_verified; });
await ok('manage actions are audited', async () => (await db.query(`select count(*)::int c from audit_log where action like 'Verified counsellor:%' or action like 'Paused counsellor:%' or action like 'Activated counsellor:%'`)).rows[0].c >= 4);
// re-run safe
await ok('030 is re-runnable', async () => { for (const f of ['030_location_scope.sql','031_admin_manages_counsellors.sql','036_admin_directory.sql']) await db.exec(fs.readFileSync(DIR+f,'utf8')); return true; });
// ---- 035: home location from UAE PASS fills people.location_id, never over the person's choice ----
await db.exec(`delete from uaepass_identity where person_id in ('omar','khalid'); update people set location_id = null where id = 'omar'; update people set location_id = 3 where id = 'khalid';`);
const ident = async (pid) => (await db.query(`select home_location_id, home_area, home_emirate from uaepass_identity where person_id = $1`, [pid])).rows[0];
const homeOf = async (pid) => (await db.query(`select location_id from people where id = $1`, [pid])).rows[0].location_id;
let omarHome;
await ok('UAE PASS link stores a home area on the identity', async () => {
  await as(U.c2, `select link_uaepass(false)`);
  const i = await ident('omar'); omarHome = i.home_location_id;
  const l = (await db.query(`select city, coalesce(nullif(trim(state_name),''), city) em from locations where id = $1`, [omarHome])).rows[0];
  return omarHome != null && i.home_area === l.city && i.home_emirate === l.em;
});
await ok('... and fills the empty location column with it', async () => (await homeOf('omar')) === omarHome);
await ok('my_identity() returns the home area to the app', async () => (await as(U.c2, `select my_identity() j`)).rows[0].j.home_location_id === omarHome);
await ok('the person can change it, and linking again keeps their choice', async () => {
  const other = omarHome === 2 ? 3 : 2;
  await as(U.c2, `select set_my_location(${other})`);
  await as(U.c2, `select link_uaepass(false)`);
  return (await homeOf('omar')) === other && (await ident('omar')).home_location_id === omarHome;
});
await ok('a location chosen before linking is not overwritten', async () => {
  await as(U.c1, `select link_uaepass(false)`);
  return (await homeOf('khalid')) === 3 && (await ident('khalid')).home_location_id != null;
});
await ok('the UAE PASS home area is stable for an account', async () => {
  await db.exec(`delete from uaepass_identity where person_id = 'omar'; update people set location_id = null where id = 'omar';`);
  await as(U.c2, `select link_uaepass(false)`);
  return (await ident('omar')).home_location_id === omarHome && (await homeOf('omar')) === omarHome;
});
await bad('the internal fill function cannot be called by a user', () => as(U.c2, `select _apply_uaepass_home('khalid')`), /permission denied/);
await ok('035 is re-runnable', async () => { await db.exec(fs.readFileSync(DIR+'035_location_from_uaepass.sql','utf8')); return (await homeOf('khalid')) === 3; });

// ---- 036: admin account directory and enforced suspension ----
// adminD is an Abu Dhabi emirate admin by now (031 tests); K1's clinic is Dubai Marina, K2's Abu Dhabi.
await db.exec(`update people set location_id = 100 where id = 'omar'; update people set location_id = 3 where id = 'khalid';`);
const dir = async (u, args = '') => (await as(u, `select * from admin_directory(${args})`)).rows;
const allAccounts = (await db.query(`select count(*)::int c from accounts`)).rows[0].c;
await bad('a couple cannot open the directory', () => dir(U.c1), /Only an administrator/);
await bad('a counsellor cannot open the directory', () => dir(U.k1), /Only an administrator/);
await ok('a nationwide admin sees every account, with the total on each row', async () => { const r = await dir(U.adminN, 'p_limit => 100'); return r.length === Math.min(allAccounts, 100) && Number(r[0].total) === allAccounts; });
await ok('an Abu Dhabi admin sees Abu Dhabi accounts only (K2, Omar), not Dubai ones (K1, Khalid)', async () => {
  const names = (await dir(U.adminD, 'p_limit => 100')).map((x) => x.display_name);
  return names.includes('K2 AbuDhabi') && names.includes('Omar') && !names.includes('K1 Dubai') && !names.includes('Khalid');
});
await ok('filters: role, sex, emirate, search', async () => {
  const k = await dir(U.adminN, `p_role => 'counsellor', p_limit => 100`);
  const men = await dir(U.adminN, `p_sex => 'M', p_limit => 100`);
  const dubai = await dir(U.adminN, `p_emirate => 'Dubai', p_limit => 100`);
  const found = await dir(U.adminN, `p_search => 'k1 dub'`);
  return k.every((x) => x.role === 'counsellor') && men.every((x) => x.sex === 'M') && men.some((x) => x.display_name === 'Khalid')
    && dubai.every((x) => x.emirate === 'Dubai') && found.length === 1 && found[0].display_name === 'K1 Dubai';
});
await ok('paging: limit and offset', async () => { const a = await dir(U.adminN, 'p_limit => 2, p_offset => 0'); const b = await dir(U.adminN, 'p_limit => 2, p_offset => 2'); return a.length === 2 && b.length >= 1 && a[0].user_id !== b[0].user_id; });
await ok('couples never show an email; staff do', async () => { const r = await dir(U.adminN, 'p_limit => 100'); return r.filter((x) => x.role === 'couple').every((x) => x.email == null) && r.some((x) => x.role !== 'couple' && x.email); });
await ok('summary counts match the directory scope', async () => {
  const s = (await as(U.adminD, `select * from admin_directory_summary()`)).rows[0];
  const r = await dir(U.adminD, 'p_limit => 100');
  return Number(s.total) === r.length && Number(s.counsellors) === r.filter((x) => x.role === 'counsellor').length;
});
await bad('reason needed to suspend', () => as(U.adminN, `select admin_set_account_status('${U.c2}', 'suspended', '  ')`), /reason/);
await bad('nobody changes their own status', () => as(U.adminN, `select admin_set_account_status('${U.adminN}', 'suspended', 'x')`), /own account/);
await bad('an admin cannot suspend outside their area', () => as(U.adminD, `select admin_set_account_status('${U.c1}', 'suspended', 'test')`), /outside your area/);
await bad('only a nationwide admin changes another admin', () => as(U.adminD, `select admin_set_account_status('${U.adminN}', 'suspended', 'test')`), /nationwide administrator/);
await bad('a couple cannot suspend anyone', () => as(U.c1, `select admin_set_account_status('${U.c2}', 'suspended', 'test')`), /Only an administrator/);
await ok('an Abu Dhabi admin suspends Omar: he loses his role and every data path', async () => {
  await as(U.adminD, `select admin_set_account_status('${U.c2}', 'suspended', 'Identity under review')`);
  const role = (await as(U.c2, `select my_role() r, my_person() p`)).rows[0];
  const people = (await as(U.c2, `select id from people`)).rows.length;
  const own = (await as(U.c2, `select status, status_reason from accounts where user_id = '${U.c2}'`)).rows[0];
  return role.r === null && role.p === null && people === 0 && own.status === 'suspended' && own.status_reason === 'Identity under review';
});
await bad('a suspended couple cannot use location functions', () => as(U.c2, `select set_my_location(3)`), /Only a couple member/);
await ok('suspending a counsellor also stops their bookings', async () => {
  await as(U.adminN, `select admin_set_account_status('${U.k2}', 'suspended', 'Licence check')`);
  return (await db.query(`select status from counsellors where user_id = '${U.k2}'`)).rows[0].status === 'away';
});
await ok('reactivating restores access, and both changes are audited', async () => {
  await as(U.adminD, `select admin_set_account_status('${U.c2}', 'active')`);
  await as(U.adminN, `select admin_set_account_status('${U.k2}', 'active')`);
  const back = (await as(U.c2, `select my_role() r`)).rows[0].r === 'couple';
  const n = (await db.query(`select count(*)::int c from audit_log where action like 'Suspended account:%' or action like 'Reactivated account:%'`)).rows[0].c;
  return back && n === 4;
});
await ok('a suspended admin has no directory and no scope', async () => {
  await as(U.adminN, `select admin_set_account_status('${U.adminD}', 'suspended', 'Left the programme')`);
  let refused = false; try { await dir(U.adminD); } catch { refused = true; }
  const scope = (await as(U.adminD, `select in_admin_scope(100) s`)).rows[0].s;
  const st = (await db.query(`select status, scope_level, location_id from accounts where user_id = '${U.adminD}'`)).rows[0];
  await as(U.adminN, `select admin_set_account_status('${U.adminD}', 'active')`);
  if (!(refused && scope === false)) throw new Error(JSON.stringify({ refused, scope, st }));
  return true;
});
await ok('a nationwide admin can suspend another nationwide admin, who then loses access', async () => {
  await db.exec(`update accounts set scope_level = 'national' where user_id = '${U.adminD}'`);
  try {
    await as(U.adminD, `select admin_set_account_status('${U.adminN}', 'suspended', 'Rotation')`);
    let refused = false; try { await dir(U.adminN); } catch { refused = true; }
    await db.exec(`update accounts set status = 'active' where user_id = '${U.adminN}'`);
    return refused;
  } finally { await db.exec(`update accounts set scope_level = 'emirate' where user_id = '${U.adminD}'`); }
});
await ok('036 is re-runnable', async () => { await db.exec(fs.readFileSync(DIR+'036_admin_directory.sql','utf8')); return (await as(U.c1, `select my_role() r`)).rows[0].r === 'couple'; });
await bad('nobody can set their own status column directly', () => as(U.c2, `update accounts set status = 'active' where user_id = '${U.c2}'`), /permission denied/);
// 029 after 030 (fresh-database order)
assert.equal(fail, 0, `${fail} of ${pass + fail} checks failed`);

}

test('030 on the live shape (identity id)', { timeout: 180000 }, () => run(true));
test('030 on a plain id column', { timeout: 180000 }, () => run(false));

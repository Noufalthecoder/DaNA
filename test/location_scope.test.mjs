/* Location scope (supabase/030_location_scope.sql) on a real Postgres (PGlite).
   Runs on the live table shape (GENERATED ALWAYS identity id) and on a plain id column. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// the package is installed under web/, this file lives in test/
const { PGlite } = await import(pathToFileURL(createRequire(new URL('../web/package.json', import.meta.url)).resolve('@electric-sql/pglite')).href);

const DIR = new URL('../supabase/', import.meta.url).pathname;
const SHIM = new URL('./support/supabase_shim.sql', import.meta.url).pathname;

async function run(identity) {
const db = new PGlite();
await db.exec(fs.readFileSync(SHIM, 'utf8'));
// live-shaped locations: bigint id, no source_id/source, 20 Dubai rows
await db.exec(`create table public.locations (id bigint ${identity ? 'generated always as identity ' : ''}primary key, city text not null, city_ascii text, state_name text, country text not null, country_code text, latitude double precision, longitude double precision, created_at timestamptz default now());`);
const dubai = [['Downtown Dubai',25.1972,55.2744],['Dubai Marina',25.0805,55.1403],['Jumeirah',25.2048,55.2708],['Deira',25.2697,55.3094]];
let id = 1; for (const [c,la,lo] of dubai) await db.exec(`insert into locations ${identity ? 'overriding system value ' : ''}values (${id++}, '${c}','${c}','Dubai','United Arab Emirates','AE',${la},${lo})`);
await db.exec(`insert into locations ${identity ? 'overriding system value ' : ''}values (100,'Abu Dhabi','Abu Dhabi','Abu Dhabi','United Arab Emirates','AE',24.4539,54.3773),(101,'Al Ain','Al Ain','Abu Dhabi','United Arab Emirates','AE',24.2075,55.7447),(102,'Sharjah','Sharjah','Sharjah','United Arab Emirates','AE',25.3463,55.4209)`);
const files = ['schema.sql','seed.sql', ...fs.readdirSync(DIR).filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort().filter(f=>f!=='029_locations.sql'), '030_location_scope.sql'];
for (const f of files) { try { await db.exec(fs.readFileSync(DIR+f,'utf8')); } catch(e){ console.log('MIGRATION FAIL', f, e.message.split('\n')[0]); throw new Error('migration failed: '+f);} }
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
// re-run safe
await ok('030 is re-runnable', async () => { await db.exec(fs.readFileSync(DIR+'030_location_scope.sql','utf8')); return true; });
// 029 after 030 (fresh-database order)
assert.equal(fail, 0, `${fail} of ${pass + fail} checks failed`);

}

test('030 on the live shape (identity id)', { timeout: 180000 }, () => run(true));
test('030 on a plain id column', { timeout: 180000 }, () => run(false));

/* family_members.id is a uuid: the tree built from the intake, and older trees kept in a browser,
   must only ever send uuids (the "invalid input syntax for type uuid: fa_2" bug). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTreeFromIntake, toDb, dbId } from '../web/src/app/shared/family.js';
import { SYNTHETIC_INTAKES } from '../web/src/app/shared/data.js';

const UU = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const me = { id: 'u_adb757ae4aa1', name: 'Test', sex: 'M' };

test('a tree built from the intake uses uuids, keeps its parent links, and is the same every time', () => {
  for (const [k, intake] of Object.entries(SYNTHETIC_INTAKES)) {
    const a = buildTreeFromIntake(me, { name: 'P' }, intake);
    const ids = new Set(a.map((r) => r.id));
    assert.equal(ids.size, a.length, `${k}: ids are unique`);
    for (const r of a) {
      assert.match(r.id, UU, `${k}: ${r.relation} id`);
      for (const p of [r.father_id, r.mother_id]) if (p) assert.ok(ids.has(p), `${k}: ${r.relation} parent link`);
    }
    assert.deepEqual(buildTreeFromIntake(me, { name: 'P' }, intake), a, `${k}: stable`);
    for (const d of a.map((r) => toDb(r, me.id))) { assert.match(d.id, UU); d.parent_ids.forEach((x) => assert.match(x, UU)); }
  }
});

test('old fa_2-style ids from a saved tree become the same uuid when saved', () => {
  const old = { id: 'fa_2', name: 'Father', relation: 'Father', sex: 'M', father_id: 'pgf_1', mother_id: null };
  const d = toDb(old, me.id);
  assert.match(d.id, UU);
  assert.equal(d.id, dbId('fa_2', me.id));
  assert.deepEqual(d.parent_ids, [dbId('pgf_1', me.id)]);
  const fresh = buildTreeFromIntake(me, {}, { family: [{ relation: 'Paternal Grandfather' }, { relation: 'Father' }] });
  assert.equal(fresh.find((r) => r.relation === 'Father').id, dbId('fa_2', me.id), 'old and new ids agree');
  const u = '0b0e8a4c-1d2e-4f3a-8b9c-0d1e2f3a4b5c';
  assert.equal(dbId(u, me.id), u, 'a real uuid is kept');
  assert.notEqual(dbId('fa_2', 'someone_else'), dbId('fa_2', me.id), 'different people never share ids');
});

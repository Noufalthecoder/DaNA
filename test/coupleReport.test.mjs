import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoupleReport, labFlags, findings, ODDS } from '../web/src/app/shared/coupleReport.js';

const base = (type, gene, over = {}) => ({
  couple: { id: 'c1', stage: 'Engaged', screened: '2026-10-01' },
  partners: [{ id: 'a', name: 'Aa Bb', short: 'Aa', sex: 'M', danaId: 'D-1', status: gene ? 'carrier' : 'clear', report: null },
             { id: 'b', name: 'Cc Dd', short: 'Cc', sex: 'F', danaId: 'D-2', status: gene ? 'carrier' : 'clear', report: null }],
  result: { type, gene, label: 'x', risk: 'r', tier: 2, version: 'rules-v0.2', condition: null },
  issued: new Date('2026-11-16T10:00:00Z'), ...over,
});

describe('couple report', () => {
  it('numbers the report from the couple and the date', () => {
    assert.equal(buildCoupleReport(base('clear', null)).number, 'C1-20261116');
  });
  it('shows odds and options only when a plan is needed', () => {
    const plan = buildCoupleReport(base('plan', 'HBB'));
    assert.equal(plan.needsPlan, true);
    assert.equal(plan.options.length, 3);
    assert.equal(plan.odds.length, 4);
    assert.equal(plan.conditionInfo.name, 'Beta-thalassaemia');
    const clear = buildCoupleReport(base('clear', null));
    assert.equal(clear.needsPlan, false);
    assert.deepEqual(clear.options, []);
    assert.equal(clear.odds, null);
  });
  it('marks the chosen plan and its approval', () => {
    const r = buildCoupleReport(base('plan', 'HBB', { plan: 'Prenatal testing', approved: true }));
    assert.equal(r.options.find((o) => o.chosen).id, 'Prenatal testing');
    assert.deepEqual(r.plan, { choice: 'Prenatal testing', approved: true });
  });
  it('xlinked odds split sons and daughters', () => {
    assert.ok(ODDS.xlinked.some(([, l]) => l.startsWith('Son')) && ODDS.xlinked.some(([, l]) => l.startsWith('Daughter')));
  });
  it('lists only findings that matter', () => {
    const f = findings({ variants: [
      { gene: 'HBB', hgvs_c: 'c.1A>G', significance: 'pathogenic', zygosity: 'heterozygous' },
      { gene: 'X', significance: 'benign' }, { gene: 'Y', significance: 'vus' }] });
    assert.deepEqual(f.map((x) => x.gene), ['HBB', 'Y']);
    assert.equal(findings(null), null);
  });
  it('flags blood results and says nothing about missing ones', () => {
    assert.equal(labFlags(null, 'M'), null);
    const f = labFlags({ hb: 10, hiv: 'reactive', hbsag: 'non_reactive', g6pd_pct: 50 }, 'F');
    const by = Object.fromEntries(f.map((x) => [x.test, x.status]));
    assert.equal(by.Haemoglobin, 'attention');
    assert.equal(by.HIV, 'attention');
    assert.equal(by['G6PD activity'], 'carrier');
    assert.equal(f.length, 4);
    assert.equal(labFlags({ hb: 12.5 }, 'M')[0].status, 'attention');
    assert.equal(labFlags({ hb: 12.5 }, 'F')[0].status, 'normal');
  });
  it('states it is not an official certificate and lists the limits', () => {
    const r = buildCoupleReport(base('carrier', 'GJB2'));
    assert.match(r.disclaimer, /not the official Department of Health/);
    assert.equal(r.limits.length, 4);
  });
});

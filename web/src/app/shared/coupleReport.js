/* The couple's combined report: one document for the couple and their counsellor. Owner: Platform.
   Pure functions (no screen, no network) so the content is easy to test. Nothing is invented: a test
   that is not in the record says so. The rules engine decides; this only arranges and explains. */
import { CONDITIONS, guide } from './explain.js';

export const COUPLE_REPORT_VERSION = 'couple-report-v1';

export const OPTIONS = {
  'IVF with embryo testing': { title: 'IVF with embryo testing (PGT-M)', when: 'Before pregnancy', text: 'Embryos are made by IVF and tested. Only embryos that will not have the condition are placed in the womb.' },
  'Prenatal testing': { title: 'Testing during pregnancy', when: 'Early pregnancy', text: 'You conceive naturally. Around weeks 11 to 16 a test (CVS or amniocentesis) shows whether the baby has the condition.' },
  'Proceed fully informed': { title: 'Go ahead, fully informed', when: 'Any time', text: 'You conceive naturally with no extra tests, and the care team is ready from day one.' },
};

/* chances for one pregnancy, per result type: [kind, label, chance] */
export const ODDS = {
  plan: [['clear', 'Does not carry it', '1 in 4'], ['carrier', 'Healthy carrier', '1 in 4'], ['carrier', 'Healthy carrier', '1 in 4'], ['affected', 'Has the condition', '1 in 4']],
  xlinked: [['clear', 'Son: does not have it', '1 in 2 sons'], ['affected', 'Son: has the condition', '1 in 2 sons'], ['clear', 'Daughter: does not carry it', '1 in 2 daughters'], ['carrier', 'Daughter: healthy carrier', '1 in 2 daughters']],
  carrier: [['clear', 'Does not carry it', '1 in 2'], ['carrier', 'Healthy carrier', '1 in 2']],
};

const STATUS_LABEL = { clear: 'Nothing found', carrier: 'Healthy carrier', xl_male: 'Has an X-linked change', xl_female: 'Carrier of an X-linked change' };
const TIER_LABEL = { 1: 'Urgent', 2: 'High', 3: 'Moderate', 4: 'Routine' };
const SIG = { pathogenic: 'Pathogenic', likely_pathogenic: 'Likely pathogenic', vus: 'Uncertain (VUS)' };

/* blood results worth showing: [test, value text, status]; a missing test is left out of the flags */
export function labFlags(lab, sex) {
  if (!lab) return null;
  const out = [];
  const add = (test, v, text, status) => { if (v != null) out.push({ test, value: text, status }); };
  add('Haemoglobin', lab.hb, `${lab.hb} g/dL`, lab.hb < (sex === 'F' ? 12 : 13) ? 'attention' : 'normal');
  add('Red cell size (MCV)', lab.mcv, `${lab.mcv} fL`, lab.mcv < 80 ? 'attention' : 'normal');
  add('Iron stores (ferritin)', lab.ferritin, `${lab.ferritin} µg/L`, lab.ferritin < 15 ? 'attention' : 'normal');
  add('Haemoglobin A2', lab.hba2, `${lab.hba2} %`, lab.hba2 >= 3.5 ? 'carrier' : 'normal');
  add('Haemoglobin variant', lab.hb_variant, lab.hb_variant === 'none' ? 'None detected' : lab.hb_variant, lab.hb_variant === 'none' ? 'normal' : 'carrier');
  add('G6PD activity', lab.g6pd_pct, `${lab.g6pd_pct} %`, lab.g6pd_pct < 30 ? 'affected' : lab.g6pd_pct < 80 ? 'carrier' : 'normal');
  for (const [k, n] of [['hiv', 'HIV'], ['hbsag', 'Hepatitis B (HBsAg)'], ['anti_hcv', 'Hepatitis C (anti-HCV)'], ['syphilis', 'Syphilis']]) {
    add(n, lab[k], lab[k] === 'reactive' ? 'Reactive' : 'Non-reactive', lab[k] === 'reactive' ? 'attention' : 'normal');
  }
  return out;
}

/* what one partner's genetic report shows: only findings that matter (pathogenic, likely pathogenic, VUS) */
export function findings(report) {
  if (!report) return null;
  return (report.variants || []).filter((v) => SIG[v.significance]).map((v) => ({
    gene: v.gene, change: [v.hgvs_c, v.hgvs_p && `(${v.hgvs_p})`].filter(Boolean).join(' '),
    zygosity: v.zygosity || '', significance: SIG[v.significance],
  }));
}

/*
  input: { couple:{id,stage,pregnantWeeks,screened}, partners:[{id,name,short,sex,danaId,status,report,lab}, x2],
           result (assess), plan, approved, counsellor, issued: Date }
*/
export function buildCoupleReport({ couple, partners, result, plan, approved, counsellor, issued = new Date() }) {
  const cond = result.gene ? CONDITIONS[result.gene] : null;
  const g = guide({ stage: 'couple', type: result.type, gene: result.gene, partnerName: partners[1].short, partnerIsCarrier: false });
  const needsPlan = result.type === 'plan' || result.type === 'xlinked';
  const stamp = issued.toISOString().slice(0, 10).replace(/-/g, '');
  const noteForType = {
    plan: '3 out of 4 children are healthy. Each pregnancy has the same chances, whatever happened before.',
    xlinked: 'Daughters are usually healthy. Each pregnancy has the same chances.',
    carrier: `A child cannot get ${cond?.name || 'the condition'} from this pairing, because only one partner carries it.`,
    clear: 'No shared finding was found, so the chance is the same as for the general population.',
    uncertain: 'A counsellor reviews the uncertain finding before any chance is given.',
  };
  return {
    version: COUPLE_REPORT_VERSION,
    number: `${String(couple.id).toUpperCase()}-${stamp}`,
    issued,
    stage: couple.pregnantWeeks ? `Pregnant, ${couple.pregnantWeeks} weeks` : (couple.stage || 'Engaged'),
    screened: couple.screened || null,
    counsellor: counsellor || null,
    partners: partners.map((p) => ({
      id: p.id, name: p.name, danaId: p.danaId || '', sex: p.sex === 'F' ? 'Female' : 'Male',
      status: STATUS_LABEL[p.status] || STATUS_LABEL.clear, statusKey: p.status || 'clear',
      lab: p.report ? `${p.report.lab || 'Accredited lab'}${p.report.accreditation ? ` · ${p.report.accreditation}` : ''}` : null,
      reportDate: p.report?.date || null,
      findings: findings(p.report),
      blood: labFlags(p.lab, p.sex),
    })),
    summary: {
      tone: g.tone, title: g.title, line: g.line, label: result.label, risk: result.risk,
      tier: result.tier, priority: TIER_LABEL[result.tier] || 'Routine', rules: result.version,
      condition: cond?.name || result.condition || null,
    },
    odds: ODDS[result.type] || null,
    oddsNote: noteForType[result.type] || '',
    conditionInfo: cond ? { name: cond.name, what: cond.what, care: cond.care } : null,
    needsPlan,
    options: needsPlan ? Object.entries(OPTIONS).map(([id, o]) => ({ id, ...o, chosen: plan === id })) : [],
    plan: plan ? { choice: plan, approved: !!approved } : null,
    next: { title: g.next?.title || '', text: result.type === 'clear' || result.type === 'carrier' ? 'No extra tests or plans are needed for future children. A counsellor is available any time.' : (g.next?.text || '') },
    limits: [
      'The genetic test checks a defined panel of genes, not every gene, and not every possible change in them.',
      '"Nothing found" lowers the chance of being a carrier a lot, but cannot make it zero.',
      'A carrier result is not an illness and is not a diagnosis.',
      'Laboratory results can rarely be wrong; important results are confirmed with a second test.',
    ],
    disclaimer: 'Generated by DaNA from the couple\'s Malaffi records, for their information and their counsellor. It is not the official Department of Health Premarital Screening Certificate. Every choice belongs to the couple; DaNA explains and never tells anyone whom to marry or what to decide.',
  };
}

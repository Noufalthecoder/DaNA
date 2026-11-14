/* Simulated Malaffi records: 10 different premarital results to compare. Synthetic data only.
   Same list as api/app/scenarios.py (keep them in step). Each person gets a stable one,
   or the demo picks one on the consent screen. */
const TX = { HBB: 'NM_000518.5', GJB2: 'NM_004004.6', SMN1: 'NM_000344.4', CFTR: 'NM_000492.4', G6PD: 'NM_001360016.2' };
const NORMAL = {
  F: { hb: 13.2, mcv: 88, mch: 29.6, hba2: 2.6, hbf: 0.6, ferritin: 58, g6pd_pct: 97, rubella_igg: 46, rhd: 'positive' },
  M: { hb: 15.1, mcv: 89, mch: 30.1, hba2: 2.7, hbf: 0.5, ferritin: 124, g6pd_pct: 101 },
};
const v = (gene, c, p = null, significance = 'pathogenic', zygosity = 'heterozygous') =>
  ({ gene, transcript: TX[gene], hgvs_c: c, hgvs_p: p, significance, zygosity });

export const SCENARIOS = {
  clear: { label: 'No carrier findings', variants: () => [], blood: () => ({}) },
  beta_thal: { label: 'Beta-thalassaemia carrier (IVS1-5)', variants: () => [v('HBB', 'c.92+5G>C')],
    blood: (s) => ({ hb: s === 'F' ? 11.4 : 12.7, mcv: 63.5, mch: 20.2, hba2: 5.4, hbf: 1.3 }) },
  sickle: { label: 'Sickle cell trait (HbS)', variants: () => [v('HBB', 'c.20A>T', 'p.Glu7Val')], blood: () => ({ hba2: 3.1, hb_variant: 'HbS' }) },
  hearing: { label: 'Hearing loss carrier (GJB2)', variants: () => [v('GJB2', 'c.35delG', 'p.Gly12fs')], blood: () => ({}) },
  cf: { label: 'Cystic fibrosis carrier (F508del)', variants: () => [v('CFTR', 'c.1521_1523del', 'p.Phe508del')], blood: () => ({}) },
  sma: { label: 'SMA carrier (one SMN1 copy)', variants: () => [v('SMN1', 'c.1_882del')], blood: () => ({}) },
  g6pd: { label: 'G6PD Mediterranean', variants: (s) => [v('G6PD', 'c.563C>T', 'p.Ser188Phe', 'pathogenic', s === 'F' ? 'heterozygous' : 'hemizygous')],
    blood: (s) => ({ g6pd_pct: s === 'F' ? 54 : 7 }) },
  vus: { label: 'Uncertain finding (CFTR VUS)', variants: () => [v('CFTR', 'c.2991G>C', 'p.Leu997Phe', 'vus')], blood: () => ({}) },
  double: { label: 'Two findings: beta-thal + hearing loss', variants: () => [v('HBB', 'c.92+5G>C'), v('GJB2', 'c.35delG', 'p.Gly12fs')],
    blood: (s) => ({ hb: s === 'F' ? 11.2 : 12.5, mcv: 64, mch: 20.5, hba2: 5.2, hbf: 1.1 }) },
  blood_attention: { label: 'No carrier findings, blood needs attention', variants: () => [],
    blood: (s) => ({ hb: s === 'F' ? 10.6 : 12.4, mcv: 74, mch: 23.8, hba2: 2.2, ferritin: 7, ...(s === 'F' ? { rubella_igg: 4, rhd: 'negative' } : {}) }) },
};
export const SCENARIO_KEYS = Object.keys(SCENARIOS);

/* stable per person (offline only; the server uses its own hash) */
export function pickScenario(personId, key) {
  if (SCENARIOS[key]) return key;
  let h = 0;
  for (const ch of personId || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SCENARIO_KEYS[h % SCENARIO_KEYS.length];
}

export function scenarioBlood(key, sex) {
  return {
    ...NORMAL[sex === 'F' ? 'F' : 'M'], hb_variant: 'none',
    hiv: 'non_reactive', hbsag: 'non_reactive', anti_hcv: 'non_reactive', syphilis: 'non_reactive',
    panel_genes: 570, ...SCENARIOS[key].blood(sex),
  };
}

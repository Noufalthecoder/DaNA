/* What each benchmark column means. Values always come from the API, never from here.
   Ranges match the checks in supabase/015_risk_benchmarks.sql. */
export const GROUPS = [
  { title: 'Full blood count', fields: [
    { key: 'hb_min_g_dl', label: 'Haemoglobin, minimum', unit: 'g/dL', min: 5, max: 20, step: 0.1 },
    { key: 'mcv_min_fl', label: 'MCV, minimum', unit: 'fL', min: 50, max: 120, step: 0.1 },
    { key: 'mch_min_pg', label: 'MCH, minimum', unit: 'pg', min: 15, max: 40, step: 0.1 },
  ] },
  { title: 'Haemoglobin analysis', fields: [
    { key: 'hba2_carrier_min_pct', label: 'HbA2, carrier (with low MCH)', unit: '%', min: 1, max: 10, step: 0.1 },
    { key: 'hba2_review_above_pct', label: 'HbA2, review (with normal MCH)', unit: '%', min: 1, max: 10, step: 0.1 },
    { key: 'hbf_review_min_pct', label: 'HbF, review (with low MCH)', unit: '%', min: 0, max: 30, step: 0.1 },
  ] },
  { title: 'Iron', fields: [
    { key: 'ferritin_min_ug_l', label: 'Ferritin, minimum', unit: 'µg/L', min: 1, max: 500, step: 0.1 },
    { key: 'ferritin_inflammation_min_ug_l', label: 'Ferritin, with inflammation', unit: 'µg/L', min: 1, max: 500, step: 0.1 },
  ] },
  { title: 'G6PD activity', fields: [
    { key: 'g6pd_deficient_below_pct', label: 'Deficient below', unit: '% of normal', min: 1, max: 100, step: 0.1 },
    { key: 'g6pd_intermediate_below_pct', label: 'Intermediate below', unit: '% of normal', min: 1, max: 100, step: 0.1 },
  ] },
  { title: 'Immunity and blood group', fields: [
    { key: 'rubella_igg_immune_min_iu_ml', label: 'Rubella IgG, immune from', unit: 'IU/mL', min: 1, max: 100, step: 0.1 },
    { key: 'rhd_negative_check', label: 'RhD-negative check', type: 'boolean' },
  ] },
  { title: 'Screening panel', fields: [
    { key: 'infection_markers', label: 'Must be non-reactive', type: 'markers' },
    { key: 'genetic_panel_min_genes', label: 'Genetic panel, minimum', unit: 'genes', min: 1, max: 100000, step: 1 },
  ] },
];

export const MARKERS = { hiv: 'HIV', hbsag: 'Hepatitis B', anti_hcv: 'Hepatitis C', syphilis: 'Syphilis' };

export const FIELDS = GROUPS.flatMap((g) => g.fields);
const LABELS = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export const labelFor = (key) => LABELS[key]?.label ?? key;

/* one value as a person reads it */
export function display(key, value) {
  const field = LABELS[key];
  if (value === null || value === undefined) return 'Not applicable';
  if (field?.type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((m) => MARKERS[m] ?? m).join(', ') || 'None';
  return field?.unit ? `${value} ${field.unit}` : String(value);
}

/* the rules the database enforces across columns, said in plain words */
export function crossFieldProblem(v) {
  if (Number(v.hba2_review_above_pct) < Number(v.hba2_carrier_min_pct)) return 'HbA2 review cannot be below the HbA2 carrier value.';
  if (Number(v.ferritin_inflammation_min_ug_l) < Number(v.ferritin_min_ug_l)) return 'Ferritin with inflammation cannot be below the ferritin minimum.';
  if (v.g6pd_intermediate_below_pct !== null && Number(v.g6pd_intermediate_below_pct) <= Number(v.g6pd_deficient_below_pct)) {
    return 'G6PD intermediate must be above G6PD deficient.';
  }
  return null;
}

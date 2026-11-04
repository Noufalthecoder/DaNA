/*
  Genetics rules engine (deterministic, versioned). Maths decides, AI only explains.
  Mirrors compute_tier() in supabase/004_spec_v3.sql so the offline demo and the
  database always agree. Owner: Platform.

  Tier 1 urgent  : pregnant + shared pathogenic finding (or X-linked)
  Tier 2 high    : shared AR pathogenic finding, or X-linked female carrier
  Tier 3 moderate: uncertain (VUS) finding, or a single carrier
  Tier 4 routine : nothing relevant found
*/
import { GENES, PEOPLE } from './data.js';

export const RULES_VERSION = 'rules-v0.2';
export const TIER_PRIORITY = { 1: 'urgent', 2: 'high', 3: 'moderate', 4: 'routine' };

export function assess(couple) {
  if (!couple) {
    return { type: 'clear', label: 'Both clear', risk: 'No shared variant found', tier: 4, gene: null, priority: 'routine', condition: null, version: RULES_VERSION };
  }
  const a = PEOPLE[couple.a] || { sex: 'M', carrier: null };
  const b = PEOPLE[couple.b] || { sex: 'F', carrier: null };
  const female = a.sex === 'F' ? a : b;
  let r;

  if (female?.carrier && GENES[female.carrier]?.inheritance === 'XL') {
    r = { type: 'xlinked', label: 'X-linked: plan for sons', risk: 'Each son: 1 in 2', tier: 2, gene: female.carrier };
  } else if (a?.carrier && b?.carrier && a.carrier === b.carrier) {
    r = { type: 'plan', label: 'Compatible, with a plan', risk: 'Each pregnancy: 1 in 4', tier: 2, gene: a.carrier };
  } else if (a?.vus || b?.vus) {
    const gene = a?.carrier || b?.carrier || a?.vus || b?.vus;
    r = { type: 'uncertain', label: 'Uncertain: needs review', risk: 'A counsellor reviews the uncertain finding before any risk is given', tier: 3, gene };
  } else if (a?.carrier || b?.carrier) {
    r = { type: 'carrier', label: 'One carrier, low couple risk', risk: 'Same as the general population', tier: 3, gene: a?.carrier || b?.carrier };
  } else {
    r = { type: 'clear', label: 'Both clear', risk: 'No shared variant found', tier: 4, gene: null };
  }
  if (couple.pregnantWeeks && r.tier === 2) r.tier = 1;
  r.priority = TIER_PRIORITY[r.tier] || 'routine';
  r.condition = (r.gene && GENES[r.gene]) ? GENES[r.gene].condition : null;
  r.version = RULES_VERSION;
  return r;
}

export const PRIORITY_ORDER = { urgent: 0, high: 1, moderate: 2, routine: 3 };

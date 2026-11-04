/*
  Genetics rules engine (deterministic). Maths decides, AI only explains.
  Owner: Platform. Add unit tests here before adding new inheritance patterns.
*/
import { GENES, PEOPLE } from './data.js';

/* returns the couple's result type, the risk wording and the counsellor priority */
export function assess(couple) {
  const a = PEOPLE[couple.a], b = PEOPLE[couple.b];
  const female = a.sex === 'F' ? a : b;
  let r;

  if (female.carrier && GENES[female.carrier].inheritance === 'XL') {
    r = { type: 'xlinked', label: 'X-linked: plan for sons', risk: 'Each son: 1 in 2', priority: 'high', gene: female.carrier };
  } else if (a.carrier && a.carrier === b.carrier) {
    r = { type: 'plan', label: 'Compatible, with a plan', risk: 'Each pregnancy: 1 in 4', priority: 'high', gene: a.carrier };
  } else if (a.carrier || b.carrier) {
    r = { type: 'carrier', label: 'One carrier, low couple risk', risk: 'Same as the general population', priority: 'low', gene: a.carrier || b.carrier };
  } else {
    r = { type: 'clear', label: 'Both clear', risk: 'No shared variant found', priority: 'routine', gene: null };
  }
  if (couple.pregnantWeeks && r.priority === 'high') r.priority = 'urgent';
  r.condition = r.gene ? GENES[r.gene].condition : null;
  return r;
}

export const PRIORITY_ORDER = { urgent: 0, high: 1, low: 2, routine: 3 };

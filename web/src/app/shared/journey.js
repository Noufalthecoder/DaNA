/* The couple journey, in one place. Owner: Platform.
   Every screen asks this file "where is this person?" and "what is next?", so Home, the menu
   and locked pages always agree. Order matters: each step unlocks the next. */
import { useStore, EMPTY_OBJ, EMPTY_ARR } from './store.js';

export const STEPS = [
  { key: 'profile',  label: 'Your profile' },
  { key: 'malaffi',  label: 'Get results' },
  { key: 'details',  label: 'Your details' },
  { key: 'result',   label: 'Result & report' },
  { key: 'partner',  label: 'Link partner' },
  { key: 'together', label: 'Couple result' },
  { key: 'options',  label: 'Choose together' },
  { key: 'family',   label: 'Protect family' },
];

const NEXT = {
  profile:  { t: 'Create your profile', p: 'Tell us if you are female or male, so your result can be read correctly.', to: '#/app' },
  malaffi:  { t: 'Connect UAE PASS and get your results', p: 'Malaffi is reached through UAE PASS. Give your consent once, and we fetch and check your premarital lab report.', to: '#/app' },
  details:  { t: 'Add your details', p: 'A few things Malaffi does not hold: marital status, pregnancy, family history. About 2 minutes.', to: '#/app/details' },
  result:   { t: 'See your result and download your report', p: 'Your result in plain words, and a standard report in English, Arabic or Urdu.', to: '#/app/result' },
  partner:  { t: 'Link your partner', p: 'Send an invitation, or find your partner by full name or DaNA ID.', to: '#/app/connections' },
  together: { t: "Waiting for your partner's result", p: 'Your couple result appears as soon as both lab reports are in.', to: '#/app/result' },
  options:  { t: 'Look at your options together', p: 'See every option side by side and decide in your own time. Nothing is decided for you.', to: '#/app/bonds' },
  family:   { t: 'Protect your family, if you wish', p: 'Send anonymous alerts so relatives can choose to screen early.', to: '#/app/roots' },
  done:     { t: 'Talk to your counsellor any time', p: 'Questions, worries or next steps: your counsellor is one tap away.', to: '#/app/counsellor' },
};

/* is this couple account linked to a partner? (staff and the offline demo always count as linked) */
export function isLinked(session) {
  if (!session || session.role !== 'couple' || !session.backend) return true;
  return !!session.couple && !session.sampleCouple; // an old automatic sample partner is not a partner
}

/* pages that only make sense once two people are linked */
/* a real lab result (old accounts got an automatic SAMPLE- report that does not count) */
export const isRealReport = (r) => !!r && !String(r.id || '').startsWith('SAMPLE-');

export const NEEDS_PARTNER = ['/app/bonds', '/app/roots', '/app/counsellor'];

/* what a person is, from their own result: a man with an X-linked change is affected, not a carrier */
export function personalStatus(sex, gene, inheritance) {
  if (!gene) return 'clear';
  if (inheritance === 'XL') return sex === 'M' ? 'xl_male' : 'xl_female';
  return 'carrier';
}

export function useJourney() {
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const plans = useStore((s) => s.plans) || EMPTY_OBJ;
  const sent = useStore((s) => s.alertsSent) || EMPTY_ARR;
  const seen = useStore((s) => s.resultSeen) || EMPTY_OBJ; // person id -> true once they opened My result

  const live = !!session?.backend;
  const linked = isLinked(session);
  const partnerId = session?.partnerId;
  const done = {
    profile: !live || (!session?.needsProfile && session?.sexConfirmed !== false),
    malaffi: !live || isRealReport(reports[session?.id]),
    details: !live || !!session?.details || !!intakes[session?.id]?.completed || !!session?.intakeDone,
    result: !live || !!seen[session?.id],
    partner: linked,
    together: linked && (!live || (isRealReport(reports[session?.id]) && !!(partnerId && isRealReport(reports[partnerId])))),
    options: !!(session?.couple && plans[session.couple]),
    family: sent.length > 0,
  };
  const steps = STEPS.map((s) => ({ ...s, done: done[s.key] }));
  const at = steps.findIndex((s) => !s.done);
  const current = at === -1 ? steps.length : at;
  let next = NEXT[at === -1 ? 'done' : steps[at].key];
  if (steps[at]?.key === 'profile' && live && !session?.needsProfile) {
    next = { ...next, t: 'Confirm your profile', p: 'Please confirm if you are female or male. Older accounts were saved without asking.' };
  }
  return { steps, current, next, live, linked, done };
}

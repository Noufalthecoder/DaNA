/* The couple journey, in one place. Owner: Platform.
   Every screen asks this file "where is this person?" and "what is next?", so Home, the menu
   and locked pages always agree. Order matters: each step unlocks the next. */
import { useStore, EMPTY_OBJ, EMPTY_ARR } from './store.js';

export const STEPS = [
  { key: 'profile',  label: 'Your profile' },
  { key: 'intake',   label: 'Screening intake' },
  { key: 'result',   label: 'Your result' },
  { key: 'partner',  label: 'Link your partner' },
  { key: 'together', label: 'Couple result' },
  { key: 'options',  label: 'Choose together' },
  { key: 'family',   label: 'Protect family' },
];

const NEXT = {
  profile:  { t: 'Create your profile', p: 'Tell us if you are female or male, so your result can be read correctly.', to: '#/app' },
  intake:   { t: 'Complete your screening intake', p: 'Your health and family history, and your consent. About 5 minutes.', to: '#/app/screening' },
  result:   { t: 'Get your result from Malaffi', p: 'We fetch your premarital lab report, check it, and explain it in plain words.', to: '#/app' },
  partner:  { t: 'Link your partner', p: 'Share your code, or find your partner by name, email or DaNA ID.', to: '#/app/connections' },
  together: { t: "Waiting for your partner's result", p: 'Your couple result appears as soon as both lab reports are in.', to: '#/app/result' },
  options:  { t: 'Look at your options together', p: 'See every option side by side and decide in your own time. Nothing is decided for you.', to: '#/app/bonds' },
  family:   { t: 'Protect your family, if you wish', p: 'Send anonymous alerts so relatives can choose to screen early.', to: '#/app/roots' },
  done:     { t: 'Talk to your counsellor any time', p: 'Questions, worries or next steps: your counsellor is one tap away.', to: '#/app/counsellor' },
};

/* is this couple account linked to a partner? (staff and the offline demo always count as linked) */
export function isLinked(session) {
  if (!session || session.role !== 'couple' || !session.backend) return true;
  return !!session.couple;
}

/* pages that only make sense once two people are linked */
export const NEEDS_PARTNER = ['/app/bonds', '/app/roots', '/app/counsellor'];

export function useJourney() {
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const plans = useStore((s) => s.plans) || EMPTY_OBJ;
  const sent = useStore((s) => s.alertsSent) || EMPTY_ARR;

  const live = !!session?.backend;
  const linked = isLinked(session);
  const partnerId = session?.partnerId;
  const done = {
    profile: !live || !session?.needsProfile,
    intake: !!intakes[session?.id]?.completed,
    result: !live || !!reports[session?.id],
    partner: linked,
    together: linked && (!live || (!!reports[session?.id] && !!(partnerId && reports[partnerId]))),
    options: !!(session?.couple && plans[session.couple]),
    family: sent.length > 0,
  };
  const steps = STEPS.map((s) => ({ ...s, done: done[s.key] }));
  const at = steps.findIndex((s) => !s.done);
  const current = at === -1 ? steps.length : at;
  const next = NEXT[at === -1 ? 'done' : steps[at].key];
  return { steps, current, next, live, linked, done };
}

/*
  Plain-language risk explanations. Owner: Platform. Reviewed wording lives HERE only,
  versioned, so a genetics professional can approve one file and every screen follows it.

  Rules for this text (challenge requirement 1):
  - plain words, short sentences, no blame, no "defective", "abnormal" or "bad genes"
  - carrier status is not an illness; a chance is not a diagnosis
  - say what is uncertain; never promise "no risk"
  - never tell anyone whom to marry or what to choose
  Numbers come from the rules engine (genetics.js); this file only explains them.
*/
import { PANEL } from './data.js';

export const EXPLAIN_VERSION = 'explain-v2';
export const EXPLAIN_STATUS = 'Draft for genetics-professional review';

/* what each condition is, in two plain sentences (no stigma, mention that care exists) */
export const CONDITIONS = {
  HBB: {
    name: 'Beta-thalassaemia',
    what: 'It affects how the body makes haemoglobin, the part of blood that carries oxygen.',
    care: 'Children who have it need lifelong medical care, and treatment has improved a lot. Your counsellor can explain what this looks like day to day.',
  },
  GJB2: {
    name: 'Inherited hearing loss',
    what: 'It affects hearing from birth or early childhood.',
    care: 'Hearing aids, cochlear implants and sign language support children to learn and communicate well.',
  },
  SMN1: {
    name: 'Spinal muscular atrophy',
    what: 'It affects the nerves that control muscles, so muscles become weak.',
    care: 'New treatments now exist and work best when started early. Your counsellor can explain the options.',
  },
  CFTR: {
    name: 'Cystic fibrosis',
    what: 'It mainly affects the lungs and digestion.',
    care: 'Daily treatment helps, and newer medicines have greatly improved health and life expectancy.',
  },
  G6PD: {
    name: 'G6PD deficiency',
    what: 'It affects an enzyme that protects red blood cells.',
    care: 'Most people with it are healthy. They avoid a few foods (such as fava beans) and some medicines.',
  },
};

/* the four (or two) possible outcomes of ONE pregnancy, as child figures */
export function outcomes(type) {
  if (type === 'plan') {
    return {
      title: 'For each pregnancy, the chances are the same',
      note: 'Each pregnancy is separate. Having one child with the condition does not change the chance for the next one, and having an unaffected child does not mean the next will be.',
      kids: [
        { kind: 'clear', label: 'Does not carry it', chance: '1 in 4' },
        { kind: 'carrier', label: 'Healthy carrier, like you', chance: '1 in 4' },
        { kind: 'carrier', label: 'Healthy carrier, like you', chance: '1 in 4' },
        { kind: 'affected', label: 'Has the condition', chance: '1 in 4' },
      ],
      summary: [['3 in 4', 'healthy (1 not a carrier, 2 healthy carriers)'], ['1 in 4', 'has the condition']],
    };
  }
  if (type === 'xlinked') {
    return {
      title: 'For each pregnancy, the chance depends on whether the baby is a boy or a girl',
      note: 'This change is on the X chromosome. Mothers pass it on; sons who inherit it can be affected, daughters who inherit it are usually healthy carriers.',
      kids: [
        { kind: 'clear', label: 'Son: does not have it', chance: '1 in 2 sons' },
        { kind: 'affected', label: 'Son: has the condition', chance: '1 in 2 sons' },
        { kind: 'clear', label: 'Daughter: does not carry it', chance: '1 in 2 daughters' },
        { kind: 'carrier', label: 'Daughter: healthy carrier', chance: '1 in 2 daughters' },
      ],
      summary: [['1 in 2', 'sons may have the condition'], ['1 in 2', 'daughters may be healthy carriers']],
    };
  }
  if (type === 'carrier') {
    return {
      title: 'For each pregnancy',
      note: 'Only one of you carries this change, so a child cannot inherit two copies from you. Some children may be healthy carriers.',
      kids: [
        { kind: 'clear', label: 'Does not carry it', chance: '1 in 2' },
        { kind: 'carrier', label: 'Healthy carrier', chance: '1 in 2' },
      ],
      summary: [['Same as most couples', 'chance of this condition']],
    };
  }
  return null;
}

/* the main text for each result type; `me`, `partner` are first names, `gene` a symbol */
export function explain(result, { meCarrier, partnerCarrier, partnerName = 'your partner' } = {}) {
  const c = result.gene ? CONDITIONS[result.gene] : null;
  const cond = c?.name || result.condition || 'this condition';

  const you = meCarrier
    ? {
        title: `You are a healthy carrier of ${cond}`,
        body: [
          'A carrier has one changed copy of a gene and one working copy. The working copy does the job, so carriers are healthy and usually never know.',
          'Being a carrier is very common. Most people carry at least one change like this. It says nothing about your own health or your worth.',
        ],
      }
    : {
        title: 'No change was found in the genes we checked for you',
        body: ['This lowers your chance of being a carrier for these conditions a lot, but no test can rule it out completely (see "What this test can and cannot tell you").'],
      };

  const couple = {
    plan: {
      title: `You and ${partnerName} both carry a change in the same gene`,
      body: [
        'Each of you is healthy. A child can only have the condition if they inherit the changed copy from both of you.',
        'This is why couples are screened together: what matters is the combination, not either person alone.',
      ],
    },
    xlinked: {
      title: `The mother carries a change for ${cond}`,
      body: ['This type of change is passed on through the X chromosome, so the chance is different for sons and daughters.'],
    },
    carrier: {
      title: 'Only one of you carries a change',
      body: [
        `${partnerCarrier && !meCarrier ? `${partnerName} is` : 'You are'} a healthy carrier, and the other partner did not show a change in the same gene.`,
        'Your children cannot inherit two changed copies of this gene from you, so the chance of this condition is about the same as for most couples.',
      ],
    },
    uncertain: {
      title: 'One result needs a closer look',
      body: [
        'The lab found a change whose effect is not yet known (a "variant of uncertain significance"). Most of these turn out to be harmless.',
        'We do not give a risk number for it. A genetics counsellor reviews it first and explains what it means for you.',
      ],
    },
    clear: {
      title: 'Neither of you showed a change in the same gene',
      body: ['Your chance of having a child with one of the screened conditions is low. It is not zero, because no test checks everything.'],
    },
  }[result.type] || null;

  const limits = [
    'The test checks a large panel of genes, not every gene, and not every possible change in them.',
    'A "no change found" result lowers the chance a lot but cannot make it zero.',
    'Many health conditions are not inherited this way or are not on the panel.',
    'Labs can occasionally make mistakes, so important results are confirmed before any medical decision.',
  ];

  const notDiagnosis = {
    title: 'A chance is not a diagnosis',
    body: [
      'These results describe what could happen in a future pregnancy. They do not say anyone is ill, and they do not decide what will happen.',
      'Only tests during a pregnancy or after birth can tell whether a particular child has the condition.',
    ],
  };

  const options = result.type === 'clear' ? [] : [
    'Talk it through with a genetics counsellor, alone or together. This is free and confidential.',
    'Ask about tests that can be done during a pregnancy, or before one starts.',
    'Take your time. There is no right or wrong choice, and no deadline from DaNA.',
  ];

  return { you, couple, condition: c, limits, notDiagnosis, options, outcomes: outcomes(result.type) };
}

/* before linking with a partner: only MY result can be explained (individual stage) */
export function explainIndividual({ gene }) {
  const c = gene ? CONDITIONS[gene] : null;
  const cond = c?.name || 'this condition';
  const you = gene
    ? {
        title: `You are a healthy carrier of ${cond}`,
        body: [
          'A carrier has one changed copy of a gene and one working copy. The working copy does the job, so carriers are healthy and usually never know.',
          'Being a carrier is very common. Most people carry at least one change like this. It says nothing about your own health or your worth.',
        ],
      }
    : {
        title: 'No change was found in the genes we checked for you',
        body: ['This lowers your chance of being a carrier for these conditions a lot, but no test can rule it out completely.'],
      };
  const partner = gene
    ? {
        title: "Why your partner's result matters",
        body: [
          `A child can only have ${cond} if both parents pass on a changed copy of the same gene. Your result alone does not tell you the chance for your future children.`,
          "When you link with your partner and both results are in, DaNA explains what your combination means. Many carrier couples' partners are not carriers of the same gene.",
        ],
      }
    : {
        title: "Your partner's result still matters",
        body: ['Screening is done as a couple because the chance for a child depends on both of you. Link with your partner to see your couple result.'],
      };
  const limits = [
    'The test checks a large panel of genes, not every gene, and not every possible change in them.',
    'A "no change found" result lowers the chance a lot but cannot make it zero.',
    'Labs can occasionally make mistakes, so important results are confirmed before any medical decision.',
  ];
  const notDiagnosis = {
    title: 'A carrier result is not a diagnosis',
    body: ['It does not mean you are ill or will become ill. It is information about what you could pass on.'],
  };
  return { you, partner, condition: c, limits, notDiagnosis };
}

/* the one-line personal status shown at the top of My result and in the report, by sex */
export function personalHeadline(status, gene) {
  const c = gene ? CONDITIONS[gene] : null;
  const cond = c?.name || 'this condition';
  return {
    clear: { tone: 'green', title: 'No changes found in the genes we checked', text: `You are not a carrier of any condition on the ${PANEL.labGenes}-gene premarital panel.` },
    carrier: { tone: 'amber', title: `You are healthy: a carrier of ${cond}`, text: 'Carriers are healthy. It only matters for children if your partner carries a change in the same gene.' },
    xl_female: { tone: 'amber', title: `You are healthy: a carrier of ${cond}`, text: 'This change is on the X chromosome. Women who carry it are usually healthy; it can matter for sons.' },
    xl_male: { tone: 'amber', title: `You may have ${cond}`, text: `Men with this change usually have ${cond} themselves. ${c?.care || ''} Your counsellor will confirm it and explain what it means.` },
  }[status];
}

/* ---- v2: the calm, one-screen result (Result page). Short sentences, answers the real worries first. ----
   stage: 'individual' | 'partner-waiting' | 'couple'; type: couple result type; status: personalStatus() */
const W = {
  sick: ['Am I sick?', 'No. A carrier is a healthy person. Your body works normally and you need no treatment.'],
  common: ['Is this rare?', 'No. Most people carry at least one gene change like this. Most never find out, because it does not affect them.'],
  fault: ['Did I do something wrong?', 'No. You were born with it. These changes pass quietly through families for generations. Nothing you did caused it.'],
  marry: ['Can we still get married?', 'Yes. This result never stops a marriage. It is information to help you plan, and every choice stays yours.'],
  kids: ['Will our children be ill?', 'Most likely not. In each pregnancy, 3 out of 4 children are healthy. There are also ways to plan a pregnancy so a child does not have the condition.'],
  kidsOne: ['Can our children have the condition?', 'Not from this result. A child needs a changed copy from both parents. Only one of you carries it, so your chance is as low as most families.'],
  private: ['Who can see this?', 'Only you, your partner once you both agree, and the counsellor you choose. Not your family, not your employer.'],
  partner: ['Does my partner need to know?', 'Their result matters more than yours alone. When you link, DaNA explains what the two results mean together. You decide what to share.'],
  sure: ['How sure is this result?', 'The test is very accurate for the genes it checks, but it does not check every gene. A small chance always remains, for every couple in the world.'],
  vus: ['Should I worry about an "uncertain" result?', 'Usually not. Most uncertain changes turn out to be harmless. A specialist reviews it before anyone gives you a number.'],
};

export function guide({ stage, status, type, gene, partnerName = 'your partner', partnerIsCarrier = false }) {
  const cond = (gene && CONDITIONS[gene]?.name) || 'this condition';
  const counsel = { href: '#/app/counsellor', label: 'Talk to a counsellor (free)' };

  if (stage !== 'couple') {
    const nextStep = stage === 'partner-waiting'
      ? { title: `Waiting for ${partnerName}'s result`, text: 'Nothing to do now. Your couple result appears here as soon as it arrives.' }
      : { title: 'Your next step: link your partner', text: 'Your result alone says little about future children. Together, it says a lot.', href: '#/app/connections', label: 'Link your partner' };
    if (status === 'clear') return {
      tone: 'green', eyebrow: 'Your result', title: 'Good news: no gene changes were found',
      line: 'You are not a carrier of any condition on the premarital panel.',
      facts: ['You are healthy', 'Nothing to treat', 'Ready for your marriage file'],
      worries: [W.sure, W.partner, W.private], next: nextStep,
    };
    if (status === 'xl_male') return {
      tone: 'calm', eyebrow: 'Your result', title: `Your result shows a change linked to ${cond}`,
      line: `Many men with this change live full, healthy lives. ${CONDITIONS[gene]?.care || ''}`,
      facts: ['Very manageable', 'A counsellor will confirm it', 'Your choices stay yours'],
      worries: [W.fault, W.marry, W.private],
      next: { title: 'Your next step: a short talk with a counsellor', text: 'They confirm the result and explain simply what it means for you. Free and private.', ...counsel },
    };
    return {
      tone: 'calm', eyebrow: 'Your result', title: 'You are healthy. You carry a common gene change.',
      line: `You are a carrier of ${cond}. Carriers are healthy and need no treatment. It only matters for children if your partner carries a change in the same gene.`,
      facts: ['You are healthy', 'Very common', 'Nothing to do today'],
      worries: [W.sick, W.common, W.fault, W.marry, W.partner, W.private], next: nextStep,
    };
  }

  const both = {
    plan: {
      tone: 'calm', title: 'You both carry the same gene change. You have good options.',
      line: `You are both healthy. A child could have ${cond} only if they get the change from both of you. In each pregnancy, 3 out of 4 children are healthy.`,
      facts: ['You are both healthy', '3 in 4: healthy child', 'Safe ways to plan exist'],
      worries: [W.marry, W.kids, W.fault, W.private],
      next: { title: 'Your next step: talk it through together', text: 'A counsellor explains your options in simple words. No pressure, no rush. Free and private.', ...counsel },
    },
    xlinked: {
      tone: 'calm', title: 'This result matters mainly for sons. You have good options.',
      line: 'This change is on the X chromosome, so it affects boys and girls differently. Daughters are usually healthy.',
      facts: ['Parents are healthy', 'Daughters usually healthy', 'Safe ways to plan exist'],
      worries: [W.marry, W.fault, W.private],
      next: { title: 'Your next step: talk it through together', text: 'A counsellor explains what this means for your family. No pressure.', ...counsel },
    },
    carrier: {
      tone: 'green', title: 'Good news for your future children',
      line: `${partnerIsCarrier ? partnerName + ' carries' : 'You carry'} a gene change, but the other partner does not carry the same one. Your children cannot get ${cond} from you.`,
      facts: ['You are both healthy', 'Low chance, like most couples', 'Nothing to do'],
      worries: [W.kidsOne, W.sick, W.common, W.private],
      next: { title: 'You are all set', text: 'Download your report for your marriage file. A counsellor is always here if you want to talk.', href: '#/app/my-report', label: 'Download my report' },
    },
    uncertain: {
      tone: 'calm', title: 'One result needs a closer look. This is usually nothing.',
      line: 'The lab found a change whose effect is not known yet. Most of these turn out to be harmless. A specialist checks it first.',
      facts: ['Usually harmless', 'A specialist reviews it', 'Nothing to do yet'],
      worries: [W.vus, W.marry, W.private],
      next: { title: 'Your next step: a counsellor will explain', text: 'They review it with a genetics specialist and tell you simply what it means.', ...counsel },
    },
    clear: {
      tone: 'green', title: 'Good news: a well-matched couple',
      line: 'Neither of you carries a change in the same gene. Your chance of a child with a screened condition is low, like most couples.',
      facts: ['You are both healthy', 'Low chance, like most couples', 'Nothing to do'],
      worries: [W.sure, W.private],
      next: { title: 'You are all set', text: 'Download your report for your marriage file. Congratulations!', href: '#/app/my-report', label: 'Download my report' },
    },
  }[type];
  return both ? { eyebrow: `You and ${partnerName}`, ...both } : null;
}

/* ---- comprehension check (v1): 3 true/false statements matched to the result, each with a short why ---- */
export const QUIZ_VERSION = 'quiz-v1';
const Q = {
  sick: ['Being a carrier means I am ill.', false, 'Carriers are healthy. The working copy of the gene does the job.'],
  alone: ['My result alone tells me the chance for my future children.', false, "The chance depends on both of you. Your partner's result is needed."],
  marry: ['This result means we should not marry.', false, 'No. It never stops a marriage. It helps you plan, and every choice is yours.'],
  zero: ['"No change found" means a zero chance of any inherited condition.', false, 'It lowers the chance a lot, but no test checks every gene.'],
  partnerMatters: ["My partner's result still matters.", true, 'Screening is done as a couple because the chance depends on both.'],
  quarter: ['In each pregnancy there is a 1 in 4 chance the child has the condition.', true, 'It is true: 1 in 4 children could have it, and 3 in 4 are healthy.'],
  next: ['If our first child has the condition, the next one will not.', false, 'Each pregnancy has the same chances, whatever happened before.'],
  decides: ['DaNA or the counsellor decides what we should do.', false, 'No. They explain your options. The decision is yours.'],
  sameSex: ['Sons and daughters have the same chance.', false, 'This change is on the X chromosome, so mainly sons can be affected.'],
  daughters: ['Daughters are usually healthy.', true, 'Daughters who inherit it are usually healthy carriers.'],
  kidsOne: ['Our children can get this condition from us.', false, 'No. A child needs the change from both parents, and only one of you carries it.'],
  noPlan: ['We need extra tests or a plan for this result.', false, 'No extra steps are needed. You can still talk to a counsellor any time.'],
  vusBad: ['An "uncertain" result means bad news.', false, 'Usually not. Most uncertain changes turn out to be harmless.'],
  vusReview: ['A specialist reviews the uncertain finding before any risk is given.', true, 'Nobody gives you a number until it is reviewed.'],
};

export function quiz({ stage, status, type }) {
  const k = stage !== 'couple'
    ? (status === 'clear' ? ['zero', 'partnerMatters', 'marry'] : ['sick', 'alone', 'marry'])
    : ({ plan: ['quarter', 'next', 'decides'], xlinked: ['sameSex', 'daughters', 'decides'], carrier: ['kidsOne', 'sick', 'noPlan'],
         clear: ['zero', 'noPlan', 'marry'], uncertain: ['vusBad', 'vusReview', 'marry'] }[type] || ['sick', 'alone', 'marry']);
  return k.map((id) => ({ id, text: Q[id][0], answer: Q[id][1], why: Q[id][2] }));
}

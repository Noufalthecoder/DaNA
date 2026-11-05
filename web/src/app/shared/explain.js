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
export const EXPLAIN_VERSION = 'explain-v1';
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

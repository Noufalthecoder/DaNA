/**
 * DaNA Personalised Care Plan Service
 * Implements the 7-Stage End-to-End Care Journey:
 * 1. Screening & discovery (Roots)
 * 2. Couple assessment (Bonds)
 * 3. Genetic counselling
 * 4. Family planning
 * 5. Pregnancy
 * 6. Birth preparation
 * 7. Childbirth & newborn care (Journey milestone)
 */

import { get, set } from './store.js';
import { logAudit } from './db.js';
import { PEOPLE, COUPLES, REFERRAL_DESTINATIONS } from './data.js';
import { isUserScreened } from './screeningPersistence.js';

export const CARE_PLAN_STAGES = [
  {
    id: 1,
    key: 'screening_discovery',
    title: 'Screening & discovery',
    titleAr: 'الفحص والاستكشاف الوراثي',
    tag: 'Roots',
    tagTone: 'green',
    description: 'Individual genetic analysis, family history collection, and variant interpretation.',
    descriptionAr: 'الفحص الجيني الفردي وجمع التاريخ العائلي وتفسير الطفرات الوراثية بدقة وبدون وصمة.',
    items: [
      { id: 'individual_screening', label: 'Individual genetic screening', labelAr: 'الفحص الجيني الفردي (570 جين)', hint: 'Abu Dhabi premarital sequencing panel completed' },
      { id: 'medical_family_history', label: 'Medical and family history', labelAr: 'التاريخ الطبي والعائلي الموثق', hint: 'Consanguinity and health background documented' },
      { id: 'pedigree_completion', label: 'Pedigree completion', labelAr: 'شجرة العائلة والنسب متعددة الأجيال', hint: '4-generation pedigree tree structured and validated' },
      { id: 'results_explanations', label: 'Results and explanations', labelAr: 'تفسير النتائج باللغة المبسطة', hint: 'Reviewed clear explanations with residual risk context' },
    ],
  },
  {
    id: 2,
    key: 'couple_assessment',
    title: 'Couple assessment',
    titleAr: 'التقييم المشترك للزوجين',
    tag: 'Bonds',
    tagTone: 'green',
    description: 'Mutual partner connection, dual consent authorization, and joint Mendelian risk evaluation.',
    descriptionAr: 'الربط المتبادل بموافقة الطرفين وحساب احتمالات الوراثة المندلية المشتركة للزوجين.',
    items: [
      { id: 'partner_connection_consent', label: 'Partner connection and consent', labelAr: 'ربط الشريك والموافقة المستنيرة', hint: 'Two-way privacy-preserving connection established' },
      { id: 'joint_risk_assessment', label: 'Joint inherited-risk assessment', labelAr: 'التقييم الوراثي المشترك (حتمي)', hint: 'Deterministic Mendelian inheritance calculated' },
      { id: 'reproductive_options', label: 'Reproductive options review', labelAr: 'استعراض الخيارات الإنجابية', hint: 'PGT-M, prenatal testing, and informed natural conception' },
    ],
  },
  {
    id: 3,
    key: 'genetic_counselling',
    title: 'Genetic counselling',
    titleAr: 'الاستشارة الوراثية المعتمدة',
    tag: null,
    description: 'Accredited consultation with clinical geneticists, protocol review, and specialist referrals.',
    descriptionAr: 'جلسة استشارية مع أخصائي الوراثة واعتماد خطة الرعاية والتحويلات التخصصية.',
    items: [
      { id: 'appointment_booking', label: 'Appointment booking', labelAr: 'حجز جلسة الاستشارة الوراثية', hint: 'Scheduled with licensed counsellor (Online / Clinic)' },
      { id: 'counsellor_recommendations', label: 'Counsellor recommendations', labelAr: 'توصيات المستشار الوراثي', hint: 'Clinical dossier and risk assessment discussed' },
      { id: 'approved_care_plan', label: 'Approved care plan', labelAr: 'اعتماد خطة الرعاية الطبية', hint: 'Counsellor countersignature on clinical protocol' },
      { id: 'follow_up_referrals', label: 'Follow-up and referrals', labelAr: 'المتابعة والتحويلات التخصصية', hint: 'Referral dispatched to specialized genomics / IVF center' },
    ],
  },
  {
    id: 4,
    key: 'family_planning',
    title: 'Family planning',
    titleAr: 'تنظيم وبناء الأسرة',
    tag: null,
    description: 'Execution of declared conception pathway, IVF/PGT-M clinic coordination, and preconception care.',
    descriptionAr: 'تحديد مسار الإنجاب والتنسيق مع مراكز الإخصاب المتقدم وفحوصات ما قبل الحمل.',
    items: [
      { id: 'chosen_conception_pathway', label: 'Chosen conception pathway', labelAr: 'تأكيد المسار الإنجابي المختار', hint: 'IVF with PGT-M, prenatal testing, or natural conception' },
      { id: 'pgtm_coordination', label: 'IVF / PGT-M coordination, if applicable', labelAr: 'التنسيق مع مركز أطفال الأنابيب والفحص الجيني', hint: 'Pre-authorization and embryo biopsy protocol aligned' },
      { id: 'preconception_followups', label: 'Preconception follow-ups', labelAr: 'متابعات واستعدادات ما قبل الحمل', hint: 'High-dose folic acid (5mg) and medication optimization' },
    ],
  },
  {
    id: 5,
    key: 'pregnancy',
    title: 'Pregnancy',
    titleAr: 'مرحلة الحمل والمتابعة الجنينية',
    tag: null,
    description: 'Gestational age tracking, trimester checkpoints, prenatal genetic diagnostics, and fetal medicine.',
    descriptionAr: 'متابعة أسابيع الحمل والفحوصات الجينية قبل الولادة ورعاية طب الأجنة.',
    items: [
      { id: 'pregnancy_confirmation', label: 'Pregnancy confirmation', labelAr: 'تأكيد الحمل وتاريخ البداية', hint: 'Gestational dating and obstetric registration' },
      { id: 'gestational_milestones', label: 'Gestational milestones', labelAr: 'محطات الرعاية خلال مراحل الحمل', hint: 'Trimester-specific ultrasound and maternal health checks' },
      { id: 'prenatal_genetic_testing', label: 'Relevant prenatal genetic testing', labelAr: 'الفحص الجيني الجنيني (CVS / سحب السائل)', hint: 'Early CVS (weeks 11-14) or Amniocentesis (weeks 15-18)' },
      { id: 'specialist_appointments', label: 'Specialist appointments and referrals', labelAr: 'مواعيد طب الأجنة والرعاية المتقدمة', hint: 'Maternal-fetal medicine specialist follow-up' },
    ],
  },
  {
    id: 6,
    key: 'birth_preparation',
    title: 'Birth preparation',
    titleAr: 'الاستعداد للولادة ورعاية الأمومة',
    tag: null,
    description: 'Delivery hospital coordination, cord blood sampling preparation, and pre-authorized clinical handover.',
    descriptionAr: 'التنسيق مع مستشفى الولادة وتجهيز بروتوكول فحص دم الحبل السري والتسليم الطبي.',
    items: [
      { id: 'expected_delivery_date', label: 'Expected delivery date', labelAr: 'الموعد المتوقع للولادة (EDD)', hint: 'Hospital booking and delivery plan confirmed' },
      { id: 'maternity_care_coordination', label: 'Maternity care coordination', labelAr: 'تنسيق رعاية الأمومة وفريق التوليد', hint: 'Labor and delivery protocol notified of genetic plan' },
      { id: 'clinical_handover_consent', label: 'Relevant clinical handover with consent', labelAr: 'التسليم الطبي لملف المولود بموافقة الزوجين', hint: 'Pediatric care team briefed with authorized summary' },
    ],
  },
  {
    id: 7,
    key: 'childbirth_newborn',
    title: 'Childbirth & newborn care',
    titleAr: 'الولادة ورعاية المولود الجديد',
    tag: 'Journey milestone',
    tagTone: 'green',
    description: 'Newborn delivery record, metabolic & hemoglobinopathy screening, pediatric follow-up, and family record.',
    descriptionAr: 'تسجيل تفاصيل الولادة وفحص حديثي الولادة والمتابعة الوراثية وتحديث السجل الصحي.',
    items: [
      { id: 'birth_details', label: 'Birth details', labelAr: 'توثيق بيانات الولادة وصحة المولود', hint: 'Date of birth, birth weight, and newborn status' },
      { id: 'newborn_screening_status', label: 'Newborn screening status', labelAr: 'فحص حديثي الولادة الوطني الممتد', hint: 'Standard heel-prick metabolic & cord blood panel' },
      { id: 'required_genetic_followup', label: 'Required genetic follow-up', labelAr: 'المتابعة الوراثية التخصصية للطفل', hint: 'Orthogonal confirmation and pediatric hematology check' },
      { id: 'child_family_health_record', label: 'Child’s family health record', labelAr: 'ربط السجل الصحي للطفل بشجرة العائلة', hint: 'Continuous longitudinal family health tracking for next gen' },
    ],
  },
];

const DEFAULT_PLAN_STATE = {
  // c1 (Khalid & Fatima) baseline
  c1: {
    activeStageId: 3,
    condition: 'Beta-thalassaemia (HBB)',
    tier: 2,
    counsellor: 'Dr. Mariam Al Hosani',
    completedItems: [
      'individual_screening',
      'medical_family_history',
      'pedigree_completion',
      'results_explanations',
      'partner_connection_consent',
      'joint_risk_assessment',
      'reproductive_options',
      'appointment_booking',
    ],
    referrals: [
      {
        id: 'REF-2026-HBB-041',
        destination: 'IVF / PGT-M',
        facility: 'Cleveland Clinic Abu Dhabi · Fertility Center',
        priority: 'high',
        status: 'DISPATCHED',
        dispatchedAt: '2026-11-04T10:15:00Z',
        reason: 'Pre-implantation Genetic Testing for HBB c.20A>T / c.92+1G>A carrier pair',
      },
    ],
    followUp: {
      date: '2026-11-10T13:30:00Z',
      doctor: 'Dr. Mariam Al Hosani',
      mode: 'online',
      status: 'confirmed',
      meetLink: 'https://meet.google.com/dan-c1-0224',
      topic: 'Pre-marital counselling and PGT-M protocol sign-off',
    },
    reproductivePathway: {
      selected: 'IVF with embryo testing',
      declaredAt: '2026-10-25T14:00:00Z',
      approvedByCounsellor: true,
      approvedAt: '2026-11-01T11:00:00Z',
    },
    silaStats: {
      relativesEligible: 5,
      alertsDispatched: 3,
      screeningsBooked: 1,
    },
    pregnancy: {
      isPregnant: false,
      weeks: null,
      edd: null,
      deliveryHospital: 'Danat Al Emarat Hospital for Women & Children, Abu Dhabi',
    },
    childbirth: {
      delivered: false,
      babyName: '',
      birthDate: null,
      newbornScreenStatus: 'pending',
      geneticFollowUpNeeded: true,
    },
    customNotes: 'Couple decided on PGT-M. Confirmatory Sanger sequencing scheduled prior to egg retrieval.',
  },
};

/**
 * Get or initialize the care plan for a couple
 */
export function getCoupleCarePlan(coupleId = 'c1') {
  const store = get();
  const allPlans = store.carePlans || {};
  const storedPlan = allPlans[coupleId];

  // Dynamic signals
  const isC1 = coupleId === 'c1';
  const khalidScreened = isUserScreened('khalid');
  const fatimaScreened = isUserScreened('fatima');
  const onboardingDone = isC1 ? (khalidScreened || fatimaScreened) : isUserScreened(coupleId);

  const connectionMade = (store.connections || []).some(
    (c) => c.status === 'ACTIVE' && (c.id?.includes(coupleId) || (isC1 && ((c.userA === 'fatima' && c.userB === 'khalid') || (c.userA === 'khalid' && c.userB === 'fatima'))))
  );

  const scheduleAppts = store.scheduleAppointments || [];
  const sessionCompleted = scheduleAppts.some(
    (a) => (a.cid === coupleId || a.id === `appt_${coupleId}`) && (a.priority === 'completed' || a.status === 'completed')
  ) || storedPlan?.counsellingCompleted;

  const pregnancyConfirmed = storedPlan?.pregnancy?.isPregnant || storedPlan?.familyPlanningChoice === 'pregnant';

  // Base state definition
  const base = storedPlan || DEFAULT_PLAN_STATE[coupleId] || {
    activeStageId: 1,
    condition: 'Genetic screening profile',
    tier: 3,
    counsellor: 'Dr. Mariam Al Hosani',
    completedItems: ['individual_screening'],
    referrals: [],
    followUp: null,
    pregnancy: { isPregnant: false, weeks: null, edd: null, deliveryHospital: 'Cleveland Clinic Abu Dhabi' },
    childbirth: { delivered: false, babyName: '', birthDate: null, newbornScreenStatus: 'pending', geneticFollowUpNeeded: true },
    customNotes: '',
  };

  const items = new Set(base.completedItems || []);

  if (!isC1 && !storedPlan) {
    return base;
  }

  // 1. "screening & discovery is always completed once the onboarding is done..."
  if (onboardingDone) {
    items.add('individual_screening');
    items.add('medical_family_history');
    items.add('pedigree_completion');
    items.add('results_explanations');
  } else {
    items.delete('individual_screening');
    items.delete('medical_family_history');
    items.delete('pedigree_completion');
    items.delete('results_explanations');
  }

  // 2. "...and couple assessment is complete once the connection is made"
  if (connectionMade && onboardingDone) {
    items.add('partner_connection_consent');
    items.add('joint_risk_assessment');
    items.add('reproductive_options');
  } else {
    items.delete('partner_connection_consent');
    items.delete('joint_risk_assessment');
    items.delete('reproductive_options');
  }

  // 3. "...and once the counselor ticks the session as complete in their schedule then genetic counseling"
  const counsellorApproved = (store.approved || []).includes(coupleId) || storedPlan?.completedItems?.includes('approved_care_plan');
  const storeRefs = store.referrals?.[coupleId] || [];
  const hasReferrals = storeRefs.length > 0 || storedPlan?.completedItems?.includes('follow_up_referrals');

  const facilityMap = {
    'IVF / PGT-M': 'Cleveland Clinic Abu Dhabi · Fertility Center',
    'Fetal medicine': 'Danat Al Emarat Hospital · Fetal Medicine Unit',
    'Haematology': 'Sheikh Shakhbout Medical City (SSMC) · Adult & Paediatric Haematology',
    'Paediatrics': 'Sheikh Khalifa Medical City (SKMC) · Paediatric Genetics',
    'Other': 'Cleveland Clinic Abu Dhabi · Medical Genetics',
  };

  const formattedStoreRefs = storeRefs.map((r, idx) => ({
    id: r.id || `REF-2026-${coupleId.toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
    destination: r.destination,
    facility: r.facility || facilityMap[r.destination] || 'Cleveland Clinic Abu Dhabi · Fertility Center',
    priority: r.priority || 'high',
    reason: r.reason,
    status: r.status || 'dispatched',
    dispatchedAt: r.dispatchedAt || r.t || new Date().toISOString(),
    t: r.t || new Date().toISOString(),
  }));

  const mergedReferrals = (storedPlan?.referrals && storedPlan.referrals.length > 0)
    ? storedPlan.referrals
    : formattedStoreRefs.length > 0
    ? formattedStoreRefs
    : (base.referrals || []);

  if (sessionCompleted && connectionMade && onboardingDone) {
    items.add('appointment_booking');
    items.add('counsellor_recommendations');
    items.add('approved_care_plan');
    items.add('follow_up_referrals');
  } else {
    if (onboardingDone && connectionMade) {
      items.add('appointment_booking');
    } else {
      items.delete('appointment_booking');
    }
    if (counsellorApproved || hasReferrals) {
      items.add('counsellor_recommendations');
    } else {
      items.delete('counsellor_recommendations');
    }
    if (counsellorApproved) {
      items.add('approved_care_plan');
    } else {
      items.delete('approved_care_plan');
    }
    if (hasReferrals) {
      items.add('follow_up_referrals');
    } else {
      items.delete('follow_up_referrals');
    }
  }

  // 4. "...and depending on the user choice(after counselling) family planing"
  if (base.familyPlanningChoice && (sessionCompleted || counsellorApproved || hasReferrals)) {
    items.add('chosen_conception_pathway');
    if (base.familyPlanningChoice === 'planning_to_conceive') {
      items.add('pgtm_coordination');
      items.add('preconception_followups');
    }
  }

  // 5. "...and after the pregnancy is confirmed"
  if (pregnancyConfirmed) {
    items.add('chosen_conception_pathway');
    items.add('pgtm_coordination');
    items.add('preconception_followups');
    items.add('pregnancy_confirmation');
    items.add('gestational_milestones');
  }

  // Dynamically calculate activeStageId based on items completed
  let activeStage = 1;
  for (const stage of CARE_PLAN_STAGES) {
    const stageItems = stage.items.map((i) => i.id);
    const completedCount = stageItems.filter((id) => items.has(id)).length;
    if (completedCount < stageItems.length) {
      activeStage = stage.id;
      break;
    }
    activeStage = Math.min(stage.id + 1, 7);
  }

  return {
    ...base,
    referrals: mergedReferrals,
    completedItems: Array.from(items),
    activeStageId: activeStage,
    counsellingCompleted: !!(sessionCompleted || counsellorApproved || hasReferrals),
    pregnancy: {
      ...(base.pregnancy || {}),
      isPregnant: !!pregnancyConfirmed,
      weeks: pregnancyConfirmed ? (base.pregnancy?.weeks || 12) : null,
      edd: pregnancyConfirmed ? (base.pregnancy?.edd || '2027-05-15') : null,
      deliveryHospital: base.pregnancy?.deliveryHospital || 'Danat Al Emarat Hospital for Women & Children, Abu Dhabi',
    },
  };
}

/**
 * Save updated care plan to store
 */
export function saveCoupleCarePlan(coupleId, patch, auditNote = 'Updated personalised care plan') {
  const current = getCoupleCarePlan(coupleId);
  const updated = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const store = get();
  const allPlans = { ...(store.carePlans || {}), [coupleId]: updated };
  set({ carePlans: allPlans }, auditNote);
  logAudit(auditNote, { resourceType: 'care_plans', resourceId: coupleId }).catch(() => {});
  return updated;
}

/**
 * Toggle completion of a specific stage item
 */
export function toggleCarePlanItem(coupleId, itemId) {
  const plan = getCoupleCarePlan(coupleId);
  const list = plan.completedItems || [];
  const nextList = list.includes(itemId) ? list.filter((id) => id !== itemId) : [...list, itemId];

  // Dynamically compute activeStageId based on items
  let activeStage = 1;
  for (const stage of CARE_PLAN_STAGES) {
    const stageItems = stage.items.map((i) => i.id);
    const completedCount = stageItems.filter((id) => nextList.includes(id)).length;
    if (completedCount < stageItems.length) {
      activeStage = stage.id;
      break;
    }
    activeStage = Math.min(stage.id + 1, 7);
  }

  return saveCoupleCarePlan(coupleId, {
    completedItems: nextList,
    activeStageId: activeStage,
  }, `Updated care plan item: ${itemId}`);
}

/**
 * Calculate total completion percentage across all 7 stages
 */
export function computeCarePlanProgress(plan) {
  if (!plan) return 0;
  const totalItems = CARE_PLAN_STAGES.reduce((acc, stage) => acc + stage.items.length, 0);
  const completedCount = (plan.completedItems || []).length;
  return Math.min(100, Math.round((completedCount / totalItems) * 100));
}

/**
 * Update pregnancy and delivery milestones
 */
export function updatePregnancyMilestone(coupleId, pregnancyData) {
  const plan = getCoupleCarePlan(coupleId);
  const completed = new Set(plan.completedItems || []);
  if (pregnancyData.isPregnant) {
    completed.add('pregnancy_confirmation');
    completed.add('gestational_milestones');
  }
  if (pregnancyData.edd) {
    completed.add('expected_delivery_date');
  }

  return saveCoupleCarePlan(coupleId, {
    pregnancy: { ...(plan.pregnancy || {}), ...pregnancyData },
    completedItems: Array.from(completed),
    activeStageId: pregnancyData.isPregnant ? Math.max(plan.activeStageId || 1, 5) : plan.activeStageId,
  }, 'Updated pregnancy tracking milestones');
}

/**
 * Log newborn delivery & child health record
 */
export function logNewbornMilestone(coupleId, childData) {
  const plan = getCoupleCarePlan(coupleId);
  const completed = new Set(plan.completedItems || []);
  if (childData.delivered) {
    completed.add('birth_details');
    completed.add('maternity_care_coordination');
    completed.add('clinical_handover_consent');
  }
  if (childData.newbornScreenStatus === 'completed') {
    completed.add('newborn_screening_status');
    completed.add('child_family_health_record');
  }

  return saveCoupleCarePlan(coupleId, {
    childbirth: { ...(plan.childbirth || {}), ...childData },
    completedItems: Array.from(completed),
    activeStageId: 7,
  }, 'Logged childbirth and newborn screening milestone');
}

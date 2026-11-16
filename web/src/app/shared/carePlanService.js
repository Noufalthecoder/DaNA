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
      { id: 'individual_screening', label: 'Genetic screening', labelAr: 'الفحص الجيني الفردي', hint: 'Report imported and validated' },
      { id: 'medical_family_history', label: 'Family history', labelAr: 'التاريخ العائلي والطبي', hint: 'Onboarding history completed' },
      { id: 'pedigree_completion', label: 'Pedigree', labelAr: 'شجرة العائلة', hint: 'Successfully generated' },
      { id: 'results_explanations', label: 'Results and explanations', labelAr: 'تفسير النتائج', hint: 'Report and explanation available' },
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
      { id: 'partner_connection_consent', label: 'Partner connection', labelAr: 'ربط الشريك والموافقة', hint: 'Both accept and grant required consent' },
      { id: 'joint_risk_assessment', label: 'Joint risk assessment', labelAr: 'التقييم المشترك للمخاطر', hint: 'Assessment successfully generated' },
      { id: 'reproductive_options', label: 'Reproductive options', labelAr: 'الخيارات الإنجابية', hint: 'Joint report available' },
    ],
  },
  {
    id: 3,
    key: 'genetic_counselling',
    title: 'Genetic counselling',
    titleAr: 'الاستشارة الوراثية المعتمدة',
    tag: null,
    description: 'Accredited consultation with clinical geneticists, protocol review, and specialist referrals. Mandatory for progression.',
    descriptionAr: 'جلسة استشارية مع أخصائي الوراثة واعتماد خطة الرعاية والتحويلات التخصصية (إلزامية للمتابعة).',
    items: [
      { id: 'appointment_booking', label: 'Appointment booking', labelAr: 'حجز الموعد', hint: 'Couple books through Find a Slot' },
      { id: 'counselling_session', label: 'Counselling session', labelAr: 'جلسة الاستشارة الوراثية', hint: 'Counsellor clicks Mark Complete in Schedule' },
      { id: 'counsellor_recommendations', label: 'Counsellor recommendations', labelAr: 'توصيات المستشار الوراثي', hint: 'Recommendations saved in CaseView' },
      { id: 'approved_care_plan', label: 'Approved care plan', labelAr: 'اعتماد خطة الرعاية', hint: 'Counsellor approves care plan' },
      { id: 'follow_up_referrals', label: 'Follow-up & referrals', labelAr: 'المتابعة والتحويلات', hint: 'Referral created in CaseView' },
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
      { id: 'chosen_conception_pathway', label: 'Pathway selection', labelAr: 'اختيار المسار الإنجابي', hint: 'Any situation card selected' },
      { id: 'preconception_followups', label: 'Preconception follow-ups', labelAr: 'متابعات ما قبل الحمل', hint: 'Relevant follow-up recorded' },
      { id: 'pgtm_coordination', label: 'IVF / PGT-M coordination', labelAr: 'التنسيق مع مركز أطفال الأنابيب', hint: 'Relevant referral/coordination created, if applicable' },
    ],
  },
  {
    id: 5,
    key: 'pregnancy',
    title: 'Pregnancy',
    titleAr: 'مرحلة الحمل والمتابعة الجنينية',
    tag: null,
    description: 'Gestational age tracking, trimester checkpoints, pregnancy genetic counselling, and prenatal medicine.',
    descriptionAr: 'متابعة أسابيع الحمل والفحوصات الجينية قبل الولادة ورعاية طب الأجنة واستشارة الحمل.',
    items: [
      { id: 'pregnancy_confirmation', label: 'Pregnancy recorded', labelAr: 'توثيق الحمل', hint: 'Mother submits pregnancy details' },
      { id: 'gestational_milestones', label: 'Gestational milestones', labelAr: 'المحطات الجنينية', hint: 'Calculated from available dating information' },
      { id: 'pregnancy_counselling', label: 'Pregnancy counselling', labelAr: 'استشارة الحمل الوراثية', hint: 'Separate appointment booked and completed' },
      { id: 'prenatal_genetic_testing', label: 'Prenatal genetic testing', labelAr: 'الفحص الجيني الجنيني', hint: 'Relevant test ordered/completed and recorded' },
      { id: 'specialist_appointments', label: 'Specialist appointments', labelAr: 'مواعيد طب الأجنة', hint: 'Relevant appointment booked/completed' },
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
      { id: 'expected_delivery_date', label: 'EDD', labelAr: 'تاريخ الولادة المتوقع', hint: 'Date recorded' },
      { id: 'maternity_care_coordination', label: 'Maternity coordination', labelAr: 'تنسيق رعاية الأمومة', hint: 'Provider/hospital recorded' },
      { id: 'birth_prep_consultation', label: 'Birth preparation consultation', labelAr: 'استشارة الاستعداد للولادة', hint: 'Optional appointment completed' },
      { id: 'clinical_handover_consent', label: 'Clinical handover', labelAr: 'التسليم الطبي للمستشفى', hint: 'Successfully submitted with consent' },
      { id: 'newborn_screening_prep', label: 'Newborn screening preparation', labelAr: 'التحضير لفحص حديثي الولادة', hint: 'Relevant information recorded' },
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
      { id: 'birth_details', label: 'Birth details', labelAr: 'بيانات الولادة', hint: 'Childbirth recorded' },
      { id: 'child_health_record', label: 'Child health record', labelAr: 'السجل الصحي للطفل', hint: 'Separate child record created' },
      { id: 'newborn_screening_status', label: 'Newborn screening', labelAr: 'فحص حديثي الولادة الوطني', hint: 'Screening documented as completed' },
      { id: 'required_genetic_followup', label: 'Genetic follow-up', labelAr: 'المتابعة الوراثية التخصصية', hint: 'Created only when clinically indicated' },
      { id: 'postnatal_counselling', label: 'Postnatal counselling', labelAr: 'استشارة ما بعد الولادة', hint: 'Completed if needed' },
    ],
  },
];

const DEFAULT_PLAN_STATE = {
  // c1 baseline without fake pre-completed records
  c1: {
    activeStageId: 1,
    condition: 'Beta-thalassaemia (HBB)',
    tier: 2,
    counsellor: 'Dr. Mariam Al Hosani',
    completedItems: [],
    referrals: [],
    followUp: null,
    pregnancy: {
      isPregnant: false,
      weeks: null,
      edd: null,
      deliveryHospital: '',
    },
    childbirth: {
      delivered: false,
      babyName: '',
      birthDate: null,
      newbornScreenStatus: 'pending',
      geneticFollowUpNeeded: false,
    },
    customNotes: '',
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

  const assignedDoctor = store.coupleCounsellors?.[coupleId] || store.cases?.[coupleId]?.counsellor || storedPlan?.counsellor || 'Dr. Mariam Al Hosani';

  // Base state definition
  const base = storedPlan || DEFAULT_PLAN_STATE[coupleId] || {
    activeStageId: 1,
    condition: 'Genetic screening profile',
    tier: 3,
    counsellor: assignedDoctor,
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

  // 3. Stage 3: Genetic counselling (ALL SESSIONS ARE MANDATORY)
  const hasApptBooked = !!(store.appointments?.[coupleId] || scheduleAppts.some((a) => a.cid === coupleId));
  if (hasApptBooked) {
    items.add('appointment_booking');
  } else {
    items.delete('appointment_booking');
  }

  const sessionMarkedDone = scheduleAppts.some(
    (a) => (a.cid === coupleId || a.id === `appt_${coupleId}`) && (a.priority === 'completed' || a.status === 'completed')
  ) || !!storedPlan?.counsellingCompleted;
  if (sessionMarkedDone) {
    items.add('counselling_session');
  } else if (!storedPlan?.completedItems?.includes('counselling_session')) {
    items.delete('counselling_session');
  }

  const hasRecommendations = (store.notes?.[coupleId] || []).length > 0 || !!base.counsellorRecommendations || storedPlan?.completedItems?.includes('counsellor_recommendations');
  if (hasRecommendations) {
    items.add('counsellor_recommendations');
  } else {
    items.delete('counsellor_recommendations');
  }

  const counsellorApproved = (store.approved || []).includes(coupleId) || storedPlan?.completedItems?.includes('approved_care_plan');
  if (counsellorApproved) {
    items.add('approved_care_plan');
  } else {
    items.delete('approved_care_plan');
  }

  const hasReferrals = (store.referrals?.[coupleId] || []).length > 0 || (storedPlan?.referrals || []).length > 0 || storedPlan?.completedItems?.includes('follow_up_referrals');
  if (hasReferrals) {
    items.add('follow_up_referrals');
  } else {
    items.delete('follow_up_referrals');
  }

  // 4. Stage 4: Family planning (Don't tick all three from one card selection)
  if (base.familyPlanningChoice) {
    items.add('chosen_conception_pathway');
  }
  if (base.preconceptionFollowupRecorded || storedPlan?.completedItems?.includes('preconception_followups')) {
    items.add('preconception_followups');
  }
  const hasPgtmCoordination = (store.referrals?.[coupleId] || []).some((r) => {
    const dest = typeof r?.destination === 'string' ? r.destination : (r?.destination?.destination || '');
    return dest.includes('IVF') || dest.includes('PGT');
  }) ||
    base.pgtmCoordinated ||
    storedPlan?.completedItems?.includes('pgtm_coordination');
  if (hasPgtmCoordination) {
    items.add('pgtm_coordination');
  }

  // 5. Stage 5: Pregnancy (Remove automatic CVS/amnio triggers based solely on gestational age)
  if (pregnancyConfirmed) {
    items.add('pregnancy_confirmation');
    if (base.pregnancy?.weeks > 0 || base.pregnancy?.edd) {
      items.add('gestational_milestones');
    }
  }
  const hasPregCounsellingDone = scheduleAppts.some(
    (a) => a.cid === coupleId && a.what?.toLowerCase().includes('pregnancy') && (a.priority === 'completed' || a.status === 'completed')
  ) || base.pregnancyCounsellingDone || storedPlan?.completedItems?.includes('pregnancy_counselling');
  if (hasPregCounsellingDone) {
    items.add('pregnancy_counselling');
  }
  if (base.pregnancy?.prenatalTestStatus === 'completed' || base.pregnancy?.prenatalTestStatus === 'recorded' || storedPlan?.completedItems?.includes('prenatal_genetic_testing')) {
    items.add('prenatal_genetic_testing');
  }
  if (base.pregnancy?.specialistApptStatus === 'completed' || storedPlan?.completedItems?.includes('specialist_appointments')) {
    items.add('specialist_appointments');
  }

  // 6. Stage 6: Birth preparation
  if (base.pregnancy?.edd || storedPlan?.completedItems?.includes('expected_delivery_date')) {
    items.add('expected_delivery_date');
  }
  if (base.pregnancy?.deliveryHospital || storedPlan?.completedItems?.includes('maternity_care_coordination')) {
    items.add('maternity_care_coordination');
  }
  const hasBirthPrepDone = scheduleAppts.some(
    (a) => a.cid === coupleId && a.what?.toLowerCase().includes('birth') && a.priority === 'completed'
  ) || base.birthPrepConsultDone || storedPlan?.completedItems?.includes('birth_prep_consultation');
  if (hasBirthPrepDone) {
    items.add('birth_prep_consultation');
  }
  if (base.clinicalHandoverSubmitted || storedPlan?.completedItems?.includes('clinical_handover_consent')) {
    items.add('clinical_handover_consent');
  }
  if (base.newbornScreeningPrepRecorded || storedPlan?.completedItems?.includes('newborn_screening_prep')) {
    items.add('newborn_screening_prep');
  }

  // 7. Stage 7: Childbirth & newborn care
  if (base.childbirth?.delivered || storedPlan?.completedItems?.includes('birth_details')) {
    items.add('birth_details');
  }
  if (base.childbirth?.childRecordCreated || storedPlan?.completedItems?.includes('child_health_record')) {
    items.add('child_health_record');
  }
  if (base.childbirth?.newbornScreenStatus === 'completed' || storedPlan?.completedItems?.includes('newborn_screening_status')) {
    items.add('newborn_screening_status');
  }
  if ((base.childbirth?.geneticFollowUpIndicated && base.childbirth?.geneticFollowUpCreated) || storedPlan?.completedItems?.includes('required_genetic_followup')) {
    items.add('required_genetic_followup');
  }
  if (base.childbirth?.postnatalCounsellingCompleted || storedPlan?.completedItems?.includes('postnatal_counselling')) {
    items.add('postnatal_counselling');
  }

  const facilityMap = {
    'IVF / PGT-M': 'Cleveland Clinic Abu Dhabi · Fertility Center',
    'Fetal medicine': 'Danat Al Emarat Hospital · Fetal Medicine Unit',
    'Haematology': 'Sheikh Shakhbout Medical City (SSMC) · Adult & Paediatric Haematology',
    'Paediatrics': 'Sheikh Khalifa Medical City (SKMC) · Paediatric Genetics',
    'Other': 'Cleveland Clinic Abu Dhabi · Medical Genetics',
  };

  const storeRefs = store.referrals?.[coupleId] || [];
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
    counsellor: assignedDoctor,
    referrals: mergedReferrals,
    completedItems: Array.from(items),
    activeStageId: activeStage,
    counsellingCompleted: !!(sessionMarkedDone && counsellorApproved),
    pregnancy: {
      ...(base.pregnancy || {}),
      isPregnant: !!pregnancyConfirmed,
      weeks: pregnancyConfirmed ? base.pregnancy?.weeks : null,
      edd: pregnancyConfirmed ? base.pregnancy?.edd : null,
      deliveryHospital: base.pregnancy?.deliveryHospital || '',
    },
    childbirth: {
      ...(base.childbirth || {}),
      delivered: !!base.childbirth?.delivered,
      babyName: base.childbirth?.babyName || '',
      birthDate: base.childbirth?.birthDate || null,
      newbornScreenStatus: base.childbirth?.newbornScreenStatus || 'pending',
      geneticFollowUpNeeded: !!base.childbirth?.geneticFollowUpNeeded,
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
 * Update pregnancy and delivery milestones.
 * Automatically ticks stage 5 & 6 checkboxes based on data provided.
 */
export function updatePregnancyMilestone(coupleId, pregnancyData) {
  const plan = getCoupleCarePlan(coupleId);
  const completed = new Set(plan.completedItems || []);
  const weeks = pregnancyData.weeks ?? plan.pregnancy?.weeks ?? 0;

  if (pregnancyData.isPregnant) {
    completed.add('pregnancy_confirmation');
    completed.add('chosen_conception_pathway');
    completed.add('pgtm_coordination');
    completed.add('preconception_followups');
    if (weeks > 0) completed.add('gestational_milestones');
    // Auto-tick prenatal testing windows
    if (weeks >= 11) completed.add('prenatal_genetic_testing');
    if (weeks >= 15) completed.add('specialist_appointments');
  }
  // Stage 6: EDD recorded → expected_delivery_date
  if (pregnancyData.edd) {
    completed.add('expected_delivery_date');
  }
  // Stage 6: delivery hospital set → maternity_care_coordination
  if (pregnancyData.deliveryHospital && pregnancyData.isPregnant) {
    completed.add('maternity_care_coordination');
  }

  // Recalculate activeStageId
  const nextList = Array.from(completed);
  let activeStage = 1;
  for (const stage of CARE_PLAN_STAGES) {
    const stageItems = stage.items.map((i) => i.id);
    const completedCount = stageItems.filter((id) => nextList.includes(id)).length;
    if (completedCount < stageItems.length) { activeStage = stage.id; break; }
    activeStage = Math.min(stage.id + 1, 7);
  }

  return saveCoupleCarePlan(coupleId, {
    pregnancy: { ...(plan.pregnancy || {}), ...pregnancyData },
    completedItems: nextList,
    activeStageId: pregnancyData.isPregnant ? Math.max(activeStage, 5) : activeStage,
  }, 'Updated pregnancy tracking milestones');
}

/**
 * Log newborn delivery & child health record.
 * Automatically ticks all Stage 7 (and remaining Stage 6) checkboxes.
 */
export function logNewbornMilestone(coupleId, childData) {
  const plan = getCoupleCarePlan(coupleId);
  const completed = new Set(plan.completedItems || []);

  if (childData.delivered) {
    completed.add('birth_details');
    // Stage 6 items that must be done before/at delivery
    completed.add('maternity_care_coordination');
    completed.add('clinical_handover_consent');
    completed.add('expected_delivery_date');
  }
  if (childData.newbornScreenStatus === 'completed') {
    completed.add('newborn_screening_status');
    completed.add('child_family_health_record');
  }
  // Required genetic follow-up: auto-tick when delivered (pending specialist follow-up is implicit)
  if (childData.delivered && childData.geneticFollowUpNeeded !== false) {
    completed.add('required_genetic_followup');
  }

  return saveCoupleCarePlan(coupleId, {
    childbirth: { ...(plan.childbirth || {}), ...childData },
    completedItems: Array.from(completed),
    activeStageId: 7,
  }, 'Logged childbirth and newborn screening milestone');
}

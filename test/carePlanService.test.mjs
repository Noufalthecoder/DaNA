import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

import {
  CARE_PLAN_STAGES,
  getCoupleCarePlan,
  saveCoupleCarePlan,
  toggleCarePlanItem,
  computeCarePlanProgress,
  updatePregnancyMilestone,
  logNewbornMilestone,
} from '../web/src/app/shared/carePlanService.js';
import { set } from '../web/src/app/shared/store.js';
import { addReferral, selectCounsellor } from '../web/src/app/shared/db.js';

describe('Personalised Care Plan Tracker Unit Tests (7 Stages)', () => {
  beforeEach(() => {
    set({
      session: { id: 'khalid', role: 'couple', name: 'Khalid Al Mansoori', couple: 'c1' },
      carePlans: {},
      audit: [],
    });
  });

  it('1. Verifies that all 7 stages match the clinical specification', () => {
    assert.equal(CARE_PLAN_STAGES.length, 7);
    const expectedKeys = [
      'screening_discovery',
      'couple_assessment',
      'genetic_counselling',
      'family_planning',
      'pregnancy',
      'birth_preparation',
      'childbirth_newborn',
    ];
    assert.deepEqual(
      CARE_PLAN_STAGES.map((s) => s.key),
      expectedKeys
    );

    // Verify Stage 1 (Roots)
    const stage1 = CARE_PLAN_STAGES[0];
    assert.equal(stage1.tag, 'Roots');
    assert.equal(stage1.items.length, 4);

    // Verify Stage 2 (Bonds)
    const stage2 = CARE_PLAN_STAGES[1];
    assert.equal(stage2.tag, 'Bonds');
    assert.equal(stage2.items.length, 3);

    // Verify Stage 7 (Journey milestone)
    const stage7 = CARE_PLAN_STAGES[6];
    assert.equal(stage7.tag, 'Journey milestone');
    assert.equal(stage7.items.length, 5);
  });

  it('2. Retrieves default plan for couple c1 with baseline progress', () => {
    const plan = getCoupleCarePlan('c1');
    assert.ok(plan);
    assert.equal(plan.condition, 'Beta-thalassaemia (HBB)');
    assert.equal(plan.tier, 2);
    assert.ok(plan.completedItems.length > 0);
    assert.ok(Array.isArray(plan.referrals));

    // When counsellor adds a referral, it synchronizes with care plan
    addReferral('c1', { destination: 'IVF / PGT-M', facility: 'Cleveland Clinic', priority: 'high', status: 'DISPATCHED' });
    const planWithRef = getCoupleCarePlan('c1');
    assert.equal(planWithRef.referrals[0].destination, 'IVF / PGT-M');

    const progress = computeCarePlanProgress(planWithRef);
    assert.ok(progress > 0 && progress < 100);
  });

  it('3. Toggles item completion and dynamically updates progress and active stage', () => {
    const initialPlan = getCoupleCarePlan('c1');
    const initialCount = initialPlan.completedItems.length;

    // Toggle a new item from Stage 4 (Family planning)
    const updated = toggleCarePlanItem('c1', 'chosen_conception_pathway');
    assert.ok(updated.completedItems.includes('chosen_conception_pathway'));
    assert.equal(updated.completedItems.length, initialCount + 1);

    // Toggle it back off
    const toggledOff = toggleCarePlanItem('c1', 'chosen_conception_pathway');
    assert.equal(toggledOff.completedItems.includes('chosen_conception_pathway'), false);
    assert.equal(toggledOff.completedItems.length, initialCount);
  });

  it('4. Updates pregnancy milestones and automatically advances to Stage 5', () => {
    const updated = updatePregnancyMilestone('c1', {
      isPregnant: true,
      weeks: 14,
      edd: '2027-05-20',
      deliveryHospital: 'Danat Al Emarat Hospital, Abu Dhabi',
    });

    assert.equal(updated.pregnancy.isPregnant, true);
    assert.equal(updated.pregnancy.weeks, 14);
    assert.equal(updated.pregnancy.edd, '2027-05-20');
    assert.ok(updated.completedItems.includes('pregnancy_confirmation'));
    assert.ok(updated.completedItems.includes('expected_delivery_date'));
    assert.ok(updated.activeStageId >= 5);
  });

  it('5. Logs childbirth delivery, newborn screening, and reaches Stage 7', () => {
    const updated = logNewbornMilestone('c1', {
      delivered: true,
      babyName: 'Zayed Al Mansoori',
      birthDate: '2027-05-18',
      newbornScreenStatus: 'completed',
    });

    assert.equal(updated.childbirth.delivered, true);
    assert.equal(updated.childbirth.babyName, 'Zayed Al Mansoori');
    assert.ok(updated.completedItems.includes('birth_details'));
    assert.ok(updated.completedItems.includes('newborn_screening_status'));
    assert.equal(updated.activeStageId, 7);
  });

  it('6. Successfully initializes empty custom couple with Stage 1 active', () => {
    const custom = getCoupleCarePlan('custom_couple_999');
    assert.ok(custom);
    assert.equal(custom.activeStageId, 1);
    assert.equal(custom.completedItems.length, 1);
  });

  it('7. Locks and preserves dedicated counsellor per couple across all 7 stages', () => {
    selectCounsellor('c3', 'Dr. Tariq Al Nuaimi');
    assert.equal(getCoupleCarePlan('c3').counsellor, 'Dr. Tariq Al Nuaimi');
    selectCounsellor('c2', 'Dr. Fatima Al Zaabi');
    assert.equal(getCoupleCarePlan('c2').counsellor, 'Dr. Fatima Al Zaabi');
    assert.equal(getCoupleCarePlan('c1').counsellor, 'Dr. Mariam Al Hosani');
  });
});

/*
  Compact Lifecycle Overview (replacing legacy 4-step Journey).
  Renders the 7-stage summary card on Home page:
  Screening · Assessment · Counselling · Planning · Pregnancy · Birth · Newborn
*/
import { useMemo } from 'react';
import { useStore } from './store.js';
import { getCoupleCarePlan } from './carePlanService.js';
import { useJourney } from './journey.js';
import Intake from './Intake.jsx';
import ProfileStep from './ProfileStep.jsx';
import './Journey.css';

const STAGES = [
  {
    id: 1,
    name: 'Screening',
    nameAr: 'الفحص',
    desc: 'Individual genetic sequencing and medical history are being evaluated.',
  },
  {
    id: 2,
    name: 'Assessment',
    nameAr: 'التقييم',
    desc: 'Joint couple risk and Mendelian compatibility are being calculated.',
  },
  {
    id: 3,
    name: 'Counselling',
    nameAr: 'الاستشارة',
    desc: 'Your combined results are ready. Review your options and arrange your counselling session.',
  },
  {
    id: 4,
    name: 'Planning',
    nameAr: 'التخطيط',
    desc: 'Your clinical care protocol is approved. Finalize your conception pathway.',
  },
  {
    id: 5,
    name: 'Pregnancy',
    nameAr: 'الحمل',
    desc: 'Pregnancy active. Track gestational milestones and prenatal diagnostics.',
  },
  {
    id: 6,
    name: 'Birth',
    nameAr: 'الولادة',
    desc: 'Birth preparation in progress. Confirm delivery hospital and cord blood plan.',
  },
  {
    id: 7,
    name: 'Newborn',
    nameAr: 'المولود',
    desc: 'Newborn delivered. Verify infant blood spot screening and pediatric follow-up.',
  },
];

export default function Journey({ action }) {
  const session = useStore((s) => s.session);
  const cid = session?.couple || 'c1';
  const storePlans = useStore((s) => s.carePlans);
  const plan = useMemo(() => storePlans?.[cid] || getCoupleCarePlan(cid), [storePlans, cid]);

  // Read active stage from plan (defaults to Stage 3 Counselling for demo)
  const activeStageId = plan?.activeStageId || 3;
  const currentStage = STAGES.find((s) => s.id === activeStageId) || STAGES[2];

  // Legacy fallback support for unlinked/fresh profile onboarding
  const { steps, current } = useJourney();
  const needsIntake = steps[current]?.key === 'malaffi';
  const needsProfile = steps[current]?.key === 'profile';

  return (
    <section className="lifecycle-card" aria-label="Your family health journey">
      {/* Header */}
      <div className="lifecycle-header">
        <div className="lifecycle-title-group">
          <h2 className="lifecycle-title">Your family health journey</h2>
        </div>
        <span className="lifecycle-counter">Stage {activeStageId} of 7</span>
      </div>

      {/* 7-Stage Horizontal Stepper */}
      <div className="lifecycle-stepper-wrap">
        <ol className="lifecycle-stepper">
          {STAGES.map((s) => {
            const isDone = s.id < activeStageId;
            const isCurrent = s.id === activeStageId;
            const isUpcoming = s.id > activeStageId;

            return (
              <li
                key={s.id}
                className={`lifecycle-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${isUpcoming ? 'is-upcoming' : ''}`}
              >
                <div className="lifecycle-circle-wrap">
                  <div className="lifecycle-circle">
                    {isDone ? (
                      <span className="lifecycle-check">✓</span>
                    ) : (
                      <span>{s.id}</span>
                    )}
                  </div>
                </div>
                <span className="lifecycle-label">{s.name}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Current Stage Highlight */}
      <div className="lifecycle-current-box">
        <h3 className="lifecycle-current-h3">
          Current stage: {currentStage.name}
        </h3>
        <p className="lifecycle-current-p">
          {currentStage.desc}
        </p>

        {/* Action Button: Open Personal Tracker */}
        <div className="lifecycle-action-row">
          <a href="#/app/tracker" className="lifecycle-open-btn">
            Open Personal Tracker <span className="lifecycle-btn-arr">→</span>
          </a>
        </div>
      </div>

      {/* Inline Onboarding step if needed for fresh/unlinked user */}
      {(needsIntake || needsProfile || action) && (
        <div className="lifecycle-onboarding-inline">
          <div className="lifecycle-onboarding-head">
            <span className="lifecycle-onboarding-tag">Required Action</span>
            <small style={{ color: '#94A3B8' }}>Complete this step to proceed</small>
          </div>
          {action || (needsIntake ? <Intake /> : <ProfileStep />)}
        </div>
      )}
    </section>
  );
}

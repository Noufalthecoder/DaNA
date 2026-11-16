import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Video,
  Hospital,
  ArrowRight,
  ExternalLink,
  Printer,
  ChevronDown,
  ChevronUp,
  Baby,
  ShieldCheck,
  Stethoscope,
  HeartHandshake,
  Dna,
  Share2,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Check,
  UserCheck,
  Building,
  Lock,
} from 'lucide-react';
import { Page, Card, Badge, Dialog } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { useCouple } from './useCouple.js';
import {
  CARE_PLAN_STAGES,
  getCoupleCarePlan,
  saveCoupleCarePlan,
  toggleCarePlanItem,
  computeCarePlanProgress,
  updatePregnancyMilestone,
  logNewbornMilestone,
} from '../shared/carePlanService.js';
import './PersonalisedPlanTracker.css';

export default function PersonalisedPlanTracker() {
  const { me, partner, result, couple } = useCouple();
  const session = useStore((s) => s.session);
  const cid = couple?.id || session?.couple || 'c1';

  // Reactive plan state from store or service
  const storePlans = useStore((s) => s.carePlans);
  const plan = useMemo(() => {
    return storePlans?.[cid] || getCoupleCarePlan(cid);
  }, [storePlans, cid]);

  const progress = useMemo(() => computeCarePlanProgress(plan), [plan]);

  // Section availability / milestone gates:
  // 1. Stage 3 (Genetic Counselling) Confirmation:
  // Once Stage 3 is confirmed (plan_approved or referral_coordinated or activeStageId >= 4), specialist referrals unlock.
  const isStage3Confirmed = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 4 ||
      plan.completedItems?.includes('plan_approved') ||
      plan.completedItems?.includes('referral_coordinated')
    );
  }, [plan.activeStageId, plan.completedItems]);

  // 2. Section 5 (Pregnancy Journey) Unlock:
  // Available ONLY once previous sections/stages (1-4) are completed AND pregnancy is confirmed.
  const isPregnancyUnlocked = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 5 ||
      !!plan.pregnancy?.isPregnant ||
      !!plan.completedItems?.includes('pregnancy_confirmation')
    );
  }, [plan.activeStageId, plan.pregnancy?.isPregnant, plan.completedItems]);

  // 3. Section 6 (Birth & Newborn Records) Unlock:
  // Available ONLY once pregnancy stage advances to birth preparation (Stage 6) or delivery (Stage 7).
  const isBirthUnlocked = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 6 ||
      !!plan.childbirth?.delivered ||
      !!plan.completedItems?.includes('birth_details')
    );
  }, [plan.activeStageId, plan.childbirth?.delivered, plan.completedItems]);

  // Section navigation state
  const [activeSection, setActiveSection] = useState('lifecycle');

  // Expanded stages state
  const [expandedStages, setExpandedStages] = useState({
    [plan.activeStageId || 3]: true,
    1: false,
    2: false,
    3: true,
  });

  // Action checklist local state (stored in plan)
  const [completedActions, setCompletedActions] = useState({
    consultation: true,
    pgtm_review: true,
    referral_check: false,
    sila_outreach: true,
  });

  // Modals state
  const [showPregnancyModal, setShowPregnancyModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form states
  const [pregWeeks, setPregWeeks] = useState(plan.pregnancy?.weeks || 12);
  const [pregEdd, setPregEdd] = useState(plan.pregnancy?.edd || '2027-05-15');
  const [deliveryHosp, setDeliveryHosp] = useState(
    plan.pregnancy?.deliveryHospital || 'Danat Al Emarat Hospital for Women & Children, Abu Dhabi'
  );
  const [babyName, setBabyName] = useState(plan.childbirth?.babyName || 'Zayed');
  const [babyDob, setBabyDob] = useState(plan.childbirth?.birthDate || '2027-05-12');
  const [babyScreen, setBabyScreen] = useState(plan.childbirth?.newbornScreenStatus || 'completed');

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleExpand = (stageId) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleToggleItem = (itemId) => {
    toggleCarePlanItem(cid, itemId);
  };

  const toggleAction = (key) => {
    setCompletedActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePregnancy = (e) => {
    e.preventDefault();
    updatePregnancyMilestone(cid, {
      isPregnant: true,
      weeks: Number(pregWeeks),
      edd: pregEdd,
      deliveryHospital: deliveryHosp,
    });
    setShowPregnancyModal(false);
  };

  const saveBirth = (e) => {
    e.preventDefault();
    logNewbornMilestone(cid, {
      delivered: true,
      babyName,
      birthDate: babyDob,
      newbornScreenStatus: babyScreen,
      geneticFollowUpNeeded: true,
    });
    setShowBirthModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Page
      title="Personal Tracker"
      sub="مُتابِع الخطة الشخصية الشاملة · Longitudinal lifecycle roadmap from premarital screening to newborn care"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline-clean"
            onClick={() => setShowPrintModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={15} /> Clinical Summary Slip
          </button>
          <a
            href="#/app/counsellor"
            className="btn btn-green-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Stethoscope size={15} /> Talk to Counsellor
          </a>
        </div>
      }
    >
      {/* ─── 6-Section Quick Navigation Bar (From Image 3) ─── */}
      <nav className="cpt-nav-tabs" aria-label="Personal Tracker Sections">
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'lifecycle' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('lifecycle')}
        >
          1. Lifecycle overview
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'milestones' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('milestones')}
        >
          2. Milestone timeline
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'actions' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('actions')}
        >
          3. Next actions
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'appointments' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('appointments')}
        >
          4. Appointments & referrals
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'pregnancy' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('pregnancy')}
        >
          5. Pregnancy journey {isPregnancyUnlocked ? '' : '🔒'}
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'birth' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('birth')}
        >
          6. Birth & newborn records {isBirthUnlocked ? '' : '🔒'}
        </button>
      </nav>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Lifecycle overview (Image 3 Section 1)                            */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-lifecycle" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 1</span>
            <h3 className="cpt-sec-title">Lifecycle Overview · نظرة عامة على دورة الرعاية</h3>
          </div>
          <Badge tone="green">Active Care Protocol</Badge>
        </div>

        <div className="cpt-couple-badge">
          <span className="cpt-live-dot" />
          <span>{me?.short || 'Khalid'} & {partner?.short || 'Fatima'}</span>
          <span className="cpt-divider">·</span>
          <span className="cpt-cond-pill">{plan.condition || 'Beta-thalassaemia (HBB)'}</span>
          <span className="cpt-divider">·</span>
          <Badge tone="amber">Tier {plan.tier || 2} Clinical Priority</Badge>
          <span className="cpt-divider">·</span>
          <span style={{ color: '#64748B', fontSize: 12.5 }}>Counsellor: <b>{plan.counsellor}</b></span>
        </div>

        {/* Progress Tracker Bar */}
        <div className="cpt-progress-container">
          <div className="cpt-progress-header">
            <span className="cpt-progress-label">Continuous Lifecycle Progress</span>
            <span className="cpt-progress-value">{progress}% Completed</span>
          </div>
          <div className="cpt-progress-track">
            <div className="cpt-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="cpt-stage-breadcrumbs">
            <span>Current Focus: <b>Stage {plan.activeStageId || 3} — {CARE_PLAN_STAGES.find((s) => s.id === (plan.activeStageId || 3))?.title}</b></span>
            <span className="cpt-muted-hint">7 Lifelong Milestones · 23 Checkpoints</span>
          </div>
        </div>

        {/* Lifecycle Stepper Strip (The 7 Stages at a glance) */}
        <div className="cpt-strip-wrap">
          {CARE_PLAN_STAGES.map((s) => {
            const isDone = s.id < (plan.activeStageId || 3);
            const isCurrent = s.id === (plan.activeStageId || 3);
            return (
              <div
                key={s.id}
                className={`cpt-strip-node ${isDone ? 'done' : isCurrent ? 'current' : 'upcoming'}`}
                onClick={() => scrollToSection('milestones')}
                role="button"
                tabIndex={0}
              >
                <div className="cpt-strip-circle">
                  {isDone ? '✓' : s.id}
                </div>
                <span className="cpt-strip-lbl">{s.title.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Milestone timeline (Image 3 Section 2)                            */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-milestones" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 2</span>
            <h3 className="cpt-sec-title">Milestone Timeline · محطات الرحلة الوراثية</h3>
            <p className="cpt-sec-sub">
              Detailed interactive checklist across all 7 stages from premarital screening to newborn care.
            </p>
          </div>
          <div className="cpt-expand-actions">
            <button
              type="button"
              className="cpt-btn-text"
              onClick={() => {
                const all = {};
                CARE_PLAN_STAGES.forEach((s) => { all[s.id] = true; });
                setExpandedStages(all);
              }}
            >
              Expand all
            </button>
            <span className="cpt-sep">·</span>
            <button
              type="button"
              className="cpt-btn-text"
              onClick={() => setExpandedStages({ [plan.activeStageId || 3]: true })}
            >
              Collapse
            </button>
          </div>
        </div>

        <div className="cpt-stages-list">
          {CARE_PLAN_STAGES.map((stage) => {
            const isExpanded = !!expandedStages[stage.id];
            const stageItems = stage.items.map((i) => i.id);
            const completedCount = stageItems.filter((id) =>
              (plan.completedItems || []).includes(id)
            ).length;
            const isFullyCompleted = completedCount === stageItems.length;
            const isCurrent = stage.id === (plan.activeStageId || 1);

            return (
              <div
                key={stage.id}
                className={`cpt-stage-card ${isCurrent ? 'is-current' : ''} ${
                  isFullyCompleted ? 'is-completed' : ''
                }`}
              >
                <div
                  className="cpt-stage-header"
                  onClick={() => toggleExpand(stage.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <div className="cpt-stage-num-wrap">
                    <div className="cpt-stage-num">
                      {isFullyCompleted ? (
                        <CheckCircle2 size={20} color="#16A34A" />
                      ) : isCurrent ? (
                        <span className="cpt-stage-current-dot" />
                      ) : (
                        stage.id
                      )}
                    </div>
                  </div>

                  <div className="cpt-stage-titles">
                    <div className="cpt-stage-top-row">
                      <span className="cpt-stage-seq">Stage {stage.id}</span>
                      {stage.tag && (
                        <span className={`cpt-badge cpt-tag-${stage.tag.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stage.tag}
                        </span>
                      )}
                      {isFullyCompleted && (
                        <Badge tone="green">Completed ({completedCount}/{stage.items.length})</Badge>
                      )}
                      {isCurrent && !isFullyCompleted && (
                        <Badge tone="blue">Active Focus ({completedCount}/{stage.items.length})</Badge>
                      )}
                    </div>
                    <h4 className="cpt-stage-title">
                      {stage.title} <span className="cpt-stage-ar">{stage.titleAr}</span>
                    </h4>
                    <p className="cpt-stage-desc">{stage.description}</p>
                  </div>

                  <div className="cpt-stage-toggle-btn">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="cpt-stage-body">
                    <div className="cpt-items-checklist">
                      {stage.items.map((item) => {
                        const checked = (plan.completedItems || []).includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`cpt-check-item ${checked ? 'checked' : ''}`}
                            onClick={() => handleToggleItem(item.id)}
                          >
                            <button
                              type="button"
                              className="cpt-check-box"
                              aria-checked={checked}
                              title={checked ? 'Mark pending' : 'Mark completed'}
                            >
                              {checked ? (
                                <CheckCircle2 size={18} color="#16A34A" />
                              ) : (
                                <Circle size={18} color="#94A3B8" />
                              )}
                            </button>
                            <div className="cpt-item-text">
                              <span className="cpt-item-label">
                                {item.label} <small className="cpt-item-ar">({item.labelAr})</small>
                              </span>
                              <span className="cpt-item-hint">{item.hint}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="cpt-stage-footer-actions">
                      {stage.id === 1 && (
                        <>
                          <a href="#/app/result" className="btn-clean-sm">
                            View My Result Report →
                          </a>
                          <a href="#/app/familytree" className="btn-clean-sm">
                            Open Family Tree →
                          </a>
                        </>
                      )}
                      {stage.id === 2 && (
                        <>
                          <a href="#/app/bonds" className="btn-clean-sm">
                            Review Joint Assessment →
                          </a>
                          <a href="#/app/connections" className="btn-clean-sm">
                            Manage Consents →
                          </a>
                        </>
                      )}
                      {stage.id === 3 && (
                        <>
                          <a href="#/app/counsellor" className="btn-clean-sm btn-green-subtle">
                            Book / Reschedule Counsellor Session →
                          </a>
                          {plan.followUp?.meetLink && (
                            <a
                              href={plan.followUp.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-clean-sm"
                            >
                              Join Video Consultation (Meet) <ExternalLink size={12} />
                            </a>
                          )}
                        </>
                      )}
                      {stage.id === 4 && (
                        <>
                          <a href="#/app/bonds" className="btn-clean-sm">
                            Confirm Conception Protocol →
                          </a>
                          <button
                            type="button"
                            className="btn-clean-sm"
                            onClick={() => setShowPregnancyModal(true)}
                          >
                            Declare Pregnancy / Gestational Age →
                          </button>
                        </>
                      )}
                      {stage.id === 5 && (
                        <>
                          <button
                            type="button"
                            className="btn-clean-sm btn-green-subtle"
                            onClick={() => setShowPregnancyModal(true)}
                          >
                            Update Gestational Weeks & Ultrasound Checkpoints →
                          </button>
                          <span className="cpt-status-pill">
                            Current: {plan.pregnancy?.weeks ? `${plan.pregnancy.weeks} Weeks` : 'Gestational Tracking Ready'}
                          </span>
                        </>
                      )}
                      {stage.id === 6 && (
                        <>
                          <button
                            type="button"
                            className="btn-clean-sm"
                            onClick={() => setShowPregnancyModal(true)}
                          >
                            Set Expected Delivery Date & Hospital →
                          </button>
                          <span className="cpt-status-pill">
                            EDD: {plan.pregnancy?.edd || 'Mid 2027'} · {plan.pregnancy?.deliveryHospital?.split(',')[0]}
                          </span>
                        </>
                      )}
                      {stage.id === 7 && (
                        <>
                          <button
                            type="button"
                            className="btn-clean-sm btn-green-subtle"
                            onClick={() => setShowBirthModal(true)}
                          >
                            <Baby size={14} /> Log Newborn Delivery & Screening Details →
                          </button>
                          <span className="cpt-status-pill">
                            {plan.childbirth?.delivered
                              ? `Baby ${plan.childbirth?.babyName || 'Zayed'} · Screen ${plan.childbirth?.newbornScreenStatus}`
                              : 'Awaiting Delivery Protocol'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Next actions (Image 3 Section 3)                                  */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-actions" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 3</span>
            <h3 className="cpt-sec-title">Next Actions · الخطوات والإجراءات القادمة</h3>
            <p className="cpt-sec-sub">
              Priority actionable tasks recommended by your clinical team for your active stage.
            </p>
          </div>
        </div>

        <div className="cpt-action-cards-grid">
          {/* Action 1 */}
          <div className={`cpt-action-item ${completedActions.consultation ? 'done' : ''}`}>
            <div className="cpt-action-top">
              <button
                type="button"
                className="cpt-action-check"
                onClick={() => toggleAction('consultation')}
                title="Toggle done"
              >
                {completedActions.consultation ? <CheckCircle2 size={20} color="#16A34A" /> : <Circle size={20} color="#94A3B8" />}
              </button>
              <div style={{ flex: 1 }}>
                <b className="cpt-action-title">1. Attend Genetic Counselling Consultation</b>
                <p className="cpt-action-desc">
                  Scheduled with <b>Dr. Mariam Al Hosani</b> for 10 Nov 2026 at 13:30 (Gulf Time). Discuss carrier match findings and PGT-M protocol.
                </p>
              </div>
            </div>
            <div className="cpt-action-links">
              {plan.followUp?.meetLink && (
                <a href={plan.followUp.meetLink} target="_blank" rel="noreferrer" className="btn-clean-sm btn-green-subtle">
                  <Video size={13} /> Open Google Meet Link
                </a>
              )}
              <a href="#/app/counsellor" className="btn-clean-sm">
                Manage Booking
              </a>
            </div>
          </div>

          {/* Action 2 */}
          <div className={`cpt-action-item ${completedActions.pgtm_review ? 'done' : ''}`}>
            <div className="cpt-action-top">
              <button
                type="button"
                className="cpt-action-check"
                onClick={() => toggleAction('pgtm_review')}
                title="Toggle done"
              >
                {completedActions.pgtm_review ? <CheckCircle2 size={20} color="#16A34A" /> : <Circle size={20} color="#94A3B8" />}
              </button>
              <div style={{ flex: 1 }}>
                <b className="cpt-action-title">2. Review Reproductive Decision Pathway</b>
                <p className="cpt-action-desc">
                  Compare IVF with PGT-M against prenatal diagnosis. Review scholar-approved faith cards regarding assisted reproduction.
                </p>
              </div>
            </div>
            <div className="cpt-action-links">
              <a href="#/app/bonds" className="btn-clean-sm">
                Review Options in Bonds →
              </a>
            </div>
          </div>

          {/* Action 3 */}
          <div className={`cpt-action-item ${completedActions.referral_check ? 'done' : ''}`}>
            <div className="cpt-action-top">
              <button
                type="button"
                className="cpt-action-check"
                onClick={() => toggleAction('referral_check')}
                title="Toggle done"
              >
                {completedActions.referral_check ? <CheckCircle2 size={20} color="#16A34A" /> : <Circle size={20} color="#94A3B8" />}
              </button>
              <div style={{ flex: 1 }}>
                <b className="cpt-action-title">3. Confirm Cleveland Clinic Abu Dhabi Referral</b>
                <p className="cpt-action-desc">
                  Requisition <b>#REF-2026-HBB-041</b> dispatched to Malaffi HIE for the IVF & PGT-M Unit. Download clinical summary slip for your intake visit.
                </p>
              </div>
            </div>
            <div className="cpt-action-links">
              <button type="button" className="btn-clean-sm" onClick={() => setShowPrintModal(true)}>
                <Printer size={13} /> View Referral Slip
              </button>
            </div>
          </div>

          {/* Action 4 */}
          <div className={`cpt-action-item ${completedActions.sila_outreach ? 'done' : ''}`}>
            <div className="cpt-action-top">
              <button
                type="button"
                className="cpt-action-check"
                onClick={() => toggleAction('sila_outreach')}
                title="Toggle done"
              >
                {completedActions.sila_outreach ? <CheckCircle2 size={20} color="#16A34A" /> : <Circle size={20} color="#94A3B8" />}
              </button>
              <div style={{ flex: 1 }}>
                <b className="cpt-action-title">4. Extend Family Cascade Protection (Sila Alerts)</b>
                <p className="cpt-action-desc">
                  3 relatives reached anonymously. 2 eligible relatives remaining on your family pedigree. Protect siblings and cousins before marriage.
                </p>
              </div>
            </div>
            <div className="cpt-action-links">
              <a href="#/app/roots" className="btn-clean-sm">
                Send Anonymous Alerts in Roots →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Appointments & referrals (Image 3 Section 4)                      */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-appointments" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 4</span>
            <h3 className="cpt-sec-title">Appointments & Referrals · المواعيد والتحويلات</h3>
            <p className="cpt-sec-sub">
              Traceable clinical specialist referrals and scheduled genetic consultations.
            </p>
          </div>
        </div>

        <div className="cpt-appts-grid">
          {/* Active Consultation Card (Counselling session) */}
          <div className="cpt-detail-card">
            <div className="cpt-card-top-badge">
              <Video size={16} color="#16A34A" />
              <span>Genetic Counselling Consultation</span>
              <Badge tone="green">Confirmed</Badge>
            </div>

            <h4 className="cpt-card-h4">Dr. Mariam Al Hosani · Licensed Clinical Geneticist</h4>
            <dl className="cpt-dl">
              <dt>Session Date</dt>
              <dd><b>Sunday, 10 Nov 2026 · 13:30 (GST)</b></dd>
              <dt>Format & Modality</dt>
              <dd>Encrypted Telehealth (Google Meet)</dd>
              <dt>Consultation Topic</dt>
              <dd>Joint couple result interpretation, PGT-M pre-testing requirements, and Sanger validation.</dd>
              <dt>Physical Clinic</dt>
              <dd>Cleveland Clinic Abu Dhabi · Building A · Room 204</dd>
            </dl>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {plan.followUp?.meetLink && (
                <a
                  href={plan.followUp.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-clean-sm btn-green-subtle"
                >
                  <Video size={13} /> Open Google Meet Link
                </a>
              )}
              <a href="#/app/counsellor" className="btn-clean-sm">
                Reschedule Session
              </a>
            </div>
          </div>

          {/* Specialist Referral Card: ONLY available once Stage 3 is confirmed & completed */}
          {isStage3Confirmed ? (
            <div className="cpt-detail-card">
              <div className="cpt-card-top-badge">
                <Hospital size={16} color="#2563EB" />
                <span>Specialist Genomics Referral</span>
                <Badge tone="blue">Dispatched</Badge>
              </div>

              <h4 className="cpt-card-h4">Cleveland Clinic Abu Dhabi · Fertility Center</h4>
              <dl className="cpt-dl">
                <dt>Service Destination</dt>
                <dd><b>IVF with PGT-M (Embryo Testing)</b></dd>
                <dt>Requisition Ref</dt>
                <dd><code>{plan.referrals?.[0]?.id || 'REF-2026-HBB-041'}</code></dd>
                <dt>Clinical Priority</dt>
                <dd><Badge tone="amber">High Priority (Carrier Match)</Badge></dd>
                <dt>Clinical Indication</dt>
                <dd>Both partners confirmed carriers of pathogenic <i>HBB</i> beta-globin gene mutations ({'c.20A>T'} &amp; {'c.92+1G>A'}).</dd>
                <dt>HIE Integration</dt>
                <dd>Dispatched through Malaffi · Confirmed received by facility</dd>
              </dl>

              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-clean-sm btn-green-subtle"
                  onClick={() => setShowPrintModal(true)}
                >
                  <Printer size={13} /> Print Referral Slip
                </button>
              </div>
            </div>
          ) : (
            <div className="cpt-detail-card cpt-detail-card-pending">
              <div className="cpt-card-top-badge">
                <Lock size={16} color="#D97706" />
                <span>Specialist Referral</span>
                <Badge tone="amber">Pending Stage 3 Consultation</Badge>
              </div>
              <h4 className="cpt-card-h4">Specialist Genomics Referral Requisition</h4>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 14px 0' }}>
                Specialist clinical referrals (such as IVF with PGT-M or Prenatal Genetics) are issued by your counsellor Dr. Mariam Al Hosani upon clinical confirmation of your consultation and approval of your joint reproductive care plan.
              </p>
              <div className="cpt-pending-hint">
                <Clock size={13} style={{ color: '#D97706' }} />
                <span>Unlocks once Stage 3 consultation is confirmed &amp; care plan approved</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: Pregnancy journey (Image 3 Section 5)                             */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-pregnancy" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 5</span>
            <h3 className="cpt-sec-title">Pregnancy Journey · رحلة الحمل والمتابعة الجنينية</h3>
            <p className="cpt-sec-sub">
              Gestational age tracking, trimester health milestones, and time-critical prenatal testing windows.
            </p>
          </div>
          {isPregnancyUnlocked && (
            <button
              type="button"
              className="btn-clean-sm btn-green-subtle"
              onClick={() => setShowPregnancyModal(true)}
            >
              Update Pregnancy Record →
            </button>
          )}
        </div>

        {isPregnancyUnlocked ? (
          <>
            <div className="cpt-preg-dashboard">
              <div className="cpt-preg-stat-box">
                <span className="cpt-preg-stat-label">Gestational Age</span>
                <b className="cpt-preg-stat-val">
                  {plan.pregnancy?.weeks ? `${plan.pregnancy.weeks} Weeks` : '12 Weeks'}
                </b>
                <span className="cpt-preg-stat-note">First Trimester · Ultrasound Dating Aligned</span>
              </div>

              <div className="cpt-preg-stat-box">
                <span className="cpt-preg-stat-label">Expected Delivery Date (EDD)</span>
                <b className="cpt-preg-stat-val">
                  {plan.pregnancy?.edd ? new Date(plan.pregnancy.edd).toLocaleDateString('en-GB') : '15 May 2027'}
                </b>
                <span className="cpt-preg-stat-note">
                  {plan.pregnancy?.deliveryHospital || 'Danat Al Emarat Hospital for Women & Children'}
                </span>
              </div>

              <div className="cpt-preg-stat-box">
                <span className="cpt-preg-stat-label">Prenatal Genetic Testing Window</span>
                <b className="cpt-preg-stat-val" style={{ color: '#2563EB' }}>
                  Active (Weeks 11–14)
                </b>
                <span className="cpt-preg-stat-note">Chorionic Villus Sampling (CVS) eligible</span>
              </div>
            </div>

            {/* Trimester Timetable */}
            <div className="cpt-trimester-timeline">
              <div className="cpt-tri-col active">
                <div className="cpt-tri-head">
                  <b>1st Trimester (Weeks 1–12)</b>
                  <Badge tone="green">Current Phase</Badge>
                </div>
                <ul className="cpt-tri-list">
                  <li>✓ Obstetric registration and ultrasound dating</li>
                  <li>✓ Early prenatal genetic consultation with Dr. Mariam</li>
                  <li>• Optional CVS diagnostic window (Weeks 11–14)</li>
                </ul>
              </div>

              <div className="cpt-tri-col">
                <div className="cpt-tri-head">
                  <b>2nd Trimester (Weeks 13–27)</b>
                  <Badge tone="grey">Upcoming</Badge>
                </div>
                <ul className="cpt-tri-list">
                  <li>• Amniocentesis testing window (Weeks 15–18 if indicated)</li>
                  <li>• Fetal anomaly ultrasound scan (Weeks 18–22)</li>
                  <li>• Pediatric hematology coordination visit</li>
                </ul>
              </div>

              <div className="cpt-tri-col">
                <div className="cpt-tri-head">
                  <b>3rd Trimester (Weeks 28–40)</b>
                  <Badge tone="grey">Upcoming</Badge>
                </div>
                <ul className="cpt-tri-list">
                  <li>• Delivery hospital maternity protocol sign-off</li>
                  <li>• Cord blood sampling kit pre-stationed at delivery ward</li>
                  <li>• Pre-birth pediatric genetic intake briefed</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="cpt-locked-card">
            <div className="cpt-locked-icon-wrap">
              <Lock size={22} />
            </div>
            <h4 className="cpt-locked-title">Pregnancy Journey Unlocks at Stage 5</h4>
            <p className="cpt-locked-desc">
              This section is only available once the previous stages (Screening, Couple Assessment, Genetic Counselling, and Family Planning) are completed. Once a pregnancy is confirmed, gestational milestones, trimester health tracking, and time-critical prenatal testing windows (CVS and Amniocentesis) will activate here automatically.
            </p>
            <div className="cpt-locked-btn-row">
              <button
                type="button"
                className="btn-clean-sm btn-green-subtle"
                onClick={() => setShowPregnancyModal(true)}
              >
                Confirm Pregnancy Record Early →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: Birth & newborn records (Image 3 Section 6)                       */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <section id="section-birth" className="cpt-section-card">
        <div className="cpt-sec-header">
          <div>
            <span className="cpt-sec-tag">Section 6</span>
            <h3 className="cpt-sec-title">Birth & Newborn Records · سجل الولادة وفحوصات المولود</h3>
            <p className="cpt-sec-sub">
              Maternity delivery coordination, national newborn blood spot screening, and pediatric care handoff.
            </p>
          </div>
          {isBirthUnlocked && (
            <button
              type="button"
              className="btn-clean-sm btn-green-subtle"
              onClick={() => setShowBirthModal(true)}
            >
              <Baby size={14} /> Log Childbirth Details →
            </button>
          )}
        </div>

        {isBirthUnlocked ? (
          <div className="cpt-birth-grid">
            {/* Maternity Handover Status */}
            <div className="cpt-detail-card">
              <div className="cpt-card-top-badge">
                <Building size={16} color="#00843D" />
                <span>Maternity & Hospital Handover</span>
                <Badge tone="green">Ready</Badge>
              </div>

              <h4 className="cpt-card-h4">
                {plan.pregnancy?.deliveryHospital || 'Danat Al Emarat Hospital for Women & Children'}
              </h4>
              <dl className="cpt-dl">
                <dt>Expected Delivery</dt>
                <dd><b>{plan.pregnancy?.edd ? new Date(plan.pregnancy.edd).toLocaleDateString('en-GB') : '15 May 2027'}</b></dd>
                <dt>Labor Ward Alert</dt>
                <dd><Badge tone="green">Active · Cord blood sampling protocol alerted</Badge></dd>
                <dt>Clinical Handover</dt>
                <dd>Pre-authorized genomic dossier transferred to pediatric team with couple consent.</dd>
              </dl>
            </div>

            {/* Newborn Screening & Record */}
            <div className="cpt-detail-card">
              <div className="cpt-card-top-badge">
                <Baby size={16} color="#2563EB" />
                <span>Newborn Screening Record</span>
                <Badge tone={plan.childbirth?.delivered ? 'green' : 'amber'}>
                  {plan.childbirth?.delivered ? 'Verified' : 'Scheduled at Birth'}
                </Badge>
              </div>

              <h4 className="cpt-card-h4">
                {plan.childbirth?.delivered
                  ? `Baby ${plan.childbirth.babyName || 'Zayed'} Al Mansoori`
                  : 'National Newborn Screening Protocol (UAE DoH)'}
              </h4>
              <dl className="cpt-dl">
                <dt>Blood Spot Screen</dt>
                <dd>
                  <b>Extended Metabolic & Hemoglobinopathy Panel</b> · Heel-prick test completed at 48 hours.
                </dd>
                <dt>Cord Blood Confirmation</dt>
                <dd>Tested for parental <i>HBB</i> variants · Confirmatory results verified.</dd>
                <dt>Pediatric Follow-up</dt>
                <dd>Assigned to Sheikh Shakhbout Medical City (SSMC) Pediatric Care.</dd>
                <dt>Family Pedigree Link</dt>
                <dd>Child registered on generation (+1) node in the family health pedigree.</dd>
              </dl>
            </div>
          </div>
        ) : (
          <div className="cpt-locked-card">
            <div className="cpt-locked-icon-wrap">
              <Lock size={22} />
            </div>
            <h4 className="cpt-locked-title">Birth &amp; Newborn Records Unlock at Stage 6 &amp; 7</h4>
            <p className="cpt-locked-desc">
              This section is only available once previous pregnancy milestones are reached. During birth preparation (Stage 6), the hospital maternity handover dossier and labor-ward cord blood protocol will activate. Following delivery (Stage 7), the UAE National Newborn Screening records will be logged here.
            </p>
            <div className="cpt-locked-btn-row">
              <button
                type="button"
                className="btn-clean-sm btn-green-subtle"
                onClick={() => setShowBirthModal(true)}
              >
                <Baby size={14} /> Log Childbirth Details Early →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─── Pregnancy Modal ─── */}
      {showPregnancyModal && (
        <Dialog
          title="Update Gestational Age & Pregnancy Care"
          onClose={() => setShowPregnancyModal(false)}
          onSubmit={savePregnancy}
          footer={
            <>
              <button type="button" className="btn-line" onClick={() => setShowPregnancyModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-green-primary">
                Save Pregnancy Milestone
              </button>
            </>
          }
        >
          <p className="cpt-modal-intro">
            Recording your gestational age updates your care team and unlocks time-critical prenatal screening windows (e.g., CVS between weeks 11–14).
          </p>
          <div className="cpt-form-group">
            <label className="cpt-label">Current Gestational Age (Weeks)
              <input
                type="number"
                min="1"
                max="42"
                value={pregWeeks}
                onChange={(e) => setPregWeeks(e.target.value)}
                className="cpt-input"
                required
              />
            </label>
            <label className="cpt-label">Expected Delivery Date (EDD)
              <input
                type="date"
                value={pregEdd}
                onChange={(e) => setPregEdd(e.target.value)}
                className="cpt-input"
                required
              />
            </label>
            <label className="cpt-label">Delivery Hospital & Maternity Center
              <input
                type="text"
                value={deliveryHosp}
                onChange={(e) => setDeliveryHosp(e.target.value)}
                className="cpt-input"
                placeholder="e.g. Danat Al Emarat or SSMC"
                required
              />
            </label>
          </div>
        </Dialog>
      )}

      {/* ─── Childbirth Modal ─── */}
      {showBirthModal && (
        <Dialog
          title="Childbirth & Newborn Screening Milestone"
          onClose={() => setShowBirthModal(false)}
          onSubmit={saveBirth}
          footer={
            <>
              <button type="button" className="btn-line" onClick={() => setShowBirthModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-green-primary">
                Save Newborn Record
              </button>
            </>
          }
        >
          <p className="cpt-modal-intro">
            Congratulations on your newborn! Logging birth details links your baby’s pediatric care with the UAE National Newborn Screening Programme and coordinates cord blood confirmation.
          </p>
          <div className="cpt-form-group">
            <label className="cpt-label">Baby’s Name
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                className="cpt-input"
                placeholder="e.g. Zayed Al Mansoori"
                required
              />
            </label>
            <label className="cpt-label">Date of Birth
              <input
                type="date"
                value={babyDob}
                onChange={(e) => setBabyDob(e.target.value)}
                className="cpt-input"
                required
              />
            </label>
            <label className="cpt-label">Newborn Blood Spot Screening Status
              <select
                value={babyScreen}
                onChange={(e) => setBabyScreen(e.target.value)}
                className="cpt-input"
              >
                <option value="pending">Sample Collected · Awaiting Lab Results</option>
                <option value="completed">Completed & Verified Healthy</option>
                <option value="scheduled">Scheduled at Delivery Hospital</option>
              </select>
            </label>
          </div>
        </Dialog>
      )}

      {/* ─── Printable Summary Modal ─── */}
      {showPrintModal && (
        <Dialog
          title="Clinical Referral & Care Plan Slip"
          onClose={() => setShowPrintModal(false)}
          wide
          footer={
            <>
              <button type="button" className="btn-line" onClick={() => setShowPrintModal(false)}>
                Close
              </button>
              <button type="submit" className="btn btn-green-primary" onClick={handlePrint}>
                <Printer size={15} /> Print / Save PDF
              </button>
            </>
          }
        >
          <div className="cpt-print-slip" id="care-plan-print">
            <div className="cpt-slip-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#00843D' }}>DaNA · برنامج الرعاية الوراثية الشاملة</h3>
                <small style={{ color: '#64748B' }}>Department of Health Abu Dhabi · Malaffi HIE Integrated Dossier</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Ref: {plan.referrals?.[0]?.id || 'REF-2026-HBB-041'}</span>
                <br />
                <small style={{ color: '#64748B' }}>Generated: {new Date().toLocaleDateString('en-GB')}</small>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '14px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748B' }}>Couple:</span><br />
                <b>{me?.name || 'Khalid Al Mansoori'}</b> & <b>{partner?.name || 'Fatima Al Hammadi'}</b>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Identified Condition & Risk:</span><br />
                <b>{plan.condition}</b> · Tier {plan.tier}
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Assigned Counsellor:</span><br />
                <b>{plan.counsellor}</b> (Licensed Clinical Geneticist)
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Declared Reproductive Pathway:</span><br />
                <b>{plan.reproductivePathway?.selected || 'IVF with PGT-M'}</b> (Counsellor Approved)
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Destination Clinical Center:</span><br />
                <b>{plan.referrals?.[0]?.facility || 'Cleveland Clinic Abu Dhabi'}</b>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Current Journey Stage:</span><br />
                <b>Stage {plan.activeStageId || 3}: {CARE_PLAN_STAGES.find((s) => s.id === (plan.activeStageId || 3))?.title}</b>
              </div>
            </div>

            <h4 style={{ margin: '18px 0 8px 0', fontSize: 14, color: '#17201B' }}>7-Stage Care Roadmap Overview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11.5 }}>
              {CARE_PLAN_STAGES.map((s) => {
                const sItems = s.items.map((i) => i.id);
                const sDone = sItems.filter((id) => (plan.completedItems || []).includes(id)).length;
                return (
                  <div key={s.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 8, borderRadius: 6 }}>
                    <b>Stage {s.id}: {s.title}</b><br />
                    <span style={{ color: sDone === s.items.length ? '#16A34A' : '#64748B' }}>
                      {sDone === s.items.length ? '✓ Completed' : `${sDone}/${s.items.length} items`}
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={{ marginTop: 18, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
              * This clinical care plan is an authorized summary from the DaNA premarital genetic platform. It is valid for presentation at accredited UAE IVF centers, fetal medicine units, and maternity hospitals. All genomic records are governed under UAE Federal Decree-Law No. 49 of 2023.
            </p>
          </div>
        </Dialog>
      )}
    </Page>
  );
}

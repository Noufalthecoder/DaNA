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
  const { me, partner, result, couple, isConnected } = useCouple();
  const session = useStore((s) => s.session);
  const cid = couple?.id || session?.couple || 'c1';

  // Reactive plan state from store or service
  const storePlans = useStore((s) => s.carePlans);
  const plan = useMemo(() => {
    return storePlans?.[cid] || getCoupleCarePlan(cid);
  }, [storePlans, cid]);

  const progress = useMemo(() => computeCarePlanProgress(plan), [plan]);

  // Expanded stage state
  const [expandedStages, setExpandedStages] = useState({
    [plan.activeStageId || 3]: true,
    1: false,
    2: false,
    3: true,
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

  const toggleExpand = (stageId) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleToggleItem = (itemId) => {
    toggleCarePlanItem(cid, itemId);
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
      title="Personalised Care Plan"
      sub="مُتابِع خِطة الرعاية الشاملة · Continuous health roadmap from premarital screening to newborn care"
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
      {/* Overview Progress & Profile Header Card */}
      <section className="cpt-hero-card">
        <div className="cpt-hero-main">
          <div className="cpt-couple-badge">
            <span className="cpt-live-dot" />
            <span>{me?.short || 'Khalid'} & {partner?.short || 'Fatima'}</span>
            <span className="cpt-divider">·</span>
            <span className="cpt-cond-pill">{plan.condition || 'Beta-thalassaemia (HBB)'}</span>
            <span className="cpt-divider">·</span>
            <Badge tone="amber">Tier {plan.tier || 2} Clinical Priority</Badge>
          </div>
          <h2 className="cpt-hero-title">
            Your Family's Continuous Care Journey
          </h2>
          <p className="cpt-hero-sub">
            DaNA stays with you across every stage of family growth. Track your specialist referrals, counseling milestones, gestational checkpoints, and newborn screening protocols.
          </p>

          <div className="cpt-progress-container">
            <div className="cpt-progress-header">
              <span className="cpt-progress-label">Overall Journey Progress</span>
              <span className="cpt-progress-value">{progress}% Complete</span>
            </div>
            <div className="cpt-progress-track">
              <div
                className="cpt-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="cpt-stage-breadcrumbs">
              <span>Active Stage: <b>Stage {plan.activeStageId || 3} — {CARE_PLAN_STAGES.find((s) => s.id === (plan.activeStageId || 3))?.title}</b></span>
              <span className="cpt-muted-hint">7 Milestones · 23 Quality Checkpoints</span>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars Quick-Status Grid */}
        <div className="cpt-pillars-grid">
          {/* Pillar 1: Referral */}
          <div className="cpt-pillar-box">
            <div className="cpt-pillar-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <Hospital size={18} />
            </div>
            <div className="cpt-pillar-content">
              <span className="cpt-pillar-title">Specialist Referral</span>
              <b className="cpt-pillar-main">
                {plan.referrals?.[0]?.destination || 'IVF / PGT-M'}
              </b>
              <span className="cpt-pillar-meta">
                {plan.referrals?.[0]?.facility?.split('·')[0] || 'Cleveland Clinic Abu Dhabi'}
              </span>
              <div style={{ marginTop: 6 }}>
                <Badge tone="blue">Dispatched · Ref #{plan.referrals?.[0]?.id?.slice(0, 12) || 'REF-2026'}</Badge>
              </div>
            </div>
          </div>

          {/* Pillar 2: Follow-up */}
          <div className="cpt-pillar-box">
            <div className="cpt-pillar-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <Calendar size={18} />
            </div>
            <div className="cpt-pillar-content">
              <span className="cpt-pillar-title">Counsellor Follow-up</span>
              <b className="cpt-pillar-main">
                {plan.followUp?.doctor || 'Dr. Mariam Al Hosani'}
              </b>
              <span className="cpt-pillar-meta">
                10 Nov 2026 · 13:30 (Gulf Time)
              </span>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge tone="green">Confirmed</Badge>
                {plan.followUp?.meetLink && (
                  <a
                    href={plan.followUp.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="cpt-tiny-link"
                    title="Open Google Meet link"
                  >
                    <Video size={12} /> Video
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Pillar 3: Reproductive Options */}
          <div className="cpt-pillar-box">
            <div className="cpt-pillar-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
              <HeartHandshake size={18} />
            </div>
            <div className="cpt-pillar-content">
              <span className="cpt-pillar-title">Reproductive Pathway</span>
              <b className="cpt-pillar-main">
                {plan.reproductivePathway?.selected || 'IVF with embryo testing'}
              </b>
              <span className="cpt-pillar-meta">
                Declared & Counsellor Validated
              </span>
              <div style={{ marginTop: 6 }}>
                <Badge tone="green">Protocol Approved</Badge>
              </div>
            </div>
          </div>

          {/* Pillar 4: Voluntary Sila Invitation */}
          <div className="cpt-pillar-box">
            <div className="cpt-pillar-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Share2 size={18} />
            </div>
            <div className="cpt-pillar-content">
              <span className="cpt-pillar-title">Voluntary Sila Reach</span>
              <b className="cpt-pillar-main">
                {plan.silaStats?.alertsDispatched || 3} of {plan.silaStats?.relativesEligible || 5} Relatives
              </b>
              <span className="cpt-pillar-meta">
                1 Relative Booked · No IDs Shared
              </span>
              <div style={{ marginTop: 6 }}>
                <Badge tone="grey">Phone Numbers Purged</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 7 Stages Detailed Timeline */}
      <div className="cpt-timeline-wrapper">
        <div className="cpt-timeline-header">
          <div>
            <h3 className="cpt-timeline-h3">The 7 Stages of Your Personalised Care Journey</h3>
            <p className="cpt-timeline-sub">
              Every milestone is tracked with your care team. Check off completed items or click actions to launch corresponding tools.
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
                {/* Stage Header */}
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

                {/* Stage Body */}
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

                    {/* Stage Specific Action Buttons */}
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
      </div>

      {/* Pregnancy Tracking Modal */}
      {showPregnancyModal && (
        <Dialog
          title="Update Gestational & Pregnancy Care"
          onClose={() => setShowPregnancyModal(false)}
          onSubmit={savePregnancy}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setShowPregnancyModal(false)}
              >
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

      {/* Childbirth & Newborn Screening Modal */}
      {showBirthModal && (
        <Dialog
          title="Childbirth & Newborn Screening Milestone"
          onClose={() => setShowBirthModal(false)}
          onSubmit={saveBirth}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setShowBirthModal(false)}
              >
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

      {/* Printable Clinical Summary Modal */}
      {showPrintModal && (
        <Dialog
          title="Clinical Referral & Care Plan Slip"
          onClose={() => setShowPrintModal(false)}
          wide
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setShowPrintModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-green-primary"
                onClick={handlePrint}
              >
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

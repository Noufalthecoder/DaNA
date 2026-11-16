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
  Heart,
  PauseCircle,
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
import { COUNSELLORS } from '../shared/data.js';
import './PersonalisedPlanTracker.css';

function getStageRelationships(counsellorName = 'Dr. Mariam Al Hosani') {
  return [
    {
      fromId: 1,
      fromTitle: 'Stage 1: Screening & Discovery',
      toId: 2,
      toTitle: 'Stage 2: Couple Assessment',
      handover: 'Genetic Variants & Pedigrees',
      summary: 'Both partners complete individual sequencing (570 genes). Their carrier profiles and 3-generation pedigrees directly feed the Mendelian risk algorithm to determine compatibility.',
    },
    {
      fromId: 2,
      fromTitle: 'Stage 2: Couple Assessment',
      toId: 3,
      toTitle: 'Stage 3: Genetic Counselling',
      handover: 'Clinical Consultation Triage',
      summary: `Identifying shared recessive traits auto-triages the couple to accredited genetic counsellor ${counsellorName}.`,
    },
    {
      fromId: 3,
      fromTitle: 'Stage 3: Genetic Counselling',
      toId: 4,
      toTitle: 'Stage 4: Family Planning',
      handover: 'Approved Care Protocol',
      summary: 'Counsellor approves personalized Reproductive Care Plan, enabling informed choice between IVF with PGT-M or natural conception with prenatal monitoring.',
    },
    {
      fromId: 4,
      fromTitle: 'Stage 4: Family Planning',
      toId: 5,
      toTitle: 'Stage 5: Pregnancy Journey',
      handover: 'Conception & Gestational Trigger',
      summary: 'Selecting conception route and confirming pregnancy automatically transitions the care team from preconception planning into active gestational tracking.',
    },
    {
      fromId: 5,
      fromTitle: 'Stage 5: Pregnancy Journey',
      toId: 6,
      toTitle: 'Stage 6: Birth Preparation',
      handover: 'Prenatal Genomics & Hospital Alert',
      summary: 'Prenatal diagnostic tests (CVS at 11–14w or Amniocentesis at 15–20w) verify fetal genetics and transmit delivery handover dossier to Danat Al Emarat labor ward.',
    },
    {
      fromId: 6,
      fromTitle: 'Stage 6: Birth Preparation',
      toId: 7,
      toTitle: 'Stage 7: Newborn Records',
      handover: 'Delivery & Newborn Blood Spot Protocol',
      summary: 'Childbirth activates UAE DoH National Newborn Blood Spot Screening (Day 2 heel-prick test) and registers the infant on the (+1) node in the family pedigree.',
    },
  ];
}

export default function PersonalisedPlanTracker() {
  const { me, partner, result, couple } = useCouple();
  const session = useStore((s) => s.session);
  const cid = couple?.id || session?.couple || 'c1';

  // Reactive plan state from store or service
  const storePlans = useStore((s) => s.carePlans);
  const storeReferrals = useStore((s) => s.referrals);
  const scheduleAppointments = useStore((s) => s.scheduleAppointments);
  const coupleCounsellors = useStore((s) => s.coupleCounsellors);
  const storeApproved = useStore((s) => s.approved);
  const connections = useStore((s) => s.connections);
  const screeningIntakes = useStore((s) => s.screeningIntakes);

  const plan = useMemo(() => {
    return getCoupleCarePlan(cid);
  }, [cid, storePlans, storeReferrals, scheduleAppointments, coupleCounsellors, storeApproved, connections, screeningIntakes]);

  const lockedDoctor = useStore((s) => s.coupleCounsellors?.[cid]);
  const caseDoctor = useStore((s) => s.cases?.[cid]?.counsellor);
  const dedicatedDoctor = lockedDoctor || plan.counsellor || caseDoctor || 'Dr. Mariam Al Hosani';
  const counsellorObj = useMemo(() => {
    return COUNSELLORS.find((c) => c.name === dedicatedDoctor) || COUNSELLORS[0];
  }, [dedicatedDoctor]);

  const activeAppt = useMemo(() => {
    const coupleAppts = (scheduleAppointments || []).filter((a) => a.cid === cid);
    return coupleAppts.find((a) => a.confirmed === true || a.status === 'confirmed' || a.priority === 'upcoming') || coupleAppts[0] || null;
  }, [scheduleAppointments, cid]);

  const formatDateLabel = (d) => {
    if (!d) return '';
    if (typeof d === 'string' && d.includes('-')) {
      const parts = d.split('-');
      if (parts.length === 3) {
        const [y, m, day] = parts;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(m, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return `${parseInt(day, 10)} ${months[mIdx]} ${y}`;
        }
      }
    }
    return d;
  };

  const progress = useMemo(() => computeCarePlanProgress(plan), [plan]);
  const stageRelationships = useMemo(() => getStageRelationships(dedicatedDoctor), [dedicatedDoctor]);

  // Section availability / milestone gates:
  // 1. Stage 3 (Genetic Counselling) Confirmation:
  // Once Stage 3 is confirmed (counselling completed, plan approved, or referrals dispatched), specialist referrals & family planning unlock.
  const isStage3Confirmed = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 4 ||
      plan.counsellingCompleted === true ||
      (plan.referrals && plan.referrals.length > 0) ||
      (storeReferrals?.[cid] && storeReferrals[cid].length > 0) ||
      plan.completedItems?.includes('approved_care_plan') ||
      plan.completedItems?.includes('follow_up_referrals') ||
      plan.completedItems?.includes('plan_approved') ||
      plan.completedItems?.includes('referral_coordinated')
    );
  }, [plan.activeStageId, plan.counsellingCompleted, plan.referrals, storeReferrals, cid, plan.completedItems]);

  const isPregnancyUnlocked = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 5 ||
      !!plan.pregnancy?.isPregnant ||
      plan.familyPlanningChoice === 'pregnant' ||
      !!plan.completedItems?.includes('pregnancy_confirmation')
    );
  }, [plan.activeStageId, plan.pregnancy?.isPregnant, plan.familyPlanningChoice, plan.completedItems]);

  const isBirthUnlocked = useMemo(() => {
    return (
      (plan.activeStageId || 1) >= 6 ||
      !!plan.childbirth?.delivered ||
      !!plan.completedItems?.includes('birth_details')
    );
  }, [plan.activeStageId, plan.childbirth?.delivered, plan.completedItems]);

  // Section navigation state
  const [activeSection, setActiveSection] = useState('lifecycle');

  // Expanded stages state: all 7 stages open & accessible
  const [expandedStages, setExpandedStages] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
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
  const [selectedPrintReferral, setSelectedPrintReferral] = useState(null);

  // Form states without mock defaults
  const [pregWeeks, setPregWeeks] = useState(plan.pregnancy?.weeks || '');
  const [pregEdd, setPregEdd] = useState(plan.pregnancy?.edd || '');
  const [deliveryHosp, setDeliveryHosp] = useState(plan.pregnancy?.deliveryHospital || '');
  const [babyName, setBabyName] = useState(plan.childbirth?.babyName || '');
  const [babyDob, setBabyDob] = useState(plan.childbirth?.birthDate || '');
  const [babyScreen, setBabyScreen] = useState(plan.childbirth?.newbornScreenStatus || 'pending');

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

  const handleSelectSituation = (situationKey) => {
    if (situationKey === 'pregnant') {
      setShowPregnancyModal(true);
      saveCoupleCarePlan(cid, {
        familyPlanningChoice: 'pregnant',
        completedItems: Array.from(new Set([
          ...(plan.completedItems || []),
          'chosen_conception_pathway',
        ])),
      }, 'Declared pregnancy in Stage 4 Family Planning');
    } else {
      saveCoupleCarePlan(cid, {
        familyPlanningChoice: situationKey,
        completedItems: Array.from(new Set([
          ...(plan.completedItems || []),
          'chosen_conception_pathway',
        ])),
      }, `Selected family planning situation: ${situationKey}`);
    }
  };

  const savePregnancy = (e) => {
    e.preventDefault();
    updatePregnancyMilestone(cid, {
      isPregnant: true,
      weeks: Number(pregWeeks) || 0,
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
          className={`cpt-nav-btn ${activeSection === 'family-planning' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('family-planning')}
        >
          Stage 4. Family planning
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'pregnancy' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('pregnancy')}
        >
          5. Pregnancy journey
        </button>
        <button
          type="button"
          className={`cpt-nav-btn ${activeSection === 'birth' ? 'is-active' : ''}`}
          onClick={() => scrollToSection('birth')}
        >
          6. Birth & newborn records
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

        {/* 7-Stage Care Protocol Matrix Table */}
        <div style={{ marginTop: 28, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>
                7-Stage Care Protocol Matrix · جدول خطة الرعاية الوراثية الشاملة
              </h4>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                Structured lifecycle oversight across screening, counselling, conception, gestation, and newborn care.
              </p>
            </div>
            <Badge tone="blue">Stage {plan.activeStageId || 3} of 7 Active</Badge>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ width: '45px', padding: '10px 8px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Clinical Stage</th>
                  <th style={{ padding: '10px 12px' }}>Domain</th>
                  <th style={{ padding: '10px 12px' }}>Checkpoints</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Clinical Deliverable</th>
                </tr>
              </thead>
              <tbody>
                {CARE_PLAN_STAGES.filter((stg) => isPregnancyUnlocked || stg.id <= 4).map((stg) => {
                  const completedCount = stg.items.filter((it) => plan.completedItems?.includes(it.id)).length;
                  const totalCount = stg.items.length;
                  const isDone = stg.id < (plan.activeStageId || 3);
                  const isCurrent = stg.id === (plan.activeStageId || 3);

                  return (
                    <tr
                      key={stg.id}
                      style={{
                        background: isCurrent ? 'rgba(0, 132, 61, 0.04)' : undefined,
                        borderBottom: '1px solid #E2E8F0',
                      }}
                    >
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isDone ? '#00843D' : isCurrent ? '#FFFFFF' : '#F1F5F9',
                          color: isDone ? '#FFFFFF' : isCurrent ? '#00843D' : '#64748B',
                          border: isCurrent ? '2px solid #00843D' : '1px solid #CBD5E1',
                        }}>
                          {isDone ? '✓' : stg.id}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <b>{stg.title}</b>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{stg.titleAr}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          background: stg.tag ? 'rgba(0, 132, 61, 0.1)' : '#F1F5F9',
                          color: stg.tag ? '#00843D' : '#475569',
                        }}>
                          {stg.tag || 'Clinical'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <b>{completedCount}</b> / {totalCount} completed
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isDone ? (
                          <Badge tone="green">Completed</Badge>
                        ) : isCurrent ? (
                          <Badge tone="amber">Active Focus</Badge>
                        ) : (
                          <Badge tone="blue">Unlocked</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#475569', fontSize: '12.5px' }}>
                        {stg.id === 1 && 'Individual genetic sequencing and pedigree generation complete.'}
                        {stg.id === 2 && 'Mendelian compatibility evaluated; carrier risk calculated.'}
                        {stg.id === 3 && 'Telehealth genetic counselling session & care protocol approval.'}
                        {stg.id === 4 && 'Preconception pathway chosen & IVF/PGT-M referral dispatched.'}
                        {stg.id === 5 && 'Gestational age tracking & CVS/Amniocentesis testing windows.'}
                        {stg.id === 6 && 'Danat Al Emarat maternity handover dossier & cord blood alert.'}
                        {stg.id === 7 && 'UAE DoH newborn blood spot screening & SSMC pediatric care handoff.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lifecycle Continuity: How the 7 Stages Connect */}
          <div className="cpt-relationship-card">
            <div className="cpt-relationship-header">
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0', color: '#0F172A' }}>
                  Lifecycle Continuity: How the 7 Stages Connect · ترابط مراحل الرعاية الوراثية
                </h4>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Clinical handover deliverables passing from premarital screening through to newborn care.
                </p>
              </div>
              <Badge tone="green">7 Handover Pathways</Badge>
            </div>

            <div className="cpt-rel-pathway">
              {stageRelationships.map((rel) => (
                <div key={rel.fromId} className="cpt-rel-row">
                  <div className="cpt-rel-badge-col">
                    <span className="cpt-rel-step-pill">Stage {rel.fromId} → {rel.toId}</span>
                    <div className="cpt-rel-arrow">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                  <div className="cpt-rel-content">
                    <div className="cpt-rel-title-line">
                      <span className="cpt-rel-stage-name">{rel.fromTitle} ➔ {rel.toTitle}</span>
                      <span className="cpt-rel-handover-tag">Handover: {rel.handover}</span>
                    </div>
                    <p className="cpt-rel-desc">{rel.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          {CARE_PLAN_STAGES.filter((stage) => isPregnancyUnlocked || stage.id <= 4).map((stage) => {
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
                        <div style={{ marginTop: 12, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Stethoscope size={15} color="#00843D" />
                            <b style={{ fontSize: '13px', color: '#0F172A' }}>Genetic Counselling with {dedicatedDoctor}</b>
                            <Badge tone="amber">Mandatory Checkpoints</Badge>
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0' }}>
                            All 5 checkpoints (Booking, Session completion, Recommendations, Care plan sign-off, and Referrals) are mandatory before advancing to Family Planning.
                          </p>
                          <div className="cpt-stage-footer-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                            <a href="#/app/counsellor" className="btn-clean-sm btn-green-subtle">
                              Book / Manage Counsellor Session →
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
                          </div>
                        </div>
                      )}
                      {stage.id === 4 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12, width: '100%' }}>
                          <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                            Family Planning Pathway · اختيار المسار الإنجابي
                          </h5>
                          <div className="cpt-situation-grid">
                            <div
                              className={`cpt-situation-card ${plan.familyPlanningChoice === 'planning_to_conceive' ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSituation('planning_to_conceive')}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="cpt-situation-icon-wrap"><Heart size={18} color="#00843D" /></div>
                              <div style={{ flex: 1 }}>
                                <b className="cpt-situation-title">Planning to conceive</b>
                                <p className="cpt-situation-desc">Track preconception care and relevant appointments.</p>
                              </div>
                              {plan.familyPlanningChoice === 'planning_to_conceive' && <CheckCircle2 size={18} color="#00843D" />}
                            </div>

                            <div
                              className={`cpt-situation-card ${plan.pregnancy?.isPregnant || plan.familyPlanningChoice === 'pregnant' ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSituation('pregnant')}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="cpt-situation-icon-wrap"><Baby size={18} color="#00843D" /></div>
                              <div style={{ flex: 1 }}>
                                <b className="cpt-situation-title">I'm pregnant</b>
                                <p className="cpt-situation-desc">Activate pregnancy tracking and record details.</p>
                              </div>
                              {(plan.pregnancy?.isPregnant || plan.familyPlanningChoice === 'pregnant') && <CheckCircle2 size={18} color="#00843D" />}
                            </div>

                            <div
                              className={`cpt-situation-card ${plan.familyPlanningChoice === 'not_planning' ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSituation('not_planning')}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="cpt-situation-icon-wrap"><Calendar size={18} color="#475569" /></div>
                              <div style={{ flex: 1 }}>
                                <b className="cpt-situation-title">Not planning currently</b>
                                <p className="cpt-situation-desc">Keep your journey open for later.</p>
                              </div>
                              {plan.familyPlanningChoice === 'not_planning' && <CheckCircle2 size={18} color="#00843D" />}
                            </div>

                            <div
                              className={`cpt-situation-card ${plan.familyPlanningChoice === 'deferred' ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSituation('deferred')}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="cpt-situation-icon-wrap"><Clock size={18} color="#475569" /></div>
                              <div style={{ flex: 1 }}>
                                <b className="cpt-situation-title">Decision deferred</b>
                                <p className="cpt-situation-desc">Continue when you are ready.</p>
                              </div>
                              {plan.familyPlanningChoice === 'deferred' && <CheckCircle2 size={18} color="#00843D" />}
                            </div>
                          </div>
                        </div>
                      )}
                      {stage.id === 5 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12, width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {plan.pregnancy?.isPregnant
                                ? `Gestational Age: ${plan.pregnancy.weeks ? `${plan.pregnancy.weeks} Weeks` : 'Recorded'} · EDD: ${plan.pregnancy.edd ? new Date(plan.pregnancy.edd).toLocaleDateString('en-GB') : 'Not set'}`
                                : 'No active pregnancy recorded · Tap to enter details'}
                            </span>
                            <button
                              type="button"
                              className="btn-clean-sm btn-green-subtle"
                              onClick={() => setShowPregnancyModal(true)}
                            >
                              {plan.pregnancy?.isPregnant ? 'Update Pregnancy Record →' : 'Record Pregnancy Details →'}
                            </button>
                          </div>
                        </div>
                      )}
                      {stage.id === 6 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12, width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {plan.pregnancy?.deliveryHospital || plan.pregnancy?.edd
                                ? `Hospital: ${plan.pregnancy?.deliveryHospital || 'Pending'} · EDD: ${plan.pregnancy?.edd ? new Date(plan.pregnancy.edd).toLocaleDateString('en-GB') : 'Pending'}`
                                : 'Delivery hospital and EDD pending confirmation'}
                            </span>
                            <button
                              type="button"
                              className="btn-clean-sm"
                              onClick={() => setShowPregnancyModal(true)}
                            >
                              Set EDD & Delivery Provider →
                            </button>
                          </div>
                        </div>
                      )}
                      {stage.id === 7 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12, width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {plan.childbirth?.delivered
                                ? `Baby: ${plan.childbirth?.babyName || 'Delivered'} · Born: ${plan.childbirth?.birthDate || 'Recorded'} · Screen: ${plan.childbirth?.newbornScreenStatus || 'Pending'}`
                                : 'Childbirth details and national newborn screening awaiting delivery'}
                            </span>
                            <button
                              type="button"
                              className="btn-clean-sm btn-green-subtle"
                              onClick={() => setShowBirthModal(true)}
                            >
                              <Baby size={14} /> Log Childbirth Details →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
      {showPrintModal && (() => {
        const printRef = selectedPrintReferral || plan.referrals?.[0];
        return (
          <Dialog
            title="Clinical Referral & Care Plan Slip"
            onClose={() => {
              setShowPrintModal(false);
              setSelectedPrintReferral(null);
            }}
            wide
            footer={
              <>
                <button type="button" className="btn-line" onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPrintReferral(null);
                }}>
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
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Ref: {printRef?.id || 'REF-2026-HBB-041'}</span>
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
                  <span style={{ color: '#64748B' }}>Clinical Referral Destination:</span><br />
                  <b>{printRef?.destination || plan.reproductivePathway?.selected || 'IVF with PGT-M'}</b>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Destination Clinical Center:</span><br />
                  <b>{printRef?.facility || 'Cleveland Clinic Abu Dhabi'}</b>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Current Journey Stage:</span><br />
                  <b>Stage {plan.activeStageId || 3}: {CARE_PLAN_STAGES.find((s) => s.id === (plan.activeStageId || 3))?.title}</b>
                </div>
                {printRef?.reason && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748B' }}>Clinical Referral Reason & Indication:</span><br />
                    <b>{printRef.reason}</b>
                  </div>
                )}
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
        );
      })()}
    </Page>
  );
}

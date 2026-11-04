import { Page, Card, Badge, Steps } from '../shared/ui.jsx';
import { set, useStore } from '../shared/store.js';
import { useCouple } from './useCouple.js';
import { IconPartner, IconArrowRight } from '../shared/Icons.jsx';

const OPTIONS = [
  {
    id: 'IVF with embryo testing (PGT-M)',
    d: 'Embryos are tested before pregnancy via PGT-M so only unaffected ones are implanted.',
    tags: ['Before pregnancy', 'Counsellor-led', 'UAE Accredited Clinics'],
  },
  {
    id: 'Prenatal diagnostic testing',
    d: 'Natural conception followed by CVS or amniocentesis early in pregnancy to confirm fetal status.',
    tags: ['During pregnancy', 'Early confirmation'],
  },
  {
    id: 'Proceed fully informed',
    d: 'Conceive naturally with dedicated paediatric and haematology support from day one.',
    tags: ['Your choice, respected', 'Clinical follow-up'],
  },
];

const TIMELINE = [
  'Premarital Screening Done',
  'Partner Connected',
  'Joint Assessment Complete',
  'Counsellor Consultation',
  'Family Plan Established',
];

export default function Bonds() {
  const { result, partner, me, isConnected } = useCouple();
  const plan = useStore((s) => s.plan);
  const booked = useStore((s) => s.booked);

  const choose = (id) => set({ plan: id }, `Couple chose reproductive plan: ${id}`);

  // Calculate current step in timeline
  const currentStep = !isConnected ? 1 : !plan ? 2 : !booked ? 3 : 4;

  return (
    <Page
      title="Bonds · الروابط"
      sub={
        isConnected
          ? `Premarital partner assessment for ${me.short} & ${partner.short}. Compatible, with a plan.`
          : 'Connect with your premarital partner to evaluate combined reproductive genetic risks.'
      }
    >
      {/* Shared Couple Journey Timeline */}
      <Card title="Shared Journey Timeline">
        <Steps items={TIMELINE} current={currentStep} />
      </Card>

      {isConnected && result ? (
        <>
          {/* Condition-Specific Genetic Assessment */}
          <Card
            title="Condition-Specific Genetic Assessment"
            aside={<Badge tone={result.priority === 'high' || result.priority === 'urgent' ? 'amber' : 'green'}>{result.label}</Badge>}
          >
            <p className="lead-in">
              {result.type === 'plan' ? (
                <>
                  Both you and {partner.short} carry one copy of the <b>{result.gene}</b> gene variant linked to <b>{result.condition}</b> (Autosomal Recessive).
                </>
              ) : result.type === 'xlinked' ? (
                <>
                  X-linked variant detected for <b>{result.gene}</b> ({result.condition}). Risk applies specifically to male offspring.
                </>
              ) : result.type === 'carrier' ? (
                <>
                  One partner carries a variant in <b>{result.gene}</b> ({result.condition}). The reproductive risk is equivalent to general population baseline.
                </>
              ) : (
                <>
                  No shared variants were detected between you and {partner.short} across the screened Abu Dhabi panel.
                </>
              )}
            </p>

            <div className="odds">
              {[
                ['Unaffected (25%)', 'clear'],
                ['Carrier, healthy (25%)', 'carrier'],
                ['Carrier, healthy (25%)', 'carrier'],
                ['Affected (25%)', 'affected'],
              ].map(([t, c], i) => (
                <div key={i} className={`odd ${c}`}>
                  <span />
                  {t}
                </div>
              ))}
            </div>

            <div className="assessment-explanation-box">
              <h4>Mendelian Inheritance Breakdown:</h4>
              <ul className="facts">
                <li><b>75% chance in each pregnancy</b> of having a healthy child (unaffected or healthy carrier).</li>
                <li><b>25% chance in each pregnancy</b> of the child inheriting both copies and having {result.condition || 'the condition'}.</li>
                <li><b>Independent probabilities:</b> Each pregnancy has the exact same odds, regardless of previous outcomes.</li>
                <li><b>DaNA never says "do not marry":</b> You are <em>compatible, with a plan</em>.</li>
              </ul>
            </div>
          </Card>

          {/* Reproductive Options */}
          <h2 className="sec-h">Reproductive Options, Side by Side</h2>
          <div className="options">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                className={`option ${plan === o.id ? 'on' : ''}`}
                onClick={() => choose(o.id)}
              >
                <h3>{o.id}</h3>
                <p>{o.d}</p>
                <div>
                  {o.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <span className="pick">{plan === o.id ? '✓ Our Selected Plan' : 'Choose this option'}</span>
              </button>
            ))}
          </div>

          {/* Counsellor Guidance */}
          <Card title="Counselling & Next Steps">
            <div className="booked">
              <div>
                <p>
                  <b>Discuss this assessment with Dr. Mariam Al Hosani:</b> Ask questions about PGT-M, prenatal testing, or UAE healthcare coverage for your selected plan.
                </p>
                <small className="muted">
                  {booked ? `Your session is booked for ${booked}.` : 'Clinical appointments are free for UAE couples.'}
                </small>
              </div>
              <a className="btn" href="#/app/counsellor">
                {booked ? 'Manage Appointment →' : 'Book Counsellor Session →'}
              </a>
            </div>
          </Card>
        </>
      ) : (
        <Card title="Connect Partner to Begin Joint Assessment">
          <div className="conn-empty-state">
            <div className="conn-privacy-shield">
              <IconPartner size={24} />
            </div>
            <h3>No Partner Connected Yet</h3>
            <p className="muted">
              Joint genetic compatibility assessment requires connecting with your partner. Search their username or unique DaNA ID in Connections to start.
            </p>
            <a className="btn" href="#/app/connections">
              <span>Go to Connections Hub</span>
              <IconArrowRight size={14} />
            </a>
          </div>
        </Card>
      )}

      <p className="disclaimer">
        DaNA provides deterministic clinical genetics education; it does not replace individualized clinical counselling. All plans are reviewed with licensed genetic counsellors.
      </p>
    </Page>
  );
}

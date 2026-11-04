import { useState } from 'react';
import { Page, Card, Badge, Stat } from '../shared/ui.jsx';
import { useCouple } from './useCouple.js';
import { IconPartner, IconArrowRight } from '../shared/Icons.jsx';

export default function Roots() {
  const { me, partner, gene, isConnected } = useCouple();
  const [playing, setPlaying] = useState(false);
  const [lang, setLang] = useState('ar');

  return (
    <Page
      title="Roots · الجذور"
      sub="Understand your individual genetic screening results and inheritance patterns."
    >
      <div className="stats">
        <Stat label="Screening Status" value="Complete" note="Malaffi HIE verified" />
        <Stat label="Genes Screened" value="570" note="Abu Dhabi premarital panel" />
        <Stat label="Your Status" value={gene ? 'Carrier' : 'Clear'} note={gene ? gene.symbol : 'No variants'} />
      </div>

      <Card
        title="Your Individual Genetic Report"
        aside={<Badge tone={gene ? 'amber' : 'green'}>{gene ? 'Healthy Carrier' : 'Clear'}</Badge>}
      >
        {gene ? (
          <>
            <p className="lead-in">
              You carry one variant copy of the <b>{gene.symbol}</b> gene, associated with <b>{gene.condition}</b> (Autosomal Recessive).
            </p>

            <div className="genes" aria-label="Two gene copies: one working, one changed">
              <div><span className="copy ok" />Working copy (functional)</div>
              <div><span className="copy changed" />Variant copy (changed)</div>
            </div>

            <div className="assessment-explanation-box">
              <h4>What Being a Carrier Means:</h4>
              <ul className="facts">
                <li><b>You are healthy:</b> Carriers do not develop the condition because your working copy produces sufficient protein.</li>
                <li><b>It is extremely common:</b> Approximately 1 in 10 individuals in the UAE carries a genetic variant like this.</li>
                <li><b>Reproductive relevance:</b> It only affects future children if your reproductive partner carries a variant in the <em>same</em> gene.</li>
                <li><b>Family cascade relevance:</b> Your siblings each have an estimated 50% chance of carrying this same variant.</li>
              </ul>
            </div>
          </>
        ) : (
          <p className="lead-in">
            No reportable pathogenic variants were found across the screened Abu Dhabi panel.
          </p>
        )}

        {/* Audio Briefing / Voice Notes (UAE Dialect) */}
        <div className="audio-voice-box">
          <div className="audio-header">
            <span className="audio-icon">🎙️</span>
            <div>
              <strong>Audio Explanation: What Your Result Means</strong>
              <small className="muted" style={{ display: 'block' }}>
                Recorded by UAE Genetic Counsellor Dr. Mariam Al Hosani
              </small>
            </div>
            <div className="lang-toggle-pills" style={{ marginLeft: 'auto' }}>
              <button
                className={`pill-btn ${lang === 'ar' ? 'active' : ''}`}
                onClick={() => setLang('ar')}
              >
                العربية (إماراتي)
              </button>
              <button
                className={`pill-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                English
              </button>
            </div>
          </div>

          <div className="audio-controls-row">
            <button
              className="audio-play-btn"
              onClick={() => setPlaying(!playing)}
            >
              {playing ? '⏸ Pause Briefing' : '▶ Play Counsellor Audio (1:45)'}
            </button>
            <span className="audio-duration muted">
              {playing ? 'Playing: Emirati dialect · 44.1kHz' : 'Verified Clinical Audio · Department of Health'}
            </span>
          </div>

          {playing && (
            <div className="audio-transcript-box">
              <p>
                {lang === 'ar'
                  ? 'مرحباً، أنا الدكتورة مريم الحوسني. فحصك الوراثي يوضح أنك حامل لطفرة جين HBB (الثلاسيميا). كونك حاملاً للمرض يعني أنك سليم تماماً ولا تظهر عليك أي أعراض، وهذا أمر شائع جداً في مجتمعنا. الخطوة المهمة هي مقارنة النتيجة مع شريك حياتك في قسم الروابط لنحدد الخطة الأنسب لمستقبلكم الصحي.'
                  : 'Welcome, I am Dr. Mariam Al Hosani. Your genetic screening indicates that you are a healthy carrier of an HBB variant. Being a carrier means you are completely healthy with no symptoms, and this is very common in our community. The key next step is comparing results with your partner in Bonds to establish your joint family plan.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* PARTNER'S REPORT STATUS */}
      <Card
        title={`${partner.short}’s Result Status`}
        aside={
          <Badge tone={isConnected ? 'green' : 'grey'}>
            {isConnected ? '✓ Connected' : 'Not Connected'}
          </Badge>
        }
      >
        {isConnected ? (
          <div className="partner-revealed-box">
            <p>
              You and {partner.short} are connected on DaNA. Because you both carry <b>{gene?.symbol || 'HBB'}</b>, your premarital compatibility risk has been assessed.
            </p>
            <p className="muted">
              You can explore combined probabilities and family options in the Bonds dashboard.
            </p>
            <a className="btn btn-sm" href="#/app/bonds">
              View Combined Assessment in Bonds →
            </a>
          </div>
        ) : (
          <div className="clinical-protected-box">
            <div className="protected-lock-icon">
              <IconPartner size={24} />
            </div>
            <div className="protected-text">
              <strong>Partner Not Yet Connected</strong>
              <p>
                Connect with your partner in the Connections hub to compare results and calculate joint reproductive odds.
              </p>
              <a className="link" href="#/app/connections">
                <span>Connect with partner in Connections</span>
                <IconArrowRight size={14} />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* CASCADE SCREENING CALLOUT */}
      <Card title="Protect Your Siblings & Relatives">
        <p className="lead-in">
          Since you carry the <b>{gene?.symbol || 'HBB'}</b> variant, each of your full siblings has a 50% chance of carrying the same gene.
        </p>
        <p className="muted">
          DaNA’s anonymous <strong>Sila alerts</strong> allow you to invite relatives to premarital screening privately without revealing your name or condition.
        </p>
        <a className="btn-soft" href="#/app/branches">
          Go to Branches & Sila Alerts →
        </a>
      </Card>

      <p className="disclaimer">
        DaNA premarital explanations are based on deterministic clinical guidelines. Data is synchronized directly with your official Malaffi laboratory record.
      </p>
    </Page>
  );
}

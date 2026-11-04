import { useState } from 'react';
import { useCouple } from './useCouple.js';
import { useStore } from '../shared/store.js';
import { go } from '../shared/router.js';
import { Brand } from '../shared/Logo.jsx';

/* ─── SVG: Proper amber DNA double-helix icon ─── */
function DnaHelixIcon({ size = 34, color = '#D97706' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      {/* Top arc — strand A */}
      <path d="M6 4 C10 4 14 7 18 7 C22 7 26 4 30 4" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Top arc — strand B */}
      <path d="M6 8 C10 8 14 11 18 11 C22 11 26 8 30 8" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.55" />
      {/* Cross-rung 1 */}
      <line x1="11" y1="5.5" x2="11" y2="9.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="7" x2="18" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="5.5" x2="25" y2="9.5" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Middle arc — strand A */}
      <path d="M6 14 C10 14 14 17 18 17 C22 17 26 14 30 14" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Middle arc — strand B */}
      <path d="M6 18 C10 18 14 21 18 21 C22 21 26 18 30 18" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.55" />
      {/* Cross-rung 2 */}
      <line x1="11" y1="15.5" x2="11" y2="19.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="17" x2="18" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="15.5" x2="25" y2="19.5" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {/* Bottom arc — strand A */}
      <path d="M6 24 C10 24 14 27 18 27 C22 27 26 24 30 24" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Bottom arc — strand B */}
      <path d="M6 28 C10 28 14 31 18 31 C22 31 26 28 30 28" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.55" />
      {/* Cross-rung 3 */}
      <line x1="11" y1="25.5" x2="11" y2="29.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="27" x2="18" y2="31" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="25.5" x2="25" y2="29.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── SVG: Medical illustration (clipboard + DNA + shield-heart + leaves) ─── */
function MedicalIllustration() {
  return (
    <svg width="310" height="230" viewBox="0 0 310 230" fill="none" aria-hidden="true">
      {/* Background soft circles */}
      <circle cx="210" cy="110" r="95" fill="#E8F5EC" />
      <circle cx="255" cy="70" r="52" fill="#D1F2D9" opacity="0.65" />
      <circle cx="175" cy="155" r="40" fill="#C6F0D4" opacity="0.4" />

      {/* DNA Double Helix — right side */}
      <path d="M262 10 Q290 55 265 100 Q240 145 268 185" stroke="#4ADE80" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M282 10 Q252 55 265 100 Q278 145 250 185" stroke="#86EFAC" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray="6 8" />
      {/* Helix rungs */}
      <line x1="264" y1="30" x2="280" y2="28" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="258" y1="55" x2="282" y2="55" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="257" y1="80" x2="278" y2="82" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="260" y1="110" x2="275" y2="108" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="254" y1="140" x2="275" y2="142" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="258" y1="165" x2="274" y2="167" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {/* Clipboard body */}
      <rect x="98" y="38" width="98" height="128" rx="12" fill="#FFFFFF" stroke="#4ADE80" strokeWidth="2.8" />
      {/* Clipboard top clip */}
      <rect x="128" y="28" width="38" height="20" rx="6" fill="#16A34A" />
      <circle cx="147" cy="33" r="4" fill="#FFFFFF" />
      {/* Clipboard top shadow line */}
      <line x1="98" y1="58" x2="196" y2="58" stroke="#E8F5EC" strokeWidth="1.5" />

      {/* Row 1 */}
      <circle cx="118" cy="80" r="7" fill="#D1FAE5" />
      <path d="M115 80 l2.5 2.5 4-4" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="130" y="77" width="52" height="6" rx="3" fill="#E2E8F0" />

      {/* Row 2 */}
      <circle cx="118" cy="104" r="7" fill="#D1FAE5" />
      <path d="M115 104 l2.5 2.5 4-4" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="130" y="101" width="44" height="6" rx="3" fill="#E2E8F0" />

      {/* Row 3 */}
      <circle cx="118" cy="128" r="7" fill="#D1FAE5" />
      <path d="M115 128 l2.5 2.5 4-4" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="130" y="125" width="38" height="6" rx="3" fill="#E2E8F0" />

      {/* Shield with heart — overlapping lower right of clipboard */}
      <path
        d="M182 118 C182 118 205 123 208 143 C208 161 182 175 182 175 C182 175 156 161 156 143 C159 123 182 118 182 118 Z"
        fill="#16A34A"
        stroke="#15803D"
        strokeWidth="2.5"
      />
      {/* Heart inside shield */}
      <path
        d="M182 149 C180 144 173.5 143.5 171 147.5 C168 153 182 161 182 161 C182 161 196 153 193 147.5 C190.5 143.5 184 144 182 149 Z"
        fill="#FFFFFF"
      />

      {/* Botanical leaves — lower left */}
      <path d="M82 148 C82 148 95 134 112 139 C112 139 108 157 82 148 Z" fill="#4ADE80" />
      <path d="M72 170 C72 170 86 158 102 165 C102 165 96 182 72 170 Z" fill="#22C55E" />
      <path d="M86 190 C86 190 103 182 110 196 C110 196 97 205 86 190 Z" fill="#16A34A" />
      {/* Leaf stems */}
      <line x1="86" y1="148" x2="99" y2="142" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="78" y1="170" x2="92" y2="162" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/* ─── SVG: Heart with ECG wave ─── */
function HeartEcgIcon({ size = 28, color = '#16A34A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <polyline points="7.5,13 9.5,13 10.5,10 12,15.5 13.5,11 14.5,13 16.5,13" strokeWidth="1.9" />
    </svg>
  );
}

/* ─── SVG: Two people / family icon ─── */
function FamilyIcon({ size = 28, color = '#0284C7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="6.5" r="3" />
      <path d="M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" />
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2-3.17" />
    </svg>
  );
}

/* ─── SVG: Calendar with dots ─── */
function CalendarDotsIcon({ size = 28, color = '#7C3AED' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="8" cy="14.5" r="1.3" fill={color} stroke="none" />
      <circle cx="12" cy="14.5" r="1.3" fill={color} stroke="none" />
      <circle cx="16" cy="14.5" r="1.3" fill={color} stroke="none" />
      <circle cx="8" cy="18.5" r="1.3" fill={color} stroke="none" />
      <circle cx="12" cy="18.5" r="1.3" fill={color} stroke="none" />
    </svg>
  );
}

/* ─── SVG: Blood drop icon ─── */
function DropIcon({ size = 24, color = '#DC2626' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

/* ─── SVG: Open book ─── */
function BookOpenIcon({ size = 20, color = '#16A34A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

/* ─── SVG: Arrow left ─── */
function ArrowLeftIcon({ size = 16, color = '#374151' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* ─── SVG: Arrow right ─── */
function ArrowRightIcon({ size = 16, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── SVG: Check circle ─── */
function CheckCircleIcon({ size = 17, color = '#16A34A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path fillRule="evenodd" d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm4.707-12.293a1 1 0 0 0-1.414-1.414L10 13.586l-2.293-2.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l6-6z" clipRule="evenodd" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function MedicalReport() {
  const { me, gene } = useCouple();
  const session = useStore((s) => s.session);
  const [showDetails, setShowDetails] = useState(false);

  const userName = session?.name || me?.name || 'Khalid Al Mansoori';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'KM';

  const geneCondition = gene?.condition || 'Beta-thalassaemia';
  const geneSymbol = gene?.symbol || 'HBB';

  /* ─── shared style tokens ─── */
  const S = {
    page: {
      minHeight: '100vh',
      background: '#FAFBFA',
      color: '#111827',
      fontFamily: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    wrap: {
      maxWidth: 1400,
      margin: '0 auto',
      padding: '0 52px 72px',
      boxSizing: 'border-box',
    },
  };

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <header
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '20px 52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          borderBottom: '1px solid #E8EDE9',
          marginBottom: 0,
        }}
      >
        <Brand size={34} href="#/" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#D1F2D9',
              color: '#0D7939',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.03em',
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: '#111827' }}>{userName}</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={S.wrap}>

        {/* ── Hero row: Heading (left) + Illustration (right) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            marginBottom: 0,
            paddingTop: 32,
          }}
        >
          {/* Left: Title + Subtitle + Banner */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#111827',
                margin: '0 0 8px',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Your Screening Results
            </h1>
            <p
              style={{
                fontSize: 17,
                color: '#6B7280',
                margin: '0 0 28px',
                fontWeight: 400,
                lineHeight: 1.4,
              }}
            >
              A simple explanation of what your report means for you.
            </p>

            {/* ── Cream Result Banner ── */}
            <div
              style={{
                background: '#FEF6E3',
                border: '1px solid #FDE68A',
                borderRadius: 20,
                padding: '28px 36px',
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                boxShadow: '0 2px 8px rgba(251, 191, 36, 0.10)',
              }}
            >
              {/* Amber squircle DNA icon */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: '#FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <DnaHelixIcon size={38} color="#D97706" />
              </div>

              {/* Thin divider */}
              <div style={{ width: 1, height: 60, background: '#F6D86A', flexShrink: 0 }} />

              {/* Banner text */}
              <div>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#111827',
                    margin: '0 0 7px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  You are a Carrier
                </h2>
                <p
                  style={{
                    fontSize: 15.5,
                    color: '#4B5563',
                    margin: 0,
                    lineHeight: 1.55,
                    maxWidth: 540,
                  }}
                >
                  We found a change in 1 gene. You are healthy, but this is important information for future family planning.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Decorative illustration — floats beside heading */}
          <div
            style={{
              flexShrink: 0,
              width: 310,
              marginTop: -8,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
            }}
          >
            <MedicalIllustration />
          </div>
        </div>

        {/* ── Three Info Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            marginTop: 24,
            marginBottom: 36,
          }}
        >
          {/* Card 1: Green — What does this mean for me? */}
          <div
            style={{
              background: '#EFF8F1',
              border: '1px solid #DCFCE7',
              borderRadius: 20,
              padding: '26px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#C8F0D4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HeartEcgIcon size={28} color="#16A34A" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '3px 0 8px',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                What does this mean for me?
              </h3>
              <p style={{ fontSize: 14.5, color: '#374151', lineHeight: 1.55, margin: 0 }}>
                You are generally healthy.<br />
                No treatment is needed.
              </p>
            </div>
          </div>

          {/* Card 2: Sky blue — Future family */}
          <div
            style={{
              background: '#EDF7FD',
              border: '1px solid #BAE6FD',
              borderRadius: 20,
              padding: '26px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FamilyIcon size={28} color="#0284C7" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '3px 0 8px',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                What does this mean for my future family?
              </h3>
              <p style={{ fontSize: 14.5, color: '#374151', lineHeight: 1.55, margin: 0 }}>
                If your partner is also a carrier of the same gene, there is{' '}
                <span
                  style={{
                    background: '#BBF7D0',
                    color: '#14532D',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 5,
                    fontSize: 13.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  1 in 4 (25%)
                </span>{' '}
                chance that a child could be affected.
              </p>
            </div>
          </div>

          {/* Card 3: Purple — What should I do now? */}
          <div
            style={{
              background: '#F5F3FE',
              border: '1px solid #DDD6FE',
              borderRadius: 20,
              padding: '26px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: '#DDD6FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarDotsIcon size={28} color="#7C3AED" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '3px 0 10px',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                What should I do now?
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  'Consider partner screening',
                  'Talk to a genetic counsellor',
                  'Plan together with the right guidance',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: '#374151' }}>
                    <CheckCircleIcon size={17} color="#16A34A" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Your Finding ── */}
        <h2
          style={{
            fontSize: 23,
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
          }}
        >
          Your Finding
        </h2>

        {/* ── Finding Card ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 20,
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Left: Blood drop icon + condition name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 260, flexShrink: 0 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DropIcon size={26} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                {geneCondition} ({geneSymbol})
              </div>
              <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.4 }}>
                A common inherited blood condition.
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 54, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Centre: Book icon + explanation */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
            <div style={{ paddingTop: 2, flexShrink: 0 }}>
              <BookOpenIcon size={22} color="#16A34A" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A', marginBottom: 5 }}>
                In simple terms
              </div>
              <div style={{ fontSize: 14.5, color: '#4B5563', lineHeight: 1.55 }}>
                You carry a change in the {geneSymbol} gene. Carriers are usually healthy and do not have the disease.
              </div>
            </div>
          </div>

          {/* Right: Learn more button */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: showDetails ? '#D1F5DC' : '#EBF6EE',
              color: '#0D7939',
              border: '1.5px solid #B0E6C0',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              flexShrink: 0,
              transition: 'background 0.15s ease',
              letterSpacing: '-0.01em',
            }}
          >
            Learn more
            <ArrowRightIcon size={15} color="#0D7939" />
          </button>
        </div>

        {/* Learn More Expanded Detail */}
        {showDetails && (
          <div
            style={{
              marginTop: 12,
              padding: '20px 28px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              fontSize: 14.5,
              color: '#374151',
              lineHeight: 1.65,
            }}
          >
            <h4 style={{ fontSize: 15.5, fontWeight: 700, margin: '0 0 7px', color: '#111827' }}>
              Clinical Guidance &amp; Abu Dhabi Department of Health Notes
            </h4>
            <p style={{ margin: 0 }}>
              Beta-thalassaemia is an autosomal recessive haemoglobinopathy. Being a carrier means you carry one mutated HBB allele. You do not have the clinical disease, but if your partner is also a carrier of a beta-globin mutation, every pregnancy has a 25% chance of inheriting both mutated copies. Free genetic counselling and reproductive pathway guidance are provided by the Abu Dhabi Department of Health.
            </p>
          </div>
        )}

        {/* ── Bottom Action Bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 44,
            paddingTop: 12,
          }}
        >
          <button
            type="button"
            onClick={() => go('/app/screening')}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #D1D5DB',
              borderRadius: 12,
              padding: '13px 26px',
              fontSize: 15,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <ArrowLeftIcon size={16} color="#374151" />
            Back to Screening
          </button>

          <button
            type="button"
            onClick={() => go('/app')}
            style={{
              background: '#0D7939',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 100,
              padding: '15px 36px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(13, 121, 57, 0.30)',
              transition: 'opacity 0.15s, transform 0.1s',
              letterSpacing: '-0.01em',
            }}
          >
            Continue to Dashboard
            <ArrowRightIcon size={17} color="#fff" />
          </button>
        </div>
      </main>
    </div>
  );
}

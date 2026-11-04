import { useState } from 'react';
import { useCouple } from './useCouple.js';
import { useStore } from '../shared/store.js';
import { go } from '../shared/router.js';
import { Brand } from '../shared/Logo.jsx';

export default function MedicalReport() {
  const { me, partner, gene } = useCouple();
  const session = useStore((s) => s.session);
  const [showDetails, setShowDetails] = useState(false);

  // User display name & initials
  const userName = session?.name || me.name || 'Khalid Al Mansoori';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'KM';

  // Gene and carrier finding
  const isCarrier = me.carrier !== null && me.carrier !== undefined;
  const geneSymbol = gene?.symbol || 'HBB';
  const geneCondition = gene?.condition || 'Beta-thalassaemia';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFBFA',
        color: '#111827',
        fontFamily: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          width: '100%',
          maxWidth: 1536,
          margin: '0 auto',
          padding: '18px 50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Brand size={32} href="#/" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#D1F2D9',
              color: '#0D7939',
              fontWeight: 700,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.02em',
            }}
          >
            {userInitials}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            {userName}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          maxWidth: 1536,
          margin: '0 auto',
          padding: '10px 50px 60px',
          boxSizing: 'border-box',
        }}
      >
        {/* Large Heading & Subtitle */}
        <div style={{ marginBottom: 26 }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: '#111827',
              margin: '0 0 6px',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Your Screening Results
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#4B5563',
              margin: 0,
              fontWeight: 400,
            }}
          >
            A simple explanation of what your report means for you.
          </p>
        </div>

        {/* Wide Horizontal Cream-Coloured Result Banner */}
        <section
          style={{
            background: '#FEF6E3',
            border: '1px solid #FDE68A',
            borderRadius: 20,
            padding: '24px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 28,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Left Text & Icon Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, zIndex: 2, flex: 1 }}>
            {/* DNA Icon Squircle */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: '#FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round">
                <path d="M4 4c2.5 3 5 4 8 4s5.5-1 8-4" />
                <path d="M4 20c2.5-3 5-4 8-4s5.5 1 8 4" />
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
                <circle cx="12" cy="12" r="2.2" fill="#D97706" />
              </svg>
            </div>

            {/* Subtle Divider Line */}
            <div style={{ width: 1, height: 56, background: '#F3E8C8', flexShrink: 0 }} />

            {/* Banner Text */}
            <div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#111827',
                  margin: '0 0 6px',
                  letterSpacing: '-0.015em',
                }}
              >
                You are a Carrier
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: '#4B5563',
                  margin: 0,
                  maxWidth: 560,
                  lineHeight: 1.5,
                }}
              >
                We found a change in 1 gene. You are healthy, but this is important information for future family planning.
              </p>
            </div>
          </div>

          {/* Right Decorative Medical Illustration */}
          <div
            style={{
              flexShrink: 0,
              width: 280,
              height: 150,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              zIndex: 1,
            }}
          >
            <svg width="270" height="150" viewBox="0 0 270 150" fill="none">
              {/* Soft Radial Glow / Backdrop */}
              <circle cx="175" cy="75" r="72" fill="#E6F7EC" />
              <circle cx="215" cy="50" r="42" fill="#D1F2D9" opacity="0.6" />

              {/* Looping 3D-styled DNA Double Helix */}
              <path
                d="M190 12 Q225 45 205 78 T228 142"
                stroke="#6EE7B7"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M218 12 Q180 45 205 78 T182 142"
                stroke="#A7F3D0"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="5 7"
              />
              {/* Helix Crossbars */}
              <line x1="196" y1="28" x2="212" y2="28" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              <line x1="200" y1="60" x2="212" y2="60" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              <line x1="192" y1="96" x2="214" y2="96" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              <line x1="190" y1="126" x2="222" y2="126" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

              {/* Medical Clipboard Body */}
              <g transform="translate(108, 16)">
                {/* Board */}
                <rect x="0" y="8" width="76" height="106" rx="10" fill="#FFFFFF" stroke="#48BB78" strokeWidth="2.5" />
                {/* Top Clip */}
                <rect x="20" y="0" width="36" height="16" rx="5" fill="#15803D" />
                <circle cx="38" cy="5" r="3" fill="#FFFFFF" />

                {/* 3 Checkmark Rows */}
                {/* Row 1 */}
                <circle cx="16" cy="32" r="5" fill="#E6F7EC" />
                <path d="M13.5 32l2 2 3.5-3.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="26" y1="32" x2="60" y2="32" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

                {/* Row 2 */}
                <circle cx="16" cy="52" r="5" fill="#E6F7EC" />
                <path d="M13.5 52l2 2 3.5-3.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="26" y1="52" x2="56" y2="52" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

                {/* Row 3 */}
                <circle cx="16" cy="72" r="5" fill="#E6F7EC" />
                <path d="M13.5 72l2 2 3.5-3.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="26" y1="72" x2="50" y2="72" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* Medical Shield with Heart */}
              <g transform="translate(156, 68)">
                <path
                  d="M24 0C24 0 42 4 45 22C45 38 24 50 24 50C24 50 3 38 3 22C6 4 24 0 24 0Z"
                  fill="#10B981"
                  stroke="#047857"
                  strokeWidth="2.5"
                />
                {/* Heart inside Shield */}
                <path
                  d="M24 23.5C22 19.5 17 19 15 22.5C12.5 27.5 24 34.5 24 34.5C24 34.5 35.5 27.5 33 22.5C31 19 26 19.5 24 23.5Z"
                  fill="#FFFFFF"
                />
              </g>

              {/* Botanical Green Leaves */}
              <path d="M96 90C96 90 104 76 118 80C118 80 116 96 96 90Z" fill="#34D399" />
              <path d="M88 108C88 108 98 98 110 104C110 104 105 118 88 108Z" fill="#10B981" />
              <path d="M98 124C98 124 112 116 118 128C118 128 106 136 98 124Z" fill="#047857" />
            </svg>
          </div>
        </section>

        {/* Three Equally Sized Horizontal Information Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Card 1: Green */}
          <div
            style={{
              background: '#EFF8F1',
              border: '1px solid #DCFCE7',
              borderRadius: 18,
              padding: '24px 22px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minHeight: 125,
              boxSizing: 'border-box',
            }}
          >
            {/* Heart ECG Wave Icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#D1F2D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0D7939" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 20.67l7.65-7.66.77-.78a5.4 5.4 0 0 0 0-7.65z" />
                <path d="M8.5 12h2l1-2.5 1.5 5 1-2.5h2" stroke="#0D7939" strokeWidth="2.2" />
              </svg>
            </div>

            <div>
              <h3
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '2px 0 6px',
                  letterSpacing: '-0.01em',
                }}
              >
                What does this mean for me?
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#374151',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                You are generally healthy.<br />
                No treatment is needed.
              </p>
            </div>
          </div>

          {/* Card 2: Light Blue / Teal */}
          <div
            style={{
              background: '#EDF7FD',
              border: '1px solid #E0F2FE',
              borderRadius: 18,
              padding: '24px 22px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minHeight: 125,
              boxSizing: 'border-box',
            }}
          >
            {/* Couple / Family Icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#CEEAF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

            <div>
              <h3
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '2px 0 6px',
                  letterSpacing: '-0.01em',
                }}
              >
                What does this mean for my future family?
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#374151',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                If your partner is also a carrier of the same gene, there is{' '}
                <span
                  style={{
                    background: '#C4EED0',
                    color: '#0C6B32',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  1 in 4 (25%)
                </span>{' '}
                chance that a child could be affected.
              </p>
            </div>
          </div>

          {/* Card 3: Light Purple */}
          <div
            style={{
              background: '#F5F3FE',
              border: '1px solid #EDE9FE',
              borderRadius: 18,
              padding: '24px 22px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minHeight: 125,
              boxSizing: 'border-box',
            }}
          >
            {/* Calendar Icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#DDD6FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1.2" fill="#6D28D9" />
                <circle cx="12" cy="14" r="1.2" fill="#6D28D9" />
                <circle cx="16" cy="14" r="1.2" fill="#6D28D9" />
                <circle cx="8" cy="18" r="1.2" fill="#6D28D9" />
                <circle cx="12" cy="18" r="1.2" fill="#6D28D9" />
              </svg>
            </div>

            <div>
              <h3
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '2px 0 8px',
                  letterSpacing: '-0.01em',
                }}
              >
                What should I do now?
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: 6,
                  fontSize: 13.5,
                  color: '#374151',
                }}
              >
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#0D7939">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Consider partner screening</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#0D7939">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Talk to a genetic counsellor</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#0D7939">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Plan together with the right guidance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section Heading: Your Finding */}
        <div style={{ marginBottom: 16 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.015em',
            }}
          >
            Your Finding
          </h2>
        </div>

        {/* Wide Horizontal White Finding Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 18,
            padding: '22px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            boxSizing: 'border-box',
          }}
        >
          {/* Left: Red Icon & Condition Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 280 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#DC2626">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                Beta-thalassaemia (HBB)
              </div>
              <div style={{ fontSize: 14, color: '#6B7280' }}>
                A common inherited blood condition.
              </div>
            </div>
          </div>

          {/* Subtle Vertical Divider */}
          <div style={{ width: 1, height: 50, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Centre: Green Book Icon & Explanation */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 320 }}>
            <div style={{ paddingTop: 2, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7939" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: '#0D7939', marginBottom: 4 }}>
                In simple terms
              </div>
              <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>
                You carry a change in the HBB gene. Carriers are usually healthy and do not have the disease.
              </div>
            </div>
          </div>

          {/* Right: Learn More Button */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: '#EBF6EE',
              color: '#0D7939',
              border: '1px solid #C4EED0',
              borderRadius: 10,
              padding: '11px 22px',
              fontSize: 14.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            Learn more →
          </button>
        </div>

        {/* Detailed Modal/Drawer for Learn More */}
        {showDetails && (
          <div
            style={{
              marginTop: 14,
              padding: '20px 24px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.6,
            }}
          >
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: '#111827' }}>
              Clinical Guidance & Abu Dhabi Department of Health Notes
            </h4>
            <p style={{ margin: 0 }}>
              Beta-thalassaemia is an autosomal recessive haemoglobinopathy. Being a carrier means you carry one mutated HBB allele. You do not have the clinical disease, but if your fiancé/partner is also a carrier of a beta-globin mutation, every pregnancy has a 25% chance of inheriting both mutated copies. Free genetic counselling and reproductive pathway guidance are provided by the Abu Dhabi Department of Health.
            </p>
          </div>
        )}

        {/* Bottom Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 36,
            paddingTop: 10,
          }}
        >
          {/* Outlined Back to Screening Button */}
          <button
            type="button"
            onClick={() => go('/app/screening')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14.5,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.15s ease',
            }}
          >
            ← Back to Screening
          </button>

          {/* Solid Green Continue to Dashboard Button */}
          <button
            type="button"
            onClick={() => go('/app')}
            style={{
              background: '#0D7939',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '13px 28px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(13, 121, 57, 0.28)',
              transition: 'opacity 0.15s ease',
            }}
          >
            Continue to Dashboard →
          </button>
        </div>
      </main>
    </div>
  );
}

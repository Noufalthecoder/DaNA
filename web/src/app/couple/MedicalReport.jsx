import { useState } from 'react';
import { useCouple } from './useCouple.js';
import { go } from '../shared/router.js';

export default function MedicalReport() {
  const { me, partner, gene } = useCouple();
  const [showDetails, setShowDetails] = useState(false);

  // Gene and carrier information
  const isCarrier = !!me.carrier;
  const conditionName = gene ? `${gene.condition} (${gene.symbol})` : 'Beta-thalassaemia (HBB)';
  const geneSymbol = gene ? gene.symbol : 'HBB';

  const conditionDetails = {
    HBB: {
      name: 'Beta-thalassaemia (HBB)',
      subtitle: 'A common inherited blood condition.',
      simple: 'You carry a change in the HBB gene. Carriers are usually healthy and do not have the disease.',
      learn: 'Beta-thalassaemia is an autosomal recessive condition affecting haemoglobin production in red blood cells. As a carrier (thalassaemia minor), your body produces slightly smaller red blood cells, which is harmless and requires no medical treatment. If your partner also carries a beta-globin variant, comprehensive premarital counselling and pre-implantation or prenatal testing options are available under Abu Dhabi Department of Health guidelines.',
    },
    GJB2: {
      name: 'Inherited Hearing Loss (GJB2)',
      subtitle: 'A genetic condition affecting inner ear development.',
      simple: 'You carry a change in the GJB2 gene. Carriers have normal hearing and no medical complications.',
      learn: 'GJB2 encodes the Connexin 26 protein vital for inner ear potassium homeostasis. Carriers are completely unaffected. Autosomal recessive inheritance occurs only if both prospective parents carry a pathogenic GJB2 variant.',
    },
    SMN1: {
      name: 'Spinal Muscular Atrophy (SMN1)',
      subtitle: 'An inherited neuromuscular condition.',
      simple: 'You carry a change in the SMN1 gene. Carriers do not experience muscle weakness or symptoms.',
      learn: 'SMN1 variants affect motor neuron survival. As an asymptomatic carrier, no treatment or restrictions apply. If both partners are carriers, DoH clinical genetics protocols provide full reproductive planning support.',
    },
    CFTR: {
      name: 'Cystic Fibrosis (CFTR)',
      subtitle: 'An inherited condition affecting mucous and sweat glands.',
      simple: 'You carry a change in the CFTR gene. Carriers live healthy lives with normal lung and digestive function.',
      learn: 'CFTR regulates epithelial ion transport. Being a carrier causes no health complications. Reproductive counselling evaluates partner carrier status to calculate joint offspring risk.',
    },
    G6PD: {
      name: 'G6PD Deficiency (G6PD)',
      subtitle: 'An X-linked enzymatic red blood cell condition.',
      simple: 'You carry a change in the G6PD gene. Avoid certain triggers like fava beans or specific medications.',
      learn: 'G6PD deficiency is an X-linked enzymopathy common in the Arabian Gulf. Maintaining an updated list of oxidant triggers protects against acute hemolytic episodes.',
    },
  };

  const activeFinding = conditionDetails[geneSymbol] || conditionDetails.HBB;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'var(--body, sans-serif)', color: '#111827' }}>
      {/* Title Section */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--head, Outfit, sans-serif)', fontSize: 32, fontWeight: 800, margin: '0 0 6px', color: '#111827', letterSpacing: '-0.02em' }}>
          Your Screening Results
        </h1>
        <p style={{ fontSize: 16, color: '#4B5563', margin: 0 }}>
          A simple explanation of what your report means for you.
        </p>
      </div>

      {/* Hero Banner Card */}
      <div
        style={{
          background: isCarrier ? 'linear-gradient(135deg, #FFFDF0 0%, #FFFBEB 60%, #F0FDF4 100%)' : '#F0FDF4',
          border: isCarrier ? '1px solid #FEF08A' : '1px solid #BBF7D0',
          borderRadius: 20,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ flex: 1, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: isCarrier ? '#FEF3C7' : '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isCarrier ? (
                /* Amber DNA Helix Icon */
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M4 4c2 3 5 4 8 4s6-1 8-4" />
                  <path d="M4 20c2-3 5-4 8-4s6 1 8 4" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                  <circle cx="12" cy="12" r="2" fill="#D97706" />
                </svg>
              ) : (
                /* Green Check Icon */
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--head, Outfit, sans-serif)', fontSize: 23, fontWeight: 700, margin: 0, color: '#111827' }}>
                {isCarrier ? 'You are a Carrier' : 'No Pathogenic Variants Detected'}
              </h2>
            </div>
          </div>

          <p style={{ fontSize: 14.5, color: '#4B5563', lineHeight: 1.55, margin: 0, maxWidth: 540 }}>
            {isCarrier
              ? 'We found a change in 1 gene. You are healthy, but this is important information for future family planning.'
              : 'Your premarital genetic test showed no harmful changes across the 570+ screened conditions. You have low residual risk.'}
          </p>
        </div>

        {/* Clinical Illustration */}
        <div style={{ flexShrink: 0, width: 220, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="210" height="135" viewBox="0 0 210 135" fill="none">
            {/* Glowing Backdrop */}
            <circle cx="130" cy="70" r="58" fill="#ECFDF5" />
            <circle cx="165" cy="50" r="35" fill="#E0F2FE" opacity="0.6" />

            {/* Stylized DNA Helix loops behind */}
            <path
              d="M145 20 Q170 45 155 70 T175 120"
              stroke="#A7F3D0"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="4 6"
            />
            <path
              d="M165 20 Q140 45 155 70 T135 120"
              stroke="#6EE7B7"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Clipboard Body */}
            <rect x="75" y="24" width="62" height="84" rx="8" fill="#FFFFFF" stroke="#6EE7B7" strokeWidth="2.5" />
            {/* Clipboard Top Clip */}
            <rect x="91" y="16" width="30" height="14" rx="4" fill="#047857" />
            <circle cx="106" cy="20" r="2.5" fill="#FFFFFF" />

            {/* Clipboard Content Lines with Checkmarks */}
            <circle cx="89" cy="42" r="3.5" fill="#10B981" />
            <line x1="97" y1="42" x2="123" y2="42" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" />

            <circle cx="89" cy="56" r="3.5" fill="#10B981" />
            <line x1="97" y1="56" x2="120" y2="56" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" />

            <circle cx="89" cy="70" r="3.5" fill="#10B981" />
            <line x1="97" y1="70" x2="116" y2="70" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" />

            {/* Shield with Heart */}
            <g transform="translate(118, 56)">
              <path
                d="M20 2C20 2 34 5 36 18C36 32 20 42 20 42C20 42 4 32 4 18C6 5 20 2 20 2Z"
                fill="#10B981"
                stroke="#047857"
                strokeWidth="2"
              />
              {/* White Heart inside Shield */}
              <path
                d="M20 18.5C18.5 15.5 14 15 12.5 18C10.5 22 20 27.5 20 27.5C20 27.5 29.5 22 27.5 18C26 15 21.5 15.5 20 18.5Z"
                fill="#FFFFFF"
              />
            </g>

            {/* Botanical Green Leaves */}
            <path d="M60 76C60 76 66 65 78 68C78 68 76 80 60 76Z" fill="#34D399" />
            <path d="M54 90C54 90 62 82 72 87C72 87 68 98 54 90Z" fill="#10B981" />
            <path d="M62 104C62 104 74 98 78 108C78 108 68 114 62 104Z" fill="#059669" />
          </svg>
        </div>
      </div>

      {/* 3-Column Explanatory Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Card 1: What does this mean for me? */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #DCFCE7',
            borderRadius: 16,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#DCFCE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            {/* Heart ECG Wave */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 20.67l7.65-7.66.77-.78a5.4 5.4 0 0 0 0-7.65z" />
              <path d="M8.5 12h2l1-2.5 1.5 5 1-2.5h2" stroke="#059669" strokeWidth="2" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            What does this mean for me?
          </h3>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, margin: 0 }}>
            {isCarrier ? (
              <>
                You are generally healthy.<br />
                No treatment is needed.
              </>
            ) : (
              <>
                Your results are within normal ranges.<br />
                No genetic risks identified.
              </>
            )}
          </p>
        </div>

        {/* Card 2: What does this mean for my future family? */}
        <div
          style={{
            background: '#F0FDFA',
            border: '1px solid #CCFBF1',
            borderRadius: 16,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#CCFBF1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            {/* Couple / Family Icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            What does this mean for my future family?
          </h3>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, margin: 0 }}>
            {isCarrier ? (
              <>
                If your partner is also a carrier of the same gene, there is{' '}
                <span style={{ background: '#D1FAE5', color: '#047857', fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                  1 in 4 (25%)
                </span>{' '}
                chance that a child could be affected.
              </>
            ) : (
              <>
                There is a very low chance of passing on the screened conditions to your future children.
              </>
            )}
          </p>
        </div>

        {/* Card 3: What should I do now? */}
        <div
          style={{
            background: '#FAF5FF',
            border: '1px solid #F3E8FF',
            borderRadius: 16,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#F3E8FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            {/* Calendar Icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8" cy="14" r="1" fill="#7C3AED" />
              <circle cx="12" cy="14" r="1" fill="#7C3AED" />
              <circle cx="16" cy="14" r="1" fill="#7C3AED" />
              <circle cx="8" cy="18" r="1" fill="#7C3AED" />
              <circle cx="12" cy="18" r="1" fill="#7C3AED" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: '#111827' }}>
            What should I do now?
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 7, fontSize: 13.5, color: '#374151' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="#059669">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Consider partner screening</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="#059669">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Talk to a genetic counsellor</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="#059669">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Plan together with the right guidance</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Your Finding Section */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px', color: '#111827' }}>
          Your Finding
        </h3>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Condition Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {/* Red Blood Droplet Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#DC2626">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#111827' }}>
                {activeFinding.name}
              </div>
              <div style={{ fontSize: 13.5, color: '#6B7280' }}>
                {activeFinding.subtitle}
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: 1, height: 44, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Middle: In simple terms */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              {/* Open Book Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#059669' }}>
                In simple terms
              </span>
            </div>
            <div style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.5 }}>
              {activeFinding.simple}
            </div>
          </div>

          {/* Right: Learn more button */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {showDetails ? 'Hide details' : 'Learn more →'}
          </button>
        </div>

        {/* Expandable Clinical Summary */}
        {showDetails && (
          <div
            style={{
              marginTop: 12,
              padding: '18px 22px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.6,
            }}
          >
            <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 6px', color: '#111827' }}>
              Clinical Guidance & Malaffi Genomic Data
            </h4>
            <p style={{ margin: 0 }}>
              {activeFinding.learn}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 32,
          paddingTop: 16,
          borderTop: '1px solid #E5E7EB',
          gap: 16,
        }}
      >
        <button
          type="button"
          onClick={() => go('/app/screening')}
          style={{
            background: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: 10,
            padding: '12px 22px',
            fontSize: 14.5,
            fontWeight: 600,
            color: '#374151',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          ← Back to Screening
        </button>

        <button
          type="button"
          onClick={() => go('/app')}
          style={{
            background: '#047857',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            padding: '12px 26px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(4, 120, 87, 0.28)',
            transition: 'opacity 0.15s ease',
          }}
        >
          Continue to Dashboard →
        </button>
      </div>
    </div>
  );
}

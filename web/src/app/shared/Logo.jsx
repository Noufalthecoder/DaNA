/* Reusable DaNA Brand Logo & Emblem. Consistent across Landing, App Shell, Screening, and Auth. */
export function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="96 120 320 260"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path
        fill="#00843D"
        d="M120 196 C 118 300, 178 352, 256 352 C 338 352, 398 296, 392 176 C 391 168, 384 166, 382 174 C 376 270, 326 316, 256 316 C 190 316, 142 278, 132 196 C 131 186, 121 186, 120 196 Z"
      />
      <circle
        cx="256"
        cy="214"
        r="44"
        fill="#ffffff"
        stroke="#CE1126"
        strokeWidth="10"
      />
    </svg>
  );
}

export function Brand({ size = 32, withArabic = false, href = '#/', className = '', style = {} }) {
  const content = (
    <span
      className={`dana-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        ...style,
      }}
    >
      <Logo size={size} />
      <span
        className="dana-brand-text"
        style={{
          fontFamily: 'var(--head, Outfit, sans-serif)',
          fontWeight: 800,
          fontSize: Math.max(19, Math.round(size * 0.72)),
          color: 'var(--green, #00843D)',
          letterSpacing: '0.2px',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          lineHeight: 1,
        }}
      >
        <span>
          D<span style={{ color: 'var(--red, #CE1126)', fontWeight: 600 }}>a</span>NA
        </span>
        {withArabic && (
          <span
            className="ar"
            style={{
              fontFamily: 'var(--ar, Tajawal, sans-serif)',
              color: 'var(--ink3, #8A958F)',
              fontWeight: 700,
              fontSize: '0.88em',
              marginLeft: 4,
            }}
          >
            دانة
          </span>
        )}
      </span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="dana-brand-link" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    );
  }

  return content;
}

/* Original chibi (cute anime-style) avatars, drawn as SVG. Owner: Platform.
   Stored on the account as "c:<id>", e.g. "c:w1". */

const SKIN = { light: '#FBE0CC', mid: '#EFC4A0', tan: '#D9A27A' };

export const CHIBIS = [
  // women
  { id: 'w1', label: 'Rose hijab', sex: 'F', bg: '#FDE7EE', skin: 'light', head: 'hijab', cloth: '#E8829E', eyes: 'open' },
  { id: 'w2', label: 'Lavender hijab', sex: 'F', bg: '#EFE8FB', skin: 'mid', head: 'hijab', cloth: '#A98BDB', eyes: 'happy' },
  { id: 'w3', label: 'Mint hijab', sex: 'F', bg: '#E3F6EE', skin: 'light', head: 'hijab', cloth: '#5DBB97', eyes: 'wink' },
  { id: 'w4', label: 'Navy hijab', sex: 'F', bg: '#E4ECF8', skin: 'tan', head: 'hijab', cloth: '#3D5A8A', eyes: 'open' },
  { id: 'w5', label: 'Sand hijab', sex: 'F', bg: '#FAF0E1', skin: 'mid', head: 'hijab', cloth: '#C9A06B', eyes: 'happy' },
  { id: 'w6', label: 'Black abaya shayla', sex: 'F', bg: '#F1EEEA', skin: 'light', head: 'hijab', cloth: '#2B2B33', eyes: 'open' },
  { id: 'w7', label: 'Long hair', sex: 'F', bg: '#FFF1E0', skin: 'light', head: 'longhair', cloth: '#4A2F25', eyes: 'happy' },
  // men
  { id: 'm1', label: 'White ghutra', sex: 'M', bg: '#E8F1FB', skin: 'mid', head: 'ghutra', cloth: '#FFFFFF', eyes: 'open' },
  { id: 'm2', label: 'Red shemagh', sex: 'M', bg: '#FCE9E7', skin: 'tan', head: 'ghutra', cloth: '#D9534F', eyes: 'happy' },
  { id: 'm3', label: 'Ghutra with beard', sex: 'M', bg: '#EAF5EC', skin: 'mid', head: 'ghutra', cloth: '#FFFFFF', eyes: 'open', beard: true },
  { id: 'm4', label: 'Kufi cap', sex: 'M', bg: '#F3EEFA', skin: 'light', head: 'kufi', cloth: '#FFFFFF', eyes: 'wink' },
  { id: 'm5', label: 'Short hair', sex: 'M', bg: '#FFF4DE', skin: 'light', head: 'shorthair', cloth: '#2E2622', eyes: 'happy' },
  { id: 'm6', label: 'Short hair with beard', sex: 'M', bg: '#E6F4F4', skin: 'tan', head: 'shorthair', cloth: '#1F1A17', eyes: 'open', beard: true },
];

const byId = Object.fromEntries(CHIBIS.map((c) => [c.id, c]));
export const isChibi = (v) => typeof v === 'string' && v.startsWith('c:') && !!byId[v.slice(2)];

function Eyes({ type }) {
  const open = (x) => (
    <g key={x}>
      <ellipse cx={x} cy="38" rx="3.4" ry="4.4" fill="#2A1E1A" />
      <ellipse cx={x} cy="39.6" rx="2.4" ry="2.2" fill="#5B3A8C" opacity=".55" />
      <circle cx={x + 1.2} cy="36.3" r="1.4" fill="#fff" />
      <circle cx={x - 1.1} cy="40.2" r=".6" fill="#fff" />
    </g>
  );
  const happy = (x) => <path key={x} d={`M${x - 3.4} 39 Q${x} 34.5 ${x + 3.4} 39`} stroke="#2A1E1A" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  if (type === 'happy') return <>{happy(26)}{happy(38)}</>;
  if (type === 'wink') return <>{open(26)}{happy(38)}</>;
  return <>{open(26)}{open(38)}</>;
}

export function Chibi({ id, size = 40, title }) {
  const c = byId[id] || CHIBIS[0];
  const skin = SKIN[c.skin];
  const k = c.cloth;
  const isWhite = k === '#FFFFFF';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title || c.label} style={{ display: 'block', borderRadius: '50%' }}>
      <circle cx="32" cy="32" r="32" fill={c.bg} />

      {/* behind the face */}
      {c.head === 'hijab' && <>
        <path d="M10 64 Q10 46 18 42 L46 42 Q54 46 54 64Z" fill={k} />
        <circle cx="32" cy="34" r="20" fill={k} />
      </>}
      {c.head === 'ghutra' && <>
        <path d="M11 64 Q11 34 16 28 L48 28 Q53 34 53 64 L44 64 Q46 46 40 44 L24 44 Q18 46 20 64Z" fill={k} stroke={isWhite ? '#D9DEE6' : 'none'} strokeWidth=".8" />
      </>}
      {c.head === 'longhair' && <path d="M13 58 Q11 22 32 17 Q53 22 51 58 Q44 52 44 40 L20 40 Q20 52 13 58Z" fill={k} />}
      {/* body / collar */}
      {c.head !== 'hijab' && <path d="M18 64 Q19 50 32 49 Q45 50 46 64Z" fill={c.sex === 'M' ? '#FFFFFF' : '#F4B7C8'} stroke="#E3E6EC" strokeWidth=".6" />}

      {/* face */}
      <ellipse cx="32" cy="37" rx="14.5" ry="13.5" fill={skin} />
      {c.beard && <path d="M18.5 38 Q19 51 32 51.5 Q45 51 45.5 38 Q42 46 32 46.5 Q22 46 18.5 38Z" fill="#3A2A22" />}
      <Eyes type={c.eyes} />
      <ellipse cx="21.5" cy="43" rx="3" ry="1.8" fill="#F59AAE" opacity=".6" />
      <ellipse cx="42.5" cy="43" rx="3" ry="1.8" fill="#F59AAE" opacity=".6" />
      <path d={c.beard ? 'M29.5 44.3 Q32 45.8 34.5 44.3' : 'M29.5 44 Q32 46.6 34.5 44'} stroke={c.beard ? '#F5D8C8' : '#B4535F'} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* over the face */}
      {c.head === 'hijab' && <path d="M17 36 Q16 17 32 16 Q48 17 47 36 Q44 26 32 25.5 Q20 26 17 36Z" fill={k} />}
      {c.head === 'hijab' && <path d="M22 21 Q32 17 42 21" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
      {c.head === 'ghutra' && <>
        <path d="M16 34 Q15 16 32 15 Q49 16 48 34 Q45 26 32 25.5 Q19 26 16 34Z" fill={k} stroke={isWhite ? '#D9DEE6' : 'none'} strokeWidth=".8" />
        {!isWhite && [22, 28, 34, 40].map((x) => <circle key={x} cx={x} cy="21" r=".9" fill="#fff" opacity=".8" />)}
        <rect x="16.5" y="17.5" width="31" height="4.2" rx="2.1" fill="#1E1E24" />
        <rect x="16.5" y="22.6" width="31" height="2.4" rx="1.2" fill="#1E1E24" opacity=".85" />
      </>}
      {c.head === 'kufi' && <>
        <path d="M18 27 Q19 15 32 15 Q45 15 46 27Z" fill={k} stroke="#D9DEE6" strokeWidth=".8" />
        {[23, 28, 33, 38, 43].map((x) => <circle key={x} cx={x - 1} cy="22" r=".8" fill="#C7CDD8" />)}
        <path d="M17.6 31 Q18 27 20 26.5 L20 33Z M46.4 31 Q46 27 44 26.5 L44 33Z" fill="#2E2622" />
      </>}
      {c.head === 'shorthair' && <path d="M17 36 Q14 18 31 16 Q48 15 48 33 Q46 27 41 26 Q40 29 36 28.5 Q35 25.5 31 27 Q27 28.5 23 26.5 Q19 29 17 36Z" fill={k} />}
      {c.head === 'longhair' && <path d="M17.5 36 Q17 19 32 18.5 Q47 19 46.5 36 Q44 27 36 25 Q30 29 22 27.5 Q19 30 17.5 36Z" fill={k} />}
    </svg>
  );
}

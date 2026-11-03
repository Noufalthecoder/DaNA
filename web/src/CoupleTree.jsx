import { motion } from 'framer-motion';

const center = {};
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i = 0) => ({ pathLength: 1, opacity: 1, transition: { delay: 0.2 + i * 0.12, duration: 1.1, ease: 'easeInOut' } }),
};
const pop = (d) => ({
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { delay: d, type: 'spring', stiffness: 260, damping: 16 },
  style: center,
});
const blink = (d) => ({
  animate: { scaleY: [1, 1, 0.1, 1] },
  transition: { duration: 4.5, times: [0, 0.92, 0.96, 1], repeat: Infinity, delay: d },
  style: center,
});
const bob = (d) => ({
  animate: { y: [0, -9, 0] },
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: d },
});

export default function CoupleTree({ L, ar = false }) {
  const tx = (x, w) => (ar ? { x: x + w, textAnchor: 'start', direction: 'rtl' } : { x });
  const branches = [
    'M300 250 C 262 212, 214 176, 158 156', 'M300 250 C 338 212, 386 176, 442 156', 'M300 236 C 300 190, 300 150, 300 112',
    'M300 300 C 250 282, 188 270, 116 254', 'M300 300 C 350 282, 412 270, 484 254',
    'M220 192 C 210 170, 206 150, 210 128', 'M380 192 C 390 170, 394 150, 390 128',
  ];
  const roots = [
    'M300 570 C 258 586, 196 596, 120 604', 'M300 570 C 342 586, 404 596, 480 604',
    'M300 574 C 286 596, 262 612, 228 624', 'M300 574 C 314 596, 338 612, 372 624',
    'M190 594 C 172 606, 160 616, 146 626', 'M410 594 C 428 606, 440 616, 454 626',
  ];
  const leaves = [
    [158, 150, 38, '#00843D'], [128, 170, 26, '#2FA866'], [442, 150, 38, '#00843D'], [472, 170, 26, '#2FA866'],
    [300, 104, 42, '#2FA866'], [262, 118, 26, '#00843D'], [338, 118, 26, '#00843D'],
    [210, 124, 20, '#0B6B3A'], [390, 124, 20, '#0B6B3A'], [112, 252, 24, '#2FA866'], [488, 252, 24, '#2FA866'],
  ];
  const pearls = [[158, 150, 11], [442, 150, 11], [112, 252, 9], [488, 252, 9], [210, 124, 8], [390, 124, 8]];

  return (
    <svg width="600" height="640" viewBox="0 0 600 640" style={{ direction: 'ltr' }} role="img" aria-label="An Emirati couple standing in front of a family tree">
      <defs>
        <radialGradient id="pearl" cx=".36" cy=".32" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".7" stopColor="#F1F1EC" /><stop offset="1" stopColor="#D6D9D2" /></radialGradient>
        <linearGradient id="kan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".7" stopColor="#F4F6F4" /><stop offset="1" stopColor="#DFE5E0" /></linearGradient>
        <linearGradient id="aba" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2A2D33" /><stop offset="1" stopColor="#15171B" /></linearGradient>
        <linearGradient id="hij" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34373F" /><stop offset="1" stopColor="#1C1E23" /></linearGradient>
        <radialGradient id="scr" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#E9FFF2" /><stop offset="1" stopColor="#00843D" /></radialGradient>
        <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0b3" floodOpacity=".18" /></filter>
      </defs>

      <motion.circle cx="300" cy="300" r="262" fill="#E8F4EC" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9 }} style={center} />

      {/* branches = the future */}
      <motion.g initial="hidden" animate="show" stroke="#0B6B3A" strokeLinecap="round" fill="none">
        {branches.map((d, i) => <motion.path key={d} d={d} strokeWidth={i < 3 ? 10 : i < 5 ? 8 : 5} variants={draw} custom={i + 3} />)}
      </motion.g>
      {leaves.map(([cx, cy, r, c], i) => (
        <motion.circle key={i} cx={cx} cy={cy} r={r} fill={c} opacity={0.85} {...pop(1.1 + i * 0.06)} />
      ))}
      {pearls.map(([cx, cy, r], i) => (
        <motion.circle key={i} cx={cx} cy={cy} r={r} fill="url(#pearl)" stroke="#CFE3D6" strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: [1, 1.18, 1] }} style={center}
          transition={{ delay: 1.8 + i * 0.15, duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }} />
      ))}
      {/* heart = the future child */}
      <motion.path fill="#CE1126" style={center}
        d="M300 116 C 286 104, 274 92, 282 80 C 288 72, 298 74, 300 82 C 302 74, 312 72, 318 80 C 326 92, 314 104, 300 116 Z"
        initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1, 1.12, 1] }}
        transition={{ delay: 2, duration: 1.4, repeat: Infinity, repeatDelay: 0.8 }} />

      {/* trunk + roots = know your roots */}
      <motion.path fill="#0B6B3A" d="M286 572 C 290 460, 288 340, 292 236 L 308 236 C 312 340, 310 460, 314 572 Z"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 0.2 }} style={{ originY: 1 }} />
      <motion.g initial="hidden" animate="show" stroke="#0B6B3A" strokeLinecap="round" fill="none" strokeWidth="6">
        {roots.map((d, i) => <motion.path key={d} d={d} variants={draw} custom={i} strokeWidth={i > 3 ? 4 : 6} />)}
      </motion.g>
      <motion.circle cx="120" cy="604" r="6" fill="#CE1126" {...pop(1.3)} />
      <motion.circle cx="480" cy="604" r="6" fill="#CE1126" {...pop(1.4)} />

      {/* ===== GIRL ===== */}
      <motion.g initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}>
        <path fill="url(#aba)" d="M168 330 C 178 304, 262 304, 272 330 L 300 590 L 140 590 Z" />
        <path d="M220 336 L 220 590" stroke="#00843D" strokeWidth="3" />
        <path d="M146 574 L 294 574" stroke="#00843D" strokeWidth="3" />
        <path fill="url(#hij)" d="M174 232 C 168 156, 272 156, 266 232 C 268 272, 262 304, 276 338 L 164 338 C 178 304, 172 272, 174 232 Z" />
        <path fill="#F0C4A2" d="M190 222 C 190 184, 250 184, 250 222 L 250 246 C 250 270, 233 286, 220 290 C 207 286, 190 270, 190 246 Z" />
        <path fill="#2B2E35" d="M186 218 C 192 176, 248 176, 254 218 C 242 196, 198 196, 186 218 Z" />
        <path d="M192 206 C 206 192, 234 192, 248 206" stroke="#00843D" strokeWidth="2.5" fill="none" />
        <path d="M198 228 q8 -6 16 0 M226 228 q8 -6 16 0" stroke="#2A1A12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <motion.g {...blink(0.6)}>
          <ellipse cx="206" cy="239" rx="7" ry="9" fill="#3B2416" /><ellipse cx="234" cy="239" rx="7" ry="9" fill="#3B2416" />
          <ellipse cx="206" cy="241" rx="4.5" ry="6" fill="#6B3E22" /><ellipse cx="234" cy="241" rx="4.5" ry="6" fill="#6B3E22" />
          <circle cx="203.5" cy="235.5" r="2.6" fill="#fff" /><circle cx="231.5" cy="235.5" r="2.6" fill="#fff" />
          <circle cx="208.5" cy="243" r="1.2" fill="#fff" /><circle cx="236.5" cy="243" r="1.2" fill="#fff" />
        </motion.g>
        <path d="M197 232 q9 -9 18 -2 M225 230 q9 -7 18 2" stroke="#1A100B" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <ellipse cx="198" cy="256" rx="7" ry="4" fill="#F28C8C" opacity=".45" /><ellipse cx="242" cy="256" rx="7" ry="4" fill="#F28C8C" opacity=".45" />
        <path d="M219 250 l-1.5 5 l2.5 0" stroke="#C98B6A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M212 263 q8 7 16 0" stroke="#B4473F" strokeWidth="2.4" fill="#F7B1A8" strokeLinecap="round" />
        <path fill="#1F2227" d="M178 340 C 170 372, 186 396, 208 404 L 214 392 C 198 384, 192 368, 196 346 Z" />
        <path fill="#1F2227" d="M262 340 C 270 372, 254 396, 232 404 L 226 392 C 242 384, 248 368, 244 346 Z" />
        <rect x="200" y="360" width="40" height="64" rx="8" fill="#111412" />
        <rect x="204" y="365" width="32" height="54" rx="5" fill="url(#scr)" />
        <motion.circle cx="220" cy="385" r="7" fill="url(#pearl)" animate={{ r: [7, 8.5, 7] }} transition={{ duration: 1.8, repeat: Infinity }} />
        <path d="M211 398 C 212 408, 228 408, 229 398" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="206" cy="402" rx="8" ry="7" fill="#F0C4A2" /><ellipse cx="234" cy="402" rx="8" ry="7" fill="#F0C4A2" />
      </motion.g>

      {/* ===== BOY ===== */}
      <motion.g initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}>
        <path fill="url(#kan)" stroke="#D5DED7" strokeWidth="1.5" d="M326 332 C 338 304, 422 304, 434 332 L 456 590 L 304 590 Z" />
        <path d="M380 330 L 380 430" stroke="#DCE4DE" strokeWidth="2" />
        <path d="M380 336 C 378 362, 376 384, 372 404" stroke="#E1E8E2" strokeWidth="3" fill="none" />
        <circle cx="372" cy="408" r="4.5" fill="#E6ECE7" />
        <path fill="#FFFFFF" stroke="#D5DED7" strokeWidth="1.5" d="M332 224 C 326 150, 434 150, 428 224 L 446 344 C 420 328, 340 328, 314 344 Z" />
        <path d="M338 300 C 350 318, 360 326, 372 330 M422 300 C 410 318, 400 326, 388 330" stroke="#E2E8E3" strokeWidth="2" fill="none" />
        <path fill="#E4B08A" d="M350 222 C 350 182, 410 182, 410 222 L 410 250 C 410 274, 394 292, 380 296 C 366 292, 350 274, 350 250 Z" />
        <path fill="#2A1C14" d="M350 244 C 352 274, 366 294, 380 298 C 394 294, 408 274, 410 244 C 404 268, 394 284, 380 286 C 366 284, 356 268, 350 244 Z" />
        <path d="M370 266 q10 -5 20 0" stroke="#2A1C14" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M373 273 q7 5 14 0" stroke="#9B3B33" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M356 226 q9 -5 18 0 M386 226 q9 -5 18 0" stroke="#1F140E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <motion.g {...blink(1.4)}>
          <ellipse cx="366" cy="240" rx="6.5" ry="7.5" fill="#2E1D12" /><ellipse cx="394" cy="240" rx="6.5" ry="7.5" fill="#2E1D12" />
          <ellipse cx="366" cy="242" rx="4" ry="5" fill="#5E3820" /><ellipse cx="394" cy="242" rx="4" ry="5" fill="#5E3820" />
          <circle cx="363.5" cy="237" r="2.3" fill="#fff" /><circle cx="391.5" cy="237" r="2.3" fill="#fff" />
        </motion.g>
        <path d="M358 233 q8 -6 16 0 M386 233 q8 -6 16 0" stroke="#1A100B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M379 250 l-1.5 5 l2.5 0" stroke="#B57A57" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path fill="#FFFFFF" stroke="#D5DED7" strokeWidth="1.5" d="M344 214 C 348 168, 412 168, 416 214 C 404 194, 356 194, 344 214 Z" />
        <ellipse cx="380" cy="190" rx="34" ry="6.5" fill="none" stroke="#111412" strokeWidth="5" />
        <ellipse cx="380" cy="197" rx="35" ry="6.5" fill="none" stroke="#111412" strokeWidth="4" />
        <path fill="#F6F8F6" stroke="#D5DED7" strokeWidth="1.5" d="M424 344 C 434 380, 420 402, 396 410 L 390 396 C 408 388, 414 372, 408 350 Z" />
        <ellipse cx="392" cy="402" rx="11" ry="9" fill="#E4B08A" />
        <path d="M384 398 q8 -3 16 0" stroke="#C9926D" strokeWidth="1.4" fill="none" />
      </motion.g>

      {/* floating cards */}
      <motion.g initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.2, duration: 0.6 }}>
        <motion.g {...bob(0)}>
          <rect x="430" y="400" width="160" height="66" rx="16" fill="#fff" filter="url(#sh)" />
          <circle cx="458" cy="433" r="14" fill="#00843D" />
          <motion.path d="M451 433 l5 5 l9 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2.7, duration: 0.5 }} />
          <text {...tx(480, 98)} y="428" fontFamily="Outfit, Tajawal" fontSize="13" fontWeight="700" fill="#111412">{L.cardPlan[0]}</text>
          <text {...tx(480, 98)} y="446" fontFamily="Outfit, Tajawal" fontSize="13" fontWeight="600" fill="#00843D">{L.cardPlan[1]}</text>
        </motion.g>
      </motion.g>
      <motion.g initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.5, duration: 0.6 }}>
        <motion.g {...bob(1.2)}>
          <rect x="4" y="430" width="140" height="60" rx="16" fill="#fff" filter="url(#sh)" />
          <circle cx="32" cy="460" r="13" fill="#FCE9EB" />
          <motion.path fill="#CE1126" style={center} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.6 }}
            d="M32 467 C 25 461, 20 456, 24 451 C 27 447, 31 448, 32 452 C 33 448, 37 447, 40 451 C 44 456, 39 461, 32 467 Z" />
          <text {...tx(52, 82)} y="456" fontFamily="Outfit, Tajawal" fontSize="13" fontWeight="700" fill="#111412">{L.cardRel[0]}</text>
          <text {...tx(52, 82)} y="474" fontFamily="Outfit, Tajawal" fontSize="12" fill="#5E6B64">{L.cardRel[1]}</text>
        </motion.g>
      </motion.g>
    </svg>
  );
}

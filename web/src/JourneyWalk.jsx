import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring, AnimatePresence } from 'framer-motion';

const step = { duration: 0.62, repeat: Infinity, ease: 'easeInOut' };

/* An anime-style walking character. Feet step, arms swing, body bobs. */
function Walker({ kind, delay = 0 }) {
  const skin = kind === 'woman' ? '#F0C4A2' : kind === 'child' ? '#EDBB95' : '#E4B08A';
  const isChild = kind === 'child';
  return (
    <motion.svg viewBox="0 0 120 240" className={`walker ${kind}`} animate={{ y: [0, -4, 0] }} transition={{ ...step, duration: 0.31, delay }}>
      {/* feet */}
      <motion.ellipse cx="48" cy="233" rx="11" ry="5" fill="#3B2A20" animate={{ x: [-9, 9, -9] }} transition={{ ...step, delay }} />
      <motion.ellipse cx="72" cy="233" rx="11" ry="5" fill="#3B2A20" animate={{ x: [9, -9, 9] }} transition={{ ...step, delay }} />
      {/* back arm */}
      <motion.path d="M38 96 C 30 130, 30 150, 34 168" stroke={kind === 'woman' ? '#1F2227' : '#E9EEEA'} strokeWidth="13" strokeLinecap="round" fill="none"
        style={{ originX: '38px', originY: '96px' }} animate={{ rotate: [16, -16, 16] }} transition={{ ...step, delay }} />
      {/* body */}
      {kind === 'woman'
        ? <path d="M32 92 C 38 74, 82 74, 88 92 L 100 230 L 20 230 Z" fill="#22252B" />
        : <path d="M32 92 C 38 74, 82 74, 88 92 L 98 230 L 22 230 Z" fill="#FFFFFF" stroke="#D5DED7" strokeWidth="1.5" />}
      {kind === 'woman' && <path d="M60 96 L 60 230 M 24 216 L 96 216" stroke="#00843D" strokeWidth="2.5" />}
      {kind !== 'woman' && <><path d="M60 92 L 60 150" stroke="#DCE4DE" strokeWidth="1.5" /><circle cx="56" cy="152" r="3" fill="#E6ECE7" /></>}
      {/* head covering (back) */}
      {kind === 'man' && <path d="M34 56 C 30 10, 90 10, 86 56 L 94 100 C 80 90, 40 90, 26 100 Z" fill="#fff" stroke="#D5DED7" strokeWidth="1.5" />}
      {kind === 'woman' && <path d="M36 58 C 32 12, 88 12, 84 58 C 86 76, 82 88, 92 98 L 28 98 C 38 88, 34 76, 36 58 Z" fill="#2B2E35" />}
      {/* face */}
      <ellipse cx="60" cy={isChild ? 58 : 54} rx="18" ry="21" fill={skin} />
      {kind === 'man' && <path d="M42 56 C 44 78, 54 86, 60 87 C 66 86, 76 78, 78 56 C 74 70, 68 77, 60 78 C 52 77, 46 70, 42 56 Z" fill="#2A1C14" />}
      {/* eyes + smile */}
      <ellipse cx="53" cy={isChild ? 58 : 53} rx="3.2" ry="4" fill="#2E1D12" /><ellipse cx="67" cy={isChild ? 58 : 53} rx="3.2" ry="4" fill="#2E1D12" />
      <circle cx="52" cy={isChild ? 56.5 : 51.5} r="1.2" fill="#fff" /><circle cx="66" cy={isChild ? 56.5 : 51.5} r="1.2" fill="#fff" />
      {kind !== 'man' && <ellipse cx="49" cy={isChild ? 64 : 60} rx="4" ry="2.4" fill="#F28C8C" opacity=".5" />}
      {kind !== 'man' && <ellipse cx="71" cy={isChild ? 64 : 60} rx="4" ry="2.4" fill="#F28C8C" opacity=".5" />}
      <path d={isChild ? 'M55 66 q5 4 10 0' : 'M55 63 q5 4 10 0'} stroke={kind === 'man' ? '#C9837A' : '#B4473F'} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* head covering (front) */}
      {kind === 'man' && <><path d="M40 48 C 42 24, 78 24, 80 48 C 72 36, 48 36, 40 48 Z" fill="#fff" stroke="#D5DED7" strokeWidth="1.2" />
        <ellipse cx="60" cy="32" rx="21" ry="4.5" fill="none" stroke="#111412" strokeWidth="3.5" /><ellipse cx="60" cy="37" rx="22" ry="4.5" fill="none" stroke="#111412" strokeWidth="3" /></>}
      {kind === 'woman' && <path d="M40 50 C 44 26, 76 26, 80 50 C 72 38, 48 38, 40 50 Z" fill="#2B2E35" />}
      {kind === 'child' && <path d="M42 46 C 44 30, 76 30, 78 46 Z" fill="#fff" stroke="#D5DED7" strokeWidth="1.2" />}
      {/* front arm */}
      <motion.path d="M82 96 C 90 130, 90 150, 86 168" stroke={kind === 'woman' ? '#1F2227' : '#F6F8F6'} strokeWidth="13" strokeLinecap="round" fill="none"
        style={{ originX: '82px', originY: '96px' }} animate={{ rotate: [-16, 16, -16] }} transition={{ ...step, delay }} />
    </motion.svg>
  );
}

function Dunes({ color, d, x, bottom, height }) {
  return (
    <motion.svg className="dunes" viewBox="0 0 3000 200" preserveAspectRatio="none" style={{ x, bottom, height }}>
      <path d={d} fill={color} />
    </motion.svg>
  );
}

export default function JourneyWalk({ L }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.4 });
  const [idx, setIdx] = useState(0);
  const marks = [0, 0.22, 0.46, 0.7, 0.9];
  useMotionValueEvent(scrollYProgress, 'change', (v) => setIdx(marks.reduce((a, m, i) => (v >= m ? i : a), 0)));

  const worldX = useTransform(p, [0, 1], [0, -2600]);
  const farX = useTransform(p, [0, 1], [0, -500]);
  const midX = useTransform(p, [0, 1], [0, -1100]);
  const sunY = useTransform(p, [0, 1], [40, -30]);
  const skyTop = useTransform(p, [0, 1], ['#DFF3E7', '#FFE8C7']);

  return (
    <section ref={ref} className="walk">
      <motion.div className="walk-sticky" style={{ background: useTransform(skyTop, (c) => `linear-gradient(180deg, ${c} 0%, #FFF8EC 70%)`) }}>
        <div className="walk-head wrap">
          <div className="kicker" style={{ textAlign: 'start' }}>{L.walkK}</div>
          <h2>{L.walkT}</h2>
          <p>{L.walkS}</p>
        </div>

        <motion.div className="sun" style={{ y: sunY }} />
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="cloud" style={{ top: 120 + i * 60, left: `${20 + i * 30}%` }}
            animate={{ x: [0, 60, 0] }} transition={{ duration: 18 + i * 6, repeat: Infinity, ease: 'easeInOut' }} />
        ))}

        <Dunes color="#F2DDB3" x={farX} bottom="160px" height="200px" d="M0 140 C 200 60, 400 60, 600 120 C 800 170, 1000 80, 1200 110 C 1400 140, 1600 50, 1800 100 C 2000 150, 2200 70, 2400 110 C 2600 150, 2800 80, 3000 120 L 3000 200 L 0 200 Z" />
        <Dunes color="#E9C98E" x={midX} bottom="110px" height="190px" d="M0 150 C 250 80, 450 90, 700 140 C 950 190, 1150 90, 1400 120 C 1650 150, 1850 70, 2100 120 C 2350 170, 2600 90, 3000 130 L 3000 200 L 0 200 Z" />

        {/* the world that scrolls past: road, palms, milestones */}
        <motion.div className="world" style={{ x: worldX }}>
          <div className="road" />
          {[260, 980, 1700, 2380, 3050].map((x, i) => (
            <svg key={i} className="palm" style={{ left: x }} viewBox="0 0 80 160">
              <path d="M40 160 C 42 120, 38 80, 44 40" stroke="#7A5A2E" strokeWidth="7" fill="none" />
              {[-60, -20, 20, 60, 100, 140].map((r) => <path key={r} d="M44 40 C 60 30, 74 34, 82 44" stroke="#0B6B3A" strokeWidth="7" fill="none" strokeLinecap="round" transform={`rotate(${r} 44 40)`} />)}
            </svg>
          ))}
          {L.miles.map((m, i) => (
            <div key={i} className="mile" style={{ left: 400 + i * 620 }}>
              <motion.div className={`mile-card ${idx >= i ? 'on' : ''}`} animate={{ scale: idx === i ? 1.08 : 1, y: idx === i ? -8 : 0 }}>
                <span className="mi">{m.i}</span>
                <div><b>{m.t}</b><small>{m.s}</small></div>
                {idx > i && <span className="tick">✓</span>}
              </motion.div>
              <div className={`pole ${idx >= i ? 'on' : ''}`} />
            </div>
          ))}
        </motion.div>

        {/* the family, walking */}
        <div className="family">
          <AnimatePresence mode="wait">
            <motion.div key={idx} className="bubble" initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
              <span className="bdot" />{L.bubbles[idx]}
            </motion.div>
          </AnimatePresence>
          <div className="walkers">
            <Walker kind="woman" />
            <AnimatePresence>
              {idx >= 3 && (
                <motion.div className="child-wrap" initial={{ opacity: 0, scale: 0.3, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.3 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
                  <Walker kind="child" delay={0.15} />
                </motion.div>
              )}
            </AnimatePresence>
            <Walker kind="man" delay={0.31} />
          </div>
          <AnimatePresence>
            <motion.div key={`h-${idx}`} className="hearts">
              {[0, 1, 2].map((h) => (
                <motion.span key={h} initial={{ opacity: 0, y: 0, x: h * 18 - 18 }} animate={{ opacity: [0, 1, 0], y: -90 - h * 20 }} transition={{ duration: 1.6, delay: h * 0.15 }}>❤</motion.span>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="walk-progress">
          {L.miles.map((m, i) => <motion.i key={i} animate={{ backgroundColor: idx >= i ? '#00843D' : '#D9D3C4', scale: idx === i ? 1.4 : 1 }} />)}
        </div>
      </motion.div>
    </section>
  );
}

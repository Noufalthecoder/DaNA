import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring, useVelocity, useMotionValue, AnimatePresence } from 'framer-motion';
import Walker from './Walker.jsx';

const DIST = 3700; // px the world travels across the scene
/* scroll → distance, with a pause while the family meets the counsellor */
const MEET = [0.55, 0.66];
const STOP = 2140;
const COUNSELLOR_X = 2900;
const POLES = [580, 1140, 1700, 2260, COUNSELLOR_X, 3500, 4060];
const C_IDX = 4;   // the counsellor milestone
const WED_IDX = 3; // married from here on

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
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.5 });
  const [idx, setIdx] = useState(0);
  const [face, setFace] = useState(1);
  const marks = [0, 0.128, 0.272, 0.416, 0.53, 0.817, 0.939];
  const [meet, setMeet] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (v) => { setIdx(marks.reduce((a, m, i) => (v >= m ? i : a), 0)); setMeet(v > MEET[0] + 0.01 && v < MEET[1]); });

  /* gait: phase from distance, stride amplitude from speed, facing from direction */
  const walked = useTransform(p, [0, MEET[0], MEET[1], 1], [0, STOP, STOP, DIST]);
  const phase = useTransform(walked, (d) => (d / 168) * Math.PI * 2);
  const childPhase = useTransform(walked, (d) => (d / 104) * Math.PI * 2);
  const vel = useVelocity(walked);
  const amp = useSpring(useTransform(vel, (v) => Math.min(1, Math.abs(v) / 110)), { stiffness: 140, damping: 22 });
  useMotionValueEvent(vel, 'change', (v) => { if (Math.abs(v) > 25) setFace(v > 0 ? 1 : -1); });
  const still = useMotionValue(0);
  /* once the family walks on, she waves goodbye and steps out of the scene */
  const cOp = useTransform(walked, [STOP + 20, STOP + 170], [1, 0]);
  const cY = useTransform(walked, [STOP + 20, STOP + 170], [0, 14]);

  const worldX = useTransform(walked, (d) => -d);
  const farX = useTransform(p, [0, 1], [0, -420]);
  const midX = useTransform(p, [0, 1], [0, -1000]);
  const sunY = useTransform(p, [0, 1], [30, -40]);
  const sky = useTransform(p, [0, 0.5, 1], ['#E4F3EA', '#FFF1DA', '#FFE2BD']);
  const bg = useTransform(sky, (c) => `linear-gradient(180deg, ${c} 0%, #FFF9EF 72%)`);
  const headY = useTransform(p, [0, 0.12], [0, -16]);

  return (
    <section ref={ref} className="walk">
      <motion.div className="walk-sticky" style={{ background: bg }}>
        <motion.div className="walk-head wrap" style={{ y: headY }}>
          <div className="kicker">{L.walkK}</div>
          <h2>{L.walkT}</h2>
          <p>{L.walkS}</p>
        </motion.div>

        <motion.div className="sun" style={{ y: sunY }} />
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="cloud" style={{ top: 150 + i * 56, left: `${18 + i * 30}%`, scale: 0.7 + i * 0.15 }}
            animate={{ x: [0, 50, 0] }} transition={{ duration: 22 + i * 6, repeat: Infinity, ease: 'easeInOut' }} />
        ))}

        <Dunes color="#F3E3C3" x={farX} bottom="150px" height="190px" d="M0 140 C 200 60, 400 60, 600 120 C 800 170, 1000 80, 1200 110 C 1400 140, 1600 50, 1800 100 C 2000 150, 2200 70, 2400 110 C 2600 150, 2800 80, 3000 120 L 3000 200 L 0 200 Z" />
        <Dunes color="#EBD1A1" x={midX} bottom="104px" height="180px" d="M0 150 C 250 80, 450 90, 700 140 C 950 190, 1150 90, 1400 120 C 1650 150, 1850 70, 2100 120 C 2350 170, 2600 90, 3000 130 L 3000 200 L 0 200 Z" />

        <motion.div className="world" style={{ x: worldX }}>
          <div className="road" />
          {[240, 860, 1420, 1980, 2560, 3200, 3780, 4400, 5000].map((x, i) => (
            <svg key={i} className="palm" style={{ left: x }} viewBox="0 0 80 160">
              <path d="M40 160 C 42 120, 38 80, 44 40" stroke="#8A6A3A" strokeWidth="6" fill="none" />
              {[-60, -20, 20, 60, 100, 140].map((r) => <path key={r} d="M44 40 C 60 30, 74 34, 82 44" stroke="#0B6B3A" strokeWidth="6" fill="none" strokeLinecap="round" transform={`rotate(${r} 44 40)`} />)}
            </svg>
          ))}
          {L.miles.map((m, i) => (
            <div key={i} className={`mile ${i === C_IDX ? 'mile-c' : ''}`} style={{ left: POLES[i] }}>
              <motion.div className={`mile-card ${idx >= i ? 'on' : ''}`} animate={{ y: idx === i ? -10 : 0, scale: idx === i ? 1.04 : 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                <span className="mi">{m.i}</span>
                <div><b>{m.t}</b><small>{m.s}</small></div>
                <AnimatePresence>{idx > i && <motion.span className="tick" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>✓</motion.span>}</AnimatePresence>
              </motion.div>
              <div className={`pole ${idx >= i ? 'on' : ''}`} />
            </div>
          ))}
          {/* the counsellor's stop: she waits, waves and welcomes the couple */}
          <motion.div className="clinic" style={{ left: COUNSELLOR_X, opacity: cOp, y: cY }}>
            <AnimatePresence>
              {meet && (
                <motion.div className="c-bubble" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.4, delay: 0.25 }}>
                  {L.counsellor.say}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="c-figure"><Walker kind="counsellor" phase={still} amp={still} wave={meet} /></div>
            <motion.div className="c-tag" animate={{ opacity: idx >= WED_IDX ? 1 : 0, y: meet ? 0 : 4 }}>
              <b>{L.counsellor.name}</b><span>{L.counsellor.role}</span>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="family">
          <AnimatePresence mode="wait">
            <motion.div key={idx} className="bubble" initial={{ opacity: 0, y: 12, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <span className="bdot" />{L.bubbles[idx]}
            </motion.div>
          </AnimatePresence>
          {/* engaged couples keep a respectful distance; after the wedding they walk side by side */}
          <motion.div className="walkers" animate={{ scaleX: face }} transition={{ duration: 0.25 }}>
            <Walker kind="man" phase={phase} amp={amp} />
            <AnimatePresence>
              {idx >= C_IDX + 1 && (
                <motion.div className="child-wrap" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.6 }}>
                  <Walker kind="child" phase={childPhase} amp={amp} offset={1.2} />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div className="child-wrap" animate={{ x: (idx < WED_IDX ? 56 : 0) * (document.documentElement.dir === 'rtl' ? -1 : 1) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              <Walker kind="woman" phase={phase} amp={amp} offset={Math.PI * 0.85} />
            </motion.div>
          </motion.div>
        </div>

        <div className="walk-progress">
          {L.miles.map((m, i) => <motion.i key={i} animate={{ width: idx === i ? 28 : 8, backgroundColor: idx >= i ? '#00843D' : '#D9D3C4' }} />)}
        </div>
      </motion.div>
    </section>
  );
}

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence, useSpring } from 'framer-motion';

/* scroll-linked helpers: each is its own component so hooks stay valid */
function Grow({ p, from, to, children }) {
  const len = useTransform(p, [from, to], [0, 1]);
  const op = useTransform(p, [from, from + 0.01], [0, 1]);
  return children(len, op);
}
function PopCircle({ p, at, cx, cy, r, fill, opacity = 1, stroke, strokeWidth }) {
  const s = useTransform(p, [at, at + 0.06], [0, 1]);
  return <motion.circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={strokeWidth} style={{ scale: s }} />;
}

export default function GrowSection({ L }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(v < 0.36 ? 0 : v < 0.68 ? 1 : 2));

  const seedY = useTransform(p, [0, 0.06], [-120, 0]);
  const trunkH = useTransform(p, [0.22, 0.48], [0, 1]);
  const bg = useTransform(p, [0, 1], ['#F4F8F5', '#E3F2E8']);
  const pct = useTransform(p, (v) => `${Math.round(v * 100)}%`);

  const roots = ['M300 470 C 260 490, 210 500, 150 520', 'M300 470 C 340 490, 390 500, 450 520', 'M300 474 C 290 500, 270 520, 240 548', 'M300 474 C 310 500, 330 520, 360 548', 'M210 500 C 190 512, 175 525, 160 540', 'M390 500 C 410 512, 425 525, 440 540'];
  const branches = ['M300 300 C 260 262, 214 226, 158 206', 'M300 300 C 340 262, 386 226, 442 206', 'M300 286 C 300 240, 300 200, 300 150', 'M300 350 C 250 332, 188 320, 116 304', 'M300 350 C 350 332, 412 320, 484 304'];
  const leaves = [[158, 200, 40, '#00843D'], [126, 222, 28, '#2FA866'], [442, 200, 40, '#00843D'], [474, 222, 28, '#2FA866'], [300, 140, 46, '#2FA866'], [258, 158, 28, '#00843D'], [342, 158, 28, '#00843D'], [112, 302, 26, '#2FA866'], [488, 302, 26, '#2FA866']];
  const pearls = [[158, 200, 11], [442, 200, 11], [112, 302, 9], [488, 302, 9], [258, 158, 8], [342, 158, 8]];

  return (
    <motion.section ref={ref} className="grow" style={{ backgroundColor: bg }}>
      <div className="grow-sticky">
        <div className="wrap grow-grid">
          <div>
            <div className="kicker" style={{ textAlign: 'start' }}>{L.growK}</div>
            <h2 className="grow-t">{L.growT}</h2>
            <div className="grow-steps">
              {L.grow.map((g, i) => (
                <motion.div key={g.n} className={`gstep ${i === step ? 'on' : ''}`} animate={{ opacity: i === step ? 1 : 0.35, x: i === step ? 0 : -6 }}>
                  <span className="gn">{g.n}</span>
                  <div><h3>{g.t}</h3>
                    <AnimatePresence initial={false}>
                      {i === step && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{g.p}</motion.p>}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grow-meter"><motion.div className="fill" style={{ scaleX: p }} /><motion.span>{pct}</motion.span></div>
          </div>

          <svg viewBox="0 0 600 600" className="grow-svg" role="img" aria-label="A family tree growing from a seed">
            <defs><radialGradient id="gp" cx=".36" cy=".32" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".7" stopColor="#F1F1EC" /><stop offset="1" stopColor="#D6D9D2" /></radialGradient></defs>
            {/* soil */}
            <ellipse cx="300" cy="478" rx="250" ry="34" fill="#E9DCC0" />
            <ellipse cx="300" cy="472" rx="250" ry="26" fill="#F3E9D2" />
            {/* roots */}
            {roots.map((d, i) => (
              <Grow key={d} p={p} from={0.06 + i * 0.02} to={0.26 + i * 0.02}>
                {(len, op) => <motion.path d={d} stroke="#7A5A2E" strokeWidth={i > 3 ? 4 : 7} fill="none" strokeLinecap="round" style={{ pathLength: len, opacity: op }} />}
              </Grow>
            ))}
            {/* trunk */}
            <motion.path d="M286 472 C 290 400, 288 330, 292 240 L 308 240 C 312 330, 310 400, 314 472 Z" fill="#0B6B3A" style={{ scaleY: trunkH, originY: 1 }} />
            {/* branches */}
            {branches.map((d, i) => (
              <Grow key={d} p={p} from={0.45 + i * 0.03} to={0.6 + i * 0.03}>
                {(len, op) => <motion.path d={d} stroke="#0B6B3A" strokeWidth={i < 3 ? 10 : 8} fill="none" strokeLinecap="round" style={{ pathLength: len, opacity: op }} />}
              </Grow>
            ))}
            {leaves.map(([cx, cy, r, c], i) => <PopCircle key={i} p={p} at={0.6 + i * 0.022} cx={cx} cy={cy} r={r} fill={c} opacity={0.88} />)}
            {pearls.map(([cx, cy, r], i) => <PopCircle key={i} p={p} at={0.78 + i * 0.025} cx={cx} cy={cy} r={r} fill="url(#gp)" stroke="#CFE3D6" strokeWidth={2} />)}
            <Grow p={p} from={0.92} to={0.98}>
              {(s) => <motion.path fill="#CE1126" style={{ scale: s }} d="M300 156 C 286 144, 274 132, 282 120 C 288 112, 298 114, 300 122 C 302 114, 312 112, 318 120 C 326 132, 314 144, 300 156 Z" />}
            </Grow>
            {/* the seed (a pearl) dropping into the soil */}
            <motion.circle cx="300" cy="462" r="14" fill="url(#gp)" stroke="#CE1126" strokeWidth="3" style={{ y: seedY }} />
            {/* stage labels */}
            <motion.text x="460" y="560" className="glab" style={{ opacity: useTransform(p, [0.1, 0.2], [0, 1]) }}>{L.grow[0].t}</motion.text>
            <motion.text x="330" y="400" className="glab" style={{ opacity: useTransform(p, [0.42, 0.5], [0, 1]) }}>{L.grow[1].t}</motion.text>
            <motion.text x="500" y="250" className="glab" style={{ opacity: useTransform(p, [0.7, 0.8], [0, 1]) }}>{L.grow[2].t}</motion.text>
          </svg>
        </div>
        <motion.div className="scroll-hint" style={{ opacity: useTransform(p, [0, 0.08], [1, 0]) }}>
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>↓</motion.span> {L.scroll}
        </motion.div>
      </div>
    </motion.section>
  );
}

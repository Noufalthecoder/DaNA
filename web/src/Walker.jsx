import { motion, useTransform } from 'framer-motion';

/*
  Side-view walking figure, facing right, driven entirely by scroll.
  `phase` advances with distance walked, `amp` (0..1) with scroll speed,
  so the family walks only while you scroll and settles when you stop.
  Simple 2-bone legs with knee bend on the swing, opposite arm swing, and the
  body is lowered so the planted foot always touches the ground.
*/
const R = Math.PI / 180;
const GROUND = 258;
const HIP = [66, 150], THIGH = 52, SHIN = 54;
const SHOULDER = [64, 102], UPPER = 34, FORE = 32;

function leg(ph, a) {
  const th = 26 * a * Math.sin(ph) * R;
  const bend = 40 * a * Math.max(0, Math.cos(ph)) * R;
  const kx = HIP[0] + Math.sin(th) * THIGH, ky = HIP[1] + Math.cos(th) * THIGH;
  const sh = th - bend;
  return { kx, ky, ax: kx + Math.sin(sh) * SHIN, ay: ky + Math.cos(sh) * SHIN };
}
function arm(ph, a, sign) {
  const up = sign * 24 * a * Math.sin(ph) * R;
  const ex = SHOULDER[0] + Math.sin(up) * UPPER, ey = SHOULDER[1] + Math.cos(up) * UPPER;
  const fo = up + (14 + 18 * a * Math.max(0, Math.sin(ph) * sign)) * R;
  return { ex, ey, hx: ex + Math.sin(fo) * FORE, hy: ey + Math.cos(fo) * FORE };
}
function pose(ph, a, hem) {
  const n = leg(ph, a), f = leg(ph + Math.PI, a);
  const drop = GROUND - Math.max(n.ay, f.ay) - 4;
  const xs = [n.kx, f.kx, n.ax, f.ax];
  const back = Math.min(44, Math.min(...xs) - 10);
  const front = Math.max(88, Math.max(...xs) + 13);
  return { n, f, an: arm(ph, a, -1), af: arm(ph, a, 1), drop, back, front, hem };
}
const legD = (l) => `M${HIP[0]} ${HIP[1]} L${l.kx} ${l.ky} L${l.ax} ${l.ay}`;
const footD = (l) => `M${l.ax - 5} ${l.ay + 3} L${l.ax + 11} ${l.ay + 3}`;
const armD = (m) => `M${SHOULDER[0]} ${SHOULDER[1]} L${m.ex} ${m.ey} L${m.hx} ${m.hy}`;
const handD = (m) => `M${m.hx} ${m.hy} l0.1 0`;
const robeD = (p) => `M50 92 Q65 83 80 92 Q90 ${p.hem - 92} ${p.front} ${p.hem} Q${(p.front + p.back) / 2} ${p.hem + 5} ${p.back} ${p.hem} Q40 ${p.hem - 92} 50 92 Z`;
const trimD = (p) => `M80 94 Q90 ${p.hem - 92} ${p.front} ${p.hem}`;

const LOOK = {
  man: { skin: '#E4B08A', robe: '#FFFFFF', line: '#D3DCD6', near: '#FAFBFA', far: '#DDE5E0', hem: 238 },
  woman: { skin: '#F0C4A2', robe: '#23262C', line: '#23262C', near: '#2C3037', far: '#15171B', hem: 246 },
  counsellor: { skin: '#EFC3A0', robe: '#FFFFFF', line: '#CFD9D3', near: '#FFFFFF', far: '#E3E9E5', hem: 222 },
  child: { skin: '#EDBB95', robe: '#FFFFFF', line: '#D3DCD6', near: '#FAFBFA', far: '#DDE5E0', hem: 236 },
};

function Head({ kind, skin }) {
  const eye = (x, y) => (<><ellipse cx={x} cy={y} rx="2.7" ry="3.8" fill="#2A1B12" /><circle cx={x + 0.9} cy={y - 1.3} r="1" fill="#fff" /></>);
  if (kind === 'man') return (
    <g>
      <path d="M44 42 Q64 24 86 40 L84 54 L54 60 Q48 86 38 108 Q30 106 33 96 Q38 70 44 42 Z" fill="#fff" stroke="#D3DCD6" strokeWidth="1.4" />
      <rect x="61" y="72" width="11" height="20" rx="4" fill={skin} />
      <ellipse cx="69" cy="60" rx="16" ry="19" fill={skin} />
      <path d="M84 57 q4 5 -1 8" fill={skin} stroke="#C99572" strokeWidth="1.2" />
      <path d="M55 62 Q57 79 71 81 Q81 81 85 70 Q80 75 72 75 Q62 73 60 62 Z" fill="#2A1C14" />
      <path d="M72 70 q5 1 9 -0.5" stroke="#2A1C14" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {eye(77, 56)}
      <path d="M72 49 q5 -2.5 10 0" stroke="#2A1C14" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M43 62 Q40 30 66 30 Q87 30 89 46 L85 48 Q80 40 68 40 Q57 42 55 62 Z" fill="#fff" stroke="#D3DCD6" strokeWidth="1.2" />
      <ellipse cx="65" cy="36" rx="22" ry="4.6" fill="none" stroke="#141716" strokeWidth="3.4" transform="rotate(-7 65 36)" />
      <ellipse cx="65" cy="41" rx="23" ry="4.6" fill="none" stroke="#141716" strokeWidth="2.6" transform="rotate(-7 65 41)" />
    </g>
  );
  if (kind === 'woman' || kind === 'counsellor') return (
    <g>
      <path d="M44 40 Q62 20 84 36 Q92 50 88 64 L86 84 Q70 96 52 98 L38 112 Q34 72 44 40 Z" fill="#2B2E35" />
      <ellipse cx="70" cy="60" rx="14.5" ry="17.5" fill={skin} />
      <path d="M84 56 q3.5 4.5 -1 7" fill={skin} stroke="#D7A383" strokeWidth="1.1" />
      {eye(77, 57)}
      <path d="M74 51 l3 -2 M79 51.5 l2.5 -1.5" stroke="#2A1B12" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="74" cy="65" rx="3.6" ry="2.2" fill="#F28C8C" opacity=".55" />
      <path d="M76 70 q3 1.5 5.5 -0.5" stroke="#B4473F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M54 66 Q51 38 70 37 Q85 37 88 50 Q81 44 70 45 Q60 46 59 68 Z" fill="#2B2E35" />
      <path d="M58 70 Q63 84 78 81 Q85 79 88 72 L88 84 Q72 94 55 88 Z" fill="#2B2E35" />
    </g>
  );
  return (
    <g>
      <rect x="62" y="72" width="10" height="20" rx="4" fill={skin} />
      <path d="M52 50 Q50 66 57 72 L60 56 Z" fill="#2A1C14" />
      <ellipse cx="69" cy="60" rx="16" ry="18" fill={skin} />
      <path d="M84 58 q3 4 -1 6.5" fill={skin} stroke="#D19C77" strokeWidth="1.1" />
      {eye(77, 59)}
      <ellipse cx="73" cy="67" rx="3.6" ry="2.2" fill="#F28C8C" opacity=".5" />
      <path d="M76 71 q3 2 5.5 0" stroke="#B4473F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M51 52 Q54 34 70 34 Q85 34 87 50 Z" fill="#fff" stroke="#D3DCD6" strokeWidth="1.2" />
      <path d="M58 44 h0.1 M66 40 h0.1 M74 40 h0.1 M81 44 h0.1" stroke="#C9D6CD" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

/* a friendly wave: the forearm swings back and forth above the shoulder */
function WaveArm({ c }) {
  const a = 'M64 102 L91 86 L110 60', b = 'M64 102 L91 86 L101 52';
  const ha = 'M110 60 l0.1 0', hb = 'M101 52 l0.1 0';
  const tr = { duration: 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' };
  return (<>
    <motion.path initial={{ d: a }} animate={{ d: b }} transition={tr} stroke="#C9D3CD" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <motion.path initial={{ d: a }} animate={{ d: b }} transition={tr} stroke={c.near} strokeWidth="12.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <motion.path initial={{ d: ha }} animate={{ d: hb }} transition={tr} stroke={c.skin} strokeWidth="11" strokeLinecap="round" />
  </>);
}

export default function Walker({ kind, phase, amp, offset = 0, wave = false }) {
  const c = LOOK[kind];
  const P = useTransform([phase, amp], ([ph, a]) => pose(ph + offset, a, c.hem));
  const y = useTransform(P, (p) => p.drop);
  const shadow = useTransform(P, (p) => 1 - (p.drop - 2) / 18);
  const nLeg = useTransform(P, (p) => legD(p.n)), fLeg = useTransform(P, (p) => legD(p.f));
  const nFoot = useTransform(P, (p) => footD(p.n)), fFoot = useTransform(P, (p) => footD(p.f));
  const nArm = useTransform(P, (p) => armD(p.an)), fArm = useTransform(P, (p) => armD(p.af));
  const nHand = useTransform(P, (p) => handD(p.an)), fHand = useTransform(P, (p) => handD(p.af));
  const robe = useTransform(P, robeD), trim = useTransform(P, trimD);

  return (
    <svg viewBox="0 0 140 270" className={`walker ${kind}`} aria-hidden="true">
      <motion.ellipse cx="68" cy="263" rx="40" ry="5" fill="#8A6A3A" opacity=".18" style={{ scaleX: shadow }} />
      <motion.g style={{ y }}>
        <motion.path d={fArm} stroke={c.far} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <motion.path d={fHand} stroke={c.skin} strokeWidth="10" strokeLinecap="round" opacity=".85" />
        <motion.path d={fLeg} stroke={kind === 'woman' ? '#1A1C20' : c.skin} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".9" />
        <motion.path d={fFoot} stroke="#2E2018" strokeWidth="7" strokeLinecap="round" opacity=".85" />
        <motion.path d={nLeg} stroke={kind === 'woman' ? '#1A1C20' : c.skin} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <motion.path d={nFoot} stroke="#3B2A20" strokeWidth="7" strokeLinecap="round" />
        {kind === 'counsellor' && <path d="M48 120 Q40 200 38 248 Q66 254 94 248 Q90 200 82 120 Z" fill="#23262C" />}
        <motion.path d={robe} fill={c.robe} stroke={c.line} strokeWidth="1.5" />
        {kind === 'counsellor' && <g>
          <path d="M66 94 L72 128 L78 94" stroke="#CFD9D3" strokeWidth="1.4" fill="none" />
          <path d="M71 100 L71 222" stroke="#DCE4DE" strokeWidth="1.4" />
          <path d="M58 96 Q54 122 64 132 Q72 136 76 126" stroke="#2F6F8F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="76" cy="125" r="4" fill="#9FB3BE" stroke="#2F6F8F" strokeWidth="1.6" />
          <rect x="74" y="140" width="13" height="16" rx="2.5" fill="#fff" stroke="#CFD9D3" />
          <path d="M80.5 144 v8 M76.5 148 h8" stroke="#00843D" strokeWidth="2.2" />
        </g>}
        {kind === 'woman' && <motion.path d={trim} stroke="#00843D" strokeWidth="2.2" fill="none" />}
        {kind !== 'woman' && <path d="M79 96 L78 140" stroke="#DCE4DE" strokeWidth="1.4" />}
        <Head kind={kind} skin={c.skin} />
        {wave ? <WaveArm c={c} /> : <>
          {kind !== 'woman' && <motion.path d={nArm} stroke="#C9D3CD" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          <motion.path d={nArm} stroke={c.near} strokeWidth="12.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <motion.path d={nHand} stroke={c.skin} strokeWidth="10.5" strokeLinecap="round" />
        </>}
        {kind === 'counsellor' && <g transform="rotate(-8 50 150)">
          <rect x="40" y="132" width="26" height="34" rx="4" fill="#1B2420" />
          <rect x="43" y="136" width="20" height="26" rx="2" fill="#7FD3A5" />
          <path d="M46 142 h14 M46 147 h10 M46 152 h12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </g>}
      </motion.g>
    </svg>
  );
}

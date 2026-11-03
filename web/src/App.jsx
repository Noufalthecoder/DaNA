import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useInView, animate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import CoupleTree from './CoupleTree.jsx';
import Intro from './Intro.jsx';
import GrowSection from './GrowSection.jsx';
import JourneyWalk from './JourneyWalk.jsx';
import { useSmoothScroll, scrollToHash, RevealText, ScrollWords, VelocityMarquee, StackCards, ExpandSection, FooterMark, ease } from './Motion.jsx';
import { t } from './i18n.js';
import { t2 } from './i18n2.js';

const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease },
};

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="96 120 320 260" aria-hidden="true">
      <path fill="#00843D" d="M120 196 C 118 300, 178 352, 256 352 C 338 352, 398 296, 392 176 C 391 168, 384 166, 382 174 C 376 270, 326 316, 256 316 C 190 316, 142 278, 132 196 C 131 186, 121 186, 120 196 Z" />
      <motion.circle cx="256" cy="214" r="44" fill="#fff" stroke="#CE1126" strokeWidth="10"
        animate={{ y: [0, -8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  );
}

const ICONS = [
  <svg key="r" viewBox="0 0 120 120"><path d="M60 104 V54" stroke="#0B6B3A" strokeWidth="6" strokeLinecap="round" /><path d="M60 104 C 44 108, 30 110, 18 116 M60 104 C 76 108, 90 110, 102 116 M60 104 C 56 110, 50 114, 44 118 M60 104 C 64 110, 70 114, 76 118" stroke="#8A6A3A" strokeWidth="4" strokeLinecap="round" fill="none" /><circle cx="60" cy="40" r="26" fill="#00843D" /><circle cx="60" cy="40" r="9" fill="#fff" stroke="#CE1126" strokeWidth="3" /></svg>,
  <svg key="b" viewBox="0 0 120 120"><circle cx="46" cy="60" r="30" fill="none" stroke="#00843D" strokeWidth="7" /><circle cx="74" cy="60" r="30" fill="none" stroke="#CE1126" strokeWidth="7" /><circle cx="60" cy="60" r="8" fill="#fff" stroke="#111412" strokeWidth="3" /></svg>,
  <svg key="f" viewBox="0 0 120 120"><path d="M60 30 L28 84 M60 30 L92 84 M60 30 V88" stroke="#111412" strokeWidth="4" /><circle cx="60" cy="26" r="13" fill="#CE1126" /><circle cx="28" cy="88" r="11" fill="#00843D" /><circle cx="60" cy="92" r="11" fill="#00843D" /><circle cx="92" cy="88" r="11" fill="#00843D" /></svg>,
];

function CountUp({ to, suffix = '', prefix = '', start = true, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView || !start) return;
    const c = animate(0, to, { duration: 1.4, ease: 'easeOut', onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, start, to]);
  return <strong ref={ref} className={className}>{prefix}{v}{suffix}</strong>;
}

/* ---------- interactive Sila alert family tree ---------- */
function FamilyAlert({ L, onSent }) {
  const [state, setState] = useState('idle');
  const routes = [
    { cx: [220, 220, 100, 100], cy: [262, 200, 200, 262] },
    { cx: [220, 220, 160, 160], cy: [262, 200, 200, 170] },
    { cx: [340, 340, 460, 460], cy: [262, 200, 200, 262] },
    { cx: [340, 340, 400, 400], cy: [262, 200, 200, 170] },
  ];
  const targets = [[100, 262], [160, 170], [460, 262], [400, 170]];
  const send = () => {
    if (state !== 'idle') return;
    setState('sending');
    setTimeout(() => { setState('done'); onSent(4); }, 1700);
  };
  const reset = () => { setState('idle'); onSent(0); };
  const lit = state === 'done';

  return (
    <div>
      <svg viewBox="0 0 560 380" width="100%" role="img" aria-label="Family tree showing private alerts reaching relatives">
        <defs><radialGradient id="pp" cx=".36" cy=".32" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".7" stopColor="#EEF2EE" /><stop offset="1" stopColor="#C9D3CC" /></radialGradient></defs>
        <motion.g stroke="#3B4A41" strokeWidth="2.5" fill="none" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}>
          {['M280 60 V110 M160 110 H400 M160 110 V154 M400 110 V154', 'M160 186 V200 M100 200 H220 M100 200 V247 M220 200 V244', 'M400 186 V200 M340 200 H460 M340 200 V244 M460 200 V247'].map((d, i) => (
            <motion.path key={i} d={d} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.3 }} />
          ))}
        </motion.g>
        <motion.path d="M220 282 C 260 330, 300 330, 340 282" stroke="#CE1126" strokeWidth="2.5" strokeDasharray="6 6" fill="none"
          animate={{ strokeDashoffset: [0, -24] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
        <circle cx="280" cy="46" r="15" fill="url(#pp)" />
        {targets.map(([x, y], i) => (
          <g key={i}>
            <motion.circle cx={x} cy={y} r="26" fill="#3CC07A" initial={{ opacity: 0, scale: 0.4 }}
              animate={lit ? { opacity: [0, 0.55, 0.3], scale: [0.4, 1.3, 1] } : { opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.9, delay: i * 0.12 }} />
            <circle cx={x} cy={y} r="15" fill="url(#pp)" />
          </g>
        ))}
        <circle cx="220" cy="262" r="18" fill="#00843D" /><circle cx="220" cy="262" r="12" fill="url(#pp)" />
        <circle cx="340" cy="262" r="18" fill="#00843D" /><circle cx="340" cy="262" r="12" fill="url(#pp)" />
        <AnimatePresence>
          {state === 'sending' && routes.map((r, i) => (
            <motion.circle key={i} r="7" fill="#FF4D5E" initial={{ cx: r.cx[0], cy: r.cy[0], opacity: 0 }}
              animate={{ cx: r.cx, cy: r.cy, opacity: [1, 1, 1, 1] }} exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: i * 0.08 }} />
          ))}
        </AnimatePresence>
        <g fontFamily="Outfit, Tajawal" fontSize="13" fill="#B9C7BF" textAnchor="middle">
          <text x="300" y="50" textAnchor="start">{L.labels.gp}</text>
          <text x="80" y="174">{L.labels.kf}</text>
          <text x="482" y="174">{L.labels.fm}</text>
          <text x="100" y="306">{L.labels.br}</text>
          <text x="220" y="306" fill="#fff" fontWeight="600">{L.labels.k}</text>
          <text x="340" y="306" fill="#fff" fontWeight="600">{L.labels.f}</text>
          <text x="460" y="306">{L.labels.si}</text>
          <text x="280" y="354" fill="#FF6B78" fontWeight="600">{L.labels.plan}</text>
        </g>
      </svg>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10 }}>
        <motion.button className={`btn alert-btn ${state === 'done' ? 'done' : ''}`} onClick={send} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          {state === 'done' ? `✓ ${L.sent}` : `✉ ${L.send}`}
        </motion.button>
        {state === 'done' && <motion.button className="btn btn-line" onClick={reset} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{L.reset}</motion.button>}
      </div>
    </div>
  );
}

function FAQ({ L }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="list">
      {L.faq.map(([q, a], i) => (
        <motion.div key={q} className="qa" onClick={() => setOpen(open === i ? -1 : i)} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
          <div className="q">{q}<motion.span className="pm" animate={{ rotate: open === i ? 45 : 0 }}>+</motion.span></div>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div className="a" initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 10 }} exit={{ height: 0, opacity: 0, marginTop: 0 }}>
                {a}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

export default function App() {
  useSmoothScroll();
  const [lang, setLang] = useState(() => (new URLSearchParams(window.location.search).get('lang') === 'ar' ? 'ar' : 'en'));
  const [protectedCount, setProtectedCount] = useState(0);
  const L = { ...t[lang], ...t2[lang] };
  const ar = lang === 'ar';
  const [intro, setIntro] = useState(() => !new URLSearchParams(window.location.search).has('nointro'));
  useEffect(() => { if (!intro) return; const id = setTimeout(() => setIntro(false), 2900); return () => clearTimeout(id); }, [intro]);
  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, ar]);

  /* nav: hides on the way down, returns on the way up */
  const { scrollY, scrollYProgress } = useScroll();
  const [nav, setNav] = useState({ solid: false, hidden: false });
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setNav((n) => { const hidden = y > 500 && y > prev + 2 ? true : y < prev - 2 ? false : n.hidden; return n.solid === y > 30 && n.hidden === hidden ? n : { solid: y > 30, hidden }; });
  });

  /* hero: subtle mouse parallax + it drifts and settles back as you scroll away */
  const heroRef = useRef(null);
  const { scrollYProgress: hp } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(hp, [0, 1], [0, -90]);
  const textOp = useTransform(hp, [0, 0.7], [1, 0]);
  const artY = useTransform(hp, [0, 1], [0, 140]);
  const artS = useTransform(hp, [0, 1], [1, 0.88]);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const px = useSpring(useTransform(mx, (v) => v * -12), { stiffness: 50, damping: 18 });
  const py = useSpring(useTransform(my, (v) => v * -8), { stiffness: 50, damping: 18 });
  const onHeroMove = (e) => { mx.set(e.clientX / window.innerWidth - 0.5); my.set(e.clientY / window.innerHeight - 0.5); };

  const go = (hash) => (e) => scrollToHash(e, hash);
  const word = (w, i, cls = '') => (
    <span className="mask" key={`${lang}-${i}`}>
      <motion.span className={`w ${cls}`} initial={{ y: '110%' }} animate={{ y: '0%' }}
        transition={{ delay: (intro ? 3 : 0.2) + i * 0.08, duration: 1, ease }}>{w}</motion.span>
    </span>
  );
  const d0 = intro ? 3 : 0.2;

  return (
    <>
      <AnimatePresence>{intro && <Intro L={L} onDone={() => setIntro(false)} />}</AnimatePresence>
      <motion.div className="progress" style={{ scaleX: scrollYProgress }} />

      <motion.nav className={`top ${nav.solid ? 'solid' : ''}`} animate={{ y: nav.hidden ? -100 : 0 }} transition={{ duration: 0.4, ease }}>
        <div className="wrap bar">
          <a className="brand" href="#top" onClick={go('#top')}><Logo /><span>D<span className="a">a</span>NA</span></a>
          <div className="links">
            {L.nav.map((n, i) => { const h = ['#how', '#tree', '#trust', '#trust', '#faq'][i]; return <a key={n} href={h} onClick={go(h)}>{n}</a>; })}
          </div>
          <div className="nav-r">
            <div className="lang">
              <button className={`arb ${ar ? 'on' : ''}`} onClick={() => setLang('ar')}>عربي</button>
              <button className={!ar ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <a className="btn btn-dark" href="#">{L.login}</a>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="hero" id="top" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="wrap grid">
          <motion.div style={{ y: textY, opacity: textOp }}>
            <motion.div className="pill" key={`p-${lang}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d0, duration: 0.8, ease }}><i />{L.pill}</motion.div>
            <h1 className="title">
              <span className="line">{L.h1a.map((w, i) => word(w, i))}{word(<>{L.h1aG}<i className="dot">.</i></>, L.h1a.length, 'g')}</span>
              <span className="line">{L.h1b.map((w, i) => word(w, i + 3))}{word(<>{L.h1bG}<i className="dot">.</i></>, L.h1b.length + 3, 'g')}</span>
            </h1>
            <motion.div className="h1-sub" dir={ar ? 'ltr' : 'rtl'} style={{ textAlign: ar ? 'right' : 'left' }} key={`s-${lang}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d0 + 0.7, duration: 0.8 }}>{L.h1ar}</motion.div>
            <motion.p className="lead" key={`l-${lang}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d0 + 0.8, duration: 0.9, ease }}>{L.lead}</motion.p>
            <motion.div className="ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d0 + 0.95, duration: 0.9, ease }}>
              <motion.a className="btn btn-green" href="#" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>{L.login} <small>{L.demo}</small></motion.a>
              <motion.a className="btn btn-ghost" href="#how" onClick={go('#how')} whileHover={{ y: -2 }}>{L.watch} <span className="arr">{ar ? '←' : '→'}</span></motion.a>
            </motion.div>
            <motion.div className="chips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d0 + 1.1, duration: 0.8 }}>
              {L.chips.map((c) => <span key={`${lang}-${c}`} className="chip"><b>✓</b>{c}</span>)}
            </motion.div>
          </motion.div>
          <motion.div className="hero-art" style={{ y: artY, scale: artS }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: d0, duration: 1.2, ease }}>
            <motion.div style={{ x: px, y: py }}><CoupleTree L={L} ar={ar} /></motion.div>
          </motion.div>
        </div>
        <motion.div className="scroll-cue" style={{ opacity: textOp }}><span /></motion.div>
      </section>

      <VelocityMarquee items={L.marquee} rtl={ar} key={`m-${lang}`} />

      {/* STATEMENT: lights up as you scroll */}
      <section className="statement">
        <div className="wrap">
          <ScrollWords key={`sw-${lang}`} text={L.band} accent={ar ? ['شائع', 'سليمة'] : ['common.', 'common', 'healthy', 'family.']} />
          <motion.div className={`sub ${!ar ? 'ar' : ''}`} {...reveal}>{L.bandAr}</motion.div>
        </div>
      </section>

      {/* HOW: cards pin and stack */}
      <section className="sec how" id="how">
        <div className="wrap">
          <motion.div className="kicker" {...reveal}>{L.howK}</motion.div>
          <RevealText key={`ht-${lang}`} text={L.howT} className="sec-t" />
          <motion.p className="sec-s" {...reveal}>{L.howS}</motion.p>
          <StackCards key={`sc-${lang}`} items={L.cards} render={(c, i) => (
            <div className="sc-in">
              <div className="sc-text">
                <div className="sc-num">0{i + 1} <span>/ 03</span></div>
                <h3>{c.t} <span>{c.ar}</span></h3>
                <div className="tag">{c.tag}</div>
                <p>{c.p}</p>
              </div>
              <div className="sc-art">{ICONS[i]}</div>
            </div>
          )} />
        </div>
      </section>

      <GrowSection L={L} key={`g-${lang}`} />
      <JourneyWalk L={L} key={`w-${lang}`} />

      {/* SILA: the dark section opens up as it arrives */}
      <ExpandSection className="sec treesec" id="tree">
        <div className="wrap grid">
          <div>
            <RevealText key={`tt-${lang}`} text={L.treeT1} className="tt" />
            <RevealText key={`tt2-${lang}`} text={L.treeT2} className="tt g" delay={0.2} />
            <motion.p {...reveal}>{L.treeP}</motion.p>
            <div className="stats">
              <motion.div className="stat" {...reveal}><CountUp to={50} prefix="~" suffix="%" /><span>{L.stats[0][0]} {L.stats[0][1]}</span></motion.div>
              <motion.div className="stat" {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}><strong>0</strong><span>{L.stats[1][0]} {L.stats[1][1]}</span></motion.div>
              <motion.div className="stat" {...reveal} transition={{ ...reveal.transition, delay: 0.2 }}>
                <motion.strong key={protectedCount} initial={{ scale: 1.5, color: '#3CC07A' }} animate={{ scale: 1, color: protectedCount ? '#3CC07A' : '#ffffff' }}>{protectedCount}</motion.strong>
                <span>{L.stats[2][0]} {L.stats[2][1]}</span>
              </motion.div>
            </div>
          </div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }}>
            <FamilyAlert L={L} onSent={setProtectedCount} />
          </motion.div>
        </div>
      </ExpandSection>

      {/* TRUST + FAITH */}
      <section className="sec trust" id="trust">
        <div className="wrap grid">
          <div>
            <RevealText key={`tr-${lang}`} text={L.trustT} className="sec-t start" />
            <div className="tlist">
              {L.trust.map(([h, p], i) => (
                <motion.div key={`${lang}-${h}`} className="titem" {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }}>
                  <span className="ti">0{i + 1}</span><h4>{h}</h4><p>{p}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div className="faith" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1, ease }}>
            <motion.div className="q" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.9, ease }}>{L.faithQ}</motion.div>
            <div className="qe">{L.faithE}</div>
            <p>{L.faithP}</p>
            <small>{L.faithS}</small>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec faq" id="faq">
        <div className="wrap">
          <motion.div className="kicker" {...reveal}>{L.faqK}</motion.div>
          <RevealText key={`fq-${lang}`} text={L.faqT} className="sec-t" />
          <FAQ L={L} key={lang} />
        </div>
      </section>

      <footer>
        <div className="wrap row">
          <div className="brand"><Logo size={30} /><span>D<span className="a">a</span>NA</span> <span className="ar fa">دانة</span></div>
          <div className="pro">{L.pro.map((p) => <a key={p} href="#">{p}</a>)}</div>
        </div>
        <div className="wrap fnote">{L.foot}</div>
        <FooterMark />
      </footer>
    </>
  );
}

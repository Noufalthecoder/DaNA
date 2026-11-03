import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useInView, animate } from 'framer-motion';
import CoupleTree from './CoupleTree.jsx';
import { t } from './i18n.js';

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

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

function Logo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="96 120 320 260" aria-hidden="true">
      <path fill="#00843D" d="M120 196 C 118 300, 178 352, 256 352 C 338 352, 398 296, 392 176 C 391 168, 384 166, 382 174 C 376 270, 326 316, 256 316 C 190 316, 142 278, 132 196 C 131 186, 121 186, 120 196 Z" />
      <motion.circle cx="256" cy="214" r="44" fill="#fff" stroke="#CE1126" strokeWidth="10"
        animate={{ cy: [214, 204, 214] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  );
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
  const [lang, setLang] = useState(() => (new URLSearchParams(window.location.search).get('lang') === 'ar' ? 'ar' : 'en'));
  const [protectedCount, setProtectedCount] = useState(0);
  const L = t[lang];
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 20));
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const word = (w, i, cls = '') => (
    <motion.span key={`${lang}-${w}-${i}`} className={`w ${cls}`} initial={{ opacity: 0, y: 40, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.15 + i * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
  );
  const green = (w, i) => (
    <motion.span key={`${lang}-g-${w}`} className="w g" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.09, duration: 0.6 }}>
      {w}
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
        <motion.path d="M2 9 C 50 2, 120 2, 198 8" stroke="#CE1126" strokeWidth="4" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1 + i * 0.1, duration: 0.7 }} />
      </svg>
    </motion.span>
  );
  const marqueeItems = [...L.marquee, ...L.marquee, ...L.marquee, ...L.marquee];

  return (
    <>
      <motion.div className="progress" style={{ scaleX: scrollYProgress }} />

      <nav className={`top ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap bar">
          <motion.div className="brand" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Logo /><span>D<span className="a">a</span>NA</span>
          </motion.div>
          <div className="links">
            {L.nav.map((n, i) => <a key={n} href={['#how', '#tree', '#trust', '#trust', '#faq'][i]}>{n}</a>)}
          </div>
          <div className="nav-r">
            <div className="lang">
              <button className={`arb ${lang === 'ar' ? 'on' : ''}`} onClick={() => setLang('ar')}>عربي</button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <motion.a className="btn btn-green" href="#" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>{L.login} <small>{L.demo}</small></motion.a>
          </div>
        </div>
      </nav>
      <div className="stripe" />

      {/* HERO */}
      <section className="hero">
        <div className="wrap grid">
          <div>
            <motion.div className="pill" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} key={`p-${lang}`}><i />{L.pill}</motion.div>
            <h1 className="title">
              {L.h1a.map((w, i) => word(w, i))}{green(L.h1aG, L.h1a.length)}<span className="dot">.</span><br />
              {L.h1b.map((w, i) => word(w, i + 3))}{green(L.h1bG, L.h1b.length + 3)}<span className="dot">.</span>
            </h1>
            <motion.div className="h1-sub" dir={lang === 'ar' ? 'ltr' : 'rtl'} style={{ textAlign: lang === 'ar' ? 'right' : 'left' }} key={`s-${lang}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>{L.h1ar}</motion.div>
            <motion.p className="lead" key={`l-${lang}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>{L.lead}</motion.p>
            <motion.div className="ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }}>
              <motion.a className="btn btn-green" href="#" whileHover={{ y: -3, boxShadow: '0 16px 30px rgba(0,132,61,.35)' }} whileTap={{ scale: 0.97 }}>{L.login} <small>{L.demo}</small></motion.a>
              <motion.a className="btn btn-line" href="#how" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>▶&nbsp; {L.watch}</motion.a>
            </motion.div>
            <div className="chips">
              {L.chips.map((c, i) => (
                <motion.div key={`${lang}-${c}`} className="chip" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3 + i * 0.12 }}><b>✓</b> {c}</motion.div>
              ))}
            </div>
          </div>
          <div className="hero-art">
            {[[30, 40, 18, 0], [520, 20, 12, 1], [560, 520, 16, 2], [-10, 560, 10, 1.5], [480, 300, 8, 0.7]].map(([x, y, s, d], i) => (
              <motion.div key={i} className="particle" style={{ left: x, top: y, width: s, height: s }}
                animate={{ y: [0, -18, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 5 + i, repeat: Infinity, delay: d }} />
            ))}
            <CoupleTree L={L} ar={lang === 'ar'} />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee">
        <motion.div className="track" animate={{ x: lang === 'ar' ? ['0%', '50%'] : ['0%', '-50%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
          {marqueeItems.map((m, i) => <span key={i}>{m}</span>)}
        </motion.div>
      </div>

      {/* BAND */}
      <section className="band">
        <motion.div className="ring" style={{ width: 300, height: 300, left: -80, top: -120 }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="ring" style={{ width: 220, height: 220, right: -60, bottom: -90 }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="wrap">
          <motion.p {...reveal} key={`b-${lang}`}>{L.band}</motion.p>
          <motion.div className={`sub ${lang === 'en' ? 'ar' : ''}`} {...reveal} transition={{ ...reveal.transition, delay: 0.2 }}>{L.bandAr}</motion.div>
        </div>
      </section>

      {/* HOW */}
      <section className="sec" id="how">
        <div className="wrap">
          <motion.div className="kicker" {...reveal}>{L.howK}</motion.div>
          <motion.div className="sec-t" {...reveal}>{L.howT}</motion.div>
          <motion.div className="sec-s" {...reveal}>{L.howS}</motion.div>
          <div className="cards">
            {L.cards.map((c, i) => (
              <motion.div key={`${lang}-${c.t}`} className={`card c${i + 1}`} {...reveal} transition={{ ...reveal.transition, delay: i * 0.15 }}
                whileHover={{ y: -10, boxShadow: '0 24px 50px rgba(0,0,0,.10)' }}>
                <div className="num">0{i + 1}</div>
                <motion.div className="ic" whileHover={{ rotate: [0, -8, 8, 0] }}>
                  {i === 0 && <svg width="34" height="34" viewBox="0 0 34 34"><path d="M17 30 V14" stroke="#0B6B3A" strokeWidth="3" strokeLinecap="round" /><path d="M17 30 C 12 31, 8 32, 5 33 M17 30 C 22 31, 26 32, 29 33" stroke="#0B6B3A" strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="11" r="8" fill="#00843D" /></svg>}
                  {i === 1 && <svg width="34" height="34" viewBox="0 0 34 34"><circle cx="13" cy="17" r="8" fill="none" stroke="#00843D" strokeWidth="3" /><circle cx="21" cy="17" r="8" fill="none" stroke="#CE1126" strokeWidth="3" /></svg>}
                  {i === 2 && <svg width="34" height="34" viewBox="0 0 34 34"><path d="M17 10 L8 24 M17 10 L26 24 M17 10 V25" stroke="#111412" strokeWidth="2.4" /><circle cx="17" cy="8" r="5" fill="#CE1126" /><circle cx="8" cy="25" r="4" fill="#00843D" /><circle cx="17" cy="26" r="4" fill="#00843D" /><circle cx="26" cy="25" r="4" fill="#00843D" /></svg>}
                </motion.div>
                <h3>{c.t} <span>{c.ar}</span></h3>
                <div className="tag">{c.tag}</div>
                <p>{c.p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TREE */}
      <section className="sec treesec" id="tree">
        <div className="wrap grid">
          <motion.div {...reveal}>
            <h2>{L.treeT1}<br /><span className="g">{L.treeT2}</span></h2>
            <p>{L.treeP}</p>
            <div className="stats">
              <div className="stat"><CountUp to={50} prefix="~" suffix="%" className="" /><span>{L.stats[0][0]}<br />{L.stats[0][1]}</span></div>
              <div className="stat"><strong>0</strong><span>{L.stats[1][0]}<br />{L.stats[1][1]}</span></div>
              <div className="stat">
                <motion.strong key={protectedCount} initial={{ scale: 1.6, color: '#3CC07A' }} animate={{ scale: 1, color: protectedCount ? '#3CC07A' : '#ffffff' }}>{protectedCount}</motion.strong>
                <span>{L.stats[2][0]}<br />{L.stats[2][1]}</span>
              </div>
            </div>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }}>
            <FamilyAlert L={L} onSent={setProtectedCount} />
          </motion.div>
        </div>
      </section>

      {/* TRUST + FAITH */}
      <section className="sec trust" id="trust">
        <div className="wrap grid">
          <div>
            <motion.div className="sec-t" {...reveal}>{L.trustT}</motion.div>
            <div className="tlist">
              {L.trust.map(([h, p], i) => (
                <motion.div key={`${lang}-${h}`} className="titem" {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} whileHover={{ x: lang === 'ar' ? -6 : 6 }}>
                  <h4>{h}</h4><p>{p}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div className="faith" initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <motion.div style={{ position: 'absolute', right: -60, bottom: -60, width: 220, height: 220, borderRadius: '50%', border: '30px solid rgba(255,255,255,.08)' }}
              animate={{ rotate: 360, scale: [1, 1.08, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="q" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>{L.faithQ}</motion.div>
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
          <motion.div className="sec-t" {...reveal}>{L.faqT}</motion.div>
          <FAQ L={L} key={lang} />
        </div>
      </section>

      <div className="stripe" />
      <footer>
        <div className="wrap row">
          <div>
            <div className="brand"><Logo size={34} /><span>D<span className="a">a</span>NA</span> <span className="ar" style={{ fontSize: 20, color: '#3CC07A' }}>دانة</span></div>
            <div style={{ marginTop: 10, maxWidth: 720 }}>{L.foot}</div>
          </div>
          <div className="pro">{L.pro.map((p) => <span key={p}>{p}</span>)}</div>
        </div>
      </footer>
    </>
  );
}

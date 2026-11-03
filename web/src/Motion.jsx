import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import {
  motion, useScroll, useTransform, useSpring, useVelocity, useMotionValue, useAnimationFrame,
} from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1];

/* Buttery smooth scrolling. Skipped for people who prefer reduced motion. */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    window.__lenis = lenis;
    let id;
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); window.__lenis = null; };
  }, []);
}

export function scrollToHash(e, hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  e.preventDefault();
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -70, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

/* Heading whose words slide up from behind a mask when it enters the view. */
export function RevealText({ text, as = 'h2', className, delay = 0 }) {
  const Tag = motion[as];
  const words = String(text).split(' ');
  return (
    <Tag className={`reveal ${className || ''}`} initial="hide" whileInView="show" viewport={{ once: true, amount: 0.5 }}>
      {words.map((w, i) => (
        <span className="mask" key={`${w}-${i}`}>
          <motion.span className="mw" variants={{ hide: { y: '110%' }, show: { y: '0%' } }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.06 }}>{w}</motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* A statement that lights up word by word as you scroll through it. */
function Word({ p, range, children, accent }) {
  const op = useTransform(p, range, [0.12, 1]);
  const y = useTransform(p, range, [6, 0]);
  return <motion.span className={`sw ${accent ? 'acc' : ''}`} style={{ opacity: op, y }}>{children}</motion.span>;
}
export function ScrollWords({ text, accent = [] }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className="scroll-words">
      {words.map((w, i) => (
        <Word key={i} p={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}
          accent={accent.some((a) => w.replace(/[.,،…]/g, '').includes(a))}>{w}</Word>
      ))}
    </p>
  );
}

/* Marquee whose speed and direction follow how fast you scroll. */
const wrap = (min, max, v) => { const r = max - min; return ((((v - min) % r) + r) % r) + min; };
export function VelocityMarquee({ items, rtl, base = 2.2 }) {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(vel, [0, 1000], [0, 5], { clamp: false });
  const dir = useRef(rtl ? 1 : -1);
  useAnimationFrame((_, delta) => {
    const f = factor.get();
    if (f < 0) dir.current = rtl ? -1 : 1; else if (f > 0) dir.current = rtl ? 1 : -1;
    const move = dir.current * base * (delta / 1000) * (1 + Math.abs(f));
    x.set(x.get() + move);
  });
  const tx = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);
  const all = [...items, ...items, ...items, ...items];
  return (
    <div className="marquee" dir="ltr">
      <motion.div className="track" style={{ x: tx }}>
        {all.map((m, i) => <span key={i} className={i % 2 ? 'o' : ''}>{m}</span>)}
      </motion.div>
    </div>
  );
}

/* Cards that pin and stack as you scroll; earlier cards settle back. */
function StackCard({ i, n, p, children, className }) {
  const scale = useTransform(p, [i / n, 1], [1, 1 - (n - 1 - i) * 0.045]);
  const dim = useTransform(p, [i / n, 1], [0, (n - 1 - i) * 0.08]);
  return (
    <div className="stack-item">
      <motion.div className={`stack-card ${className || ''}`} style={{ scale, top: `calc(13vh + ${i * 26}px)` }}>
        {children}
        <motion.div className="stack-dim" style={{ opacity: dim }} />
      </motion.div>
    </div>
  );
}
export function StackCards({ items, render }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <div ref={ref} className="stack">
      {items.map((it, i) => (
        <StackCard key={i} i={i} n={items.length} p={scrollYProgress} className={`c${i + 1}`}>{render(it, i)}</StackCard>
      ))}
    </div>
  );
}

/* A dark section that grows from a rounded card to full width as it arrives. */
export function ExpandSection({ children, className, id }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.15'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const clip = useTransform(p, (v) => `inset(0% ${(1 - v) * 5}% round ${(1 - v) * 44}px)`);
  return <motion.section ref={ref} id={id} className={className} style={{ clipPath: clip }}>{children}</motion.section>;
}

/* Giant wordmark that rises as the page ends. */
export function FooterMark() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['45%', '0%']);
  const op = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  return (
    <div ref={ref} className="footmark" dir="ltr" aria-hidden="true">
      <motion.div style={{ y, opacity: op }}>D<span>a</span>NA</motion.div>
    </div>
  );
}

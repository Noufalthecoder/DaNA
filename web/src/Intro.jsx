import { motion } from 'framer-motion';

export default function Intro({ L, onDone }) {
  const letters = ['D', 'a', 'N', 'A'];
  return (
    <motion.div className="intro" initial={{ opacity: 1 }} exit={{ y: '-100%', transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }} onClick={onDone}>
      <svg width="220" height="200" viewBox="96 40 320 330" aria-hidden="true">
        <motion.path fill="#00843D"
          d="M120 196 C 118 300, 178 352, 256 352 C 338 352, 398 296, 392 176 C 391 168, 384 166, 382 174 C 376 270, 326 316, 256 316 C 190 316, 142 278, 132 196 C 131 186, 121 186, 120 196 Z"
          initial={{ pathLength: 0, opacity: 0, scale: 0.8 }} animate={{ pathLength: 1, opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} />
        {/* ripple when the pearl lands */}
        {[0, 1].map((i) => (
          <motion.ellipse key={i} cx="256" cy="262" rx="40" ry="10" fill="none" stroke="#CE1126" strokeWidth="3"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.6], opacity: [0.8, 0] }} transition={{ delay: 1.05 + i * 0.18, duration: 0.9 }} />
        ))}
        {/* the pearl drops into the shell */}
        <motion.circle cx="256" cy="214" r="44" fill="#fff" stroke="#CE1126" strokeWidth="10"
          initial={{ y: -260, opacity: 0 }} animate={{ y: [-260, 0, -26, 0, -6, 0], opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9, times: [0, 0.55, 0.72, 0.86, 0.94, 1], ease: 'easeIn' }} />
      </svg>
      <div className="intro-word">
        {letters.map((l, i) => (
          <motion.span key={i} className={i === 1 ? 'a' : ''} initial={{ y: 60, opacity: 0, rotate: 8 }} animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 1.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 18 }}>{l}</motion.span>
        ))}
      </div>
      <motion.div className="intro-tag" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>{L.introTag}</motion.div>
      <motion.div className="intro-bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.4, ease: 'easeInOut' }} />
      <button className="intro-skip" onClick={onDone}>{L.skip} →</button>
    </motion.div>
  );
}

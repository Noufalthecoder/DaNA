/* App language: English, Arabic, Urdu. Owner: Platform.
   The chosen language is kept per device. Arabic and Urdu switch the whole page to right-to-left.
   Screens are written in English; the translator (Translator.jsx) swaps visible text using the dictionary in
   i18n_dict.js, so every screen follows without rewriting each component. Wording is a draft for review by
   native-speaking genetic counsellors (same rule as explain.js). */
import { useEffect, useState } from 'react';
import { ROWS, PATTERNS } from './i18n_dict.js';

export const LANGS = [['en', 'English'], ['ar', 'العربية'], ['ur', 'اردو']];
const KEY = 'dana.lang';
const listeners = new Set();
let current = (() => { try { const v = localStorage.getItem(KEY); return ['en', 'ar', 'ur'].includes(v) ? v : 'en'; } catch { return 'en'; } })();

export const getLang = () => current;
export const isRtl = (l = current) => l === 'ar' || l === 'ur';

export function applyDocLang(l = current) {
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr';
}

export function setLang(l) {
  if (!['en', 'ar', 'ur'].includes(l) || l === current) return;
  current = l;
  try { localStorage.setItem(KEY, l); } catch {}
  applyDocLang(l);
  listeners.forEach((f) => f(l));
}

export function useLang() {
  const [l, setL] = useState(current);
  useEffect(() => { listeners.add(setL); return () => listeners.delete(setL); }, []);
  return l;
}

/* ---- lookup ---- */
const DICT = { ar: new Map(), ur: new Map() };
for (const [en, ar, ur] of ROWS) {
  const k = norm(en);
  if (ar) DICT.ar.set(k, ar);
  if (ur) DICT.ur.set(k, ur);
}
function norm(s) { return s.replace(/\s+/g, ' ').replace(/[’‘]/g, "'").trim(); }

const ARROWS = { '→': '←', '←': '→' };
const flip = (s, l) => (isRtl(l) ? s.replace(/[→←]/g, (a) => ARROWS[a]) : s);

/* translate one piece of visible text; returns null when there is no translation */
export function tr(text, l = current) {
  if (l === 'en' || !text) return null;
  const k = norm(text);
  if (!k || !/[A-Za-z]/.test(k)) return null;
  const hit = DICT[l].get(k);
  if (hit) return hit;
  // keep marks such as "✓ ", "← ", " →", "…" around a known phrase
  const m = k.match(/^([✓✔⏳←→•·\s]*)(.*?)([\s:→←…]*)$/);
  if (m && (m[1] || m[3]) && m[2]) {
    const core = DICT[l].get(m[2]) || patterned(m[2], l);
    if (core) return flip(m[1], l) + core + flip(m[3].replace(':', l === 'en' ? ':' : ':'), l);
  }
  const p = patterned(k, l);
  if (p) return p;
  // "A · B · C": translate each part we know
  if (k.includes(' · ')) {
    const parts = k.split(' · ');
    const out = parts.map((x) => DICT[l].get(x) || patterned(x, l) || x);
    if (out.some((x, i) => x !== parts[i])) return out.join(' · ');
  }
  return null;
}

/* phrase or name inside a pattern: translate it if we can, keep names as they are */
const word = (s, l) => DICT[l].get(norm(s)) || s;

function patterned(k, l) {
  for (const [re, by] of PATTERNS) {
    const m = k.match(re);
    if (m) return by[l === 'ar' ? 0 : 1](...m.slice(1).map((g) => word(g || '', l)));
  }
  return null;
}

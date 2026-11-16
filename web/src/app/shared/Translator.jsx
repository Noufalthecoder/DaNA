/* Swaps visible English text for Arabic or Urdu, live, across the whole app (see i18n.js).
   Only text nodes and a few attributes change; React keeps its own copy, and when it re-renders a node
   in English the observer translates it again. Switching back to English restores every original. */
import { useEffect, useState } from 'react';
import { useLang, tr, applyDocLang, setLang, LANGS } from './i18n.js';
import './i18n.css';

/* the language switch shown in the top bar and on onboarding (never translated itself) */
export function LangSwitch() {
  const l = useLang();
  return (
    <div className="lang-sw" role="group" aria-label="Language / اللغة / زبان" data-notr>
      {LANGS.map(([v, label]) => (
        <button key={v} type="button" lang={v} className={l === v ? 'on' : ''} aria-pressed={l === v} onClick={() => setLang(v)}>{label}</button>
      ))}
    </div>
  );
}

const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = 'script,style,textarea,code,pre,[data-notr],.as-msg';
const orig = new WeakMap();      // text node -> original English
const mine = new WeakMap();      // text node -> the translation we wrote (to ignore our own changes)
const origAttr = new WeakMap();  // element -> { attr: original }

function skip(el) { return !el || el.closest?.(SKIP); }

function doText(n, l) {
  if (skip(n.parentElement)) return;
  const now = n.nodeValue;
  if (mine.get(n) === now) return;                 // our own translation
  if (l === 'en') { if (orig.has(n) && mine.get(n) === now) n.nodeValue = orig.get(n); return; }
  const t = tr(now, l);
  if (t == null) { orig.delete(n); mine.delete(n); return; }
  orig.set(n, now);
  const lead = now.match(/^\s*/)[0], tail = now.match(/\s*$/)[0];
  const v = lead + t + tail;
  mine.set(n, v);
  n.nodeValue = v;
}

function doAttrs(el, l) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const saved = origAttr.get(el) || {};
    const cur = el.getAttribute(a);
    if (saved[a] && saved[a].t === cur) { if (l === 'en') el.setAttribute(a, saved[a].en); continue; }
    if (l === 'en') continue;
    const t = tr(cur, l);
    if (t) { saved[a] = { en: cur, t }; origAttr.set(el, saved); el.setAttribute(a, t); }
  }
}

function walk(root, l) {
  if (root.nodeType === 3) return doText(root, l);
  if (root.nodeType !== 1 || skip(root)) return;
  doAttrs(root, l);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = it.nextNode())) { if (n.nodeType === 3) doText(n, l); else doAttrs(n, l); }
}

function restore(root) {
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = it.nextNode())) {
    if (n.nodeType === 3) { if (orig.has(n) && mine.get(n) === n.nodeValue) n.nodeValue = orig.get(n); orig.delete(n); mine.delete(n); }
    else { const s = origAttr.get(n); if (s) { for (const [a, v] of Object.entries(s)) if (n.getAttribute(a) === v.t) n.setAttribute(a, v.en); origAttr.delete(n); } }
  }
}

/* the public landing page has its own design; the language applies to sign-in, onboarding and the app */
const inScope = () => /^#\/(app|login|onboarding|join|invite)/.test(window.location.hash);
function useInScope() {
  const [on, setOn] = useState(inScope);
  useEffect(() => { const f = () => setOn(inScope()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return on;
}

export default function Translator() {
  const chosen = useLang();
  const l = useInScope() ? chosen : 'en';
  useEffect(() => {
    applyDocLang(l);
    const root = document.getElementById('root') || document.body;
    if (l === 'en') { restore(root); return; }
    walk(root, l);
    const ob = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target, l);
        else if (m.type === 'attributes') doAttrs(m.target, l);
        else m.addedNodes.forEach((x) => walk(x, l));
      }
    });
    ob.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => ob.disconnect();
  }, [l]);
  return null;
}

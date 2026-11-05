/* My partner invite code + "enter your partner's code". Owner: Platform.
   Used at the top of Connections. Linking creates the real couple in the database (009/010). */
import { useEffect, useState } from 'react';
import { useStore } from './store.js';
import { refreshSession } from './supabase.js';
import { createPartnerInvite, acceptPartnerInvite, loadAll } from './db.js';
import { go } from './router.js';

export const PENDING_CODE_KEY = 'dana.partnerCode';
const readPending = () => { try { return sessionStorage.getItem(PENDING_CODE_KEY) || ''; } catch { return ''; } };
const clearPending = () => { try { sessionStorage.removeItem(PENDING_CODE_KEY); } catch {} };

export default function PartnerCode() {
  const session = useStore((s) => s.session);
  const [code, setCode] = useState('');
  const [partnerCode, setPartnerCode] = useState(readPending());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const live = !!session?.backend;
  const hasProfile = live && !session.needsProfile;
  const linked = !!session?.couple;

  useEffect(() => {
    if (hasProfile && !linked && !code) createPartnerInvite().then(setCode).catch((e) => setErr(e.message));
  }, [hasProfile, linked, code]);

  // my partner may enter my code on their phone: check now and then
  useEffect(() => {
    if (!hasProfile || linked) return;
    const t = setInterval(async () => {
      const s = await refreshSession().catch(() => null);
      if (s?.couple) { clearInterval(t); await loadAll(); go('/app'); }
    }, 15000);
    return () => clearInterval(t);
  }, [hasProfile, linked]);

  if (!live || linked) return null;
  if (!hasProfile) {
    return (
      <div className="pcode">
        <p className="muted">Create your health profile on <a href="#/app">Home</a> first. Your invite code appears here right after.</p>
      </div>
    );
  }

  const link = code ? `${window.location.origin}${window.location.pathname}#/join/${code}` : '';
  const share = `Assalamu alaikum! Join me on DaNA for our premarital genetic results. Use my code ${code} or open: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await acceptPartnerInvite(partnerCode);
      clearPending();
      await refreshSession();
      await loadAll();
      go('/app');
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="pcode">
      <div className="code-box">
        <small>Your invite code</small>
        <b>{code || '······'}</b>
        <div className="btn-row">
          <button className="btn secondary" onClick={copy} disabled={!code}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          <a className="btn secondary" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
        <small>Valid for 7 days. When your partner enters it, you are linked.</small>
      </div>
      <form className="code-in" onSubmit={submit}>
        <label htmlFor="pcode">Have your partner's code?</label>
        <div>
          <input id="pcode" value={partnerCode} onChange={(e) => setPartnerCode(e.target.value.toUpperCase())} placeholder="e.g. K7M2QX" maxLength={8} autoComplete="off" />
          <button className="btn" disabled={busy || partnerCode.trim().length < 6}>{busy ? 'Linking…' : 'Link'}</button>
        </div>
        <small className="muted">Entering a code is your consent to link and share results with your partner.</small>
      </form>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

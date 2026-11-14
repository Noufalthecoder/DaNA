/* Privacy: who saw my data, my consents, withdraw Malaffi consent (027). Owner: Couple app. */
import { useEffect, useState } from 'react';
import { Page, Card, Toggle, Badge } from '../shared/ui.jsx';
import { useStore, set, get } from '../shared/store.js';
import { setConsent, loadAll, isLive } from '../shared/db.js';
import { supabase, refreshSession } from '../shared/supabase.js';

const ITEMS = [
  ['sharePartner', 'Share my result with my partner', 'Your linked partner can see your result.'],
  ['shareCounsellor', 'Share my result with my counsellor', 'Needed for a counselling session.'],
  ['faithCards', 'Show faith cards', 'Scholar-reviewed guidance, optional.'],
];
const when = (t) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Privacy() {
  const consents = useStore((s) => s.consents);
  const audit = useStore((s) => s.audit);
  const session = useStore((s) => s.session);
  const live = isLive();
  const [seen, setSeen] = useState(null);
  const [consent, setConsentInfo] = useState(null);
  const [asking, setAsking] = useState(false);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (!live) { setSeen([]); setConsentInfo({ granted: !!session?.malaffiConsent, updated_at: session?.malaffiConsentAt, version: 'malaffi-consent-v1' }); return; }
    const [w, c] = await Promise.all([supabase.rpc('who_saw_my_data'), supabase.rpc('my_consent_status')]);
    setSeen(w.error ? [] : w.data || []);
    setConsentInfo(c.error ? { granted: !!session?.malaffiConsent } : c.data);
  };
  useEffect(() => { load(); }, [live, session?.malaffiConsent]); // eslint-disable-line react-hooks/exhaustive-deps

  const withdraw = async () => {
    setBusy(true); setMsg('');
    try {
      if (live) {
        const { error } = await supabase.rpc('withdraw_malaffi_consent', { p_delete: del });
        if (error) throw new Error(error.message);
        await refreshSession();
        await loadAll();
      } else {
        const s = get();
        set({
          session: { ...s.session, malaffiConsent: false },
          ...(del ? { reports: { ...(s.reports || {}), [s.session.id]: undefined }, demoLab: { ...(s.demoLab || {}), [s.session.id]: undefined } } : {}),
        }, del ? 'Withdrew Malaffi consent and deleted fetched results (demo)' : 'Withdrew Malaffi consent (demo)');
      }
      setMsg(del ? 'Consent withdrawn and your fetched results deleted.' : 'Consent withdrawn. DaNA will not read Malaffi again unless you give consent.');
      setAsking(false); setDel(false);
      load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const mine = audit.filter((a) => a.who === session.name).slice(0, 8);

  return (
    <Page title="Privacy" sub="You decide who sees what. Change it any time.">
      <Card title="Malaffi access">
        {consent?.granted ? (
          <>
            <p><Badge tone="green">Consent given</Badge>{consent.updated_at && <span className="muted"> on {when(consent.updated_at)}{consent.version ? ` · ${consent.version}` : ''}</span>}</p>
            <p className="muted">DaNA reads your premarital results from Malaffi only with this consent, and only to explain your result and support your care.</p>
            {!asking ? (
              <button className="btn secondary" onClick={() => setAsking(true)}>Withdraw consent</button>
            ) : (
              <div className="pv-confirm" role="group" aria-label="Withdraw consent">
                <p><b>Withdraw your consent?</b> DaNA stops reading Malaffi. Your partner's couple result will wait until you consent again.</p>
                <label className="mc-box"><input type="checkbox" checked={del} onChange={(e) => setDel(e.target.checked)} /> Also delete the results DaNA already fetched</label>
                <div className="btn-row">
                  <button className="btn danger" onClick={withdraw} disabled={busy}>{busy ? 'Withdrawing…' : 'Withdraw'}</button>
                  <button className="btn secondary" onClick={() => { setAsking(false); setDel(false); }} disabled={busy}>Keep my consent</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p><Badge tone="grey">No consent</Badge>{consent?.revoked_at && <span className="muted"> withdrawn {when(consent.revoked_at)}</span>}</p>
            <p className="muted">DaNA is not reading Malaffi. You can give consent again on Home when you are ready.</p>
            <a className="btn" href="#/app">Go to Home</a>
          </>
        )}
        {msg && <p className="pv-msg" role="status">{msg}</p>}
      </Card>

      <Card title="Who saw my data">
        {seen === null ? <p className="muted">Loading…</p>
          : seen.length === 0 ? <p className="muted">Nobody else has opened your data yet. When your partner, a counsellor or the programme team does, it shows here.</p>
          : (
            <ul className="pv-seen">
              {seen.map((r, i) => (
                <li key={i}>
                  <span className={`pv-role pv-${r.role.split(' ')[0].toLowerCase()}`}>{r.role}</span>
                  <div><b>{r.who}</b><span>{r.action}</span></div>
                  <time>{when(r.at)}</time>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <Card title="Your consents">
        {ITEMS.map(([k, l, h]) => <Toggle key={k} label={l} hint={h} checked={consents[k]} onChange={(v) => setConsent(k, v)} />)}
      </Card>

      <Card title="Your recent activity">
        {mine.length ? <ul className="log">{mine.map((a, i) => <li key={i}><time>{when(a.t)}</time>{a.what}</li>)}</ul> : <p className="muted">No activity yet.</p>}
      </Card>
    </Page>
  );
}

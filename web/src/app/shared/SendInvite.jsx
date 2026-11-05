/* "Send invitation" on Connections. Owner: Platform.
   WhatsApp: opens WhatsApp with the message and number ready (automatic sending needs the paid
   WhatsApp Business API). Email: sent automatically by the API when an email service is set up,
   otherwise the user's email app opens with the message ready. */
import { useState } from 'react';
import { api } from './api.js';
import { recordExternalInvitation } from './connectionsService.js';

export default function SendInvite({ code, senderName, senderId }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('whatsapp');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const link = `${window.location.origin}${window.location.pathname}#/join/${code}`;
  const text = `Assalamu alaikum! ${senderName} invited you to link on DaNA for our premarital screening result. Open ${link} or enter my code ${code} in Connections.`;

  const sendWhatsApp = (e) => {
    e.preventDefault();
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 8) { setMsg({ err: 'Enter the phone number with country code, e.g. 971501234567.' }); return; }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    recordExternalInvitation({ senderId, channel: 'whatsapp', recipientContact: digits }).catch(() => {});
    setMsg({ ok: 'WhatsApp opened with your invitation. Tap Send there.' });
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    const to = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(to)) { setMsg({ err: 'Enter a valid email address.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api('/invite/email', { method: 'POST', body: { email: to, code } });
      recordExternalInvitation({ senderId, channel: 'gmail', recipientContact: to }).catch(() => {});
      setMsg({ ok: `Invitation sent to ${to}.` });
    } catch (err) {
      if (/not set up/i.test(err.message)) {
        // no email service yet: open the user's own email app with the message ready
        window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`${senderName} invited you to DaNA`)}&body=${encodeURIComponent(text)}`;
        recordExternalInvitation({ senderId, channel: 'gmail', recipientContact: to }).catch(() => {});
        setMsg({ ok: 'Your email app opened with the invitation ready. Press Send there.' });
      } else setMsg({ err: err.message });
    }
    setBusy(false);
  };

  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>Send invitation</button>;
  return (
    <div className="si">
      <div className="si-h">
        <b>Send invitation</b>
        <button type="button" className="link" onClick={() => { setOpen(false); setMsg(null); }}>Close</button>
      </div>
      <div className="seg" role="tablist">
        {[['whatsapp', 'WhatsApp'], ['email', 'Email']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>
      {tab === 'whatsapp' ? (
        <form onSubmit={sendWhatsApp} className="si-f">
          <label>Partner's mobile number<input type="tel" inputMode="tel" placeholder="971501234567" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <button className="btn">Send on WhatsApp</button>
        </form>
      ) : (
        <form onSubmit={sendEmail} className="si-f">
          <label>Partner's email<input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send email'}</button>
        </form>
      )}
      <p className="si-prev"><small>Message:</small> {text}</p>
      {msg?.err && <p className="err">{msg.err}</p>}
      {msg?.ok && <p className="ok-msg">{msg.ok}</p>}
    </div>
  );
}

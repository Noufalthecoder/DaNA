import { useState } from 'react';
import { Page, Card, Stat } from '../shared/ui.jsx';
import { MONTHLY } from '../shared/data.js';
import { useStore } from '../shared/store.js';

/* single-series column chart: one hue, thin rounded bars, recessive grid, hover tooltip, table view */
function ScreeningsChart() {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const W = 1000, H = 300, pad = { l: 48, r: 8, t: 14, b: 30 };
  const max = 2000, ticks = [0, 500, 1000, 1500, 2000];
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const band = iw / MONTHLY.length, bw = Math.min(36, band * 0.3);
  const y = (v) => pad.t + ih - (v / max) * ih;

  return (
    <Card title="Couples screened per month" aside={<button className="link" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show table'}</button>}>
      {table ? (
        <table className="table"><thead><tr><th>Month</th><th className="right">Couples screened</th></tr></thead>
          <tbody>{MONTHLY.map((d) => <tr key={d.m}><td>{d.m} 2026</td><td className="right">{d.n.toLocaleString()}</td></tr>)}</tbody></table>
      ) : (
        <div className="chart">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Couples screened per month, May to October 2026, rising from 1,180 to 1,745">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={pad.l - 8} y={y(t) + 4} className="tick" textAnchor="end">{t.toLocaleString()}</text>
              </g>
            ))}
            {MONTHLY.map((d, i) => {
              const cx = pad.l + band * i + band / 2, top = y(d.n), h = pad.t + ih - top;
              return (
                <g key={d.m} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={cx - band / 2} y={pad.t} width={band} height={ih} fill="transparent" />
                  <path d={`M${cx - bw / 2} ${top + h} V${top + 4} q0 -4 4 -4 H${cx + bw / 2 - 4} q4 0 4 4 V${top + h} Z`} className={`bar ${hover === i ? 'hl' : ''}`} />
                  <text x={cx} y={H - 8} className="tick" textAnchor="middle">{d.m}</text>
                </g>
              );
            })}
            {hover !== null && (() => {
              const d = MONTHLY[hover], cx = pad.l + band * hover + band / 2, ty = y(d.n) - 46;
              return (
                <g className="tip" transform={`translate(${Math.min(Math.max(cx - 62, pad.l), W - 132)} ${Math.max(ty, 0)})`}>
                  <rect width="124" height="38" rx="8" />
                  <text x="12" y="16" className="tip-l">{d.m} 2026</text>
                  <text x="12" y="31" className="tip-v">{d.n.toLocaleString()} couples</text>
                </g>
              );
            })()}
          </svg>
        </div>
      )}
    </Card>
  );
}

export default function Overview() {
  const sent = useStore((s) => s.alertsSent);
  const approved = useStore((s) => s.approved);
  return (
    <Page title="Programme overview" sub="Abu Dhabi premarital genetic screening · synthetic data">
      <div className="stats four">
        <Stat label="Couples screened" value="8,405" note="since May 2026" />
        <Stat label="Same-gene couples" value="312" note="compatible, with a plan" />
        <Stat label="Sila alerts sent" value={(1284 + sent.length).toLocaleString()} note="anonymous" />
        <Stat label="Relatives screened" value="417" note="after an alert" />
      </div>
      <ScreeningsChart />
      <div className="stats">
        <Stat label="Median wait for counsellor" value="2.4 days" note="urgent cases: same day" />
        <Stat label="Plans approved" value={(268 + approved.length).toLocaleString()} />
        <Stat label="Couples who married" value="91%" note="of same-gene couples, with a plan" />
      </div>
    </Page>
  );
}

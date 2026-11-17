/* Charts for Outcome metrics: plain SVG, no chart library. Owner: Platform.
   Every value a tooltip shows is also on the chart or in the table view; marks take keyboard focus too. */
import { useLayoutEffect, useRef, useState } from 'react';

export const C = {
  green: '#00843D', greenTrack: '#E3EFE7',
  orange: '#EB6834', orangeTrack: '#FBE4DA',
  good: '#0CA30C', warning: '#FAB219',
  ink: '#17201B', ink2: '#56625B', ink3: '#8A958F', grid: '#E6EAE7', axis: '#C9D0CC',
};
// one colour per language, fixed, so a hidden group never repaints the others (validated: CVD-safe on white)
export const LANG_COLOR = { en: '#00843D', ar: '#2A78D6', ur: '#EDA100' };

const fmt = (v) => Number(v).toLocaleString();

export function useWidth(min = 260) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = () => setW(Math.max(min, Math.floor(el.clientWidth)));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w];
}

/* one tooltip per chart: value first, then what it is */
function useTip() {
  const box = useRef(null);
  const tip = useRef(null);
  const at = useRef({ x: 0, y: 0 });
  const [content, setContent] = useState(null);

  const place = () => {
    const b = box.current, t = tip.current;
    if (!b || !t) return;
    const { x, y } = at.current;
    const tw = t.offsetWidth, th = t.offsetHeight;
    let left = x + 14;
    if (left + tw > b.clientWidth - 4) left = x - 14 - tw;
    let top = y - th - 12;
    if (top < 0) top = y + 18;
    t.style.transform = `translate(${Math.max(0, left)}px, ${top}px)`;
  };
  useLayoutEffect(place, [content]);

  const show = (e, c) => {
    const r = box.current.getBoundingClientRect();
    if (e.type === 'focus') {
      const m = e.currentTarget.getBoundingClientRect();
      at.current = { x: m.left + m.width / 2 - r.left, y: m.top - r.top };
    } else {
      at.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    setContent(c);
    place();
  };
  const hide = () => setContent(null);
  const bind = (c) => ({
    tabIndex: 0, role: 'img', 'aria-label': `${c.label}: ${c.value}${c.note ? `, ${c.note}` : ''}`,
    onPointerMove: (e) => show(e, c), onPointerLeave: hide, onFocus: (e) => show(e, c), onBlur: hide,
  });
  const node = (
    <div ref={tip} className={`mt-tip${content ? ' on' : ''}`} aria-hidden="true">
      {content && (
        <>
          <b>{content.value}</b>
          <span>
            {content.color && <svg width="12" height="4" className="mt-key"><line x1="0" y1="2" x2="12" y2="2" stroke={content.color} strokeWidth="3" strokeLinecap="round" /></svg>}
            {content.label}
          </span>
          {content.note && <small>{content.note}</small>}
        </>
      )}
    </div>
  );
  return { box, bind, node };
}

/* a bar that grows from its baseline: square at the base, 4px round at the data end */
function hbar(x, y, w, h) {
  if (w <= 0) return '';
  const r = Math.min(4, w, h / 2);
  return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z`;
}
function vbar(x, base, w, h) {
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
}

/* half-circle gauge for a KPI tile; `target` draws a tick (a goal or a review line) */
export function Gauge({ value, max = 100, target, color = C.green, track = C.greenTrack }) {
  const cx = 56, cy = 54, r = 44;
  const pt = (f) => [cx - r * Math.cos(Math.PI * f), cy - r * Math.sin(Math.PI * f)];
  const arc = (f) => { const [x, y] = pt(f); return `M${cx - r},${cy}A${r},${r} 0 0 1 ${x.toFixed(2)},${y.toFixed(2)}`; };
  const f = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const tick = target == null ? null : (() => {
    const t = Math.max(0, Math.min(1, target / max)), a = Math.PI * t;
    return [cx - (r - 9) * Math.cos(a), cy - (r - 9) * Math.sin(a), cx - (r + 9) * Math.cos(a), cy - (r + 9) * Math.sin(a)];
  })();
  return (
    <svg className="mt-gauge" viewBox="0 0 112 62" width="112" height="62" aria-hidden="true">
      <path d={arc(1)} fill="none" stroke={track} strokeWidth="10" strokeLinecap="round" />
      {f > 0.005 && <path className="mt-sweep" d={arc(f)} pathLength="100" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />}
      {tick && <line x1={tick[0]} y1={tick[1]} x2={tick[2]} y2={tick[3]} stroke={C.ink} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

/* thin meter: the fill on a lighter step of the same hue */
export function Meter({ value, max = 100, color = C.green, track = C.greenTrack, label }) {
  const [ref, w] = useWidth(80);
  const f = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div ref={ref} className="mt-meter" role="img" aria-label={label}>
      {w > 0 && (
        <svg width={w} height="8" aria-hidden="true">
          <rect x="0" y="0" width={w} height="8" rx="4" fill={track} />
          {f > 0 && <rect className="mt-grow" x="0" y="0" width={Math.max(8, w * f)} height="8" rx="4" fill={color} />}
        </svg>
      )}
    </div>
  );
}

/* ranked horizontal bars on a 0-100% axis, with an optional reference line (the overall figure) */
export function BarChart({ rows, refLine, unit = '%', hiddenText = 'fewer than 5 people' }) {
  const [ref, w] = useWidth(240);
  const { box, bind, node } = useTip();
  const narrow = w < 480;                                    // phones: the label sits above its bar
  const labelW = narrow ? 0 : Math.min(196, Math.round(w * 0.36)), endPad = 52, top = refLine ? 26 : 6;
  const rowH = narrow ? 50 : 44, barH = narrow ? 14 : 16, barY = narrow ? 26 : (rowH - barH) / 2;
  const x0 = labelW, plotW = Math.max(60, w - labelW - endPad), axisH = 26;
  const H = top + rows.length * rowH + axisH;
  const sx = (v) => x0 + (Math.max(0, Math.min(100, v)) / 100) * plotW;
  const midBar = (y) => y + barY + barH / 2;
  return (
    <div ref={(el) => { ref.current = el; box.current = el; }} className="mt-chart">
      {w > 0 && (
        <svg className="mt-svg" width={w} height={H}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={top - 4} y2={top + rows.length * rowH} stroke={t === 0 ? C.axis : C.grid} strokeWidth="1" />
              <text x={sx(t)} y={H - 8} textAnchor={t === 0 && narrow ? 'start' : 'middle'} className="mt-tick">{t}{unit}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = top + i * rowH, hidden = r.value == null;
            const c = { value: hidden ? 'Hidden' : `${r.value}${unit}`, label: r.label, note: hidden ? hiddenText : r.note };
            return (
              <g key={r.key} className="mt-row" {...bind(c)}>
                <rect x="0" y={y} width={w} height={rowH} fill="transparent" />
                {narrow
                  ? <text x="0" y={y + 14} dominantBaseline="central" className="mt-label">{r.label}</text>
                  : <text x={labelW - 14} y={midBar(y)} dominantBaseline="central" textAnchor="end" className="mt-label">{r.label}</text>}
                {hidden ? (
                  <text x={x0 + 8} y={midBar(y)} dominantBaseline="central" className="mt-muted">{hiddenText}</text>
                ) : (
                  <>
                    <path className="mt-grow mt-mark" d={hbar(x0, y + barY, sx(r.value) - x0, barH)} fill={r.color || C.green} />
                    <text x={sx(r.value) + 8} y={midBar(y)} dominantBaseline="central" className="mt-val">{r.value}{unit}</text>
                  </>
                )}
              </g>
            );
          })}
          {refLine && refLine.value != null && (
            <g aria-hidden="true">
              <line x1={sx(refLine.value)} x2={sx(refLine.value)} y1={top - 6} y2={top + rows.length * rowH} stroke={C.ink} strokeWidth="1.5" />
              <text x={sx(refLine.value)} y={top - 12} textAnchor={refLine.value > 70 ? 'end' : 'middle'} className="mt-reftext">{refLine.label} {refLine.value}{unit}</text>
            </g>
          )}
        </svg>
      )}
      {node}
    </div>
  );
}

/* counselling funnel: each stage centred, joined to the next, with its share of the stage before */
export function Funnel({ stages }) {
  const [ref, w] = useWidth(240);
  const { box, bind, node } = useTip();
  const narrow = w < 480;
  const labelW = narrow ? 0 : Math.min(190, Math.round(w * 0.3)), valW = narrow ? 0 : Math.min(170, Math.round(w * 0.27));
  const plotW = Math.max(80, w - labelW - valW), cx = labelW + plotW / 2, barH = 24, gap = narrow ? 52 : 26, head = narrow ? 34 : 4;
  const max = Math.max(1, ...stages.map((s) => s.value || 0));
  const bw = (v) => Math.max(6, ((v || 0) / max) * (plotW - 8));
  const H = head + stages.length * barH + (stages.length - 1) * gap + 8;
  return (
    <div ref={(el) => { ref.current = el; box.current = el; }} className="mt-chart">
      {w > 0 && (
        <svg className="mt-svg" width={w} height={H}>
          {stages.map((s, i) => {
            const y = head + i * (barH + gap), wi = bw(s.value), next = stages[i + 1];
            const c = { value: s.value == null ? '—' : fmt(s.value), label: s.label, note: s.share };
            const v = s.value == null ? '—' : fmt(s.value);
            return (
              <g key={s.label}>
                {next && (() => {
                  const wn = bw(next.value), y1 = y + barH + 2, y2 = y + barH + gap - 2;
                  return <polygon points={`${cx - wi / 2},${y1} ${cx + wi / 2},${y1} ${cx + wn / 2},${y2} ${cx - wn / 2},${y2}`} fill={C.greenTrack} />;
                })()}
                <g className="mt-row" {...bind(c)}>
                  <rect x="0" y={narrow ? y - 32 : y - gap / 2 + 2} width={w} height={narrow ? barH + 34 : barH + gap - 4} fill="transparent" />
                  {narrow ? (
                    <>
                      <text x="0" y={y - 14} dominantBaseline="central" className="mt-label">{s.label}{s.share ? ` · ${s.share}` : ''}</text>
                      <text x={w} y={y - 14} dominantBaseline="central" textAnchor="end" className="mt-big">{v}</text>
                    </>
                  ) : (
                    <>
                      <text x={labelW - 14} y={y + barH / 2} dominantBaseline="central" textAnchor="end" className="mt-label">{s.label}</text>
                      <text x={labelW + plotW + 14} y={y + barH / 2 - 7} dominantBaseline="central" className="mt-big">{v}</text>
                      {s.share && <text x={labelW + plotW + 14} y={y + barH / 2 + 11} dominantBaseline="central" className="mt-muted">{s.share}</text>}
                    </>
                  )}
                  <rect className="mt-growc mt-mark" x={cx - wi / 2} y={y} width={wi} height={barH} rx="4" fill={C.green} />
                </g>
              </g>
            );
          })}
        </svg>
      )}
      {node}
    </div>
  );
}

/* grouped columns: one group per measure, one column per language (fixed colours), the gap under each group */
export function LanguageColumns({ groups, langs, names, limit = 10 }) {
  const [ref, w] = useWidth(300);
  const { box, bind, node } = useTip();
  const yAxisW = 40, top = 22, plotH = 210, xBand = 50, H = top + plotH + xBand;
  const plotW = Math.max(120, w - yAxisW - 4), gw = plotW / groups.length;
  const colW = Math.min(24, (gw - 24) / Math.max(1, langs.length) - 2), inner = langs.length * colW + (langs.length - 1) * 2;
  const sy = (v) => top + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  return (
    <div ref={(el) => { ref.current = el; box.current = el; }} className="mt-chart">
      {w > 0 && (
        <svg className="mt-svg" width={w} height={H}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={yAxisW} x2={w} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? C.axis : C.grid} strokeWidth="1" />
              <text x={yAxisW - 8} y={sy(t)} dominantBaseline="central" textAnchor="end" className="mt-tick">{t}%</text>
            </g>
          ))}
          {groups.map((g, gi) => {
            const gx = yAxisW + gi * gw + (gw - inner) / 2;
            const vals = langs.map((l) => l[g.key]).filter((v) => v != null);
            const gap = vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : null;
            const over = gap != null && gap > limit;
            const lx = yAxisW + gi * gw + gw / 2;
            return (
              <g key={g.key}>
                {langs.map((l, li) => {
                  const v = l[g.key], x = gx + li * (colW + 2);
                  const c = { value: v == null ? 'Hidden' : `${v}%`, label: `${names[l.lang]} · ${g.label}`, note: v == null ? 'fewer than 5 people' : `${fmt(l.people ?? 0)} people`, color: LANG_COLOR[l.lang] };
                  return (
                    <g key={l.lang} className="mt-row" {...bind(c)}>
                      <rect x={x - 1} y={top} width={colW + 2} height={plotH} fill="transparent" />
                      {v != null && <path className="mt-growv mt-mark" d={vbar(x, sy(0), colW, sy(0) - sy(v))} fill={LANG_COLOR[l.lang]} />}
                      <text x={x + colW / 2} y={v == null ? sy(0) - 8 : sy(v) - 7} textAnchor="middle" className="mt-cap">{v == null ? '–' : v}</text>
                    </g>
                  );
                })}
                <text x={lx} y={top + plotH + 18} textAnchor="middle" className="mt-label">{gw < 130 && g.short ? g.short : g.label}</text>
                {gap != null && (
                  <text x={lx} y={top + plotH + 38} textAnchor="middle" className={over ? "mt-gapwarn" : "mt-muted"}>
                    <tspan fill={over ? C.warning : C.good}>{over ? '▲' : '●'}</tspan>
                    <tspan>{over ? ` Gap ${gap} · review` : ` Gap ${gap} pts`}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {node}
    </div>
  );
}

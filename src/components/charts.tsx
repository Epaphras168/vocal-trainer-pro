import { useEffect, useRef, useState, type ReactNode } from 'react';
import { midiToName } from '../audio/notes';
import './charts.css';

// Small hand-rolled SVG charts: thin marks, recessive grid, a hover layer on
// every chart, and a screen-reader table behind each one.

interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // Draw at the real pixel width so text never scales with the viewBox.
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(280, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const show = (e: { clientX: number; clientY: number }, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content });
  };
  const showAt = (x: number, y: number, content: ReactNode) => setTip({ x, y, content });
  return { tip, ref, width, show, showAt, hide: () => setTip(null) };
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="chart__tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.content}
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  /** Short axis label; falls back to `label`. */
  tick?: string;
  value: number;
}

/** Single-series column chart (e.g. XP per day). */
export function BarChart({ data, unit, height = 160, title }: { data: BarDatum[]; unit: string; height?: number; title: string }) {
  const { tip, ref, width: W, show, hide } = useTip();
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 24 };
  const max = Math.max(10, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 10) * 10;
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  const every = Math.ceil(data.length / Math.max(3, Math.floor(W / 60)));
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chart__svg" role="img" aria-label={title}>
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line className="chart__grid" x1={pad.l} x2={W - pad.r} y1={y(nice * k)} y2={y(nice * k)} />
            <text className="chart__axis" x={pad.l - 6} y={y(nice * k)} textAnchor="end" dominantBaseline="middle">
              {Math.round(nice * k)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * bw + 1;
          const w = Math.max(2, bw - 2);
          const h = Math.max(0, y(0) - y(d.value));
          return (
            <g key={d.label}>
              {d.value > 0 && <path className="chart__bar" d={roundedTop(x, y(d.value), w, h, Math.min(4, w / 2))} />}
              <rect
                className="chart__hit"
                x={pad.l + i * bw}
                y={pad.t}
                width={bw}
                height={H - pad.t - pad.b}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value} ${unit}`}
                onPointerMove={(e) => show(e, <TipBody value={`${d.value} ${unit}`} label={d.label} />)}
                onFocus={(e) => {
                  const r = (e.target as SVGRectElement).getBoundingClientRect();
                  show({ clientX: r.left + r.width / 2, clientY: r.top + 20 }, <TipBody value={`${d.value} ${unit}`} label={d.label} />);
                }}
                onPointerLeave={hide}
                onBlur={hide}
              />
              {i % every === 0 && (
                <text className="chart__axis" x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor="middle">
                  {d.tick ?? d.label}
                </text>
              )}
            </g>
          );
        })}
        <line className="chart__base" x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} />
      </svg>
      <Tooltip tip={tip} />
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function TipBody({ value, label, rows }: { value?: string; label: string; rows?: { name: string; value: string; color: string }[] }) {
  return (
    <>
      {value && <strong className="chart__tipval">{value}</strong>}
      {rows?.map((r) => (
        <span key={r.name} className="chart__tiprow">
          <i style={{ background: r.color }} />
          <strong>{r.value}</strong> {r.name}
        </span>
      ))}
      <span className="chart__tiplabel">{label}</span>
    </>
  );
}

// ---------------------------------------------------------------------------

export interface LineSeries {
  name: string;
  /** CSS colour, e.g. var(--series-1). */
  color: string;
  values: (number | null)[];
}

/** 0-100 line chart with a snapping crosshair (e.g. accuracy over sessions). */
export function LineChart({ labels, series, title, height = 180, unit = '%' }: { labels: string[]; series: LineSeries[]; title: string; height?: number; unit?: string }) {
  const { tip, ref, width: W, showAt, hide } = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const pad = { l: 34, r: 70, t: 12, b: 24 };
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / 100);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((sx - pad.l) / (W - pad.l - pad.r)) * (n - 1))));
    setHover(i);
    const box = ref.current!.getBoundingClientRect();
    showAt(
      (x(i) / W) * r.width + (r.left - box.left),
      e.clientY - box.top,
      <TipBody
        label={labels[i]}
        rows={series.map((s) => ({ name: s.name, value: s.values[i] === null ? '--' : `${s.values[i]}${unit}`, color: s.color }))}
      />,
    );
  };

  return (
    <div className="chart" ref={ref}>
      <div className="chart__legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chart__svg" role="img" aria-label={title}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line className="chart__grid" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
            <text className="chart__axis" x={pad.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {hover !== null && <line className="chart__cross" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const d = pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? 'L' : 'M'}${p[0]},${p[1]} ` : acc), '');
          const lastIdx = s.values.map((v, i) => (v === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
          return (
            <g key={s.name}>
              <path d={d} className="chart__line" style={{ stroke: s.color }} />
              {pts.map((p, i) => p && (n <= 12 || i === hover) && <circle key={i} cx={p[0]} cy={p[1]} r={4} className="chart__dot" style={{ fill: s.color }} />)}
              {lastIdx >= 0 && (
                <text className="chart__direct" x={x(lastIdx) + 8} y={y(s.values[lastIdx] as number)} dominantBaseline="middle">
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
        <rect className="chart__hit" x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} onPointerMove={onMove} onPointerLeave={() => (setHover(null), hide())} />
      </svg>
      <Tooltip tip={tip} />
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Session</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th>{l}</th>
              {series.map((s) => (
                <td key={s.name}>{s.values[i] ?? '--'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface RangeRow {
  name: string;
  low: number;
  high: number;
  highlight?: boolean;
}

/** Horizontal note-range bars on a shared pitch axis (you vs. famous singers). */
export function RangeChart({ rows, title }: { rows: RangeRow[]; title: string }) {
  const { tip, ref, width: W, show, hide } = useTip();
  const lo = Math.floor(Math.min(...rows.map((r) => r.low)) / 12) * 12;
  const hi = Math.ceil((Math.max(...rows.map((r) => r.high)) + 1) / 12) * 12;
  const rowH = 30;
  const pad = { l: Math.min(128, W * 0.3), r: 12, t: 8, b: 26 };
  const H = pad.t + rows.length * rowH + pad.b;
  const x = (m: number) => pad.l + ((m - lo) / (hi - lo)) * (W - pad.l - pad.r);
  const cs: number[] = [];
  for (let m = lo; m <= hi; m += 12) cs.push(m);
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chart__svg" role="img" aria-label={title}>
        {cs.map((m) => (
          <g key={m}>
            <line className="chart__grid" x1={x(m)} x2={x(m)} y1={pad.t} y2={H - pad.b} />
            <text className="chart__axis" x={x(m)} y={H - 8} textAnchor="middle">
              {midiToName(m)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = pad.t + i * rowH + rowH / 2;
          const label = `${midiToName(r.low)} – ${midiToName(r.high)}`;
          return (
            <g key={r.name}>
              <text className={`chart__rowlabel ${r.highlight ? 'is-you' : ''}`} x={pad.l - 10} y={cy} textAnchor="end" dominantBaseline="middle">
                {r.name}
              </text>
              <rect
                className={`chart__range ${r.highlight ? 'is-you' : ''}`}
                x={x(r.low)}
                y={cy - (r.highlight ? 9 : 6)}
                width={Math.max(4, x(r.high) - x(r.low))}
                height={r.highlight ? 18 : 12}
                rx={r.highlight ? 9 : 6}
              />
              <rect
                className="chart__hit"
                x={pad.l}
                y={cy - rowH / 2}
                width={W - pad.l - pad.r}
                height={rowH}
                tabIndex={0}
                aria-label={`${r.name}: ${label}`}
                onPointerMove={(e) => show(e, <TipBody value={label} label={r.name} />)}
                onPointerLeave={hide}
              />
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th>{r.name}</th>
              <td>
                {midiToName(r.low)} to {midiToName(r.high)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

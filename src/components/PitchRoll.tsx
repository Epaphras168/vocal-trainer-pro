import { useEffect, useRef, type ReactNode } from 'react';
import { pitchEngine } from '../audio/pitchEngine';
import { centsFromFolded, isBlackKey, midiToName } from '../audio/notes';
import './PitchRoll.css';

// Piano-roll canvas: target notes in gold, the singer's voice as a live line
// scrolling right-to-left past a playhead. Drawn every animation frame
// straight from the pitch engine, with no React re-renders in the hot path.

export interface RollTarget {
  midi: number;
  /** Seconds relative to `origin`. */
  start: number;
  end: number;
  /** For glides: the note the ramp ends on. */
  toMidi?: number;
}

interface Props {
  low: number;
  high: number;
  /** Timed targets, relative to `origin` (engine clock seconds). */
  targets?: RollTarget[];
  origin?: number | null;
  /** A single note held across the whole roll. */
  hold?: number | null;
  /** Cents counted as on-target for colouring the line. */
  tolerance?: number;
  /** Seconds of history visible. */
  windowSec?: number;
  /** Playhead position, 0..1 of the drawable width. */
  playhead?: number;
  /** Draw the singer's line. */
  live?: boolean;
  /** Change to wipe the trail, e.g. on retry. */
  resetKey?: unknown;
  className?: string;
  children?: ReactNode;
}

interface TrailPoint {
  t: number;
  midi: number | null;
  on: boolean;
}

const GUTTER = 44;

function readColors(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    bg: v('--roll-bg'),
    row: v('--roll-row'),
    line: v('--line'),
    mute: v('--text-mute'),
    dim: v('--text-dim'),
    gold: v('--gold'),
    goldSoft: v('--gold-soft'),
    goldGlow: v('--gold-glow'),
    accent: v('--accent'),
    text: v('--text'),
    font: cs.fontFamily,
  };
}

export function PitchRoll({
  low,
  high,
  targets = [],
  origin = null,
  hold = null,
  tolerance = 50,
  windowSec = 6,
  playhead = 0.78,
  live = true,
  resetKey,
  className = '',
  children,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trail = useRef<TrailPoint[]>([]);
  // Latest props for the draw loop without restarting it.
  const props = useRef({ low, high, targets, origin, hold, tolerance, windowSec, playhead, live });
  props.current = { low, high, targets, origin, hold, tolerance, windowSec, playhead, live };

  useEffect(() => {
    trail.current = [];
  }, [resetKey]);

  // Record the singer's line.
  useEffect(() => {
    return pitchEngine.onFrame((f) => {
      const p = props.current;
      if (!p.live) return;
      let on = false;
      if (f.midi !== null) {
        const target = targetAt(p, f.t);
        on = target !== null && Math.abs(centsFromFolded(f.midi, target)) <= p.tolerance;
      }
      trail.current.push({ t: f.t, midi: f.midi, on });
      const cutoff = f.t - p.windowSec - 1;
      while (trail.current.length && trail.current[0].t < cutoff) trail.current.shift();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const g = canvas.getContext('2d')!;
    let colors = readColors(wrap);
    let w = 0;
    let h = 0;
    let raf = 0;
    let frame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const draw = () => {
      raf = requestAnimationFrame(draw);
      // Theme can change under us; refresh colours about once a second.
      if (++frame % 60 === 0) colors = readColors(wrap);
      const p = props.current;
      const now = pitchEngine.now();
      const rows = p.high - p.low + 1;
      const pad = 10;
      const rowH = (h - pad * 2) / rows;
      const plotW = w - GUTTER;
      const px = GUTTER + plotW * p.playhead;
      const pxPerSec = (plotW * p.playhead) / p.windowSec;
      const y = (m: number) => pad + (p.high + 0.5 - m) * rowH;
      const x = (t: number) => px - (now - t) * pxPerSec;

      g.clearRect(0, 0, w, h);
      g.fillStyle = colors.bg;
      g.fillRect(0, 0, w, h);

      // Semitone rows: shade the black keys, label the white ones.
      g.font = `700 ${Math.min(12, Math.max(9, rowH * 0.62))}px ${colors.font}`;
      g.textBaseline = 'middle';
      const labelEvery = rowH < 11 ? 2 : 1;
      for (let m = p.low; m <= p.high; m++) {
        const top = y(m) - rowH / 2;
        if (isBlackKey(m)) {
          g.fillStyle = colors.row;
          g.fillRect(GUTTER, top, plotW, rowH);
        } else {
          const isC = m % 12 === 0;
          if (isC || (m - p.low) % labelEvery === 0) {
            g.fillStyle = isC ? colors.dim : colors.mute;
            g.fillText(midiToName(m), 10, y(m));
          }
          if (isC) {
            g.fillStyle = colors.line;
            g.fillRect(GUTTER, top + rowH - 1, plotW, 1);
          }
        }
      }

      const latest = trail.current[trail.current.length - 1];
      const voiceMidi = latest && now - latest.t < 0.2 ? latest.midi : null;

      // Targets
      const barH = Math.max(8, Math.min(rowH * 0.8, 22));
      const drawBar = (x0: number, x1: number, m: number, active: boolean, hit: boolean, past: boolean) => {
        const cy = y(m);
        g.save();
        g.globalAlpha = past ? 0.35 : 1;
        if (active && hit) {
          g.shadowColor = colors.goldGlow;
          g.shadowBlur = 24;
        }
        g.fillStyle = active ? colors.goldSoft : colors.goldSoft;
        g.strokeStyle = colors.gold;
        g.lineWidth = active ? 2.5 : 1.5;
        roundRect(g, x0, cy - barH / 2, Math.max(4, x1 - x0), barH, barH / 2);
        g.fill();
        g.shadowBlur = 0;
        g.stroke();
        g.setLineDash([8, 6]);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x0 + barH / 2, cy);
        g.lineTo(x1 - barH / 2, cy);
        g.stroke();
        g.restore();
      };

      const onNow = voiceMidi !== null && latest?.on;
      if (p.hold !== null) {
        drawBar(GUTTER + 4, w - 4, p.hold, true, !!onNow, false);
      }
      if (p.origin !== null) {
        for (const tg of p.targets) {
          const x0 = x(p.origin + tg.start);
          const x1 = x(p.origin + tg.end);
          if (x1 < GUTTER || x0 > w) continue;
          const active = now >= p.origin + tg.start && now <= p.origin + tg.end;
          const past = now > p.origin + tg.end;
          if (tg.toMidi !== undefined) {
            drawRamp(g, x0, x1, y(tg.midi), y(tg.toMidi), barH, colors, active);
          } else {
            drawBar(Math.max(GUTTER, x0), Math.min(w, x1), tg.midi, active, !!onNow, past);
          }
        }
      }

      // Playhead
      g.fillStyle = colors.line;
      g.fillRect(px - 1, 0, 2, h);

      // Singer's line
      const pts = trail.current;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (a.midi === null || b.midi === null) continue;
        if (b.t - a.t > 0.15) continue;
        const xa = x(a.t);
        if (xa < GUTTER) continue;
        g.strokeStyle = b.on ? colors.gold : colors.accent;
        g.lineWidth = b.on ? 6 : 5;
        g.beginPath();
        g.moveTo(xa, clampY(y(a.midi), h));
        g.lineTo(x(b.t), clampY(y(b.midi), h));
        g.stroke();
      }

      // Voice dot, or an arrow when the singer is off the visible range.
      if (voiceMidi !== null) {
        const vy = y(voiceMidi);
        if (vy < 0 || vy > h) {
          const up = vy < 0;
          g.fillStyle = colors.accent;
          g.beginPath();
          const ay = up ? 14 : h - 14;
          g.moveTo(px - 9, ay + (up ? 6 : -6));
          g.lineTo(px + 9, ay + (up ? 6 : -6));
          g.lineTo(px, ay + (up ? -6 : 6));
          g.closePath();
          g.fill();
        } else {
          g.save();
          g.shadowColor = onNow ? colors.goldGlow : colors.accent;
          g.shadowBlur = onNow ? 26 : 14;
          g.fillStyle = onNow ? colors.gold : colors.accent;
          g.beginPath();
          g.arc(px, vy, 9, 0, Math.PI * 2);
          g.fill();
          g.restore();
          g.strokeStyle = colors.bg;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(px, vy, 9, 0, Math.PI * 2);
          g.stroke();
        }
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`roll ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {children}
    </div>
  );
}

function targetAt(
  p: { hold: number | null; origin: number | null; targets: RollTarget[] },
  t: number,
): number | null {
  if (p.hold !== null) return p.hold;
  if (p.origin === null) return null;
  const rel = t - p.origin;
  // A little latency forgiveness on both sides of each note.
  const tg = p.targets.find((x) => rel >= x.start - 0.05 && rel <= x.end + 0.15);
  if (!tg) return null;
  if (tg.toMidi === undefined) return tg.midi;
  const k = Math.min(1, Math.max(0, (rel - tg.start) / (tg.end - tg.start)));
  return tg.midi + (tg.toMidi - tg.midi) * k;
}

function clampY(v: number, h: number) {
  return Math.min(h - 2, Math.max(2, v));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function drawRamp(
  g: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  barH: number,
  c: ReturnType<typeof readColors>,
  active: boolean,
) {
  g.save();
  g.fillStyle = c.goldSoft;
  g.strokeStyle = c.gold;
  g.lineWidth = active ? 2.5 : 1.5;
  g.beginPath();
  g.moveTo(x0, y0 - barH / 2);
  g.lineTo(x1, y1 - barH / 2);
  g.lineTo(x1, y1 + barH / 2);
  g.lineTo(x0, y0 + barH / 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.setLineDash([8, 6]);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

import { isBlackKey, midiToName } from '../audio/notes';
import './Piano.css';

// A compact keyboard that highlights a vocal range and an optional live note.

interface Props {
  from?: number;
  to?: number;
  low?: number | null;
  high?: number | null;
  /** Live sung note (rounded) to light up. */
  live?: number | null;
  /** Ghost range drawn underneath, e.g. a reference singer. */
  ghost?: { low: number; high: number } | null;
}

const WW = 20;
const WH = 100;
const BW = 12;
const BH = 62;

export function Piano({ from: fromProp, to: toProp, low = null, high = null, live = null, ghost = null }: Props) {
  // By default, frame the range with a little room, snapped to Cs and at least two octaves wide.
  let from = fromProp ?? (low !== null ? Math.floor((low - 3) / 12) * 12 : 36);
  let to = toProp ?? (high !== null ? Math.ceil((high + 3) / 12) * 12 : 84);
  if (to - from < 24) {
    if (fromProp === undefined) from = Math.max(24, to - 24);
    if (to - from < 24) to = from + 24;
  }
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const xOfWhite = new Map(whites.map((m, i) => [m, i * WW]));
  const inRange = (m: number) => low !== null && high !== null && m >= low && m <= high;
  const inGhost = (m: number) => ghost !== null && m >= ghost.low && m <= ghost.high;
  const cls = (m: number) =>
    ['piano__key', isBlackKey(m) ? 'is-black' : 'is-white', inRange(m) ? 'is-range' : '', inGhost(m) ? 'is-ghost' : '', live === m ? 'is-live' : '']
      .filter(Boolean)
      .join(' ');

  const blacks: number[] = [];
  for (let m = from; m <= to; m++) if (isBlackKey(m)) blacks.push(m);

  return (
    <svg className="piano" viewBox={`0 0 ${whites.length * WW} ${WH + 2}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={low !== null && high !== null ? `Range ${midiToName(low)} to ${midiToName(high)}` : 'Piano'}>
      {whites.map((m) => (
        <g key={m}>
          <rect className={cls(m)} x={xOfWhite.get(m)! + 1} y={1} width={WW - 2} height={WH} rx={4} />
          {m % 12 === 0 && (
            <text className="piano__label" x={xOfWhite.get(m)! + WW / 2} y={WH - 8} textAnchor="middle">
              {midiToName(m)}
            </text>
          )}
        </g>
      ))}
      {blacks.map((m) => {
        const x = (xOfWhite.get(m - 1) ?? 0) + WW - BW / 2;
        return <rect key={m} className={cls(m)} x={x} y={1} width={BW} height={BH} rx={3} />;
      })}
    </svg>
  );
}

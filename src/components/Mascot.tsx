import { useId } from 'react';
import './Mascot.css';

// Pip: a round little robin with a microphone, drawn as a die-cut sticker.

export type Mood = 'idle' | 'sing' | 'cheer' | 'encourage' | 'listen' | 'sleep' | 'wow';

interface Props {
  mood?: Mood;
  size?: number;
  className?: string;
  /** Turn off the idle bobbing, e.g. in dense layouts. */
  still?: boolean;
  title?: string;
}

export function Mascot({ mood = 'idle', size = 120, className = '', still = false, title = 'Pip the bird' }: Props) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${uid}`;
  const beakOpen = mood === 'sing' || mood === 'cheer' || mood === 'wow';

  return (
    <svg
      className={`pip pip--${mood} ${still ? 'pip--still' : ''} ${className}`}
      width={size}
      height={size * 0.85}
      viewBox="0 0 200 170"
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id={id('body')} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ff9a68" />
          <stop offset="0.6" stopColor="#f7744a" />
          <stop offset="1" stopColor="#de5a37" />
        </radialGradient>
        <radialGradient id={id('belly')} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#fff09a" />
          <stop offset="1" stopColor="#ffc93c" />
        </radialGradient>
        <linearGradient id={id('wing')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2693f" />
          <stop offset="1" stopColor="#cf4e2f" />
        </linearGradient>
        <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#140612" floodOpacity="0.3" />
        </filter>
        <clipPath id={id('clip')}>
          <path d={BODY} />
        </clipPath>
        <g id={id('sil')}>
          <path d={TAIL} />
          <path d={BODY} />
          <path d={CREST} />
          <circle cx="44" cy="108" r="13" />
          <path d="M40 112 L24 140 L34 144 L50 118 Z" />
        </g>
      </defs>

      <g className="pip__rig">
        {/* Die-cut sticker edge */}
        <use href={`#${id('sil')}`} fill="#fff" stroke="#fff" strokeWidth="14" strokeLinejoin="round" className="pip__edge" filter={`url(#${id('shadow')})`} />

        <g className="pip__tail">
          <path d={TAIL} fill={`url(#${id('wing')})`} />
          <path d="M160 96 C172 92 182 90 188 92" stroke="#b9442a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
        <path d={CREST} fill="#e9603b" />
        <path d={BODY} fill={`url(#${id('body')})`} />
        <g clipPath={`url(#${id('clip')})`}>
          <ellipse cx="90" cy="124" rx="50" ry="38" fill={`url(#${id('belly')})`} />
          <ellipse cx="74" cy="34" rx="30" ry="12" fill="#fff" opacity="0.18" />
        </g>

        <g className="pip__wing">
          <path d="M126 92 C150 86 170 104 162 128 C154 142 130 140 120 128 C113 117 114 99 126 92 Z" fill={`url(#${id('wing')})`} />
          <path d="M134 108 C144 110 152 118 154 126" stroke="#b9442a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
        </g>

        {/* Cheeks */}
        <ellipse cx="58" cy="82" rx="9" ry="6" fill="#ff5f7e" opacity="0.4" />
        <ellipse cx="104" cy="78" rx="8" ry="5.5" fill="#ff5f7e" opacity="0.35" />

        <Eyes mood={mood} />

        {/* Beak */}
        <g className="pip__beak">
          {beakOpen ? (
            <>
              <path d="M54 66 L26 66 L30 80 L53 84 Z" fill="#7a2416" />
              <ellipse cx="40" cy="78" rx="8" ry="4" fill="#ff6f86" />
              <path d="M55 60 C44 55 30 57 19 63 C31 68 44 69 55 68 Z" fill="#ffb21f" stroke="#e08710" strokeWidth="1.5" />
              <path d="M53 80 C44 82 36 83 29 82 C35 90 46 92 54 87 Z" fill="#f08d12" />
            </>
          ) : (
            <path d="M52 62 C42 60 30 66 24 72 C32 76 44 80 54 76 Z" fill="#ffb21f" stroke="#e08710" strokeWidth="1.5" />
          )}
        </g>

        {/* Mic, held in a little wing */}
        <g className="pip__mic">
          <path d="M40 112 L26 138 C25 141 29 143 31 141 L48 116 Z" fill="#3a3340" />
          <circle cx="44" cy="108" r="11" fill="#5b5363" />
          <circle cx="44" cy="108" r="11" fill="none" stroke="#857b8c" strokeWidth="2" />
          <path d="M37 103 L51 113 M36 109 L48 117 M40 100 L53 108" stroke="#2c2630" strokeWidth="1.6" opacity="0.6" />
          <ellipse cx="54" cy="120" rx="12" ry="9" fill="#ef6b42" transform="rotate(-25 54 120)" />
        </g>

        {mood === 'sleep' && (
          <g className="pip__zzz" fill="currentColor" fontFamily="var(--font-display)" fontWeight="900">
            <text x="128" y="40" fontSize="22">z</text>
            <text x="146" y="24" fontSize="16">z</text>
          </g>
        )}
      </g>

      {(mood === 'sing' || mood === 'cheer') && (
        <g className="pip__notes" fill="var(--gold)" stroke="#fff" strokeWidth="2.5" paintOrder="stroke">
          <Note x={152} y={22} />
          <Note x={176} y={50} delay />
        </g>
      )}
      {mood === 'cheer' && (
        <g className="pip__sparkles" fill="var(--gold)">
          <path d="M176 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />
          <path d="M20 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
        </g>
      )}
      {mood === 'listen' && (
        <g className="pip__waves" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M12 52 C6 60 6 72 12 80" />
          <path d="M2 44 C-6 58 -6 74 2 88" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

const BODY =
  'M98 20 C62 20 38 46 40 80 C30 98 32 134 66 148 C96 160 146 156 162 128 C174 106 166 84 150 72 C146 40 128 20 98 20 Z';
const TAIL = 'M148 94 C166 80 186 74 194 82 C200 92 188 106 168 114 Z';
const CREST = 'M92 26 C86 12 96 2 106 8 C100 10 100 16 104 22 C108 12 120 12 120 20 C112 20 110 26 108 30 Z';

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'cheer') {
    return (
      <g stroke="#2a0f12" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M56 60 Q64 50 72 60" />
        <path d="M86 56 Q94 46 102 56" />
      </g>
    );
  }
  if (mood === 'sleep') {
    return (
      <g stroke="#2a0f12" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M56 60 Q64 66 72 60" />
        <path d="M86 56 Q94 62 102 56" />
      </g>
    );
  }
  const r = mood === 'wow' ? 10 : 8;
  return (
    <g className="pip__eyes">
      {mood === 'encourage' && (
        <g stroke="#7a2a1a" strokeWidth="3.5" strokeLinecap="round">
          <path d="M54 46 L69 41" />
          <path d="M89 38 L103 42" />
        </g>
      )}
      <circle cx="64" cy="58" r={r} fill="#2a0f12" />
      <circle cx="94" cy="54" r={r} fill="#2a0f12" />
      <circle cx="61" cy="55" r={r * 0.36} fill="#fff" />
      <circle cx="91" cy="51" r={r * 0.36} fill="#fff" />
      <circle cx="67" cy="62" r={r * 0.16} fill="#fff" opacity="0.8" />
      <circle cx="97" cy="58" r={r * 0.16} fill="#fff" opacity="0.8" />
    </g>
  );
}

function Note({ x, y, delay = false }: { x: number; y: number; delay?: boolean }) {
  return (
    // The animation owns `transform`, so position with an outer group.
    <g transform={`translate(${x} ${y})`}>
      <g className={`pip__note ${delay ? 'pip__note--late' : ''}`}>
        <ellipse cx="0" cy="16" rx="7" ry="5.5" transform="rotate(-20 0 16)" />
        <rect x="4.5" y="-6" width="3.5" height="22" rx="1.5" />
        <path d="M6 -6 C14 -4 18 2 16 8 C14 4 10 2 6 2 Z" />
      </g>
    </g>
  );
}

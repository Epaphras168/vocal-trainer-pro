import { Link } from 'react-router-dom';
import { ArrowRight, AudioLines, Ear, Gamepad2, Mountain, Sunrise, Target } from 'lucide-react';
import { midiToName } from '../../audio/notes';
import { Mascot } from '../../components/Mascot';
import { useGame } from '../../game/store';
import { dayKey } from '../../game/dates';
import './PracticeHub.css';

export function PracticeHub() {
  const s = useGame();
  const last = (kind: string) => [...s.activity].reverse().find((a) => a.kind === kind);
  const bestAcc = Math.max(0, ...s.activity.filter((a) => a.kind === 'accuracy').map((a) => a.accuracy));
  const warmedToday = s.activity.some((a) => a.kind === 'warmup' && a.day === dayKey());

  const drills = [
    {
      to: '/practice/warmup',
      icon: Sunrise,
      tone: 'gold',
      title: 'Daily warm-up',
      blurb: 'Two minutes of breath, sirens and hums before you sing.',
      stat: warmedToday ? 'Done today' : '2 min',
      feature: true,
    },
    {
      to: '/practice/accuracy',
      icon: Target,
      tone: '',
      title: 'Pitch accuracy test',
      blurb: 'Sing a scale to the metronome. Get your Precision and Sustain scores.',
      stat: bestAcc ? `Best ${bestAcc}%` : 'Not taken yet',
    },
    {
      to: '/practice/game',
      icon: Gamepad2,
      tone: 'pink',
      title: 'Echo: pitch game',
      blurb: 'Pip plays a tune, you sing it back. It gets trickier every level.',
      stat: s.gameBest ? `Best level ${s.gameBest}` : 'New',
    },
    {
      to: '/practice/range',
      icon: Mountain,
      tone: 'teal',
      title: 'Vocal range test',
      blurb: 'Find your lowest and highest notes and compare with famous singers.',
      stat: s.range ? `${midiToName(s.range.low)}–${midiToName(s.range.high)}` : 'Not measured',
    },
    {
      to: '/practice/ear',
      icon: Ear,
      tone: 'violet',
      title: 'Ear gym',
      blurb: 'Quick-fire listening: higher or lower, same or different, intervals.',
      stat: last('ear') ? `Last ${last('ear')!.accuracy}%` : 'No mic needed',
    },
    {
      to: '/practice/free',
      icon: AudioLines,
      tone: '',
      title: 'Pitch playground',
      blurb: 'Pick any note and sing on the gold line. No pressure, just play.',
      stat: 'Free play',
    },
  ];

  return (
    <div className="practice">
      <header className="practice__head">
        <div>
          <p className="eyebrow">Practice</p>
          <h1 className="practice__title">Drills & games</h1>
          <p className="dim">Off the path, any time. Every drill earns XP.</p>
        </div>
        <Mascot mood="sing" size={130} />
      </header>
      <div className="practice__grid">
        {drills.map((d) => (
          <Link key={d.to} to={d.to} className={`drillcard card ${d.feature ? 'drillcard--feature' : ''}`}>
            <span className={`tile-icon ${d.tone ? `tile-icon--${d.tone}` : ''}`}>
              <d.icon size={24} />
            </span>
            <div className="drillcard__body">
              <h2 className="drillcard__title">{d.title}</h2>
              <p className="dim">{d.blurb}</p>
            </div>
            <div className="drillcard__foot">
              <span className="chip">{d.stat}</span>
              <ArrowRight size={20} className="drillcard__go" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

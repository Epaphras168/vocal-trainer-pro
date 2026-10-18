import { useEffect } from 'react';
import { ArrowRight, RotateCcw, Sparkles, ThumbsUp, Heart } from 'lucide-react';
import { grade, type Score } from '../audio/scoring';
import './StepFeedback.css';

// Duolingo-style bottom sheet after each graded step. Retrying is always free:
// singing is hard, so the best attempt counts and nothing is taken away.

const ENCOURAGE = [
  'Every rep trains your ear. Want another go?',
  "Pitch is a muscle. You're building it right now.",
  'Totally normal! Try listening once more before you sing.',
];

interface Props {
  score: Score;
  onRetry: () => void;
  onContinue: () => void;
  /** Optional detail, e.g. "4 of 5 notes" or "11.2 seconds". */
  detail?: string;
}

export function StepFeedback({ score, onRetry, onContinue, detail }: Props) {
  const g = grade(score.accuracy);
  const tone = g.tier === 'perfect' || g.tier === 'great' ? 'great' : g.tier === 'good' ? 'good' : 'soft';
  const Icon = tone === 'great' ? Sparkles : tone === 'good' ? ThumbsUp : Heart;
  const line = tone === 'soft' ? ENCOURAGE[score.accuracy % ENCOURAGE.length] : detail ?? `Precision ${score.precision}% · Sustain ${score.sustain}%`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className={`feedback feedback--${tone}`} role="status">
      <div className="feedback__inner">
        <div className="feedback__head">
          <span className="feedback__icon">
            <Icon size={26} />
          </span>
          <div>
            <p className="feedback__title">
              {g.label} <span className="num">{score.accuracy}%</span>
            </p>
            <p className="feedback__line">{line}</p>
          </div>
        </div>
        <div className="feedback__actions">
          <button className="btn btn--ghost" onClick={onRetry}>
            <RotateCcw size={18} /> Try again
          </button>
          <button className={`btn ${tone === 'soft' ? 'btn--gold' : 'btn--primary'} feedback__go`} onClick={onContinue} autoFocus>
            Continue <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

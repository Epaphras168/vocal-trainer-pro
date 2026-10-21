import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb, Play, X } from 'lucide-react';
import { findLesson, type Demo, type GradedStep, type Step } from '../content/curriculum';
import type { Score } from '../audio/scoring';
import { midiToName, registerZones, tessitura } from '../audio/notes';
import { playGlide, playNote, playSequence } from '../audio/synth';
import { ExerciseRunner } from '../exercises/ExerciseRunner';
import { noteFor, placeMelody, type VoiceRange } from '../exercises/common';
import { glideEnds } from '../exercises/GlideExercise';
import { Mascot } from '../components/Mascot';
import { StepFeedback } from '../components/StepFeedback';
import { Results } from '../components/Results';
import { ICONS } from '../components/icons';
import { effectiveRange, isLessonUnlocked, useGame, type Reward } from '../game/store';
import './LessonPlayer.css';

export function LessonPlayer() {
  const { id = '' } = useParams();
  const found = findLesson(id);
  const lessons = useGame((s) => s.lessons);
  if (!found || !isLessonUnlocked(lessons, id)) return <Navigate to="/path" replace />;
  return <Player key={id} lessonId={id} />;
}

function Player({ lessonId }: { lessonId: string }) {
  const { unit, lesson } = findLesson(lessonId)!;
  const nav = useNavigate();
  const range = effectiveRange(useGame());
  const record = useGame((s) => s.recordActivity);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<Score | null>(null);
  const [best, setBest] = useState<Record<number, Score>>({});
  const [quitting, setQuitting] = useState(false);
  const [reward, setReward] = useState<{ reward: Reward; accuracy: number; precision: number; sustain: number } | null>(null);

  const step = lesson.steps[index];
  const progress = reward ? 1 : (index + (pending ? 1 : 0)) / lesson.steps.length;
  const Icon = ICONS[unit.icon];

  const finishLesson = (scores: Record<number, Score>) => {
    const graded = Object.values(scores);
    const avg = (k: keyof Pick<Score, 'accuracy' | 'precision' | 'sustain'>) =>
      graded.length ? Math.round(graded.reduce((a, s) => a + s[k], 0) / graded.length) : 100;
    const accuracy = avg('accuracy');
    const precision = avg('precision');
    const sustain = avg('sustain');
    const r = record({ kind: 'lesson', label: lesson.title, accuracy, precision, sustain, lessonId: lesson.id });
    setReward({ reward: r, accuracy, precision, sustain });
  };

  const advance = (scores = best) => {
    setPending(null);
    if (index + 1 >= lesson.steps.length) finishLesson(scores);
    else {
      setIndex(index + 1);
      setAttempt(0);
    }
  };

  const onScore = (score: Score) => {
    const prev = best[index];
    const next = !prev || score.accuracy > prev.accuracy ? { ...best, [index]: score } : best;
    setBest(next);
    setPending(score);
  };

  if (reward) {
    return (
      <Results
        title={`${unit.title} · ${lesson.title}`}
        accuracy={reward.accuracy}
        precision={reward.precision}
        sustain={reward.sustain}
        reward={reward.reward}
        onContinue={() => nav('/path')}
      />
    );
  }

  return (
    <div className="lesson">
      <header className="lesson__top">
        <button className="icon-btn" onClick={() => setQuitting(true)} aria-label="Quit lesson">
          <X size={22} />
        </button>
        <div className="bar lesson__progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </header>

      <div className="lesson__crumb">
        <span className="tile-icon lesson__crumbicon">
          <Icon size={22} />
        </span>
        <div>
          <p className="eyebrow">{unit.title}</p>
          <p className="lesson__crumbtitle">{lesson.title}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${index}-${attempt}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.22 }}
        >
          {step.kind === 'teach' ? (
            <Teach step={step} range={range} onNext={() => advance()} />
          ) : (
            <div className="lesson__exercise">
              <div className="lesson__ask">
                <h1 className="lesson__steptitle">{step.title}</h1>
                <p className="dim">{step.prompt}</p>
              </div>
              <ExerciseRunner step={step as GradedStep} range={range} onComplete={pending ? () => undefined : onScore} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {pending && (
        <StepFeedback
          score={pending}
          detail={detailFor(step, pending)}
          onRetry={() => {
            setPending(null);
            setAttempt((a) => a + 1);
          }}
          onContinue={() => advance()}
        />
      )}

      {quitting && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Quit lesson">
          <div className="modal__card card pop-in" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Mascot mood="encourage" size={120} />
            <h2 className="h2">Leaving so soon?</h2>
            <p className="dim">You're doing great. If you quit now, this lesson's progress won't be saved.</p>
            <button className="btn btn--primary btn--block" onClick={() => setQuitting(false)} autoFocus>
              Keep singing
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => nav('/path')}>
              Quit lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function detailFor(step: Step, score: Score): string | undefined {
  if (step.kind === 'melody') {
    const hits = score.notes.filter((n) => n.hit).length;
    return `${hits} of ${score.notes.length} notes on pitch · precision ${score.precision}%`;
  }
  if (step.kind === 'quiz') return `${score.accuracy}% correct`;
  if (step.kind === 'rhythm') return `Timing ${score.precision}% · hit ${score.sustain}% of the beats`;
  if (step.kind === 'breath') return `Length ${score.precision}% of the goal · evenness ${score.sustain}%`;
  if (step.kind === 'glide') return `Covered ${score.precision}% of the slide · smoothness ${score.sustain}%`;
  if (step.kind === 'harmony') {
    const hits = score.notes.filter((n) => n.hit).length;
    return `${hits} of ${score.notes.length} harmony notes on pitch · precision ${score.precision}%`;
  }
  if (step.kind === 'swell') return `Pitch held ${score.precision}% · volume shape ${score.sustain}%`;
  if (step.kind === 'improv') return `In the key ${score.precision}% · variety ${score.sustain}%`;
  return undefined;
}

function Teach({ step, range, onNext }: { step: Extract<Step, { kind: 'teach' }>; range: VoiceRange; onNext: () => void }) {
  const [playing, setPlaying] = useState(false);
  const demoLabel = useMemo(() => (step.demo ? describeDemo(step.demo, range) : ''), [step.demo, range]);

  const play = async () => {
    if (!step.demo) return;
    setPlaying(true);
    await playDemo(step.demo, range);
    setPlaying(false);
  };

  return (
    <div className="teach">
      <div className="teach__hero">
        <h1 className="teach__title">{step.title}</h1>
        <Mascot mood={playing ? 'sing' : 'idle'} size={170} />
      </div>
      <p className="teach__body">{step.body}</p>
      {step.personal && <p className="teach__personal">{personalLine(step.personal, range)}</p>}
      {step.checklist && <Checklist items={step.checklist} />}
      {step.tip && (
        <p className="tip">
          <Lightbulb size={20} /> {step.tip}
        </p>
      )}
      {step.demo && (
        <div className="teach__demo">
          <div>
            <strong>Hear the demo</strong>
            <span className="mute">{demoLabel}</span>
          </div>
          <button className="btn btn--gold btn--icon btn--sm" onClick={play} disabled={playing} aria-label="Play demo">
            <Play size={18} />
          </button>
        </div>
      )}
      <button className="btn btn--primary btn--lg btn--block" onClick={onNext} autoFocus>
        Let's do it
      </button>
    </div>
  );
}

function personalLine(kind: 'zones' | 'tessitura', range: VoiceRange): string {
  const span = (r: [number, number]) => `${midiToName(r[0])}–${midiToName(r[1])}`;
  if (kind === 'zones') {
    const z = registerZones(range.low, range.high);
    return `Your map (a starting guess from your range): lower voice ${span(z.chest)} · blend ${span(z.mix)} · lighter top ${span(z.head)}.`;
  }
  return `Your comfy middle is about ${span(tessitura(range.low, range.high))}. Songs that live there feel easy.`;
}

function Checklist({ items }: { items: string[] }) {
  const [ticked, setTicked] = useState<number[]>([]);
  return (
    <ul className="teach__checks" aria-label="Try these">
      {items.map((item, i) => (
        <li key={item}>
          <label>
            <input
              type="checkbox"
              checked={ticked.includes(i)}
              onChange={() => setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]))}
            />
            <span>{item}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function describeDemo(demo: Demo, range: VoiceRange): string {
  if (demo.type === 'note') return `Pitched for your voice: ${midiToName(noteFor(demo.offset, range))}`;
  if (demo.type === 'melody') return `Pitched for your voice: ${placeMelody(demo.offsets, range).map(midiToName).join(' · ')}`;
  const [a, b] = glideEnds(demo.from, demo.to, range);
  return `A slide from ${midiToName(a)} to ${midiToName(b)}`;
}

async function playDemo(demo: Demo, range: VoiceRange): Promise<void> {
  if (demo.type === 'note') return playNote(noteFor(demo.offset, range), demo.dur ?? 1.5, demo.voice ? 'voice' : 'piano');
  if (demo.type === 'melody')
    return playSequence(
      placeMelody(demo.offsets, range).map((midi) => ({ midi, dur: demo.beat - 0.06, gap: 0.06 })),
      'piano',
    );
  const [a, b] = glideEnds(demo.from, demo.to, range);
  return playGlide(a, b, demo.dur);
}

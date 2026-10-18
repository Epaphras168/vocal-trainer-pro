import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crown, Gift, Lock, Music2, Play, RotateCcw, Star } from 'lucide-react';
import { UNITS, ALL_LESSONS, type Lesson, type Unit } from '../content/curriculum';
import { ICONS } from '../components/icons';
import { Mascot } from '../components/Mascot';
import { sfx } from '../audio/synth';
import { CHEST_GEMS, isLessonUnlocked, nextLessonId, useGame } from '../game/store';
import './PathMap.css';

// The singing path as a winding game map. Each unit is a stretch of road with
// lesson stops and a treasure chest at the end.

const ROW = 128;
const SWING = 78;

function offsetFor(i: number): number {
  return Math.round(Math.sin(i * 0.95) * SWING);
}

type NodeState = 'done' | 'current' | 'locked';

export function PathMap() {
  const lessons = useGame((s) => s.lessons);
  const chests = useGame((s) => s.chests);
  const openChest = useGame((s) => s.openChest);
  const nav = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const currentId = nextLessonId(lessons);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const stateOf = (l: Lesson): NodeState => (lessons[l.id] ? 'done' : l.id === currentId ? 'current' : isLessonUnlocked(lessons, l.id) ? 'current' : 'locked');

  const firstVisit = Object.keys(lessons).length === 0;

  return (
    <div className="pathmap">
      {firstVisit && (
        <div className="pathmap__intro">
          <Mascot mood="idle" size={90} />
          <p className="pathmap__bubble">Welcome to your path! Tap the glowing star to start your first lesson.</p>
        </div>
      )}

      {UNITS.map((unit, ui) => {
        const done = unit.lessons.filter((l) => lessons[l.id]).length;
        const unitComplete = done === unit.lessons.length;
        const unitActive = unit.lessons.some((l) => l.id === currentId);
        const startIndex = ALL_LESSONS.findIndex((l) => l.id === unit.lessons[0].id) + ui;
        const nodes = [...unit.lessons.map((l) => ({ kind: 'lesson' as const, lesson: l })), { kind: 'chest' as const }];
        const pts = nodes.map((_, i) => ({ x: offsetFor(startIndex + i), y: i * ROW + ROW / 2 }));
        const d = pts.reduce((acc, p, i) => {
          if (i === 0) return `M ${200 + p.x} ${p.y}`;
          const prev = pts[i - 1];
          const my = (prev.y + p.y) / 2;
          return `${acc} C ${200 + prev.x} ${my}, ${200 + p.x} ${my}, ${200 + p.x} ${p.y}`;
        }, '');

        return (
          <section key={unit.id} className="unit" aria-label={`Unit ${ui + 1}: ${unit.title}`}>
            <UnitHeader unit={unit} index={ui} done={done} active={unitActive} />
            <div className="unit__road" style={{ height: nodes.length * ROW }}>
              <svg className="unit__trail" viewBox={`0 0 400 ${nodes.length * ROW}`} width="400" height={nodes.length * ROW} aria-hidden="true">
                <path d={d} className="unit__trail-base" />
                <path d={d} className={`unit__trail-dash ${done > 0 ? 'is-walked' : ''}`} />
              </svg>
              {nodes.map((n, i) => {
                const style = { top: pts[i].y, transform: `translate(calc(-50% + ${pts[i].x}px), -50%)` };
                if (n.kind === 'chest') {
                  const opened = !!chests[unit.id];
                  return (
                    <div key="chest" className="node-wrap" style={style}>
                      <button
                        className={`node node--chest ${unitComplete ? (opened ? 'is-open' : 'is-ready') : 'is-locked'}`}
                        aria-label={opened ? 'Chest opened' : unitComplete ? `Open chest for ${CHEST_GEMS} gems` : 'Chest locked'}
                        onClick={() => {
                          if (unitComplete && !opened) {
                            sfx('gem');
                            openChest(unit.id);
                          } else sfx('tap');
                        }}
                      >
                        <Gift size={30} />
                      </button>
                      {unitComplete && !opened && <span className="node__tag">+{CHEST_GEMS} gems</span>}
                    </div>
                  );
                }
                const l = n.lesson;
                const st = stateOf(l);
                const isCurrent = l.id === currentId;
                const best = lessons[l.id]?.best ?? 0;
                return (
                  <Fragment key={l.id}>
                    <div className="node-wrap" style={style} ref={isCurrent ? currentRef : undefined}>
                      {isCurrent && <span className="node__start">Start</span>}
                      <button
                        className={`node node--${st} ${isCurrent ? 'is-current' : ''} ${best >= 90 ? 'is-perfect' : ''}`}
                        aria-label={`${l.title}: ${st === 'done' ? `completed, best ${best}%` : st === 'locked' ? 'locked' : 'ready'}`}
                        onClick={() => {
                          sfx('tap');
                          setSelected(selected === l.id ? null : l.id);
                        }}
                      >
                        {st === 'done' ? best >= 90 ? <Crown size={30} /> : <Check size={32} strokeWidth={3} /> : st === 'locked' ? <Lock size={28} /> : <Star size={32} />}
                      </button>
                      {isCurrent && (
                        <div className={`node__pip ${pts[i].x > 0 ? 'is-left' : 'is-right'}`}>
                          <Mascot mood="idle" size={78} />
                        </div>
                      )}
                      <AnimatePresence>
                        {selected === l.id && (
                          <motion.div
                            className={`node__pop node__pop--${st}`}
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                          >
                            <strong>{l.title}</strong>
                            <span className="node__popmeta">
                              {st === 'locked' ? 'Finish the lesson before this one to unlock it.' : `${l.minutes} min · ${l.steps.length} steps`}
                              {st === 'done' && ` · best ${best}%`}
                            </span>
                            {st !== 'locked' && (
                              <button className={`btn ${st === 'done' ? 'btn--gold' : 'btn--primary'} btn--block btn--sm`} onClick={() => nav(`/lesson/${l.id}`)}>
                                {st === 'done' ? (
                                  <>
                                    <RotateCcw size={16} /> Practise again
                                  </>
                                ) : (
                                  <>
                                    <Play size={16} /> Start lesson
                                  </>
                                )}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {i % 2 === 1 && <Music2 className="unit__deco" size={26} style={{ top: pts[i].y - 10, left: `calc(50% ${pts[i].x > 0 ? '-' : '+'} 150px)` }} aria-hidden="true" />}
                  </Fragment>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="pathmap__end">
        <Mascot mood={currentId ? 'sleep' : 'cheer'} size={120} />
        <p className="dim">{currentId ? 'More units are on the way. Keep singing!' : 'You finished the whole path. Encore!'}</p>
      </div>
    </div>
  );
}

function UnitHeader({ unit, index, done, active }: { unit: Unit; index: number; done: number; active: boolean }) {
  const Icon = ICONS[unit.icon];
  const complete = done === unit.lessons.length;
  return (
    <header className={`unit__head ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}>
      <span className={`tile-icon ${active ? 'tile-icon--ink' : complete ? 'tile-icon--teal' : ''}`}>
        <Icon size={24} />
      </span>
      <div className="unit__titles">
        <span className="eyebrow">Unit {index + 1}</span>
        <h2 className="unit__title">{unit.title}</h2>
        <p className="unit__tag">{unit.tagline}</p>
      </div>
      <div className="unit__count">
        <strong className="num">
          {done}/{unit.lessons.length}
        </strong>
        <span>lessons</span>
      </div>
    </header>
  );
}

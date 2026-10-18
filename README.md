# Belto

**Find your voice. Then belt it.** Belto is a game-like singing trainer in the spirit of Duolingo: short daily lessons, practice drills and games, all graded in real time against your actual singing through the microphone. Pip, a little robin with a microphone, is your coach.

Everything runs in the browser. Pitch detection is fully client-side and no audio is ever recorded or uploaded. Progress is saved on the device (localStorage).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build into dist/
```

Microphone access needs a secure context: `localhost` or an `https://` deployment. `vercel.json` and `public/_redirects` (Netlify) provide the single-page-app rewrites.

## What's inside

| Area | What it does |
| --- | --- |
| **Onboarding** | Name, why you sing, daily time, a friendly mic explainer *before* the browser prompt, a mic check, a vocal range test, then your voice type revealed. |
| **Home** | Greeting from Pip, your voice and range on a keyboard, "up next" lesson, daily XP goal ring, this week's streak strip, daily quests, goals. |
| **Path** | A winding game map of 8 units / 24 lessons with locked, current and completed stops plus a gem chest at the end of each unit. |
| **Lesson player** | Teach cards with a demo pitched for your voice, then graded exercises: held notes, melodies, glides, breath work, ear-training quizzes and rhythm. Every lesson ends on an easy, confidence-building step. |
| **Practice** | Daily 2-minute warm-up, Pitch Accuracy Test (scale vs. metronome, Precision % and Sustain %), Echo pitch game (levels, three hearts), Vocal Range Test (compared with famous singers), Ear Gym, and the Pitch Playground. |
| **League** | Weekly leagues (Sparrow → Songbird) with promotion and demotion zones and podium gems. |
| **Profile** | Streak calendar, XP chart, accuracy trend, range over time, badges, and settings (theme, sound, reset). |
| **Shop** | Spend gems on streak freezes and accent colour themes. |

There's also a no-signup `/try` page with the live pitch tracker.

## How the real-time pitch loop works

1. `src/audio/pitchEngine.ts` opens the mic with `getUserMedia` (echo cancellation, noise suppression and auto-gain **off**, since they smear sustained notes) and feeds an `AnalyserNode`.
2. Every animation frame (~60 Hz) it runs [pitchy](https://github.com/ianprime0509/pitchy)'s McLeod Pitch Method over a 2048-sample window, which gives a frequency and a clarity score.
3. Frames are accepted only when clarity ≥ 0.86, the level is above a silence floor and the pitch is between ~55 Hz and ~1400 Hz. A median filter rejects one-frame octave jumps, two agreeing frames are required before a note starts, and short dropouts are bridged so the line stays continuous.
4. Frequencies become fractional MIDI notes (`src/audio/notes.ts`) for note names, cents and grading. Octave errors are forgiven when grading.
5. `PitchRoll` (canvas) and `TuningMeter` subscribe to the engine and redraw straight from it each frame, outside React's render cycle.
6. While Belto plays a reference note the engine ignores input (plus a short echo tail), so the speaker is never mistaken for the singer. Metronome clicks and in-exercise sound effects sit above the detector's range for the same reason.
7. The engine also produces coaching hints ("sing a bit louder", "it's noisy around you", "hold it steadier"), which Pip speaks during exercises.

Scoring (`src/audio/scoring.ts`) is pure and unit-tested. **Precision** is how close each frame is to the target (within 15 cents is perfect, 100 cents earns nothing). **Sustain** is how continuously and steadily each note is held; natural vibrato isn't penalised. Glides are scored on how much of the slide you cover and how smoothly, breath on length and evenness, and rhythm on tap or onset timing.

## Game layer

All rewards go through one place, `useGame().recordActivity` in `src/game/store.ts`:

- **XP**: a base amount for finishing, an accuracy bonus, and a perfect-run bonus at 90%+. Replays pay a bit less. The level curve is 60 XP to level 2, then +30 per level.
- **Streaks**: counted on your local calendar. Missed days spend streak freezes automatically. If there aren't enough, the streak resets gently and Pip says so once.
- **Gems**: from first lesson clears, perfect drills, quests, unit chests and the league podium. Spent on freezes and themes.
- **Badges**: 13 achievements, checked after every activity.
- **Soft failure**: no hearts in lessons. You can retry any step for free and your best attempt counts. Only the optional Echo game uses hearts.

### About the league

Belto has no backend, so your weekly cohort is a deterministic set of 19 practice buddies generated from the week and tier, whose XP grows as the week goes on. `cohortFor()` in `src/game/league.ts` is the one function to swap for a server call to make leagues truly multiplayer.

## Design system

- **Type**: Fraunces (soft, wonky display serif) for headings, Figtree for UI and body. Both are self-hosted via Fontsource.
- **Colour**: plum night, ember orange, stage-light gold and gem teal. Light mode is warm paper with plum ink and is designed separately, not inverted. Tokens live in `src/styles/tokens.css`. Accent themes (Ember, Lagoon, Orchid, Citrus) swap the accent tokens.
- **Shape**: chunky "pressable" buttons with a bottom edge, a consistent radius scale (8 / 12 / 16 / 22 / 30), and a 4 px spacing scale.
- **Icons**: Lucide throughout.
- **Mascot**: Pip is drawn as an SVG sticker with seven moods (idle, sing, cheer, encourage, listen, sleep, wow), each animated.
- **Motion**: XP count-ups with ticks, streak flame bumps, confetti on great runs, level-up takeovers, badge toasts and spring transitions. All of it respects `prefers-reduced-motion`.
- **Charts**: hand-rolled SVG with hover tooltips and screen-reader tables. Series colours are validated for colour-vision deficiency and contrast in both themes.

## Project layout

```
src/
  audio/       pitch engine, note math, synth, scoring (+ tests)
  content/     the curriculum (units, lessons, steps)
  exercises/   hold, melody, glide, breath, quiz, rhythm (+ tests)
  game/        store, levels, streak dates, league, badges, quests (+ tests)
  components/  Pip, PitchRoll, TuningMeter, MicGate, Results, charts, shell
  pages/       landing, onboarding, home, path, lesson player, practice/*, league, profile, shop
  styles/      tokens + global styles
```

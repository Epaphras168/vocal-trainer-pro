# Belto curriculum

Belto's path has **15 units and 79 lessons**. The first eight units were the original path; the other seven, and extra lessons in six of the first eight, were built from the worship-team guide *Vocal Techniques for Singers* (11 topics) and checked against what teachers, researchers and other singing apps do.

Every lesson is pitched for the singer's own voice (offsets from a "home" note, see `src/content/curriculum.ts`), ends on an easy step, and lets you retry for free. Lesson ids from the original units never changed, so saved progress still points at the right lessons.

## What a microphone can and cannot judge

This decides how each topic is taught, so it comes first.

| Belto can measure | Belto cannot hear |
| --- | --- |
| Pitch, and how steadily it is held | Whether words are clear, or the right words |
| When a sound starts (timing, syllable onsets) | Whether a tone is bright, twangy, covered or "mixed" |
| Loudness *relative to your own start level* | Whether a belt is safe, or posture is right |
| Whether a slide is smooth, a hiss even, a note in a key | Emotion and expression |

Where a skill is on the right, the lesson teaches it with a **checklist** (mirror, phone recording, hand on ribs) and is graded only on the part that *can* be measured. The lesson says so out loud, rather than pretending the app can hear it. Apps that grade "tone" from a pitch trace are guessing.

Measurements are **relative to the singer**, not absolute: volume is judged against your own start level (so mic gain and distance don't matter), breath against the room's own noise, and registers against *your* range. A sloppy absolute number would punish quiet rooms and good singers alike.

## New and extended exercise types

| Step | What it does | How it is graded |
| --- | --- | --- |
| `swell` | Hold one note, grow louder then softer (messa di voce) | Pitch stays on the note; volume rises ≥ ~6 dB then falls, peak near the middle. Pure scoring in `scoreSwell` |
| `improv` | Free singing with the notes of a key drawn as gold lines | Time in the key, number of different notes used, number of moves between notes (`scoreImprov`) |
| `harmony` | Sing a second part against a tune | Same as a melody, on your part. Tune plays first alone, then together. With headphones it plays under you while you sing |
| `quiz` `interval` | Name the interval, rising or falling | After each answer, a well-known tune that starts with it |
| `quiz` `chord-quality` | Major or minor? | Right or wrong |
| `teach` with `checklist` | Self-check list (posture, jaw, mirror) | Not graded; honest about it |
| `teach` with `personal` | A line worked out from *your* range (register map, comfy middle) | n/a |
| `melody` with `lyrics` | A syllable under each note | As before |

## Topic by topic

### 1. Breathing → *Breath support* (6 lessons, 3 new) + *Power* lesson 2

**The guide:** diaphragmatic breathing, support, phrasing and dynamics, stamina, relaxation, control.

**Already had:** belly breath, the long "sss", steady tone. **Added:** posture and rib expansion (checklist), pulses of "ha" for stamina (graded by onset timing), and phrase-and-breathe lessons where you plan breaths.

**Research notes:** Teachers consistently pair posture with breath work, and "gentle beats loud" for airflow drills. In our own testing the breath "sss" was graded so that a soft, thin hiss counts as well as a hard blow (relative to room noise, in dB).

**Correction:** the guide says the diaphragm "relaxes and moves upward, pushing the air out". Singers actually keep the inspiratory muscles engaged on the way out to slow the release. The lessons say "keep the ribs wide, keep the belly gently firm".

### 2. Articulation → *Articulation* (new unit, 5 lessons)

**The guide:** clear pronunciation, phrasing, diction, accentuation, expression.

**Built:** loose jaw and tongue (checklist), five pure vowels sung on one steady pitch (a vowel change must not move the note), crisp consonants and fast syllables ("ta", "ka-pa", "la-la" on half beats, graded by *when each syllable starts*), words on notes with lyrics shown under each note, and a "record yourself and check" step.

**Can't grade:** whether the words are intelligible. We say so. The pitch-steady-through-vowel-changes drill and the onset-timing drills are the measurable parts; the intelligibility check is your own phone recording.

### 3. Pitching → *Pitch matching* (3 new lessons) + *Ear training*

**The guide:** tuning, accuracy, intonation, technique, ear training, pitch correction.

**Added:** "land it clean" (imagine the pitch first, no scooping), "hold steady" (tight tolerance, no drift), and "sing in a group" (listening while singing, close-step ear work). 

**Research notes:** Studies of singing accuracy (Welch and Howard; a University of Sydney thesis by Wilson, both linked below) support giving singers real-time *visual* pitch feedback alongside what they hear. Belto's pitch roll is that feedback.

**The guide's "pitch correction":** deliberately not offered: Belto trains the ear and voice, it doesn't fix them for you.

### 4. Intervals → *Intervals* (new unit, 6 lessons) + *Ear training*

**The guide:** size, quality, recognising, singing, harmonising with intervals.

**Built:** half and whole steps, thirds (minor/major), fourths and fifths, sixths-sevenths-octave, falling intervals, a mixed "name that jump". Every lesson pairs a recognition quiz with *singing* the same interval. After each answer the app names a tune that starts with it (rising and falling).

**Research notes:** Tying intervals to songs you already know is the standard ear-training method (Musical-U, EarMaster's interval songs, Singing Carrots' interval trainers). The tune lists are the widely shared ones; people's favourites differ and a few are contested, so they are a memory aid, not a rule.

### 5. Belting → *Power & belting* (new unit, 6 lessons)

**The guide:** chest voice, resonance, breath support, forward placement ("mask"), high notes, emotion, training. Says it "pushes the voice to its limits".

**Built, safety first:** a safety lesson with a checklist (warm up, stop at scratchiness, water, reduce volume and pitch not force), support, bright/forward "twang" ("nyah"), punchy "hey/yeah" calls, climbing to the belt note, a belt phrase and a **cool-down**.

**What we changed from the guide:** we do **not** teach "pushing to the limits". The belting literature we found (Titze's paper below) treats belting as a specific, learnable way of producing a bright, chest-dominant sound rather than just shouting upward, and is candid about how little controlled evidence exists. So we teach it as a technique with a safety checklist, not as endurance. Lessons say "strain is never the price of power", and repeat it.

**Can't grade:** whether it's a belt, whether it's twangy, whether it's safe. Belto only checks pitch accuracy and steadiness. **There is no agreed acoustic measure of twang** (twang is usually described in the voice-science literature, including the 2022 *Frontiers in Physiology* paper below, as a narrowing of the tube above the vocal folds that strengthens certain overtones, but we found no standard way to score it), so we teach it with a "nyah" cue and leave the judgement to your ears. The evidence base for belt safety is also thin, which is another reason to be cautious.

### 6. Registers → *Registers & bridges* (new unit, 5 lessons)

**The guide:** chest, head ("or falsetto"), mixed, modal, whistle, transition areas.

**Built:** a self-discovery lesson with your own register map (thirds of *your measured range*), chest, head, crossing the bridge (slow sirens, flips are normal), and blending (even siren, swell near the bridge).

**Corrections and caveats:**

- The guide says head voice is "also known as falsetto". Most teachers treat them as different: falsetto is a lighter, breathier mechanism; head voice is a fuller upper-register sound. The lesson says so.
- "Modal register" in the guide is described as chest + head + mix. In the voice-science literature the modal register is the everyday chest-dominant mechanism. We use "chest" and don't teach "modal".
- *Where* the bridge sits depends on voice type and technique and sources disagree (see the *Passaggio* article), so the register map is a starting guess in thirds of your own range, not a diagnosis.
- Whistle register is not trained (it sits above the detector's range, and few singers can do it).

### 7. Vocal range → *Range & vibrato* (2 new lessons)

**The guide:** voice types and their ranges, extending range, **tessitura**, bridges, classification, vocal health.

**Added:** "Know your voice" (the guide's six voice types, your own comfy middle worked out from your measured range) and "Your sweet spot" (tessitura, and choosing keys that suit it). The existing range finder and reference singers are unchanged.

### 8. Scales → *Steps & scales* (5 new lessons)

**The guide:** major, minor, pentatonic, chromatic, warm-ups, ear training.

**Added:** minor, pentatonic (major and minor), arpeggios, scale patterns (zig-zag, thirds), and the chromatic ladder (half steps, nowhere to hide). A major/minor chord quiz is in *Ear training*.

### 9. Riffs and runs → *Riffs & runs* (new unit, 6 lessons)

**The guide:** riffs, runs, technique, expression and style, practice slowly then faster, use them tastefully.

**Built:** slow-motion runs, a **speed ladder** (the same run at four tempos, so you speed up only while it stays clean), pentatonic riffs, turns and neighbour notes, falling runs, and "plan the landing" with a held target note. The last lesson carries the guide's point that runs should serve the song.

**Research notes:** every teacher source agrees: slow and accurate first, then speed. That's the whole structure of the unit.

### 10. Harmonies → *Harmony* (new unit, 5 lessons)

**The guide:** melodic, chordal, contrapuntal, vocal harmony; thirds, fourths, fifths, sixths; listening and blending.

**Built:** a first harmony over a held note, holding your own note, thirds above, thirds and fourths below, and parallel fifths. The tune plays first alone, then with your part; with headphones it plays under you while you sing.

**Honest limitation:** with speakers the mic would hear the tune and confuse the pitch tracker, so the tune is only played underneath you when you tick *Headphones on*. We do not grade blend or tone: only whether your own part is on pitch. Contrapuntal (independent) lines are not covered.

### 11. Ad-libbing → *Ad-libbing* (new unit, 6 lessons)

**The guide:** improvisation, embellishment, expressiveness, freedom, collaboration, preparing and practising ad-libs.

**Built:** pentatonic "home and friends" (every note works), call and response, shaping a phrase, ornaments, the blues scale, and "your own moment" (30 seconds with a soft drone, with a preparation checklist: ad-libs are often rehearsed). The roll draws the notes of the key as gold lines, the singer's line turns gold on any of them, and each note lights up as you visit it.

**How it is graded:** there's no "right" ad-lib, so we grade what makes one musical and is measurable: staying in the key, using several different notes, and moving between them rather than droning. It can't judge taste or feel, and says so.

## What we did *not* build

- A **key finder** and a free **ad-lib playground** in the Practice hub (the drills exist; a stand-alone page doesn't yet).
- Grading of tone colour, twang or belt safety.
- Whistle register, contrapuntal harmony, collaboration with other singers in real time.
- Speech-level articulation checks (needs a speech recogniser, and a sung one is much harder).

## Weakest evidence

Flagging it plainly, so nobody over-trusts the lessons:

- Straw and SOVT (semi-occluded vocal tract) exercises: the evidence is mixed. We use lip trills and "ng/nyah" as warm-ups, not as proven therapy.
- Belting safety research is thin and small.
- Passaggio notes: sources disagree.
- There is no standard objective measure of twang.
- Reference tunes for intervals: widely shared but not universal.

## Sources

- Welch & Howard, *Visual feedback and singing accuracy*: https://journals.sagepub.com/doi/10.1177/0305735689172005
- Wilson, real-time visual feedback for singing (Univ. of Sydney thesis): https://ses.library.usyd.edu.au/handle/2123/1526
- Singing Carrots, app review: https://singingcarrots.com/blog/singing-apps-review
- EarMaster, interval songs: https://www.earmaster.com/intervalsongs
- Musical-U, interval recognition: https://www.musical-u.com/modules/intervals/interval-recognition-1/
- Titze, *Can a belt or call be taught?*: https://www.vocology.utah.edu/_resources/documents/can_a_belt_or_call_titze.pdf
- Twang research, *Frontiers in Physiology*: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.1081622/pdf
- Passaggio: https://en.wikipedia.org/wiki/Passaggio
- Duke Voice Care Center vocal exercises: https://archive.chorusamerica.org/sites/default/files/resources/VocalExercises_DukeVoiceCareCenter.pdf
- Messa di voce: https://neilhowlett.com/?p=313
- Berklee on vocal technique: https://berklee.edu/node/2280366

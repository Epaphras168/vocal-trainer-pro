import { lesson, type Unit } from './types';

// The first eight units: the original path. Lesson ids here are stable (saved progress points at them).

export const CORE_UNITS: Unit[] = [
  {
    id: 'breath',
    title: 'Breath support',
    tagline: 'Power every note from a calm, steady breath.',
    icon: 'Wind',
    lessons: [
      lesson('breath-1', 'Belly breath', 3, [
        {
          kind: 'teach',
          title: 'Sing from the belly',
          body: 'Great singing starts below the chest. Breathe in low so your belly expands, then let the air out slow and steady on one easy note.',
          tip: 'Put a hand on your stomach. It should push out when you breathe in.',
          demo: { type: 'note', offset: 0, dur: 2.5, voice: true },
        },
        { kind: 'breath', title: 'The slow leak', prompt: "Big belly breath, then a long, soft 'sssss'. Like a slow tyre leak.", goal: 8, sound: 'hiss' },
        { kind: 'hold', title: 'Add a note', prompt: "Same steady air, now on an 'ahh'. Ride the gold line.", offset: 0, seconds: 3, tolerance: 70, easy: true },
      ]),
      lesson('breath-2', 'The long hiss', 4, [
        {
          kind: 'teach',
          title: 'Air is your fuel',
          body: "The longer you can let air out evenly, the longer and steadier your notes get. Today we stretch that tank.",
          tip: 'Keep your shoulders relaxed. They should not rise when you breathe in.',
        },
        { kind: 'breath', title: 'Longer leak', prompt: "Breathe low, then a soft, even 'sssss'. No need to push.", goal: 12, sound: 'hiss' },
        { kind: 'breath', title: 'Humming bird', prompt: "Now a gentle hum, 'mmmm', lips closed. Keep it even.", goal: 10, sound: 'hum' },
        { kind: 'hold', title: 'Easy ahh', prompt: "Open up into a relaxed 'ahh' on the line.", offset: 0, seconds: 3, tolerance: 70, easy: true },
      ]),
      lesson('breath-3', 'Steady tone', 5, [
        {
          kind: 'teach',
          title: 'Steady air, steady pitch',
          body: 'When the air wobbles, the note wobbles. Think of your breath as a smooth river under the note.',
          demo: { type: 'note', offset: 0, dur: 3, voice: true },
        },
        { kind: 'hold', title: 'Hold the river', prompt: 'Hold this note for five seconds. Smooth and straight.', offset: 0, seconds: 5 },
        { kind: 'hold', title: 'One step up', prompt: 'Same idea, a little higher.', offset: 2, seconds: 4 },
        { kind: 'breath', title: 'Hiss check', prompt: "One more long, even 'sssss'.", goal: 12, sound: 'hiss' },
      ]),
    ],
  },
  {
    id: 'pitch',
    title: 'Pitch matching',
    tagline: 'Hear a note, then sing it right back.',
    icon: 'Target',
    lessons: [
      lesson('pitch-1', 'Match one note', 3, [
        {
          kind: 'teach',
          title: 'Listen, then land it',
          body: "Pitch matching is the heart of singing in tune. Listen to the note, imagine it in your head, then sing it. Watch your line meet the gold one.",
          tip: "If you're too low, the line sits under the gold. Lift your voice a touch.",
          demo: { type: 'note', offset: 0, dur: 1.5 },
        },
        { kind: 'hold', title: 'Home note', prompt: 'Sing the note you heard and hold it.', offset: 0, seconds: 3 },
        { kind: 'hold', title: 'A little lower', prompt: 'Now this one. Listen first.', offset: -2, seconds: 3 },
        { kind: 'hold', title: 'A little higher', prompt: 'And up we go.', offset: 3, seconds: 3 },
      ]),
      lesson('pitch-2', 'Two-note hop', 4, [
        {
          kind: 'teach',
          title: 'Hop between notes',
          body: 'Songs move. Practise hopping cleanly from one note to the next, landing right in the middle of each one.',
          demo: { type: 'melody', offsets: [0, 2, 0], beat: 0.9 },
        },
        { kind: 'melody', title: 'Step up and back', prompt: 'Listen, then sing it back on the beat.', offsets: [0, 2, 0], beat: 1 },
        { kind: 'melody', title: 'Bigger hop', prompt: 'A slightly bigger jump this time.', offsets: [0, 4, 0], beat: 1 },
        { kind: 'melody', title: 'Up the stairs', prompt: 'Three notes going up.', offsets: [0, 2, 4], beat: 1 },
      ]),
      lesson('pitch-3', 'Find it by ear', 4, [
        {
          kind: 'teach',
          title: 'Train your ear',
          body: "Singing in tune starts with hearing in tune. First we'll compare notes by ear, then you'll sing them.",
        },
        { kind: 'quiz', title: 'Higher or lower?', prompt: 'Is the second note higher or lower?', mode: 'higher-lower', count: 5 },
        { kind: 'hold', title: 'Reach for it', prompt: 'Listen and match this higher note.', offset: 5, seconds: 3 },
      ]),
    ],
  },
  {
    id: 'glides',
    title: 'Glides & sirens',
    tagline: 'Slide smoothly through your whole voice.',
    icon: 'Waves',
    lessons: [
      lesson('glides-1', 'Gentle slide up', 3, [
        {
          kind: 'teach',
          title: 'Slide like a siren',
          body: "A glide is one smooth slide from low to high with no bumps. It warms up your voice and connects its low and high parts.",
          tip: "Try it on an 'ooo' or a lip trill: 'brrrr' with loose lips.",
          demo: { type: 'glide', from: 0, to: 7, dur: 2.5 },
        },
        { kind: 'glide', title: 'Slide up', prompt: 'Start on the low line and slide up to the high one.', from: 0, to: 7, seconds: 4 },
        { kind: 'glide', title: 'From a bit lower', prompt: 'Start lower this time. Keep it smooth.', from: -3, to: 5, seconds: 4 },
      ]),
      lesson('glides-2', 'Slide down', 3, [
        {
          kind: 'teach',
          title: 'What goes up...',
          body: 'Sliding down is just as useful. Keep your air steady so the voice does not crash at the bottom.',
          demo: { type: 'glide', from: 7, to: 0, dur: 2.5 },
        },
        { kind: 'glide', title: 'Slide down', prompt: 'Start high, float down to the low line.', from: 7, to: 0, seconds: 4 },
        { kind: 'glide', title: 'Longer slide', prompt: 'A longer trip down.', from: 9, to: -2, seconds: 5 },
      ]),
      lesson('glides-3', 'Full siren', 5, [
        {
          kind: 'teach',
          title: 'The full siren',
          body: 'Up and down in one breath. If your voice flips or cracks in the middle, that is totally normal: it means you found the bridge between registers.',
          demo: { type: 'glide', from: -3, to: 9, dur: 3 },
        },
        { kind: 'glide', title: 'Big siren up', prompt: 'Low to high, all in one smooth slide.', from: -5, to: 9, seconds: 5 },
        { kind: 'glide', title: 'Big siren down', prompt: 'And all the way back down.', from: 9, to: -5, seconds: 5 },
        { kind: 'hold', title: 'Land it', prompt: 'Land on this note and hold.', offset: 2, seconds: 3 },
      ]),
    ],
  },
  {
    id: 'scales',
    title: 'Steps & scales',
    tagline: 'Do, re, mi, and the ladder of notes.',
    icon: 'ListMusic',
    lessons: [
      lesson('scales-1', 'Do-re-mi', 4, [
        {
          kind: 'teach',
          title: 'The first three steps',
          body: "Most songs are built from scales. We'll start with the first three: do, re, mi.",
          demo: { type: 'melody', offsets: [0, 2, 4], beat: 0.8 },
        },
        { kind: 'melody', title: 'Do re mi', prompt: 'Sing up the three steps.', offsets: [0, 2, 4], beat: 0.9 },
        { kind: 'melody', title: 'Mi re do', prompt: 'And back down.', offsets: [4, 2, 0], beat: 0.9 },
        { kind: 'melody', title: 'There and back', prompt: 'Up and down in one go.', offsets: [0, 2, 4, 2, 0], beat: 0.8 },
      ]),
      lesson('scales-2', 'Five-note scale', 5, [
        {
          kind: 'teach',
          title: 'Five in a row',
          body: 'The five-note scale is a singer favourite for warming up. Keep each note clean and centred.',
          demo: { type: 'melody', offsets: [0, 2, 4, 5, 7], beat: 0.7 },
        },
        { kind: 'melody', title: 'Climb', prompt: 'Up five notes.', offsets: [0, 2, 4, 5, 7], beat: 0.8 },
        { kind: 'melody', title: 'Descend', prompt: 'Down five notes.', offsets: [7, 5, 4, 2, 0], beat: 0.8 },
      ]),
      lesson('scales-3', 'The full octave', 6, [
        {
          kind: 'teach',
          title: 'Eight notes, one octave',
          body: 'The whole major scale. Take a good breath first and pace your air across all eight notes.',
          demo: { type: 'melody', offsets: [0, 2, 4, 5, 7, 9, 11, 12], beat: 0.6 },
        },
        { kind: 'melody', title: 'Major scale up', prompt: 'All eight notes going up.', offsets: [0, 2, 4, 5, 7, 9, 11, 12], beat: 0.7 },
        { kind: 'melody', title: 'Major scale down', prompt: 'And all the way down.', offsets: [12, 11, 9, 7, 5, 4, 2, 0], beat: 0.7 },
      ]),
    ],
  },
  {
    id: 'ear',
    title: 'Ear training',
    tagline: 'Hear the gaps between notes.',
    icon: 'Ear',
    lessons: [
      lesson('ear-1', 'Higher or lower', 3, [
        { kind: 'teach', title: 'Up or down?', body: 'Before you can sing a jump, you need to hear which way it goes. Close your eyes if it helps.' },
        { kind: 'quiz', title: 'Higher or lower?', prompt: 'Is the second note higher or lower?', mode: 'higher-lower', count: 6 },
      ]),
      lesson('ear-2', 'Same or different', 4, [
        { kind: 'teach', title: 'Tiny differences', body: "Now the notes get closer together. Some are the same, some are just one step apart. Listen carefully." },
        { kind: 'quiz', title: 'Same or different?', prompt: 'Are these two notes the same?', mode: 'same-different', count: 6 },
        { kind: 'melody', title: 'Repeat and step', prompt: 'Sing it back.', offsets: [0, 0, 1, 0], beat: 0.9 },
      ]),
      lesson('ear-3', 'Thirds & fifths', 5, [
        {
          kind: 'teach',
          title: 'The happy chord',
          body: 'A major chord is built from a root, a third and a fifth. You have heard this sound in a thousand songs.',
          demo: { type: 'melody', offsets: [0, 4, 7], beat: 0.7 },
        },
        { kind: 'quiz', title: 'Name the jump', prompt: 'How big was the jump?', mode: 'interval', count: 5 },
        { kind: 'melody', title: 'Sing the chord', prompt: 'Root, third, fifth, and back.', offsets: [0, 4, 7, 4, 0], beat: 0.8 },
      ]),
    ],
  },
  {
    id: 'rhythm',
    title: 'Rhythm & timing',
    tagline: 'Lock in with the beat.',
    icon: 'Drum',
    lessons: [
      lesson('rhythm-1', 'Feel the beat', 3, [
        { kind: 'teach', title: 'Every song has a pulse', body: 'Great singers are great timekeepers. Listen to the clicks and tap right on them.' },
        { kind: 'rhythm', title: 'Tap along', prompt: 'Tap the button (or press space) on every click.', bpm: 80, pattern: [0, 1, 2, 3, 4, 5, 6, 7] },
      ]),
      lesson('rhythm-2', 'Half beats', 4, [
        { kind: 'teach', title: 'In between the clicks', body: "Some notes fall between the beats. Count '1 and 2 and' in your head." },
        { kind: 'rhythm', title: 'Tap the pattern', prompt: 'Tap on the highlighted spots.', bpm: 76, pattern: [0, 1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6] },
      ]),
      lesson('rhythm-3', 'Sing on the beat', 4, [
        { kind: 'teach', title: 'Your voice is the drum', body: "Now use your voice. Sing a short 'ta!' exactly on each click." },
        { kind: 'rhythm', title: "Ta, ta, ta", prompt: "Sing a short 'ta' on every click.", bpm: 72, pattern: [0, 1, 2, 3, 4, 5], sing: true },
        { kind: 'melody', title: 'Notes on time', prompt: 'Sing each note right on the beat.', offsets: [0, 2, 4, 2], beat: 0.75 },
      ]),
    ],
  },
  {
    id: 'sustain',
    title: 'Sustain & control',
    tagline: 'Long notes, steady and sure.',
    icon: 'AudioLines',
    lessons: [
      lesson('sustain-1', 'Long notes', 4, [
        { kind: 'teach', title: 'Hold it like you mean it', body: 'A confident long note sounds amazing. Breathe low, open your mouth, and keep the line flat.' },
        { kind: 'hold', title: 'Six seconds', prompt: 'Hold for six seconds.', offset: 0, seconds: 6 },
        { kind: 'hold', title: 'Up a step', prompt: 'Same again, a step higher.', offset: 2, seconds: 6 },
      ]),
      lesson('sustain-2', 'Even power', 4, [
        { kind: 'teach', title: 'No fading out', body: "Notes often droop at the end as air runs out. Keep the support going right to the finish." },
        { kind: 'breath', title: 'Even hum', prompt: "A long, even 'mmmm'.", goal: 12, sound: 'hum' },
        { kind: 'hold', title: 'Eight seconds', prompt: 'A long, steady note. Finish strong.', offset: 0, seconds: 8, tolerance: 60 },
      ]),
      lesson('sustain-3', 'Held steps', 5, [
        { kind: 'teach', title: 'Long and connected', body: 'Now hold each step of a scale a little longer. Move cleanly from one to the next.', demo: { type: 'melody', offsets: [0, 2, 4, 5, 7], beat: 1.2 } },
        { kind: 'melody', title: 'Slow climb', prompt: 'Five long notes going up.', offsets: [0, 2, 4, 5, 7], beat: 1.4 },
      ]),
    ],
  },
  {
    id: 'range',
    title: 'Range & vibrato',
    tagline: 'Stretch higher, lower, and add shimmer.',
    icon: 'Mountain',
    lessons: [
      lesson('range-1', 'Stretch up', 4, [
        { kind: 'teach', title: 'Reaching higher', body: 'High notes come from more air and less squeeze. Keep your jaw loose and let the note float.', tip: 'If it hurts, stop. Never push through strain.' },
        { kind: 'hold', title: 'Up a fifth', prompt: 'Float up to this note.', offset: 7, seconds: 3, tolerance: 60 },
        { kind: 'glide', title: 'Siren to the top', prompt: 'Slide up as high as feels easy.', from: 0, to: 11, seconds: 5 },
      ]),
      lesson('range-2', 'Stretch down', 4, [
        { kind: 'teach', title: 'Finding the floor', body: "Low notes need a relaxed throat and a little less air. Think 'yawn' and let your voice settle." },
        { kind: 'hold', title: 'Low and easy', prompt: 'Sink into this low note.', offset: -4, seconds: 3, tolerance: 60 },
        { kind: 'glide', title: 'Slide to the floor', prompt: 'Slide down as low as is comfy.', from: 5, to: -6, seconds: 5 },
      ]),
      lesson('range-3', 'Vibrato intro', 5, [
        {
          kind: 'teach',
          title: 'A little shimmer',
          body: 'Vibrato is a gentle, even wobble in pitch. It appears naturally when you are relaxed and well supported. Listen to the demo.',
          tip: "Don't force it. Hold a note, relax, and let it wave a little.",
          demo: { type: 'note', offset: 0, dur: 3, voice: true },
        },
        { kind: 'hold', title: 'Let it shimmer', prompt: 'Hold the note and let it wave gently around the line.', offset: 0, seconds: 5, tolerance: 90, vibrato: true },
      ]),
    ],
  },
];


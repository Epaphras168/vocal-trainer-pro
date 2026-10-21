import { lesson, type Lesson, type Unit } from './types';

// Units and lessons built from the worship-team technique guide (11 topics:
// breathing, articulation, pitching, intervals, belting, registers, vocal range,
// scales, riffs and runs, harmonies, ad-libbing), expanded with what working
// teachers and other singing apps do. docs/CURRICULUM.md walks through each
// topic: what we kept, what we corrected, and what Belto can and cannot hear.
//
// A recurring rule: a microphone can measure pitch, timing, loudness and
// steadiness. It cannot hear whether a word is clear, a tone is "bright", or a
// belt is safe. Where a skill is one of those, the lesson teaches it with a
// checklist and gets graded on the part we CAN measure.

const SAFETY = 'If anything feels scratchy, tight or sore, stop and rest. Strain is never the price of power.';

// ---------------------------------------------------------------------------
// Extra lessons added to the original units.
// ---------------------------------------------------------------------------

const breathExtra: Lesson[] = [
  lesson('breath-4', 'Posture & ribs', 4, [
    {
      kind: 'teach',
      title: 'Stand like you mean it',
      body: 'Your breath can only go as deep as your body lets it. Tall, loose posture gives the diaphragm room to drop, so the belly and lower ribs widen when you breathe in. Shoulders should stay down.',
      checklist: [
        'Feet hip-width apart, knees soft (not locked)',
        'Head level, chin neither up nor tucked',
        'Hands on your lower ribs: they should widen sideways as you breathe in',
        'Shoulders heavy and still: they must not rise with the breath',
      ],
      tip: 'The mic cannot see your posture. Try this in front of a mirror.',
    },
    { kind: 'breath', title: 'Wide ribs, slow leak', prompt: "Breathe in so your ribs widen, then a soft, even 'sssss'.", goal: 10, sound: 'hiss' },
    { kind: 'hold', title: 'Tall and easy', prompt: "Stay tall and sing an easy 'ah'.", offset: 0, seconds: 4, tolerance: 60 },
  ]),
  lesson('breath-5', 'Stamina & pulses', 5, [
    {
      kind: 'teach',
      title: 'Spend air wisely',
      body: "Long phrases are about spending air slowly, not about big breaths. Short, light pulses of 'ha' teach the belly to control how much air each syllable uses, which builds stamina.",
      tip: "Each 'ha' is a tiny pulse from the belly, not a push from the throat.",
    },
    { kind: 'rhythm', title: "Light 'ha' pulses", prompt: "Sing a short, light 'ha' on each click.", bpm: 72, pattern: [0, 1, 2, 3, 4, 5, 6, 7], sing: true },
    { kind: 'breath', title: 'The long leak', prompt: "Breathe low and let a soft 'sssss' last as long as you can.", goal: 14, sound: 'hiss' },
    { kind: 'breath', title: 'Hum it out', prompt: "A gentle, even 'mmmm'. Same patience.", goal: 14, sound: 'hum' },
  ]),
  lesson('breath-6', 'Phrase and breathe', 5, [
    {
      kind: 'teach',
      title: 'Breathe where the song breathes',
      body: 'Plan your breaths for the ends of phrases and commas, never in the middle of a word. A quick, quiet breath keeps the line flowing. Where you breathe changes how the lyric feels.',
      tip: 'Pencil a small tick at each breath spot in your lyrics, then keep to it every time.',
      demo: { type: 'melody', offsets: [0, 2, 4, 5, 4, 2, 0], beat: 0.7 },
    },
    {
      kind: 'melody',
      title: 'One breath, one phrase',
      prompt: 'Take a breath, then sing the whole phrase on it.',
      offsets: [0, 2, 4, 5, 4, 2, 0],
      beat: 0.8,
      lyrics: ['Sing', 'a', 'new', 'song', 'to', 'the', 'sky'],
    },
    {
      kind: 'melody',
      title: 'A longer phrase',
      prompt: 'Pace your air: save some for the last note.',
      offsets: [0, 2, 4, 5, 7, 5, 4, 2, 4, 2, 0],
      beat: 0.8,
    },
  ]),
];

const pitchExtra: Lesson[] = [
  lesson('pitch-4', 'Land it clean', 4, [
    {
      kind: 'teach',
      title: 'Hear it first, then sing it',
      body: 'Singers go out of tune when they chase a note after they start singing. Instead, imagine the pitch in your head before you open your mouth, then land on it directly. No scooping up from below.',
      tip: "A quick check: if the line starts under the gold bar and slides up into it, you scooped. Think the note first.",
    },
    { kind: 'melody', title: 'Leap and land', prompt: 'Listen, think each note, then land it.', offsets: [0, 4, 0, 7, 0], beat: 1.1 },
    { kind: 'melody', title: 'Down and up', prompt: 'Same idea, going down first.', offsets: [0, -3, 0, -5, 0], beat: 1.1 },
    { kind: 'hold', title: 'Straight in', prompt: 'Hear it, imagine it, then sing it dead on.', offset: 5, seconds: 3, tolerance: 35 },
  ]),
  lesson('pitch-5', 'Hold steady', 4, [
    {
      kind: 'teach',
      title: 'No drifting',
      body: 'Landing is half the job; staying is the other half. Pitch drifts flat when air runs low and sharp when we squeeze. Steady breath, relaxed throat, and keep listening to yourself.',
    },
    { kind: 'hold', title: 'Home, tight', prompt: 'Hold it right on the line.', offset: 0, seconds: 5, tolerance: 30 },
    { kind: 'hold', title: 'A little lower', prompt: 'Again, and listen for any sag.', offset: -2, seconds: 5, tolerance: 30 },
    { kind: 'hold', title: 'A little higher', prompt: 'Stay tall as it goes up.', offset: 3, seconds: 5, tolerance: 30 },
  ]),
  lesson('pitch-6', 'Sing in a group', 5, [
    {
      kind: 'teach',
      title: 'Listening is the skill',
      body: "In a choir or worship team you are matching other voices, not just a piano. Intonation is accuracy within a musical context: your note must fit with theirs. The habit to build is listening while you sing.",
      tip: 'If you can hear yourself clearly, you are probably too loud for the group.',
    },
    { kind: 'quiz', title: 'Same or different?', prompt: 'Sharpen your ear: are these the same note?', mode: 'same-different', count: 8 },
    { kind: 'melody', title: 'Close steps', prompt: 'Tiny steps need careful listening.', offsets: [0, 1, 0, 2, 0, 1, 2, 0], beat: 0.8 },
  ]),
];

const scalesExtra: Lesson[] = [
  lesson('scales-4', 'Minor: the darker sound', 5, [
    {
      kind: 'teach',
      title: 'Same ladder, different mood',
      body: 'The minor scale lowers the third (and usually the sixth and seventh) a half step. That one change turns bright into thoughtful. Listen first, then sing it.',
      demo: { type: 'melody', offsets: [0, 2, 3, 5, 7, 8, 10, 12], beat: 0.6 },
    },
    { kind: 'melody', title: 'Minor up and down', prompt: 'Five notes up and back, in minor.', offsets: [0, 2, 3, 5, 7, 5, 3, 2, 0], beat: 0.8 },
    { kind: 'melody', title: 'The full minor scale', prompt: 'Eight notes up, with the lowered third, sixth and seventh.', offsets: [0, 2, 3, 5, 7, 8, 10, 12], beat: 0.7 },
  ]),
  lesson('scales-5', 'Pentatonic: five friendly notes', 5, [
    {
      kind: 'teach',
      title: 'No wrong notes',
      body: 'The pentatonic scale has just five notes per octave and no half steps, so every note sounds good with the others. It is the sound of countless songs and the starting point for improvising.',
      demo: { type: 'melody', offsets: [0, 2, 4, 7, 9, 12], beat: 0.6 },
    },
    { kind: 'melody', title: 'Major pentatonic', prompt: 'Up and back down.', offsets: [0, 2, 4, 7, 9, 7, 4, 2, 0], beat: 0.8 },
    { kind: 'melody', title: 'Minor pentatonic', prompt: 'A bluesier set of five.', offsets: [0, 3, 5, 7, 10, 7, 5, 3, 0], beat: 0.8 },
  ]),
  lesson('scales-6', 'Arpeggios', 5, [
    {
      kind: 'teach',
      title: 'A chord, one note at a time',
      body: 'An arpeggio sings the notes of a chord in turn: root, third, fifth, octave. The jumps are wider than a scale, so listening to the next note before you sing it matters even more.',
      demo: { type: 'melody', offsets: [0, 4, 7, 12, 7, 4, 0], beat: 0.6 },
    },
    { kind: 'melody', title: 'Major arpeggio', prompt: 'Up to the top and back.', offsets: [0, 4, 7, 12, 7, 4, 0], beat: 0.8 },
    { kind: 'melody', title: 'Minor arpeggio', prompt: 'Same shape, darker third.', offsets: [0, 3, 7, 12, 7, 3, 0], beat: 0.8 },
  ]),
  lesson('scales-7', 'Scale patterns', 5, [
    {
      kind: 'teach',
      title: 'Same notes, new routes',
      body: 'Singers practise patterns, not just straight scales: skipping a step, zig-zagging, going in threes. They train your ear and your accuracy at the same time, and they are how warm-ups usually work.',
      tip: 'Say the pattern out loud in numbers first: 1-3-2-4-3-5-4-2-1.',
    },
    { kind: 'melody', title: 'Zig-zag', prompt: '1-3-2-4-3-5-4-2-1', offsets: [0, 4, 2, 5, 4, 7, 5, 2, 0], beat: 0.7 },
    { kind: 'melody', title: 'Down in threes', prompt: 'Falling by thirds.', offsets: [7, 4, 5, 2, 4, 0], beat: 0.8 },
    { kind: 'melody', title: 'Round trip', prompt: 'Up the scale, then back by skips.', offsets: [0, 2, 4, 5, 7, 4, 2, 0], beat: 0.7 },
  ]),
  lesson('scales-8', 'The chromatic ladder', 5, [
    {
      kind: 'teach',
      title: 'Every note, one at a time',
      body: 'The chromatic scale climbs by half steps: every key on the piano. There is nowhere to hide, so it is brilliant for precision. Go slowly and aim for the exact middle of each note.',
      demo: { type: 'melody', offsets: [0, 1, 2, 3, 4, 5], beat: 0.6 },
    },
    { kind: 'melody', title: 'Up in half steps', prompt: 'Six notes, one half step at a time.', offsets: [0, 1, 2, 3, 4, 5], beat: 0.9 },
    { kind: 'melody', title: 'Up and back', prompt: 'Climb, then retrace your steps.', offsets: [0, 1, 2, 3, 4, 3, 2, 1, 0], beat: 0.8 },
  ]),
];

const earExtra: Lesson[] = [
  lesson('ear-4', 'Major or minor?', 5, [
    {
      kind: 'teach',
      title: 'Hear the colour',
      body: 'Stack a third and a fifth on a root and you get a chord. A major third sounds bright and settled; a minor third sounds darker and more tender. Only that middle note changes.',
      demo: { type: 'melody', offsets: [0, 4, 7], beat: 0.7 },
    },
    { kind: 'quiz', title: 'Bright or dark?', prompt: 'Is this chord major or minor?', mode: 'chord-quality', count: 8 },
    { kind: 'melody', title: 'Sing it major', prompt: 'Root, third, fifth, back.', offsets: [0, 4, 7, 4, 0], beat: 0.8 },
    { kind: 'melody', title: 'Sing it minor', prompt: 'Lower that middle note.', offsets: [0, 3, 7, 3, 0], beat: 0.8 },
  ]),
];

const sustainExtra: Lesson[] = [
  lesson('sustain-4', 'Swell: soft, loud, soft', 6, [
    {
      kind: 'teach',
      title: 'Breathing dynamics',
      body: 'Singers have trained control for centuries by holding one note and swelling it from very soft to louder and back (the Italians call it messa di voce). The pitch stays put while the volume travels. It is the best test of breath control there is.',
      tip: 'Start so softly you can barely hear yourself. Your volume is measured against your own start, so room and mic distance do not matter.',
      demo: { type: 'note', offset: 0, dur: 4, voice: true },
    },
    { kind: 'swell', title: 'First swell', prompt: 'Soft, growing, then soft again, all on one note.', offset: 0, seconds: 6 },
    { kind: 'swell', title: 'A longer one', prompt: 'Take your time climbing the hill.', offset: 2, seconds: 8 },
  ]),
  lesson('sustain-5', 'Dynamics in a phrase', 6, [
    {
      kind: 'teach',
      title: 'Shape the line',
      body: 'Dynamics make a phrase feel alive: rise toward the important word, then settle. Good breath control lets you do it without the pitch wobbling.',
    },
    { kind: 'swell', title: 'Warm-up swell', prompt: 'One smooth hill.', offset: 0, seconds: 6 },
    { kind: 'melody', title: 'Grow through the phrase', prompt: 'Build toward the high note, then relax.', offsets: [0, 2, 4, 7, 4, 2, 0], beat: 0.9 },
    { kind: 'swell', title: 'Last swell', prompt: 'One more, a step higher.', offset: 3, seconds: 7 },
  ]),
];

const rangeExtra: Lesson[] = [
  lesson('range-4', 'Know your voice', 5, [
    {
      kind: 'teach',
      title: 'Where your voice lives',
      body: 'Voice types are named by range: bass (about E2-E4), baritone (G2-G4), tenor (C3-B4), alto (F3-F5), mezzo-soprano (A3-A5), soprano (B3-C6). Your range is where you can sing with clarity and control, not just where you can make a sound.',
      personal: 'tessitura',
      tip: 'Measure it any time in Practice. It shifts with warm-up, health and time of day.',
    },
    { kind: 'glide', title: 'Explore up', prompt: 'Slide up as far as stays comfortable.', from: 0, to: 12, seconds: 6 },
    { kind: 'glide', title: 'Explore down', prompt: 'Float back down below where you started.', from: 0, to: -8, seconds: 6 },
  ]),
  lesson('range-5', 'Your sweet spot', 5, [
    {
      kind: 'teach',
      title: 'Tessitura',
      body: 'Tessitura is the part of your range where the voice sounds best and tires least. Choose songs and keys that keep the tune mostly in this zone: change the key rather than strain for the top note.',
      personal: 'tessitura',
    },
    { kind: 'hold', title: 'In the sweet spot', prompt: 'A long, relaxed note in your comfy middle.', offset: 0, seconds: 8, tolerance: 50 },
    { kind: 'melody', title: 'Stay in the zone', prompt: 'A phrase that lives right there.', offsets: [0, 2, 4, 2, 0, -2, 0], beat: 0.9 },
  ]),
];

// ---------------------------------------------------------------------------
// New units.
// ---------------------------------------------------------------------------

const diction: Unit = {
  id: 'diction',
  title: 'Articulation',
  tagline: 'Make every word land clearly.',
  icon: 'Smile',
  lessons: [
    lesson('diction-1', 'Open and relaxed', 4, [
      {
        kind: 'teach',
        title: 'Clear words start with a loose jaw',
        body: 'Mumbling usually comes from a tight jaw and a sleepy tongue. Drop the jaw as if for a gentle yawn, keep the tip of the tongue resting behind your lower front teeth, and let the lips move freely.',
        checklist: [
          'Look in a mirror: the jaw hangs, it is not pushed forward',
          'Tongue tip resting behind the lower front teeth',
          'Lips soft and mobile, no tight smile or pout',
          'Say a line from a song out loud, over-exaggerating every word',
        ],
        tip: 'Belto can hear when and how steadily you sing, but not whether the words are clear. A mirror or a phone recording is your judge here.',
      },
      { kind: 'hold', title: 'Tall open ah', prompt: "A relaxed, open 'ah' with the jaw dropped.", offset: 0, seconds: 4, tolerance: 60 },
      { kind: 'hold', title: 'Round oh', prompt: "Now 'oh'. Keep the same loose jaw.", offset: 0, seconds: 4, tolerance: 60 },
    ]),
    lesson('diction-2', 'Five pure vowels', 5, [
      {
        kind: 'teach',
        title: 'Vowels carry the note',
        body: "Singing happens on vowels, so they need to be pure: 'ee, eh, ah, oh, oo'. Do not slide into the next sound. The trick is to change the mouth shape while the pitch does not move at all.",
        demo: { type: 'note', offset: 0, dur: 3, voice: true },
      },
      { kind: 'melody', title: 'One note, five vowels', prompt: 'Change vowels without changing pitch.', offsets: [0, 0, 0, 0, 0], beat: 1, lyrics: ['ee', 'eh', 'ah', 'oh', 'oo'] },
      { kind: 'melody', title: 'Vowels on a ladder', prompt: 'Keep each vowel pure as you climb.', offsets: [0, 2, 4, 2, 0], beat: 0.9, lyrics: ['ee', 'eh', 'ah', 'oh', 'oo'] },
    ]),
    lesson('diction-3', 'Crisp consonants', 5, [
      {
        kind: 'teach',
        title: 'Consonants make the words',
        body: 'Consonants carry the meaning. Sing them quickly and lightly just before the beat, and put the vowel right on it. Belto listens for the moment each syllable starts, so it can tell you whether your starts are tidy and on time.',
        tip: "'t', 'k' and 'p' are crisp bursts; 'l', 'm' and 'n' flow. Both need clear shapes.",
      },
      { kind: 'rhythm', title: "'Ta' on every click", prompt: "Sing 'ta' on each click: a clean, tidy start.", bpm: 80, pattern: [0, 1, 2, 3, 4, 5, 6, 7], sing: true },
      { kind: 'rhythm', title: "'Ka' and 'pa'", prompt: "Alternate 'ka' and 'pa' on each click.", bpm: 84, pattern: [0, 1, 2, 3, 4, 5, 6, 7], sing: true },
    ]),
    lesson('diction-4', 'Quick tongue and lips', 5, [
      {
        kind: 'teach',
        title: 'Agility for the articulators',
        body: "Your tongue and lips are muscles that need warming up too. Lip trills ('brrr'), tongue trills and tongue twisters build speed and ease. Start slow, stay relaxed, and speed up only while it stays clean.",
        checklist: [
          "Lip trill ('brrr') for ten seconds on an easy slide",
          "Say 'red leather, yellow leather' five times, slowly then faster",
          "Say 'unique New York' with big lip movements",
        ],
      },
      { kind: 'rhythm', title: "'La-la' on the halves", prompt: "Sing a quick 'la' on every dot, on the beats and in between.", bpm: 84, pattern: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], sing: true },
      { kind: 'rhythm', title: "'Ta-ka' speed", prompt: "'ta-ka-ta-ka' with a clear start on every dot.", bpm: 92, pattern: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], sing: true },
    ]),
    lesson('diction-5', 'Words on the notes', 6, [
      {
        kind: 'teach',
        title: 'Say it, then sing it',
        body: 'Good diction in song is speech stretched over notes. Stress the important syllables, place vowels on the beat, finish consonants at the end of a word, and keep the pitch steady underneath it all.',
        tip: 'Accent the meaning: which word in the line matters most? Lean on it, with a little more breath, never a push.',
        demo: { type: 'melody', offsets: [0, 2, 4, 5, 4, 2, 0], beat: 0.7 },
      },
      { kind: 'melody', title: 'A phrase with words', prompt: 'Sing the words clearly on each note.', offsets: [0, 2, 4, 5, 4, 2, 0], beat: 0.8, lyrics: ['Sing', 'a', 'new', 'song', 'to', 'the', 'sky'] },
      { kind: 'melody', title: 'Open syllables', prompt: "Keep a tall 'ah' on each syllable.", offsets: [0, 0, 2, 2, 4, 4, 2, 0], beat: 0.7, lyrics: ['la', 'la', 'la', 'la', 'la', 'la', 'la', 'la'] },
      {
        kind: 'teach',
        title: 'Check it with your phone',
        body: 'Record yourself singing a verse and play it back. Could a stranger write down the words? If not, exaggerate your consonants a little more next time. This is the one check only your own ears can make.',
      },
    ]),
  ],
};

const intervals: Unit = {
  id: 'intervals',
  title: 'Intervals',
  tagline: 'Measure the jump between any two notes.',
  icon: 'ArrowUpDown',
  lessons: [
    lesson('intervals-1', 'Half steps and whole steps', 5, [
      {
        kind: 'teach',
        title: 'The smallest jumps',
        body: 'An interval is the distance between two notes, measured in semitones (half steps). Tie each one to a tune you know: a rising half step is the shark in Jaws; a rising whole step is the start of "Happy Birthday".',
        demo: { type: 'melody', offsets: [0, 1, 0, 2], beat: 0.7 },
        tip: 'Songs you already know are the quickest way to recognise a new interval.',
      },
      { kind: 'quiz', title: 'Half or whole?', prompt: 'Which interval did you hear?', mode: 'interval', intervals: [1, 2], count: 6 },
      { kind: 'melody', title: 'Sing the steps', prompt: 'A half step, then a whole step.', offsets: [0, 1, 0, 2, 0], beat: 0.9 },
    ]),
    lesson('intervals-2', 'Thirds', 5, [
      {
        kind: 'teach',
        title: 'The sweet jump',
        body: 'Thirds are the building block of harmony. A minor third is three semitones ("Greensleeves"); a major third is four ("When the Saints Go Marching In"). Both appear in nearly every chord you sing.',
        demo: { type: 'melody', offsets: [0, 3, 0, 4], beat: 0.7 },
      },
      { kind: 'quiz', title: 'Minor or major third?', prompt: 'Which third was it?', mode: 'interval', intervals: [3, 4], count: 6 },
      { kind: 'melody', title: 'Sing the thirds', prompt: 'Minor third, then major third.', offsets: [0, 3, 0, 4, 0], beat: 0.9 },
    ]),
    lesson('intervals-3', 'Fourths and fifths', 5, [
      {
        kind: 'teach',
        title: 'The open sounds',
        body: 'A perfect fourth (5 semitones) is "Here Comes the Bride". A perfect fifth (7) is the first jump in "Twinkle Twinkle Little Star". They sound open and strong, and they are the backbone of many worship and folk harmonies.',
        demo: { type: 'melody', offsets: [0, 5, 0, 7], beat: 0.7 },
      },
      { kind: 'quiz', title: 'Fourth or fifth?', prompt: 'Which one did you hear?', mode: 'interval', intervals: [5, 7], count: 6 },
      { kind: 'melody', title: 'Sing fourth and fifth', prompt: 'Listen, then land each jump.', offsets: [0, 5, 0, 7, 0], beat: 0.9 },
    ]),
    lesson('intervals-4', 'Sixths, sevenths, octaves', 6, [
      {
        kind: 'teach',
        title: 'The big leaps',
        body: 'A major sixth (9) opens "My Bonnie Lies Over the Ocean". The octave (12) is "Somewhere Over the Rainbow": the same note, higher. Wide leaps are easier if you hear the target in your head before you leave the start note.',
        demo: { type: 'melody', offsets: [0, 9, 0, 12], beat: 0.8 },
      },
      { kind: 'quiz', title: 'Big or bigger?', prompt: 'Name the leap.', mode: 'interval', intervals: [5, 7, 9, 12], count: 6 },
      { kind: 'melody', title: 'Sing a sixth', prompt: 'Jump up and back.', offsets: [0, 9, 0], beat: 1.1 },
      { kind: 'melody', title: 'Sing an octave', prompt: 'The same note, one octave higher.', offsets: [0, 12, 0], beat: 1.2 },
    ]),
    lesson('intervals-5', 'Falling intervals', 5, [
      {
        kind: 'teach',
        title: 'Going down is different',
        body: 'Falling intervals feel different to the ear. A falling fifth is the opening of "The Flintstones" theme; a falling minor third is "Hey Jude" (the first two notes). Say the song in your head, then sing the interval.',
        demo: { type: 'melody', offsets: [7, 0, 4, 0], beat: 0.7 },
      },
      { kind: 'quiz', title: 'Rising or falling, how far?', prompt: 'Name the interval, whichever way it went.', mode: 'interval', intervals: [2, 3, 4, 5, 7], descending: true, count: 8 },
      { kind: 'melody', title: 'Down a fifth', prompt: 'Start high and step down.', offsets: [7, 0, 7, 0], beat: 1 },
      { kind: 'melody', title: 'Down in thirds', prompt: 'A falling major third, then a minor third.', offsets: [4, 0, 4, 1, 4], beat: 1 },
    ]),
    lesson('intervals-6', 'Name that jump', 6, [
      {
        kind: 'teach',
        title: 'Put it all together',
        body: 'Every interval is now in your toolbox. Mix them up: rising, falling, small and wide. Then sing real tunes built from them.',
        tip: '"Twinkle Twinkle" starts with a fifth then a step; "Happy Birthday" starts with a repeat then a step up.',
      },
      { kind: 'quiz', title: 'Mixed intervals', prompt: 'Name it, rising or falling.', mode: 'interval', intervals: [2, 3, 4, 5, 7, 12], descending: true, count: 10 },
      { kind: 'melody', title: 'Twinkle, twinkle', prompt: 'A fifth up, then steps.', offsets: [0, 0, 7, 7, 9, 9, 7], beat: 0.8, lyrics: ['Twin', 'kle', 'twin', 'kle', 'lit', 'tle', 'star'] },
      { kind: 'melody', title: 'Happy birthday', prompt: 'Whole step, then a fourth.', offsets: [0, 0, 2, 0, 5, 4], beat: 0.8, lyrics: ['Hap', 'py', 'birth', 'day', 'to', 'you'] },
    ]),
  ],
};

const registers: Unit = {
  id: 'registers',
  title: 'Registers & bridges',
  tagline: 'Chest, head, and the blend between.',
  icon: 'Layers',
  lessons: [
    lesson('registers-1', 'Two voices, one you', 5, [
      {
        kind: 'teach',
        title: 'What a register is',
        body: 'A register is a way the vocal folds vibrate. Lower notes use the thicker, fuller setting (often called chest voice); higher notes use a lighter, thinner one (head voice). In between is a blend, and the shift is the bridge, or passaggio.',
        personal: 'zones',
        tip: 'Chest and head are names for how it feels, not where the sound is made. Head voice is not the same as falsetto, which is a lighter, breathier cousin. Sources disagree on exact notes, so use your own map.',
      },
      {
        kind: 'teach',
        title: 'Feel the difference',
        body: 'Say "hey!" low and firm, then "wee!" high and light. Notice how the first feels meatier. Now glide between them on a siren and notice where it changes character.',
        checklist: ['Hand on your breastbone: low notes buzz here (chest voice)', 'Low and firm: say "hey"', 'High and light: say "wee"', 'Glide between them and find where it changes'],
      },
      { kind: 'glide', title: 'Find the change', prompt: 'A full, easy siren. Notice any flip.', from: -5, to: 10, seconds: 6 },
    ]),
    lesson('registers-2', 'Chest voice', 5, [
      {
        kind: 'teach',
        title: 'Warm, full, grounded',
        body: 'Chest voice is the voice closest to speech: rich and warm. The golden rule is never to haul it upward by force. Keep it relaxed and let it get lighter as the pitch rises.',
      },
      { kind: 'hold', title: 'Deep and easy', prompt: "A warm, speech-like 'ah'.", offset: -4, seconds: 4, tolerance: 55 },
      { kind: 'melody', title: 'Low ladder', prompt: 'Step through the lower part of your range.', offsets: [-5, -3, -1, 0, -1, -3, -5], beat: 0.9 },
    ]),
    lesson('registers-3', 'Head voice', 5, [
      {
        kind: 'teach',
        title: 'Light, free, floating',
        body: "Head voice is the upper register: lighter, brighter and easier on the throat. Think of an 'oo' or a gentle 'ng' and imagine the sound floating forward and up rather than being pushed.",
        tip: 'Do not belt up into it. If it feels like effort, lighten the sound.',
        demo: { type: 'note', offset: 8, dur: 3, voice: true },
      },
      { kind: 'hold', title: 'Float up', prompt: "A soft 'oo' on a high, easy note.", offset: 7, seconds: 4, tolerance: 65 },
      { kind: 'glide', title: 'Slide up lightly', prompt: "Glide on 'oo' without pushing.", from: 3, to: 11, seconds: 5 },
    ]),
    lesson('registers-4', 'Crossing the bridge', 6, [
      {
        kind: 'teach',
        title: 'The passaggio',
        body: "The transition between registers is where voices crack, flip or tense up. It is normal. Smoothing it takes three things: lighten the sound as you ascend, keep the air flowing, and don't grab the throat. Narrow, bright vowels like 'ee' can help.",
        tip: "Your voice may flip in a different place today than yesterday. It's a zone, not a single note.",
        personal: 'zones',
      },
      { kind: 'glide', title: 'Slow siren up', prompt: 'Keep the sound even right through the change.', from: -3, to: 10, seconds: 7 },
      { kind: 'glide', title: 'Slow siren down', prompt: "Don't push the chest up as you come back.", from: 10, to: -3, seconds: 7 },
      { kind: 'melody', title: 'Over the bridge', prompt: 'Step across the middle of your voice.', offsets: [0, 2, 4, 5, 7, 5, 4, 2, 0], beat: 0.8 },
    ]),
    lesson('registers-5', 'Blending (mix)', 6, [
      {
        kind: 'teach',
        title: 'Chest and head together',
        body: 'Mixed voice blends the fullness of chest with the lightness of head, so one voice sounds connected from bottom to top. It is built by keeping a siren steady and even instead of letting the register change jump out.',
        tip: "Belto can tell whether your slide is smooth and your volume steady, but not the 'colour' of your tone. Trust your ears and a teacher for that.",
      },
      { kind: 'glide', title: 'Even siren', prompt: 'One continuous slide at the same loudness.', from: -2, to: 9, seconds: 8 },
      { kind: 'swell', title: 'Swell in the middle', prompt: 'A grow-and-fade on a note near your bridge.', offset: 4, seconds: 7 },
      { kind: 'hold', title: 'Connected', prompt: 'Hold a steady note in the blend.', offset: 5, seconds: 5, tolerance: 45 },
    ]),
  ],
};

const power: Unit = {
  id: 'power',
  title: 'Power & belting',
  tagline: 'Strong, bright, and kind to your voice.',
  icon: 'Zap',
  lessons: [
    lesson('power-1', 'Safety first', 4, [
      {
        kind: 'teach',
        title: 'Strong is not the same as strained',
        body: "Belting is a bright, powerful, chest-dominant sound high in the range, loved in pop, musical theatre and gospel. Done well it feels surprisingly easy, with plenty of support and no squeezing. Pushing to the limit is how voices get hurt.",
        checklist: [
          'Warm up first (the daily warm-up counts)',
          'Stop at the first sign of scratchiness, pain or tightness',
          'Drink water, and rest your voice after a long session',
          'Reduce volume and pitch rather than force them',
        ],
        tip: SAFETY,
      },
      { kind: 'glide', title: 'Easy siren', prompt: 'Warm up gently. No power yet.', from: 0, to: 9, seconds: 5 },
      { kind: 'hold', title: 'Easy and open', prompt: "A comfortable, open 'ah'.", offset: 2, seconds: 3, tolerance: 60 },
    ]),
    lesson('power-2', 'Support for power', 5, [
      {
        kind: 'teach',
        title: 'The engine is the breath',
        body: 'Power comes from steady air pressure from low in the body, not from squeezing the throat. Think of widening the ribs and keeping the belly gently firm while the sound flows out. Posture matters more here than anywhere.',
        tip: 'The throat should feel as free as when you are saying a relaxed, confident "yes".',
      },
      { kind: 'breath', title: 'Strong, steady air', prompt: "Breathe low and let a steady 'sssss' go.", goal: 12, sound: 'hiss' },
      { kind: 'hold', title: 'Supported note', prompt: "An open 'ah', with the same steady air.", offset: 3, seconds: 6, tolerance: 45 },
    ]),
    lesson('power-3', 'Bright and forward', 5, [
      {
        kind: 'teach',
        title: 'The ring in the voice',
        body: "Part of what makes a belt carry is brightness: a narrow, ringing quality singers call twang, like the 'nyah' of a witch's cackle or a cheeky 'nyeah'. It makes a voice sound louder without more air or effort. Many teachers describe it as sound felt in the front of the face.",
        checklist: ["Say 'nyah, nyah' like a nasty cackle", 'Feel the buzz behind the nose, the soft palate lifting', "Now sing the same 'nyah' on one note"],
        tip: "Belto can check that your note is steady. Whether it sounds twangy is down to your ears. There is no agreed metric for it.",
      },
      { kind: 'hold', title: "'Nyah' on a note", prompt: "Sing a bright 'nyah' and hold it steady.", offset: 2, seconds: 4, tolerance: 50 },
      { kind: 'glide', title: "'Nyah' siren", prompt: "A bright 'nyah' slide up and back.", from: 0, to: 7, seconds: 5 },
    ]),
    lesson('power-4', 'The punchy call', 5, [
      {
        kind: 'teach',
        title: 'Short, sharp, supported',
        body: "The calling sounds of belting ('hey!', 'yeah!') are short and bright, with the breath doing the work. Use them to find the feeling of a forward, supported sound at a medium pitch before you go higher.",
        tip: SAFETY,
      },
      { kind: 'rhythm', title: "'Hey!' on the beat", prompt: "A bright, short 'hey!' on each click. Medium volume.", bpm: 76, pattern: [0, 1, 2, 3, 4, 5], sing: true },
      { kind: 'hold', title: "'Yeah' and hold", prompt: "A bright 'yeah', then hold the vowel steady.", offset: 2, seconds: 3, tolerance: 55 },
    ]),
    lesson('power-5', 'Up to the belt note', 6, [
      {
        kind: 'teach',
        title: 'Climb, do not shout',
        body: "As you go up, keep the same forward brightness and steady air. Do not shout and do not spread your mouth. Lift the sound rather than pushing it. If it breaks or tightens, go back down a few steps: that is your limit for today.",
        tip: SAFETY,
      },
      { kind: 'melody', title: 'Step up the ladder', prompt: "Sing 'yeah' on each step.", offsets: [0, 2, 4, 5, 7], beat: 0.9 },
      { kind: 'glide', title: "'Nyah' to the top", prompt: 'A bright slide up. Stop where it stops feeling easy.', from: 2, to: 9, seconds: 5 },
      { kind: 'hold', title: 'The top note', prompt: 'Hold it with steady, supported air.', offset: 7, seconds: 3, tolerance: 55 },
    ]),
    lesson('power-6', 'A belt phrase and cool-down', 6, [
      {
        kind: 'teach',
        title: 'Phrase it, then cool down',
        body: 'Put it in a short phrase: a lead-in, the big note, a release. Then always cool down. A few gentle slides and hums bring the voice back to rest and help you recover for tomorrow.',
        tip: SAFETY,
      },
      { kind: 'melody', title: 'The big phrase', prompt: 'Aim for the top note, then settle.', offsets: [0, 0, 2, 4, 7, 7, 5, 4, 2], beat: 0.85 },
      { kind: 'glide', title: 'Cool-down slide', prompt: 'Float down gently.', from: 9, to: -2, seconds: 6 },
      { kind: 'breath', title: 'Cool-down hum', prompt: "A soft, easy 'mmm'.", goal: 8, sound: 'hum' },
    ]),
  ],
};

const runs: Unit = {
  id: 'runs',
  title: 'Riffs & runs',
  tagline: 'Fast, flowing embellishments.',
  icon: 'Gauge',
  lessons: [
    lesson('runs-1', 'Slow-motion runs', 5, [
      {
        kind: 'teach',
        title: 'A run is a scale in a hurry',
        body: 'A run is a quick sequence of notes sung smoothly in one breath. A riff is a short melodic pattern that repeats or varies. Both are built from scales you already know. The secret is to learn them slowly, perfectly, and only then speed up.',
        tip: 'Slow and accurate beats fast and messy. Speed arrives on its own.',
        demo: { type: 'melody', offsets: [0, 2, 4, 7, 9], beat: 0.8 },
      },
      { kind: 'melody', title: 'Up slowly', prompt: 'Five clear notes, one breath.', offsets: [0, 2, 4, 7, 9], beat: 1 },
      { kind: 'melody', title: 'And down', prompt: 'Retrace it, still slow.', offsets: [9, 7, 4, 2, 0], beat: 1 },
    ]),
    lesson('runs-2', 'The speed ladder', 6, [
      {
        kind: 'teach',
        title: 'Faster, one rung at a time',
        body: 'The same run three times, a little faster each time. If a rung is messy, drop back down. Let each note start from the belly, not a throat bounce.',
      },
      { kind: 'melody', title: 'Medium', prompt: 'Same run, quicker.', offsets: [0, 2, 4, 7, 9, 7, 4, 2, 0], beat: 0.7 },
      { kind: 'melody', title: 'Quick', prompt: 'A little faster again.', offsets: [0, 2, 4, 7, 9, 7, 4, 2, 0], beat: 0.55 },
      { kind: 'melody', title: 'Flowing', prompt: 'Light and fast, but still clean.', offsets: [0, 2, 4, 7, 9, 7, 4, 2, 0], beat: 0.45 },
    ]),
    lesson('runs-3', 'Pentatonic riffs', 5, [
      {
        kind: 'teach',
        title: 'Short patterns you can repeat',
        body: 'Riffs are short, catchy patterns, usually from the pentatonic scale. Learn a few and you have a toolbox you can drop into any song. Listen, copy, and own them.',
        demo: { type: 'melody', offsets: [0, 2, 4, 2, 4, 7], beat: 0.5 },
      },
      { kind: 'melody', title: 'Riff one', prompt: 'Up, back, then leap.', offsets: [0, 2, 4, 2, 4, 7], beat: 0.65 },
      { kind: 'melody', title: 'Riff two', prompt: 'A bluesy dip.', offsets: [7, 5, 3, 0, 3, 0], beat: 0.65 },
      { kind: 'melody', title: 'Riff three', prompt: 'Short, snappy, repeated.', offsets: [0, 0, 3, 5, 3, 0], beat: 0.6 },
    ]),
    lesson('runs-4', 'Turns and neighbours', 5, [
      {
        kind: 'teach',
        title: 'Little ornaments',
        body: 'A turn circles a note: the note, the one above, the note again, the one below, back home. It is the building block of countless runs. Neighbour notes decorate a long note without changing the tune.',
        demo: { type: 'melody', offsets: [4, 5, 4, 2, 4], beat: 0.45 },
      },
      { kind: 'melody', title: 'The turn', prompt: 'Above, back, below, back home.', offsets: [4, 5, 4, 2, 4], beat: 0.6 },
      { kind: 'melody', title: 'Turn at the end', prompt: 'A plain phrase with an ornament on the last note.', offsets: [0, 2, 4, 5, 4, 2, 4], beat: 0.6 },
    ]),
    lesson('runs-5', 'Falling runs', 5, [
      {
        kind: 'teach',
        title: 'Cascading down',
        body: 'Falling runs sound smooth and relaxed, but they tempt you to let the air collapse. Keep the support up the whole way down and land the last note with intention.',
      },
      { kind: 'melody', title: 'Pentatonic fall', prompt: 'From the top, down in a flow.', offsets: [12, 9, 7, 4, 2, 0], beat: 0.65 },
      { kind: 'melody', title: 'Scale fall', prompt: 'Eight notes, no sagging.', offsets: [12, 11, 9, 7, 5, 4, 2, 0], beat: 0.6 },
    ]),
    lesson('runs-6', 'Plan the landing', 6, [
      {
        kind: 'teach',
        title: 'A run is a journey to a target',
        body: "Decide where a run will land before you start. Pick the destination, take the shortest tasteful route and land cleanly. And use runs sparingly: they should lift the song, not bury the melody or the words.",
        tip: 'Ask: does this run serve the song, or only me? Less is often more.',
      },
      { kind: 'melody', title: 'Run to a target', prompt: 'Up to the high note and settle.', offsets: [0, 2, 4, 7, 9, 12, 9, 7], beat: 0.65 },
      { kind: 'hold', title: 'Nail the landing', prompt: 'Hold the landing note steady.', offset: 7, seconds: 3, tolerance: 35 },
    ]),
  ],
};

const harmony: Unit = {
  id: 'harmony',
  title: 'Harmony',
  tagline: 'Blend your voice with another.',
  icon: 'Users',
  lessons: [
    lesson('harmony-1', 'Two notes together', 5, [
      {
        kind: 'teach',
        title: 'What is harmony?',
        body: 'Harmony is notes sounding together. The simplest kind is melody plus a second line that moves with it, usually a third or a sixth away. You listen to the tune, hold your own different note, and the two blend.',
        checklist: [
          'Put headphones on if you have them: the tune will play while you sing',
          'Keep your volume modest so you can hear the other part',
          'Listen to the blend, not just your own note',
        ],
        tip: 'With speakers, Belto plays the tune first, then you sing alone. With headphones it plays the tune while you sing (turn it on in the exercise).',
      },
      { kind: 'quiz', title: 'Chord colour', prompt: 'Warm up your ear: major or minor?', mode: 'chord-quality', count: 6 },
      { kind: 'harmony', title: 'A third above', prompt: 'Hold your own note over the tune.', lead: [0, 0, 0, 0], offsets: [4, 4, 4, 4], beat: 1.2 },
    ]),
    lesson('harmony-2', 'Stay on your note', 5, [
      {
        kind: 'teach',
        title: 'Holding your own line',
        body: 'The hardest part of harmony is not drifting to the tune. Hear the other part, but sing yours. A fifth above (7 semitones) is a strong, open choice; a major third is bright and sweet.',
      },
      { kind: 'harmony', title: 'A fifth above', prompt: 'A strong, open sound.', lead: [0, 0, 0, 0], offsets: [7, 7, 7, 7], beat: 1.2 },
      { kind: 'harmony', title: 'A third above again', prompt: 'Back to the sweet one.', lead: [0, 0, 0, 0], offsets: [4, 4, 4, 4], beat: 1.2 },
      { kind: 'harmony', title: 'Change notes with the tune', prompt: 'Your note changes when the tune does.', lead: [0, 0, 2, 2], offsets: [4, 4, 5, 5], beat: 1.1 },
    ]),
    lesson('harmony-3', 'Thirds above the tune', 6, [
      {
        kind: 'teach',
        title: 'The classic harmony',
        body: 'The most common harmony is a third above the tune. When the melody moves, you move with it, keeping about the same distance. The shape of your line follows theirs.',
        demo: { type: 'melody', offsets: [4, 5, 7, 9, 7, 5, 4], beat: 0.7 },
      },
      { kind: 'harmony', title: 'Thirds above', prompt: 'Follow the tune from a third up.', lead: [0, 2, 4, 5, 4, 2, 0], offsets: [4, 5, 7, 9, 7, 5, 4], beat: 0.9 },
      { kind: 'harmony', title: 'Again, with the climb', prompt: 'A slightly longer line.', lead: [0, 2, 4, 5, 7, 5, 4, 2, 0], offsets: [4, 5, 7, 9, 11, 9, 7, 5, 4], beat: 0.85 },
    ]),
    lesson('harmony-4', 'Harmony below', 6, [
      {
        kind: 'teach',
        title: 'Under the melody',
        body: 'A harmony under the tune sounds warm and supportive. It is the same idea mirrored: stay a third or so below. Because the tune is above you, resist the pull to follow it up.',
        demo: { type: 'melody', offsets: [-3, -1, 0, 2, 0, -1, -3], beat: 0.7 },
      },
      { kind: 'harmony', title: 'Thirds below', prompt: 'Sing underneath the tune.', lead: [0, 2, 4, 5, 4, 2, 0], offsets: [-3, -1, 0, 2, 0, -1, -3], beat: 0.9 },
      { kind: 'harmony', title: 'A fourth below', prompt: 'A more open sound under the tune.', lead: [4, 5, 7, 5, 4], offsets: [-1, 0, 2, 0, -1], beat: 0.9 },
    ]),
    lesson('harmony-5', 'Open fifths', 6, [
      {
        kind: 'teach',
        title: 'Parallel fifths',
        body: 'Singing a fifth above the tune the whole way gives an open, ancient-sounding harmony. It is not used all the time in classical writing, but it is easy to hear and a great way to practise holding a part against another.',
      },
      { kind: 'harmony', title: 'Fifths above', prompt: 'Keep the fifth open and steady.', lead: [0, 2, 4, 5, 4, 2, 0], offsets: [7, 9, 11, 12, 11, 9, 7], beat: 0.9 },
      { kind: 'harmony', title: 'Mix it up', prompt: 'A third, then a fifth.', lead: [0, 2, 4, 5, 7, 5, 4, 2, 0], offsets: [4, 5, 7, 9, 14, 12, 11, 9, 7], beat: 0.85 },
    ]),
  ],
};

const adlib: Unit = {
  id: 'adlib',
  title: 'Ad-libbing',
  tagline: 'Make it yours, safely inside the key.',
  icon: 'Sparkles',
  lessons: [
    lesson('adlib-1', 'Home and friends', 5, [
      {
        kind: 'teach',
        title: 'Start with a safe palette',
        body: 'Ad-libbing means improvising extra notes and phrases around a melody. Start with the pentatonic scale: every note works with the others, so you cannot go wrong. Return to your home note often, like a comfortable chair.',
        tip: 'In the next exercise, the gold lines show which notes to use. Wander between them and come back to home.',
      },
      { kind: 'improv', title: 'Free play', prompt: 'Sing anything you like on the gold notes.', scale: 'majorPentatonic', seconds: 15, wantDistinct: 3 },
    ]),
    lesson('adlib-2', 'Call and response', 6, [
      {
        kind: 'teach',
        title: 'Answer the lick',
        body: 'Jazz, gospel and soul singers learn by call and response: hear a short lick, then answer it with your own. Copy first, then change one thing: a note, a rhythm, an ending.',
      },
      { kind: 'melody', title: 'Copy the call', prompt: 'Listen, then sing it back exactly.', offsets: [0, 4, 2, 4, 7], beat: 0.7 },
      { kind: 'melody', title: 'Copy another', prompt: 'A new lick, same job.', offsets: [7, 4, 5, 4, 2, 0], beat: 0.7 },
      { kind: 'improv', title: 'Now answer', prompt: 'Make up your own replies.', scale: 'majorPentatonic', seconds: 15, wantDistinct: 4 },
    ]),
    lesson('adlib-3', 'Shape a phrase', 6, [
      {
        kind: 'teach',
        title: 'A phrase has a shape',
        body: 'Good ad-libs have a beginning, a peak and a rest. Start low or mid, climb to one highlight, then settle home. Use fewer notes than you think, repeat an idea, and leave space between phrases.',
        tip: 'Space is a note too. Breathe, then sing.',
      },
      { kind: 'improv', title: 'Minor shapes', prompt: 'Build phrases with a peak and a landing.', scale: 'minorPentatonic', seconds: 20, wantDistinct: 4 },
    ]),
    lesson('adlib-4', 'A little spice', 6, [
      {
        kind: 'teach',
        title: 'Ornaments for ad-libs',
        body: 'Turns, quick slides into a note, and little runs make an ad-lib sound polished. The guide for worship teams is clear: use them to serve the song, not to overshadow it.',
        demo: { type: 'melody', offsets: [4, 5, 4, 2, 4, 7], beat: 0.5 },
      },
      { kind: 'melody', title: 'A lick with a turn', prompt: 'Sing the lick, with its ornament.', offsets: [4, 5, 4, 2, 4, 7], beat: 0.6 },
      { kind: 'improv', title: 'Play with ornaments', prompt: 'Use the whole scale, include a turn or two.', scale: 'major', seconds: 20, wantDistinct: 5 },
    ]),
    lesson('adlib-5', 'Blues colours', 6, [
      {
        kind: 'teach',
        title: 'The blues scale',
        body: "Add a 'blue note' (a flattened fifth) to the minor pentatonic and you get the blues scale. It slips in a bit of tension that gives the music its attitude. Slide into the blue note rather than landing on it flat.",
      },
      { kind: 'improv', title: 'Blues free play', prompt: 'Six notes of blues. Find the blue one.', scale: 'blues', seconds: 20, wantDistinct: 4 },
    ]),
    lesson('adlib-6', 'Your own moment', 7, [
      {
        kind: 'teach',
        title: 'Prepare, then let go',
        body: 'Even famous ad-libs are often rehearsed. Make a plan before you perform: pick spots, try ideas, keep the ones that work. Then, in the moment, trust the plan and feel free to add something new.',
        checklist: [
          'Pick two spots in a song for an ad-lib (end of a line, a held note)',
          'Rehearse three short licks and pick the best',
          'Practise returning to the home note every time',
          'Record yourself, listen back, keep the keepers',
        ],
      },
      { kind: 'improv', title: 'The longer take', prompt: 'Thirty seconds of your own music.', scale: 'majorPentatonic', seconds: 30, wantDistinct: 5, drone: true },
    ]),
  ],
};

export const EXPANSION: { units: Unit[]; extra: Record<string, Lesson[]> } = {
  units: [diction, intervals, registers, power, runs, harmony, adlib],
  extra: {
    breath: breathExtra,
    pitch: pitchExtra,
    scales: scalesExtra,
    ear: earExtra,
    sustain: sustainExtra,
    range: rangeExtra,
  },
};

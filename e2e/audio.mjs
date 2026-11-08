// Synthetic "singing" for the browser smoke tests. Chromium can play a WAV file
// into the page as if it were the microphone, so the real pitch detector, the
// real scoring and the real screens are exercised with no human in the loop.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 48000;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** A voice-like tone (a few harmonics) on one note, with a loudness curve in dB. */
function voice(midi, secs, db = () => -22) {
  const n = Math.round(SR * secs);
  const out = new Float32Array(n);
  let phase = 0;
  const f = hz(midi);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * f) / SR;
    let x = 0;
    for (let k = 1; k <= 8; k++) x += Math.sin(k * phase) / k;
    const fade = Math.min(1, t / 0.03, (secs - t) / 0.03);
    out[i] = x * 0.5 * 10 ** (db(t) / 20) * fade;
  }
  return out;
}

const silence = (secs) => new Float32Array(Math.round(SR * secs));

function join_(...parts) {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

/** Writes the test clips into `dir` and returns their paths. The app's home note for a C3 to C5 voice is A#3 (MIDI 58). */
export function makeClips(dir) {
  mkdirSync(dir, { recursive: true });
  const clips = {
    // Steady home note, a minute long.
    steady: voice(58, 60),
    // Silence, then a 6 s swell (soft, loud, soft) on the home note, then quiet. Loops every 15.5 s.
    swell: join_(silence(3.5), voice(58, 6, (t) => -34 + 14 * (1 - Math.abs(t - 3) / 3)), silence(6)),
    // Wanders over the notes of A#-major-pentatonic.
    improv: join_(...[58, 62, 65, 62, 67, 70, 67, 65, 60, 58, 62, 65, 70, 67, 60, 58].map((m) => voice(m, 0.6)), silence(1)),
    // Nothing at all.
    quiet: silence(30),
  };
  const paths = {};
  for (const [name, samples] of Object.entries(clips)) {
    paths[name] = join(dir, `${name}.wav`);
    writeFileSync(paths[name], wav(samples));
  }
  return paths;
}

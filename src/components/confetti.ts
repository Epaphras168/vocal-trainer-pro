import confetti from 'canvas-confetti';

/** Brand-coloured confetti burst. Respects reduced motion. */
export function celebrate(power: 'small' | 'big' = 'small'): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--gold', '--teal', '--pink'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
  const base = { colors, disableForReducedMotion: true, zIndex: 100, scalar: 1.1 };
  if (power === 'small') {
    void confetti({ ...base, particleCount: 70, spread: 70, origin: { y: 0.6 } });
    return;
  }
  void confetti({ ...base, particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
  void confetti({ ...base, particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
  setTimeout(() => void confetti({ ...base, particleCount: 120, spread: 120, origin: { y: 0.4 }, shapes: ['star'] }), 250);
}

import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/synth';

/** Animated number that ticks up, optionally with a soft tick sound. */
export function CountUp({ to, duration = 900, delay = 0, prefix = '', suffix = '', sound = false }: {
  to: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  sound?: boolean;
}) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    let start = 0;
    let lastTick = 0;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        start ||= now;
        const k = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        const v = Math.round(to * eased);
        setValue(v);
        if (sound && v - lastTick >= Math.max(1, Math.round(to / 8))) {
          lastTick = v;
          sfx('xp');
        }
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, [to, duration, delay, sound]);
  return (
    <span className="num">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

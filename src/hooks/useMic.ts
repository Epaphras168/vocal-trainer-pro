import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { pitchEngine, type InputHint, type MicState, type PitchFrame } from '../audio/pitchEngine';

export function useMicState(): MicState {
  return useSyncExternalStore(
    (cb) => pitchEngine.onState(cb),
    () => pitchEngine.state,
  );
}

let holders = 0;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Keep the mic open while a singing screen is mounted, and close it a few
 * seconds after the last one goes away (so hopping between exercises
 * doesn't re-prompt or click the mic indicator on and off).
 */
export function useMicLease(): void {
  useEffect(() => {
    holders++;
    clearTimeout(stopTimer);
    return () => {
      holders--;
      if (holders === 0) stopTimer = setTimeout(() => holders === 0 && pitchEngine.stop(), 8000);
    };
  }, []);
}

/** Has the browser already granted mic access (so we can skip the explainer)? */
export async function micAlreadyGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return status?.state === 'granted';
  } catch {
    return false;
  }
}

/** Latest frame, re-rendering at most `hz` times a second. */
export function useThrottledFrame(hz = 15): PitchFrame {
  const [frame, setFrame] = useState(pitchEngine.latest);
  const last = useRef(0);
  useEffect(
    () =>
      pitchEngine.onFrame((f) => {
        if (f.t - last.current >= 1 / hz) {
          last.current = f.t;
          setFrame(f);
        }
      }),
    [hz],
  );
  return frame;
}

/** Input-quality coaching hint, refreshed twice a second. */
export function useInputHint(active = true): InputHint {
  const [hint, setHint] = useState<InputHint>('ok');
  useEffect(() => {
    if (!active) {
      setHint('ok');
      return;
    }
    const id = setInterval(() => setHint(pitchEngine.state === 'running' ? pitchEngine.hint() : 'ok'), 500);
    return () => clearInterval(id);
  }, [active]);
  return hint;
}

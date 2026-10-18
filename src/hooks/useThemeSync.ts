import { useEffect } from 'react';
import { useGame } from '../game/store';
import { setSfxEnabled } from '../audio/synth';

/** Mirror theme, accent and sound preferences onto the document. */
export function useThemeSync(): void {
  const theme = useGame((s) => s.theme);
  const accent = useGame((s) => s.accent);
  const sound = useGame((s) => s.sound);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1b0f1d' : '#fbf1e4');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => setSfxEnabled(sound), [sound]);
}

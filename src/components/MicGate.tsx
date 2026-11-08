import { useEffect, useState, type ReactNode } from 'react';
import { Copy, Headphones, Mic, RefreshCw, ShieldCheck } from 'lucide-react';
import { pitchEngine } from '../audio/pitchEngine';
import { micAlreadyGranted, useMicLease, useMicState } from '../hooks/useMic';
import { browserFamily, inAppBrowser, micHelp } from '../diagnostics/info';
import { feedbackLink } from './feedback';
import { Mascot } from './Mascot';
import './MicGate.css';

// Explain why we want the mic *before* the browser asks, then handle every
// way the request can go.

interface Props {
  children: ReactNode;
  /** What the mic will be used for, in Pip's words. */
  purpose?: string;
}

export function MicGate({ children, purpose = 'so I can hear your notes and show them on screen' }: Props) {
  useMicLease();
  const state = useMicState();
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const inApp = inAppBrowser();
  const stuck = feedbackLink('Belto microphone problem');

  useEffect(() => {
    let alive = true;
    micAlreadyGranted().then((granted) => {
      if (!alive) return;
      if (granted && pitchEngine.state !== 'running') void pitchEngine.start();
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'running') return <>{children}</>;
  if (!checked && state === 'idle') return <div className="micgate micgate--loading" aria-busy="true" />;

  // Browsers inside Instagram, Facebook, WhatsApp and friends usually refuse the mic
  // for good. Say so up front rather than letting people fail the permission prompt.
  if (inApp && state !== 'requesting') {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(location.origin + location.pathname);
        setCopied(true);
      } catch {
        // clipboard blocked: the address is on screen anyway
      }
    };
    return (
      <div className="micgate card pop-in" role="region" aria-label="Open in your browser">
        <Mascot mood="encourage" size={120} />
        <h2 className="h2">Open Belto in your browser</h2>
        <p className="dim">
          You're viewing Belto inside {inApp}, and apps like that usually block the microphone. Open this page in Safari or Chrome to sing.
        </p>
        <ol className="micgate__steps">
          <li>Tap the menu (three dots or the share icon).</li>
          <li>Choose <strong>Open in browser</strong> (or Open in Safari / Chrome).</li>
        </ol>
        <button className="btn btn--primary btn--block" onClick={copy}>
          <Copy size={18} /> {copied ? 'Link copied. Paste it in your browser' : 'Copy the link'}
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => pitchEngine.start()}>
          <Mic size={18} /> Try the microphone anyway
        </button>
      </div>
    );
  }

  return (
    <div className="micgate card pop-in" role="region" aria-label="Microphone access">
      {state === 'idle' && (
        <>
          <Mascot mood="listen" size={130} />
          <h2 className="h2">Pip needs to hear you</h2>
          <p className="dim">Turn on your microphone {purpose}.</p>
          <ul className="micgate__facts">
            <li>
              <ShieldCheck size={20} /> Your voice is analysed right here on your device. Nothing is recorded or uploaded.
            </li>
            <li>
              <Headphones size={20} /> Headphones help, but aren't required. Belto pauses listening while it plays notes.
            </li>
          </ul>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => pitchEngine.start()}>
            <Mic size={20} /> Turn on my mic
          </button>
        </>
      )}
      {state === 'requesting' && (
        <>
          <Mascot mood="wow" size={120} />
          <h2 className="h2">Look for the pop-up</h2>
          <p className="dim">Your browser is asking for mic access. Tap <strong>Allow</strong> and we'll get singing.</p>
        </>
      )}
      {state === 'denied' && (
        <>
          <Mascot mood="encourage" size={120} />
          <h2 className="h2">The mic is blocked</h2>
          <p className="dim">No worries, it's an easy fix:</p>
          <ol className="micgate__steps">
            {micHelp(browserFamily()).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button className="btn btn--primary btn--block" onClick={() => pitchEngine.start()}>
            <RefreshCw size={18} /> Try again
          </button>
          {stuck && (
            <a className="micgate__help" href={stuck}>
              Still stuck? Tell us
            </a>
          )}
        </>
      )}
      {state === 'unsupported' && (
        <>
          <Mascot mood="encourage" size={120} />
          <h2 className="h2">This browser can't listen</h2>
          <p className="dim">
            Belto needs microphone access, which only works on a secure (https) page in a modern browser. Try the latest Chrome, Safari, Firefox or Edge.
          </p>
        </>
      )}
      {state === 'error' && (
        <>
          <Mascot mood="encourage" size={120} />
          <h2 className="h2">I couldn't find a mic</h2>
          <p className="dim">Check that a microphone is plugged in and not being used by another app, then try again.</p>
          <button className="btn btn--primary btn--block" onClick={() => pitchEngine.start()}>
            <RefreshCw size={18} /> Try again
          </button>
          {stuck && (
            <a className="micgate__help" href={stuck}>
              Still stuck? Tell us
            </a>
          )}
        </>
      )}
    </div>
  );
}

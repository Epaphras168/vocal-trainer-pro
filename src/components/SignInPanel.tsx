import { useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { cloud } from '../cloud/account';
import { sfx } from '../audio/synth';
import './SignInPanel.css';

// Passwordless sign-in: we email a link that also carries a 6-digit code, so
// it works whether the email is opened on this device or another one.

export function SignInPanel({ title = 'Sign in', blurb }: { title?: string; blurb?: string }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await cloud().sendCode(email.trim());
      sfx('pop');
      setStep('code');
    } catch (err) {
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await cloud().verifyCode(email.trim(), code.trim());
      sfx('success');
    } catch (err) {
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div className="signin">
      <h2 className="h2">{title}</h2>
      {blurb && <p className="dim">{blurb}</p>}
      {step === 'email' ? (
        <form
          className="signin__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (validEmail && !busy) void send();
          }}
        >
          <label className="onb__label" htmlFor="signin-email">
            Your email
          </label>
          <input
            id="signin-email"
            className="field"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn--primary btn--lg btn--block" disabled={!validEmail || busy}>
            <Mail size={20} /> {busy ? 'Sending...' : 'Email me a sign-in link'}
          </button>
          <p className="signin__note mute">
            <ShieldCheck size={16} /> No password needed. We only use your email to sign you in.
          </p>
        </form>
      ) : (
        <form
          className="signin__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 6 && !busy) void verify();
          }}
        >
          <p className="signin__sent">
            We sent a link to <strong>{email.trim()}</strong>. Tap it on this device, or type the 6-digit code from the email.
          </p>
          <label className="onb__label" htmlFor="signin-code">
            Code
          </label>
          <input
            id="signin-code"
            className="field signin__code num"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button className="btn btn--primary btn--lg btn--block" disabled={code.trim().length < 6 || busy}>
            {busy ? 'Checking...' : 'Sign in'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          >
            <ArrowLeft size={16} /> Use a different email
          </button>
        </form>
      )}
      {error && (
        <p className="signin__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function friendly(message: string): string {
  if (/rate|too many|seconds/i.test(message)) return "That's a lot of emails! Wait a minute and try again.";
  if (/expired|invalid|token/i.test(message)) return 'That code did not work. It may have expired, so ask for a new one.';
  if (/fetch|network/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  return message;
}

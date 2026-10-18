import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { cloud } from '../cloud/account';
import { sfx } from '../audio/synth';
import './SignInPanel.css';

// Sign in with Google, or with an email and password.

type Mode = 'signin' | 'signup' | 'forgot';

export function SignInPanel({ title = 'Sign in', blurb }: { title?: string; blurb?: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const google = () => run(() => cloud().signInWithGoogle());

  const submit = () =>
    run(async () => {
      const e = email.trim();
      if (mode === 'forgot') {
        await cloud().sendPasswordReset(e);
        setNotice(`If ${e} has an account, a reset link is on its way.`);
        return;
      }
      if (mode === 'signup') {
        const result = await cloud().signUp(e, password);
        if (result === 'confirm-email') {
          setNotice(`Almost there! Open the email we sent to ${e} to confirm your account, then sign in.`);
          setMode('signin');
          return;
        }
      } else {
        await cloud().signInWithPassword(e, password);
      }
      sfx('success');
    });

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const ready = validEmail && (mode === 'forgot' || password.length >= 6);
  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="signin">
      <h2 className="h2">{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : title}</h2>
      {blurb && mode !== 'forgot' && <p className="dim">{blurb}</p>}

      {mode !== 'forgot' && (
        <>
          <button className="btn btn--lg btn--block signin__google" onClick={google} disabled={busy}>
            <GoogleMark /> Continue with Google
          </button>
          <div className="signin__or" role="separator">
            <span>or use email</span>
          </div>
        </>
      )}

      <form
        className="signin__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void submit();
        }}
      >
        <label className="onb__label" htmlFor="signin-email">
          Email
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
        {mode !== 'forgot' && (
          <>
            <div className="spread">
              <label className="onb__label" htmlFor="signin-password">
                Password
              </label>
              {mode === 'signin' && (
                <button type="button" className="signin__link" onClick={() => switchTo('forgot')}>
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="signin-password"
              className="field"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        <button className="btn btn--primary btn--lg btn--block" disabled={!ready || busy}>
          <Mail size={20} />
          {busy ? 'One moment...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Email me a reset link' : 'Sign in'}
        </button>
      </form>

      {notice && (
        <p className="signin__notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="signin__error" role="alert">
          {error}
        </p>
      )}

      <p className="signin__switch">
        {mode === 'signin' && (
          <>
            New to Belto?{' '}
            <button type="button" className="signin__link" onClick={() => switchTo('signup')}>
              Create an account
            </button>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <button type="button" className="signin__link" onClick={() => switchTo('signin')}>
              Sign in
            </button>
          </>
        )}
        {mode === 'forgot' && (
          <button type="button" className="signin__link" onClick={() => switchTo('signin')}>
            <ArrowLeft size={14} /> Back to sign in
          </button>
        )}
      </p>
    </div>
  );
}

/** For the password-reset link: the singer arrives signed in and picks a new password. */
export function NewPasswordPanel({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="signin signin__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await cloud().updatePassword(password);
          sfx('success');
          onDone();
        } catch (err) {
          setError(friendly((err as Error).message));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="h2">Choose a new password</h2>
      <input
        className="field"
        type="password"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="New password"
        autoFocus
      />
      <button className="btn btn--primary btn--lg btn--block" disabled={password.length < 6 || busy}>
        Save password
      </button>
      {error && (
        <p className="signin__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Try again, or reset your password.";
  if (/already registered|already exists/i.test(message)) return 'That email already has an account. Sign in instead.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for our message.';
  if (/at least 6|password should/i.test(message)) return 'Your password needs at least 6 characters.';
  if (/rate|too many|seconds/i.test(message)) return 'Too many tries. Wait a minute and try again.';
  if (/provider is not enabled/i.test(message)) return "Google sign-in isn't switched on yet. Use email for now.";
  if (/fetch|network/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  return message;
}

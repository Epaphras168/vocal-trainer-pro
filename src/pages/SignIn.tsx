import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { rememberInvite, useAccount } from '../cloud/account';
import { useGame } from '../game/store';
import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { SignInPanel } from '../components/SignInPanel';

/** For returning singers on a new device: sign in, pull progress, carry on. */
export function SignIn() {
  const nav = useNavigate();
  const status = useAccount((s) => s.status);
  const onboarded = useGame((s) => s.onboarded);

  useEffect(() => {
    if (status === 'signed-in') nav(onboarded ? '/home' : '/onboarding', { replace: true });
  }, [status, onboarded, nav]);

  return (
    <div className="column stack" style={{ paddingTop: 'var(--s-4)' }}>
      <Logo />
      <div className="card stack" style={{ alignItems: 'stretch' }}>
        <div style={{ alignSelf: 'center' }}>
          <Mascot mood={status === 'loading' ? 'listen' : 'cheer'} size={120} />
        </div>
        {status === 'disabled' ? (
          <p className="dim">Accounts aren't switched on for this copy of Belto. Your progress is saved on this device.</p>
        ) : status === 'loading' ? (
          <p className="dim" style={{ textAlign: 'center' }}>
            Fetching your progress...
          </p>
        ) : (
          <SignInPanel title="Welcome back" blurb="Sign in to pick up your path, streak and friends on this device." />
        )}
      </div>
    </div>
  );
}

/** /add/:code invite links: remember the code, then send them where they need to go. */
export function AddInvite() {
  const { code = '' } = useParams();
  const onboarded = useGame((s) => s.onboarded);
  rememberInvite(code);
  return <Navigate to={onboarded ? '/friends' : '/onboarding'} replace />;
}

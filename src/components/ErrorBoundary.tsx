import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../diagnostics/monitoring';
import { Mascot } from './Mascot';
import { feedbackLink } from './feedback';

// If something throws while rendering, show a calm way out instead of a blank page.

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, `render:${info.componentStack?.split('\n')[1]?.trim().slice(0, 60) ?? '?'}`);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const mail = feedbackLink('Belto hit an error');
    return (
      <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <Mascot mood="encourage" size={140} />
        <h1 className="h1">Oops, Pip dropped the mic</h1>
        <p className="dim">Something went wrong on our side. Your progress is saved on this device, so nothing is lost.</p>
        <div style={{ display: 'grid', gap: 12, maxWidth: 360, margin: '0 auto', width: '100%' }}>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => location.reload()}>
            Reload Belto
          </button>
          <a className="btn btn--ghost btn--block" href="/home">
            Back to home
          </a>
          {mail && (
            <a className="btn btn--ghost btn--block" href={mail}>
              Tell us what happened
            </a>
          )}
        </div>
      </main>
    );
  }
}

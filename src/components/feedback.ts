import { deviceSummary } from '../diagnostics/info';
import { lastError } from '../diagnostics/monitoring';

/** A mailto: link for feedback or a bug report, with the details a fix needs filled in. Null if no contact email is set. */
export function feedbackLink(subject = 'Belto feedback'): string | null {
  const to = import.meta.env.VITE_CONTACT_EMAIL;
  if (!to) return null;
  const d = deviceSummary();
  const err = lastError();
  const body = [
    'What happened, or what would you like us to know?',
    '',
    '',
    '',
    '---- Details (helps us fix things; please leave in) ----',
    `Build: ${d.build}`,
    `Page: ${d.page}`,
    `Browser: ${d.browser}`,
    `Screen: ${d.viewport}${d.installed ? ' (installed app)' : ''}${d.inApp ? ` (inside ${d.inApp})` : ''}`,
    `Online: ${d.online ? 'yes' : 'no'}`,
    err ? `Last error: ${err}` : '',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

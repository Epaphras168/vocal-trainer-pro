import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import './Legal.css';

// Plain-language Privacy Policy and Terms. They describe what Belto actually
// does today, so update them whenever the app's data handling changes.

const UPDATED = 'October 19, 2026';
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

function Contact() {
  return CONTACT ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a> : <>the contact details on the site where you found Belto</>;
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal">
      <header className="legal__top">
        <Logo />
        <Link to="/" className="btn btn--ghost btn--sm">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>
      <article className="legal__body">
        <p className="eyebrow">Belto</p>
        <h1 className="legal__title">{title}</h1>
        <p className="mute">Last updated {UPDATED}</p>
        {children}
        <nav className="legal__foot" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </nav>
      </article>
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy Policy">
      <p>
        Belto is a singing trainer. This page explains what information it uses, where that information lives, and who can see it. We've tried to keep it short and plain.
      </p>

      <h2>Your voice stays on your device</h2>
      <p>
        When you sing, Belto listens through your microphone to work out which note you're singing. That happens entirely inside your browser. <strong>Your voice is never recorded, saved or sent anywhere.</strong> Only the results (like a score) are kept.
      </p>

      <h2>What's saved on your device</h2>
      <p>
        Your progress (XP, streak, lessons, badges, gems, your measured vocal range, settings) is saved in your browser's local storage. You can use Belto this way without an account. Clearing your browser data removes it.
      </p>

      <h2>If you create an account</h2>
      <p>Accounts are optional and are used for backup, syncing between devices, and friends. If you make one, we store:</p>
      <ul>
        <li>your email address and a password (the password is stored in scrambled, hashed form by our sign-in provider, never in readable form);</li>
        <li>if you choose Google sign-in, the name and email address Google shares with us (we don't get your Google password or other Google data);</li>
        <li>your display name, a friend code, and a copy of your progress;</li>
        <li>who you're friends with, and any friend requests.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li>
          <strong>Your friends</strong> can see your display name, level, total and weekly XP, streak, lessons completed, best accuracy, voice type (for example "Alto"), and the day you last practised.
        </li>
        <li>
          <strong>Someone who has your friend code</strong> can send you a friend request. While a request is pending, they see your display name and nothing else.
        </li>
        <li>
          <strong>Nobody else</strong> can see your email address, your full progress, or your friends list. We don't sell your information, show ads, or use it for tracking.
        </li>
      </ul>
      <p>Use a first name or nickname as your display name if you'd rather not use your real one.</p>

      <h2>Services that help us run Belto</h2>
      <ul>
        <li>
          <strong>Supabase</strong> hosts accounts and the database where account information is stored.
        </li>
        <li>
          <strong>Vercel</strong> hosts the website. Like most hosts, it keeps basic technical logs (such as IP address and pages requested) for security and reliability.
        </li>
        <li>
          <strong>Google</strong>, only if you choose to sign in with Google.
        </li>
      </ul>
      <p>Belto does not use advertising or analytics trackers.</p>

      <h2>Keeping and deleting your information</h2>
      <p>
        We keep your account information for as long as your account exists. To delete your account and everything stored with it, contact us at <Contact /> and we'll remove it. Your progress on your own device can be cleared at any time from your browser's settings, or with <em>Reset all progress</em> in Belto's Profile page.
      </p>

      <h2>Children</h2>
      <p>Belto isn't aimed at children under 13, and we don't knowingly collect their information. If you think a child has made an account, contact us and we'll delete it.</p>

      <h2>Changes</h2>
      <p>If we change how Belto handles information, we'll update this page and the date at the top.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your information: <Contact />.
      </p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of Service">
      <p>By using Belto you agree to these terms. If you don't agree, please don't use it.</p>

      <h2>What Belto is</h2>
      <p>
        Belto is a free app with singing lessons, practice exercises and games. It's meant for fun and practice. It doesn't replace a voice teacher or a doctor.
      </p>

      <h2>Look after your voice</h2>
      <p>
        Singing should never hurt. Stop if you feel pain, strain or hoarseness, take breaks, and keep water nearby. You sing and follow the exercises at your own risk. Belto's pitch scores are estimates and can be affected by your microphone and your room.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You can use Belto without an account. If you make one, keep your password private. You're responsible for what happens under your account.</li>
        <li>Give accurate sign-in details, and don't use someone else's account.</li>
        <li>You can stop using Belto and ask us to delete your account at any time (see the Privacy Policy).</li>
      </ul>

      <h2>Being kind to other singers</h2>
      <p>Friends and rankings are for friendly fun. Please don't:</p>
      <ul>
        <li>choose a display name that is offensive, hateful, or pretends to be someone else;</li>
        <li>send friend requests to people to harass or spam them;</li>
        <li>try to cheat the rankings, break the app, attack the service, or access other people's information.</li>
      </ul>
      <p>We may remove accounts or display names that break these rules.</p>

      <h2>Our content</h2>
      <p>
        The app, its lessons, artwork and the Pip character belong to Belto's maker. You may use them to practise singing, but please don't copy or resell them.
      </p>

      <h2>No guarantees</h2>
      <p>
        Belto is provided "as is" and "as available". We work hard to keep it running well, but we can't promise it will always be available, error-free, or that your saved progress will never be lost. To the fullest extent the law allows, we aren't liable for losses that come from using Belto.
      </p>

      <h2>Changes and ending the service</h2>
      <p>
        We may change Belto or these terms, or stop offering Belto, at any time. When these terms change materially we'll update the date at the top of this page. Using Belto after a change means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <Contact />.
      </p>
    </Page>
  );
}

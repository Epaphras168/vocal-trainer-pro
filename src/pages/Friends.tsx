import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Check, Copy, Flame, Mic2, Share2, Target, Trophy, UserMinus, UserPlus, X } from 'lucide-react';
import { ALL_LESSONS } from '../content/curriculum';
import { cloud, inviteLink, takeInvite, useAccount } from '../cloud/account';
import { lastSeen, liveStreak, parseFriendCode, rankBoard, type BoardMode, type RankedRow } from '../cloud/summary';
import type { AddFriendResult, FriendRow } from '../cloud/types';
import { dayKey, weekStart } from '../game/dates';
import { useGame } from '../game/store';
import { sfx } from '../audio/synth';
import { Mascot } from '../components/Mascot';
import { SignInPanel } from '../components/SignInPanel';
import './Friends.css';

const ADD_COPY: Record<AddFriendResult, string> = {
  requested: 'Request sent! They will show up here once they accept.',
  accepted: "They'd already asked you, so you're now friends!",
  already_friends: "You're already friends.",
  already_requested: 'Request already sent. Waiting on them.',
  not_found: "No singer has that code. Double-check it and try again.",
  self: "That's your own code! Share it with a friend instead.",
  limit: "You've hit the friend limit (200). Remove someone to add more.",
};

export function Friends() {
  const status = useAccount((s) => s.status);
  return (
    <div className="friends">
      <header className="friends__head">
        <div>
          <p className="eyebrow">Friends</p>
          <h1 className="friends__title">Sing together</h1>
          <p className="dim">See how your friends are doing, cheer their streaks, and race for the top spot each week.</p>
        </div>
        <Mascot mood="cheer" size={130} />
      </header>
      {status === 'disabled' && <NotConfigured />}
      {status === 'loading' && <div className="card friends__loading" aria-busy="true" />}
      {status === 'signed-out' && (
        <div className="card friends__signin">
          <SignInPanel
            title="Sign in to add friends"
            blurb="Your progress gets backed up and syncs across your devices, and you can add friends with a code."
          />
        </div>
      )}
      {status === 'signed-in' && <Board />}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="card friends__empty">
      <Mascot mood="sleep" size={100} />
      <div>
        <h2 className="h3">Friends aren't switched on yet</h2>
        <p className="dim">This copy of Belto isn't connected to a server, so there's nobody to add. Everything else works offline.</p>
      </div>
    </div>
  );
}

function Board() {
  const friendCode = useAccount((s) => s.friendCode);
  const syncError = useAccount((s) => s.error);
  const setFriendCount = useGame((s) => s.setFriendCount);
  const xp = useGame((s) => s.xp);
  const [rows, setRows] = useState<FriendRow[] | null>(null);
  const [mode, setMode] = useState<BoardMode>('week');
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await cloud().friendBoard(weekStart(dayKey()));
      setRows(data);
      setLoadError(null);
      setFriendCount(data.filter((r) => r.relation === 'friend').length);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [setFriendCount]);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  };

  const add = useCallback(
    async (raw: string) => {
      const code = parseFriendCode(raw);
      if (!code) return;
      try {
        const result = await cloud().addFriend(code);
        sfx(result === 'requested' || result === 'accepted' ? 'pop' : 'soft');
        say(ADD_COPY[result]);
        await load();
      } catch (err) {
        say((err as Error).message);
      }
    },
    [load],
  );

  useEffect(() => {
    void load();
    // A pending invite link from before sign-in/onboarding gets used now.
    const invite = takeInvite();
    if (invite) void add(invite);
    const id = setInterval(load, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, add]);

  // Our own XP changes are pushed after a short delay; refresh to pick them up.
  useEffect(() => {
    const t = setTimeout(load, 3500);
    return () => clearTimeout(t);
  }, [xp, load]);

  const ranked = useMemo(() => (rows ? rankBoard(rows, mode) : []), [rows, mode]);
  const incoming = rows?.filter((r) => r.relation === 'incoming') ?? [];
  const outgoing = rows?.filter((r) => r.relation === 'outgoing') ?? [];
  const friendCount = rows?.filter((r) => r.relation === 'friend').length ?? 0;

  const respond = async (id: string, accept: boolean) => {
    await cloud().respond(id, accept);
    sfx(accept ? 'success' : 'tap');
    if (accept) say('New friend! Time to out-sing each other.');
    await load();
  };

  const remove = async (id: string) => {
    await cloud().removeFriend(id);
    setOpen(null);
    await load();
  };

  return (
    <>
      {flash && (
        <p className="friends__flash pop-in" role="status">
          {flash}
        </p>
      )}
      {(loadError || syncError) && (
        <p className="friends__warn" role="alert">
          {loadError ? "Couldn't load your friends right now. We'll keep trying." : 'Your latest progress is not synced yet. It will retry automatically.'}
        </p>
      )}

      {incoming.length > 0 && (
        <section className="card friends__requests" aria-label="Friend requests">
          <h2 className="h3">Friend requests</h2>
          {incoming.map((r) => (
            <div key={r.id} className="request">
              <Avatar row={r} />
              <span className="request__name">
                <strong>{r.name}</strong> wants to sing with you
              </span>
              <button className="btn btn--teal btn--sm" onClick={() => respond(r.id, true)}>
                <Check size={16} /> Accept
              </button>
              <button className="icon-btn" onClick={() => respond(r.id, false)} aria-label={`Decline ${r.name}`}>
                <X size={18} />
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="card friends__board" aria-label="Friend rankings">
        <div className="spread">
          <h2 className="h3">
            <Trophy size={22} className="friends__trophy" /> Rankings
          </h2>
          <div className="seg" role="radiogroup" aria-label="Ranking period">
            <button role="radio" aria-checked={mode === 'week'} onClick={() => setMode('week')}>
              This week
            </button>
            <button role="radio" aria-checked={mode === 'all'} onClick={() => setMode('all')}>
              All time
            </button>
          </div>
        </div>
        {rows === null ? (
          <div className="friends__skeleton" aria-busy="true" />
        ) : (
          <ol className="board">
            {ranked.map((r) => (
              <BoardRow key={r.id} row={r} mode={mode} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} onRemove={() => remove(r.id)} />
            ))}
          </ol>
        )}
        {rows !== null && friendCount === 0 && (
          <div className="friends__lonely">
            <Mascot mood="encourage" size={80} still />
            <p className="dim">It's just you so far. Share your code below and turn practice into a friendly race.</p>
          </div>
        )}
      </section>

      <AddFriends code={friendCode} onAdd={add} onCopied={say} />

      {outgoing.length > 0 && (
        <section className="card friends__outgoing" aria-label="Sent requests">
          <h2 className="h3">Waiting to hear back</h2>
          {outgoing.map((r) => (
            <div key={r.id} className="request">
              <Avatar row={r} />
              <span className="request__name">
                <strong>{r.name}</strong> hasn't accepted yet
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => remove(r.id)}>
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Avatar({ row, size = 44 }: { row: FriendRow; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: `hsl(${row.hue} 62% 56%)` }} aria-hidden="true">
      {row.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function BoardRow({ row, mode, open, onToggle, onRemove }: { row: RankedRow; mode: BoardMode; open: boolean; onToggle: () => void; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const isYou = row.relation === 'self';
  const streak = liveStreak(row.streak ?? 0, row.lastActive);
  const lessons = row.lessonsCompleted ?? 0;
  return (
    <li className={`brow ${isYou ? 'is-you' : ''} ${open ? 'is-open' : ''}`}>
      <button className="brow__main" onClick={onToggle} aria-expanded={open}>
        <span className={`brow__rank num ${row.rank <= 3 && row.score > 0 ? `is-medal is-medal-${row.rank}` : ''}`}>{row.rank}</span>
        {isYou ? (
          <span className="avatar avatar--you" aria-hidden="true">
            <Mascot size={40} still title="" />
          </span>
        ) : (
          <Avatar row={row} />
        )}
        <span className="brow__who">
          <strong>{isYou ? `${row.name} (you)` : row.name}</strong>
          <span className="brow__meta">
            Level {row.level ?? 1}
            {streak > 0 && (
              <span className="brow__streak">
                <Flame size={13} /> {streak}
              </span>
            )}
          </span>
        </span>
        <span className="brow__xp num">
          {row.score}
          <small>{mode === 'week' ? ' XP this week' : ' XP'}</small>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="brow__detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="brow__stats">
              <Stat icon={<BookOpen size={16} />} label="Lessons" value={`${lessons}/${ALL_LESSONS.length}`}>
                <div className="bar bar--teal">
                  <span style={{ width: `${(lessons / ALL_LESSONS.length) * 100}%` }} />
                </div>
              </Stat>
              <Stat icon={<Target size={16} />} label="Best accuracy" value={row.bestAccuracy ? `${row.bestAccuracy}%` : '--'} />
              <Stat icon={<Flame size={16} />} label="Longest streak" value={`${row.longestStreak ?? 0} days`} />
              <Stat icon={<Mic2 size={16} />} label="Voice" value={row.voiceType ?? 'Not tested'} />
            </div>
            <div className="spread brow__foot">
              <span className="mute">
                {row.xp ?? 0} XP all time · last sang {lastSeen(row.lastActive)}
              </span>
              {!isYou &&
                (confirm ? (
                  <span className="row">
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>
                      Keep
                    </button>
                    <button className="btn btn--sm" onClick={onRemove}>
                      Remove
                    </button>
                  </span>
                ) : (
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(true)}>
                    <UserMinus size={16} /> Unfriend
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Stat({ icon, label, value, children }: { icon: React.ReactNode; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bstat">
      <span className="bstat__label">
        {icon} {label}
      </span>
      <strong>{value}</strong>
      {children}
    </div>
  );
}

function AddFriends({ code, onAdd, onCopied }: { code: string | null; onAdd: (code: string) => Promise<void>; onCopied: (msg: string) => void }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      sfx('pop');
      onCopied(msg);
    } catch {
      onCopied(text);
    }
  };

  const share = async () => {
    if (!code) return;
    const url = inviteLink(code);
    const text = 'Sing with me on Belto! Tap to add me as a friend.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Belto', text, url });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    await copy(url, 'Invite link copied. Send it to a friend!');
  };

  return (
    <section className="card friends__add" aria-label="Add friends">
      <div className="friends__code">
        <span className="eyebrow">Your friend code</span>
        <strong className="friends__codeval num">{code ?? '------'}</strong>
        <div className="row">
          <button className="btn btn--sm" onClick={() => code && copy(code, 'Code copied!')} disabled={!code}>
            <Copy size={16} /> Copy code
          </button>
          <button className="btn btn--primary btn--sm" onClick={share} disabled={!code}>
            <Share2 size={16} /> Share invite link
          </button>
        </div>
      </div>
      <form
        className="friends__form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!parseFriendCode(input) || busy) return;
          setBusy(true);
          await onAdd(input);
          setBusy(false);
          setInput('');
        }}
      >
        <label className="onb__label" htmlFor="friend-code">
          Add a friend
        </label>
        <div className="friends__formrow">
          <input
            id="friend-code"
            className="field num"
            placeholder="e.g. K7Q2MX"
            value={input}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn--teal" disabled={!parseFriendCode(input) || busy}>
            <UserPlus size={18} /> Add
          </button>
        </div>
      </form>
    </section>
  );
}

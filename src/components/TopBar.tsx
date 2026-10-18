import { NavLink, Link } from 'react-router-dom';
import { Flame, Gem, House, Map, AudioLines, Trophy, UserRound } from 'lucide-react';
import { useGame } from '../game/store';
import { levelFromXp } from '../game/levels';
import { dayKey } from '../game/dates';
import { Logo } from './Logo';
import './TopBar.css';

export const NAV = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/path', label: 'Path', icon: Map },
  { to: '/practice', label: 'Practice', icon: AudioLines },
  { to: '/league', label: 'League', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export function TopBar() {
  const xp = useGame((s) => s.xp);
  const streak = useGame((s) => s.streak);
  const lastActive = useGame((s) => s.lastActive);
  const gems = useGame((s) => s.gems);
  const lvl = levelFromXp(xp);
  const doneToday = lastActive === dayKey();

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Logo to="/home" />
        <nav className="topbar__nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="topbar__link">
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar__stats">
          <Link to="/profile" className="topbar__level" title={`Level ${lvl.level}`}>
            <span className="topbar__lvlbar" aria-hidden="true">
              <span style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </span>
            <span className="topbar__lvltext num">
              {lvl.into}/{lvl.needed} to Lv {lvl.level + 1}
            </span>
          </Link>
          <span className="topbar__badge num" aria-label={`Level ${lvl.level}`}>
            {lvl.level}
          </span>
          <Link
            to="/profile"
            className={`topbar__stat topbar__stat--streak ${doneToday ? 'is-lit' : ''}`}
            aria-label={`${streak} day streak${doneToday ? ', practised today' : ''}`}
          >
            <Flame size={20} />
            <span className="num" key={streak}>
              {streak}
            </span>
          </Link>
          <Link to="/shop" className="topbar__stat topbar__stat--gems" aria-label={`${gems} gems`}>
            <Gem size={18} />
            <span className="num" key={gems}>
              {gems}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="bottomnav__link">
          <span className="bottomnav__icon">
            <Icon size={22} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import './DrillFrame.css';

/** Header + body for standalone practice drills. */
export function DrillFrame({ eyebrow, title, children, aside, back = '/practice' }: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  back?: string;
}) {
  const nav = useNavigate();
  return (
    <div className="drill">
      <header className="drill__head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="drill__title">{title}</h1>
        </div>
        <div className="drill__aside">
          {aside}
          <button className="icon-btn" onClick={() => nav(back)} aria-label="Close">
            <X size={22} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

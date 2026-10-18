import { Link } from 'react-router-dom';
import { Mascot } from './Mascot';
import './Logo.css';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="Belto home">
      <Mascot size={40} still title="" />
      <span className="logo__word">
        belto<span className="logo__dot">.</span>
      </span>
    </Link>
  );
}

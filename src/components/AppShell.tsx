import { Navigate, Outlet } from 'react-router-dom';
import { useGame } from '../game/store';
import { BottomNav, TopBar } from './TopBar';

/** Layout for the main tabs. Sends first-timers to onboarding. */
export function AppShell() {
  const onboarded = useGame((s) => s.onboarded);
  if (!onboarded) return <Navigate to="/welcome" replace />;
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <TopBar />
      <main className="page" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}

/** Full-screen focus layout (lessons, drills): no tab bar, no distractions. */
export function FocusShell() {
  const onboarded = useGame((s) => s.onboarded);
  if (!onboarded) return <Navigate to="/welcome" replace />;
  return (
    <main className="focus">
      <Outlet />
    </main>
  );
}

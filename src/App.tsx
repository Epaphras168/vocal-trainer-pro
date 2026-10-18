import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell, FocusShell } from './components/AppShell';
import { Celebrations } from './components/Celebrations';
import { useThemeSync } from './hooks/useThemeSync';
import { useGame } from './game/store';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { PathMap } from './pages/PathMap';
import { LessonPlayer } from './pages/LessonPlayer';
import { Profile } from './pages/Profile';
import { League } from './pages/League';
import { Shop } from './pages/Shop';
import { PracticeHub } from './pages/practice/PracticeHub';
import { RangeTest } from './pages/practice/RangeTest';
import { AccuracyTest } from './pages/practice/AccuracyTest';
import { PitchGame } from './pages/practice/PitchGame';
import { Warmup } from './pages/practice/Warmup';
import { FreeSing } from './pages/practice/FreeSing';
import { EarGym } from './pages/practice/EarGym';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Root() {
  const onboarded = useGame((s) => s.onboarded);
  return onboarded ? <Navigate to="/home" replace /> : <Landing />;
}

export function App() {
  useThemeSync();
  const reconcile = useGame((s) => s.reconcile);

  // Settle streak freezes and league weeks on launch and whenever the app comes back.
  useEffect(() => {
    reconcile();
    const onVisible = () => document.visibilityState === 'visible' && reconcile();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reconcile]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Celebrations />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/welcome" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/try" element={<main className="focus"><FreeSing guest /></main>} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/path" element={<PathMap />} />
          <Route path="/practice" element={<PracticeHub />} />
          <Route path="/league" element={<League />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={<Shop />} />
        </Route>
        <Route element={<FocusShell />}>
          <Route path="/lesson/:id" element={<LessonPlayer />} />
          <Route path="/practice/range" element={<RangeTest />} />
          <Route path="/practice/accuracy" element={<AccuracyTest />} />
          <Route path="/practice/game" element={<PitchGame />} />
          <Route path="/practice/warmup" element={<Warmup />} />
          <Route path="/practice/free" element={<FreeSing />} />
          <Route path="/practice/ear" element={<EarGym />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

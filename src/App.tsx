import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell, FocusShell } from './components/AppShell';
import { Celebrations } from './components/Celebrations';
import { useThemeSync } from './hooks/useThemeSync';
import { useGame } from './game/store';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { PathMap } from './pages/PathMap';
import { AddInvite, SignIn } from './pages/SignIn';
import { initCloud } from './cloud/account';

const LessonPlayer = lazy(() => import('./pages/LessonPlayer').then((m) => ({ default: m.LessonPlayer })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Friends = lazy(() => import('./pages/Friends').then((m) => ({ default: m.Friends })));
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));
const Shop = lazy(() => import('./pages/Shop').then((m) => ({ default: m.Shop })));
const PracticeHub = lazy(() => import('./pages/practice/PracticeHub').then((m) => ({ default: m.PracticeHub })));
const RangeTest = lazy(() => import('./pages/practice/RangeTest').then((m) => ({ default: m.RangeTest })));
const AccuracyTest = lazy(() => import('./pages/practice/AccuracyTest').then((m) => ({ default: m.AccuracyTest })));
const PitchGame = lazy(() => import('./pages/practice/PitchGame').then((m) => ({ default: m.PitchGame })));
const Warmup = lazy(() => import('./pages/practice/Warmup').then((m) => ({ default: m.Warmup })));
const FreeSing = lazy(() => import('./pages/practice/FreeSing').then((m) => ({ default: m.FreeSing })));
const EarGym = lazy(() => import('./pages/practice/EarGym').then((m) => ({ default: m.EarGym })));

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

  // Settle streak freezes on launch and whenever the app comes back.
  useEffect(() => {
    reconcile();
    const onVisible = () => document.visibilityState === 'visible' && reconcile();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reconcile]);

  useEffect(() => {
    void initCloud();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Celebrations />
      <Suspense fallback={<div className="focus" aria-busy="true" aria-label="Loading" />}>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/signin" element={<main className="focus"><SignIn /></main>} />
          <Route path="/add/:code" element={<AddInvite />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/try" element={<main className="focus"><FreeSing guest /></main>} />
          <Route element={<AppShell />}>
            <Route path="/home" element={<Home />} />
            <Route path="/path" element={<PathMap />} />
            <Route path="/practice" element={<PracticeHub />} />
            <Route path="/friends" element={<Friends />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

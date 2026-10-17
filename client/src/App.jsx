import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SiteHeader from './site/SiteHeader';
import SiteFooter from './site/SiteFooter';
import { useCanonical } from './site/canonical';
import OfflineScreen from './app/OfflineScreen';
import { startNativeShell } from './app/native';
import { resumeStorePurchases } from './site/payments';
import { useAuth } from './context/AuthContext';
import LandingPage from './site/landing/LandingPage';
import { FriendsStep, ShooterStep, StartStep, TrackStep } from './site/pages/RaceFlow';
import ShopPage from './site/pages/ShopPage';
import RoomPage from './site/pages/RoomPage';
import CertificatePage from './site/pages/CertificatePage';
import BagPage from './site/pages/BagPage';
import PurchasesPage from './site/pages/PurchasesPage';
import SettingsPage from './site/pages/SettingsPage';
import UnsubscribePage from './site/pages/UnsubscribePage';
import { ForgotPasswordPage, ResetPasswordPage } from './site/pages/PasswordPages';
import CheckoutPage from './site/pages/CheckoutPage';
import ScoresPage from './site/pages/ScoresPage';
import SignupPage from './site/pages/SignupPage';
import LegalPage from './site/pages/LegalPage';
import HomeHub from './site/pages/HomeHub';
import HelpPage from './site/help/HelpPage';
import CookiesPage from './site/pages/CookiesPage';
import { TrackPage, TracksPage } from './site/pages/TrackPages';
import ConsentManager from './site/consent/ConsentManager';
import { applyMeta, metaFor } from './site/pageMeta';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Race from './pages/Race';
import Results from './pages/Results';
import { Spinner } from './components/Status';
import { importOrReload } from './utils/staleCode';
import { useSoundUnlock } from './sound/settings';

// 3D preview (beta) is loaded on demand so the rest of the site stays light.
// (If a file is gone after an update, the page reloads once for the new version.)
const TrackPreview3D = lazy(() => importOrReload(() => import('./pages/TrackPreview3D')));
const Replay3D = lazy(() => importOrReload(() => import('./pages/Replay3D')));
const MarbleShowroom = lazy(() => importOrReload(() => import('./site/pages/MarbleShowroom')));
const MarbleCompare = lazy(() => importOrReload(() => import('./site/pages/MarbleCompare')));
const MarbleRoll = lazy(() => importOrReload(() => import('./site/pages/MarbleRoll')));
const AuroraOptions = lazy(() => importOrReload(() => import('./site/pages/AuroraOptions')));
const HolidayDesigns = lazy(() => importOrReload(() => import('./site/pages/HolidayDesigns')));
const BannerReview = lazy(() => importOrReload(() => import('./site/pages/BannerReview')));
const PhysicsPreview = lazy(() => importOrReload(() => import('./pages/PhysicsPreview')));
// The back office (/admin): its own chunk, never linked from the site; the server checks every request.
const AdminApp = lazy(() => importOrReload(() => import('./admin/AdminApp')));

export default function App() {
  const { pathname } = useLocation();
  const { isAuthenticated, refreshUser } = useAuth();
  // Android: a Google Play purchase the server hasn't confirmed yet (app closed mid-purchase, a
  // pending payment that completed) is sent again once the player is logged in; coins are added once.
  useEffect(() => {
    if (!isAuthenticated) return;
    resumeStorePurchases().then((n) => { if (n) refreshUser?.(); });
  }, [isAuthenticated]);
  useCanonical(pathname);
  // Every page's title, description, share picture and indexing (./site/pageMeta.js). A layout
  // effect, so it runs before the pages' own (a track's page, the not-found page) and they win.
  useLayoutEffect(() => { applyMeta(metaFor(pathname)); }, [pathname]);
  const navigate = useNavigate();
  // In the iPhone and Android apps: splash, status bar, back button, sound in the background.
  useEffect(() => {
    startNativeShell({ goBack: () => navigate(-1), atHome: () => ['/', '/home'].includes(window.location.pathname) });
  }, [navigate]);
  // Sound starts with the first tap (not on the landing page: music only once you're in the game).
  const admin = pathname === '/admin' || pathname.startsWith('/admin/');
  useSoundUnlock((pathname === '/' && !isAuthenticated) || admin);
  if (admin) {
    return <Suspense fallback={<div className="page"><Spinner /></div>}><AdminApp /></Suspense>;
  }
  return (
    <>
      <OfflineScreen />
      <SiteHeader />
      <main>
        <ErrorBoundary resetKey={pathname}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomeHub /> : <LandingPage />} />
          <Route path="/home" element={isAuthenticated ? <HomeHub /> : <Home />} />
          <Route path="/lobby" element={<Home />} />
          <Route path="/play/friends" element={<FriendsStep />} />
          <Route path="/play/track" element={<TrackStep />} />
          <Route path="/play/shooter" element={<ShooterStep />} />
          <Route path="/play/start" element={<StartStep />} />
          <Route path="/r/:code" element={<RoomPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collection" element={<ShopPage />} />
          <Route path="/collection/:design" element={<ShopPage />} />
          <Route path="/certificate/:code" element={<CertificatePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/scores" element={<ScoresPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/help/:question" element={<HelpPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/tracks/:slug" element={<TrackPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:userId" element={<Dashboard />} />
          <Route path="/race/:raceId" element={<Race />} />
          <Route path="/results/:raceId" element={<Results />} />
          <Route
            path="/preview/3d"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><TrackPreview3D /></Suspense>}
          />
          <Route
            path="/preview/marbles"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><MarbleShowroom /></Suspense>}
          />
          <Route
            path="/preview/marbles/compare"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><MarbleCompare /></Suspense>}
          />
          <Route
            path="/preview/marbles/roll"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><MarbleRoll /></Suspense>}
          />
          <Route
            path="/preview/marbles/northern-lights"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><AuroraOptions /></Suspense>}
          />
          <Route
            path="/preview/marbles/holiday"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><HolidayDesigns /></Suspense>}
          />
          <Route
            path="/preview/banners"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><BannerReview /></Suspense>}
          />
          <Route
            path="/preview/physics"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><PhysicsPreview /></Suspense>}
          />
          <Route
            path="/preview/3d/race/:raceId"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><Replay3D /></Suspense>}
          />
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
        </ErrorBoundary>
      </main>
      <SiteFooter />
      <ConsentManager />
    </>
  );
}

/** Any other address: a friendly page, kept out of search results. */
function NotFound() {
  const { pathname } = useLocation();
  useEffect(() => { applyMeta({ ...metaFor(pathname), title: 'Page not found · Marble Spins', noindex: true }); }, [pathname]);
  return (
    <div className="page">
      <h1>Lost the marble</h1>
      <p className="muted">That page doesn't exist.</p>
      <div className="ms-row"><Link to="/" className="btn">Back home</Link><Link to="/help">Help Centre</Link><Link to="/help#contact">Contact us</Link></div>
    </div>
  );
}

import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SiteHeader from './site/SiteHeader';
import SiteFooter from './site/SiteFooter';
import { useCanonical } from './site/canonical';
import OfflineScreen from './app/OfflineScreen';
import { startNativeShell } from './app/native';
import { resumeStorePurchases } from './site/payments';
import { useAuth } from './context/AuthContext';
import LandingPage from './site/landing/LandingPage';
import { FriendsStep, QuickStep, ShooterStep, StartOrQuick, TrackStep } from './site/pages/RaceFlow';
import ShopPage from './site/pages/ShopPage';
import RoomPage from './site/pages/RoomPage';
import CertificatePage from './site/pages/CertificatePage';
import BagPage from './site/pages/BagPage';
import PurchasesPage from './site/pages/PurchasesPage';
import SettingsPage from './site/pages/SettingsPage';
import UnsubscribePage from './site/pages/UnsubscribePage';
import { ForgotPasswordPage, ResetPasswordPage } from './site/pages/PasswordPages';
import CheckoutPage from './site/pages/CheckoutPage';
import PassPage from './site/pages/PassPage';
import PassReminderLink from './site/pages/PassReminderLink';
import PassOnSaleNotice from './site/payments/PassOnSaleNotice';
import { HiddenNameNotice } from './site/account/NameChip';
import ScoresPage from './site/pages/ScoresPage';
import SignupPage from './site/pages/SignupPage';
import LegalPage from './site/pages/LegalPage';
import HomeHub from './site/pages/HomeHub';
import HelpPage from './site/help/HelpPage';
import CookiesPage from './site/pages/CookiesPage';
import { TrackPage, TracksPage } from './site/pages/TrackPages';
import ConsentManager from './site/consent/ConsentManager';
import { applyMeta, metaFor } from './site/pageMeta';
import Race from './pages/Race';
import Results from './pages/Results';
import { Spinner } from './components/Status';
import { importOrReload } from './utils/staleCode';
import MarblesHubRoute from './hub/route';
import { CreateLeague, LeaguePage, LeaguesHome } from './site/leagues/LeaguesPages';
import { WalletPage } from './site/leagues/Pro';
import { startPush } from './app/push';
import { useSoundUnlock } from './sound/settings';
import { SavePromptProvider } from './site/account/SavePrompt';
import ConfirmEmailPage from './site/account/ConfirmEmailPage';
import RedeemPage from './site/pages/RedeemPage';

// 3D preview (beta) is loaded on demand so the rest of the site stays light.
// (If a file is gone after an update, the page reloads once for the new version.)
const TrackPreview3D = lazy(() => importOrReload(() => import('./pages/TrackPreview3D')));
const Replay3D = lazy(() => importOrReload(() => import('./pages/Replay3D')));
const MarbleShowroom = lazy(() => importOrReload(() => import('./site/pages/MarbleShowroom')));
const MarbleCompare = lazy(() => importOrReload(() => import('./site/pages/MarbleCompare')));
const MarbleRoll = lazy(() => importOrReload(() => import('./site/pages/MarbleRoll')));
const AuroraOptions = lazy(() => importOrReload(() => import('./site/pages/AuroraOptions')));
const HolidayDesigns = lazy(() => importOrReload(() => import('./site/pages/HolidayDesigns')));
const LeagueDesigns = lazy(() => importOrReload(() => import('./site/pages/LeagueDesigns')));
const BannerReview = lazy(() => importOrReload(() => import('./site/pages/BannerReview')));
const PhysicsPreview = lazy(() => importOrReload(() => import('./pages/PhysicsPreview')));
// The back office (/admin): its own chunk, never linked from the site; the server checks every request.
const AdminApp = lazy(() => importOrReload(() => import('./admin/AdminApp')));

// (The router's navigate, for a tapped notification: set on every draw.)
const navigateRef = { current: null };

export default function App() {
  const { pathname } = useLocation();
  const { isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  // Android: a Google Play purchase the server hasn't confirmed yet (app closed mid-purchase, a
  // pending payment that completed) is sent again once the player is logged in; coins are added once.
  // In the apps, once switched on: register this phone for notifications again if it was allowed before.
  useEffect(() => { if (isAuthenticated) startPush({ navigate: (url) => navigateRef.current?.(url) }); }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    resumeStorePurchases().then((n) => { if (n) refreshUser?.(); });
  }, [isAuthenticated]);
  useCanonical(pathname);
  // Every page's title, description, share picture and indexing (./site/pageMeta.js). A layout
  // effect, so it runs before the pages' own (a track's page, the not-found page) and they win.
  useLayoutEffect(() => { applyMeta(metaFor(pathname)); }, [pathname]);
  const navigate = useNavigate();
  navigateRef.current = navigate;
  // In the iPhone and Android apps: splash, status bar, back button, sound in the background.
  useEffect(() => {
    startNativeShell({ goBack: () => navigate(-1), atHome: () => ['/', '/home'].includes(window.location.pathname), open: (to) => navigate(to) });
  }, [navigate]);
  // Sound starts with the first tap (not on the landing page: music only once you're in the game).
  const admin = pathname === '/admin' || pathname.startsWith('/admin/');
  useSoundUnlock((pathname === '/' && !isAuthenticated) || admin);
  if (admin) {
    return <Suspense fallback={<div className="page"><Spinner /></div>}><AdminApp /></Suspense>;
  }
  return (
    <SavePromptProvider>
      <OfflineScreen />
      <SiteHeader />
      <PassOnSaleNotice />
      <HiddenNameNotice />
      <main>
        <ErrorBoundary resetKey={pathname}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomeHub /> : <LandingPage />} />
          {/* (The first version's lobby, dashboard and profile pages: their places are taken by /home, /play/… and /scores.) */}
          <Route path="/home" element={isAuthenticated ? <HomeHub /> : authLoading ? null : <Navigate to="/" replace />} />
          <Route path="/lobby" element={<Navigate to="/home" replace />} />
          <Route path="/play/friends" element={<FriendsStep />} />
          <Route path="/play/track" element={<TrackStep />} />
          <Route path="/play/shooter" element={<ShooterStep />} />
          <Route path="/play/start" element={<StartOrQuick />} />
          <Route path="/play/quick" element={<QuickStep />} />
          <Route path="/r/:code" element={<RoomPage />} />
          <Route path="/leagues" element={<LeaguesHome NotFound={NotFound} />} />
          <Route path="/leagues/new" element={<CreateLeague NotFound={NotFound} />} />
          <Route path="/l/:code" element={<LeaguePage NotFound={NotFound} />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collection" element={<ShopPage />} />
          <Route path="/collection/:design" element={<ShopPage />} />
          <Route path="/certificate/:code" element={<CertificatePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pass" element={<PassPage />} />
          <Route path="/pass/reminder" element={<PassReminderLink />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/wallet" element={<WalletPage NotFound={NotFound} />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Gift codes: a 404 until src/shared/giftCodes.json switches them on; never in the apps. */}
          <Route path="/redeem" element={<RedeemPage NotFound={NotFound} />} />
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
          {/* The marbles knowledge hub: a 404 until src/shared/marblesHub.json switches it on (src/hub/route.jsx). */}
          <Route path="/marbles/*" element={<MarblesHubRoute NotFound={NotFound} />} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/profile/:userId" element={<Navigate to="/scores" replace />} />
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
            path="/preview/marbles/league"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><LeagueDesigns /></Suspense>}
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
    </SavePromptProvider>
  );
}

/** Any other address: a friendly page, kept out of search results. */
function NotFound() {
  const { pathname } = useLocation();
  useEffect(() => { applyMeta({ ...metaFor(pathname), title: 'Page not found · Marble Spins', noindex: true }); }, [pathname]);
  return (
    <div className="ms-page">
      <section className="ms-hero ms-notfound" aria-labelledby="nf-h">
        <div style={{ display: 'grid', gap: 12 }}>
          <span className="ms-eyebrow" style={{ color: 'var(--ms-soft)' }}>Error 404</span>
          <h1 id="nf-h" className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Lost the marble</h1>
          <p style={{ color: 'var(--ms-soft)', margin: 0 }}>That page doesn't exist, or it rolled off the track. Try one of these instead.</p>
          <div className="ms-row">
            <Link to="/" className="ms-btn ms-btn--primary">Back home</Link>
            <Link to="/tracks" className="ms-btn">See the tracks</Link>
            <Link to="/help" className="ms-btn">Help Centre</Link>
          </div>
        </div>
        <div className="ms-notfound__ball" aria-hidden="true" />
      </section>
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import SiteHeader from './site/SiteHeader';
import SiteFooter from './site/SiteFooter';
import { useAuth } from './context/AuthContext';
import LandingPage from './site/landing/LandingPage';
import { FriendsStep, ShooterStep, StartStep, TrackStep } from './site/pages/RaceFlow';
import CollectionPage from './site/pages/CollectionPage';
import DesignPage from './site/pages/DesignPage';
import ShopPage from './site/pages/ShopPage';
import CertificatePage from './site/pages/CertificatePage';
import BagPage from './site/pages/BagPage';
import CheckoutPage from './site/pages/CheckoutPage';
import ScoresPage from './site/pages/ScoresPage';
import SignupPage from './site/pages/SignupPage';
import LegalPage from './site/pages/LegalPage';
import HomeHub from './site/pages/HomeHub';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Race from './pages/Race';
import Results from './pages/Results';
import { Spinner } from './components/Status';
import { importOrReload } from './utils/staleCode';

// 3D preview (beta) is loaded on demand so the rest of the site stays light.
// (If a file is gone after an update, the page reloads once for the new version.)
const TrackPreview3D = lazy(() => importOrReload(() => import('./pages/TrackPreview3D')));
const Replay3D = lazy(() => importOrReload(() => import('./pages/Replay3D')));
const MarbleShowroom = lazy(() => importOrReload(() => import('./site/pages/MarbleShowroom')));
const PhysicsPreview = lazy(() => importOrReload(() => import('./pages/PhysicsPreview')));

export default function App() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  return (
    <>
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
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/collection/:design" element={<DesignPage />} />
          <Route path="/certificate/:code" element={<CertificatePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/scores" element={<ScoresPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/legal" element={<LegalPage />} />
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
            path="/preview/physics"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><PhysicsPreview /></Suspense>}
          />
          <Route
            path="/preview/3d/race/:raceId"
            element={<Suspense fallback={<div className="page"><Spinner /></div>}><Replay3D /></Suspense>}
          />
          <Route
            path="*"
            element={(
              <div className="page">
                <h1>Lost the marble</h1>
                <p className="muted">That page doesn't exist.</p>
                <Link to="/" className="btn">Back home</Link>
              </div>
            )}
          />
        </Routes>
        </ErrorBoundary>
      </main>
      <SiteFooter />
    </>
  );
}

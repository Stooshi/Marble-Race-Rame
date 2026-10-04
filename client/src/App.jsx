import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Race from './pages/Race';
import Results from './pages/Results';

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <NavBar />
      <main>
        <ErrorBoundary resetKey={pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/:userId" element={<Dashboard />} />
          <Route path="/race/:raceId" element={<Race />} />
          <Route path="/results/:raceId" element={<Results />} />
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
    </>
  );
}

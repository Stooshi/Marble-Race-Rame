import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
// The game's fonts, served with the site (not from Google): faster, private, and they work inside the apps offline.
import '@fontsource/lilita-one/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import './styles.css';
import './site/site.css';
import { reloadOnceForNewCode } from './utils/staleCode';

// A code file gone after a new version of the site went live: reload once to pick up the new version.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewCode()) event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

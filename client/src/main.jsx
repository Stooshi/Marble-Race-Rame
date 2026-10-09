import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles.css';
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

// Part of: App start-up: mounts React.
// Uses: App.jsx, AuthContext.jsx, styles.css.
// Entry point: mounts the React app inside the router. index.html provides <div id="root">.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './account/AuthContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { initMonitoring } from './monitoring.js';
import './styles.css';

initMonitoring(); // error reports to Sentry, only when VITE_SENTRY_DSN is set

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

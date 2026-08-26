import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// A back/forward navigation can restore this page from the browser's bfcache: the
// address bar updates to the new URL but React's in-memory state (and the share id
// it was mounted with) stays frozen from before. Force a real reload so the app
// re-reads the URL and re-fetches the matching shared page.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

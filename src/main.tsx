import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silently intercept and ignore expected benign Vite dev-server WebSocket/HMR errors
// when HMR is disabled or sleeping behind the reverse proxy
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('connection failed')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (msg.includes('WebSocket') || msg.includes('websocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


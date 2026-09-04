import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './services/firebase/firebaseApp';

// Global error interrupter for benign websocket notices in container previews
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e.reason?.message || e.reason || '').toLowerCase();
    if (msg.includes('websocket') || msg.includes('vite') || msg.includes('offline')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

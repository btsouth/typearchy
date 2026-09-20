'use client';

import { useEffect } from 'react';
import { rememberInstallPrompt } from './lib/installPrompt';

// Registers the offline shell and keeps the browser's install prompt for the player to trigger.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const capture = (event: Event) => {
      event.preventDefault();
      rememberInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);
  return null;
}

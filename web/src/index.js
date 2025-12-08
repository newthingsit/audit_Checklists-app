import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import './styles/animations.css';
import App from './App';

// Configure axios base URL for API calls
const API_URL = process.env.REACT_APP_API_URL || '';
if (API_URL) {
  axios.defaults.baseURL = API_URL;
}
console.log('API Base URL:', API_URL || 'Using relative URLs');

// Force service worker update and cache clearing
const APP_VERSION = '5'; // Increment this on each major deployment

(async function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Check stored version
      const storedVersion = localStorage.getItem('app_version');
      
      // If version mismatch, clear all caches
      if (storedVersion !== APP_VERSION) {
        console.log('App version changed, clearing caches...');
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('All caches cleared');
        }
        
        // Unregister old service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Old service worker unregistered');
        }
        
        // Store new version
        localStorage.setItem('app_version', APP_VERSION);
        
        // Reload to get fresh content (only if we actually cleared something)
        if (registrations.length > 0) {
          window.location.reload(true);
          return;
        }
      }
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered:', registration.scope);
      
      // Check for updates immediately
      registration.update();
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available, skip waiting
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            console.log('New service worker installed, reloading...');
            window.location.reload();
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


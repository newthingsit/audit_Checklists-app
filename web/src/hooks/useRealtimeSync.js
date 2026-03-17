import { useEffect, useRef, useCallback } from 'react';

const TOKEN_KEY = 'auth_token';

/**
 * useRealtimeSync – Subscribes to Server-Sent Events (SSE) from the backend
 * and fires a callback whenever audit-related events arrive.
 *
 * Uses the browser-native EventSource API with token passed via query param
 * (EventSource does not support custom headers).
 *
 * Falls back gracefully: if the SSE connection fails or the server doesn't
 * support SSE, the hook becomes a no-op and existing data fetching continues.
 *
 * @param {Function} onEvent  – called with (eventType: string, data: object)
 * @param {boolean}  enabled  – set false to disable (e.g. when user is logged out)
 */
export function useRealtimeSync(onEvent, enabled = true) {
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 5;
  const BASE_DELAY = 3000;

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    if (!enabled) return;

    let token = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      // sessionStorage unavailable
    }
    if (!token) return;

    // Build SSE URL – use REACT_APP_API_URL if set, otherwise relative
    const base = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
      : '';
    const sseUrl = `${base}/api/events?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        retriesRef.current = 0;
      };

      // Listen for specific audit event types
      const eventTypes = ['audit_scheduled', 'audit_completed', 'audit_updated'];
      eventTypes.forEach((type) => {
        es.addEventListener(type, (e) => {
          try {
            const data = JSON.parse(e.data);
            onEventRef.current(type, data);
          } catch {
            // ignore parse errors
          }
        });
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
          retriesRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };
    } catch {
      // EventSource not supported or blocked – silent no-op
    }
  }, [enabled, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  // Reconnect when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !eventSourceRef.current) {
        retriesRef.current = 0;
        connect();
      } else if (document.visibilityState === 'hidden' && eventSourceRef.current) {
        cleanup();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [connect, cleanup]);
}

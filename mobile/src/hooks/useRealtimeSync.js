import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

/**
 * useRealtimeSync – Subscribes to Server-Sent Events (SSE) from the backend
 * and fires a callback whenever audit-related events arrive.
 *
 * Uses a fetch-based SSE reader (no external dependency) so it works
 * in React Native without requiring an EventSource polyfill.
 *
 * Falls back gracefully: if the SSE connection fails or the server doesn't
 * support SSE, the hook simply becomes a no-op and the existing polling
 * continues to work.
 *
 * @param {Function} onEvent  – called with (eventType: string, data: object)
 * @param {boolean}  enabled  – set false to disable (e.g. when user is logged out)
 */
export function useRealtimeSync(onEvent, enabled = true) {
  const abortRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const onEventRef = useRef(onEvent);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 5;
  const BASE_DELAY = 3000; // 3 seconds

  // Keep callback ref fresh
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch (e) { /* ignore */ }
      abortRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    cleanup();

    if (!enabled) return;

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
      const sseUrl = `${baseUrl}/api/events`;

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(sseUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      retriesRef.current = 0; // Reset on successful connection

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processEvents = (text) => {
        // SSE format: "event: <type>\ndata: <json>\n\n"
        const blocks = text.split('\n\n');
        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split('\n');
          let eventType = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              data = line.slice(6);
            }
            // Ignore comments (lines starting with :) and other fields
          }
          if (data && eventType !== 'connected') {
            try {
              const parsed = JSON.parse(data);
              onEventRef.current(eventType, parsed);
            } catch (e) { /* ignore invalid JSON */ }
          }
        }
      };

      // Read the stream
      const read = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Process complete events (separated by \n\n)
            if (buffer.includes('\n\n')) {
              const lastDoubleNewline = buffer.lastIndexOf('\n\n');
              const complete = buffer.substring(0, lastDoubleNewline + 2);
              buffer = buffer.substring(lastDoubleNewline + 2);
              processEvents(complete);
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return; // Intentional disconnect
          // Connection dropped – schedule reconnect
        }

        // If we get here, connection dropped – reconnect with backoff
        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
          retriesRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };

      read();
    } catch (err) {
      // SSE not available or network error – fail silently, polling continues
      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
        retriesRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    }
  }, [enabled, cleanup]);

  // Connect/disconnect based on app state
  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    connect();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground – reconnect SSE
        retriesRef.current = 0;
        connect();
      } else if (nextState.match(/inactive|background/)) {
        // App went to background – disconnect to save battery
        cleanup();
      }
      appStateRef.current = nextState;
    });

    return () => {
      cleanup();
      subscription?.remove();
    };
  }, [enabled, connect, cleanup]);
}

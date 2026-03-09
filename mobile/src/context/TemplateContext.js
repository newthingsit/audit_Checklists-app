import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useNetwork } from './NetworkContext';

const TemplateContext = createContext();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
};

export const TemplateProvider = ({ children }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useNetwork();

  const lastFetchRef = useRef(0);
  const pendingRef = useRef(null);

  /**
   * Fetch templates from server. Caches for CACHE_TTL and deduplicates
   * concurrent calls so only one network request flies at a time.
   *
   * @param {{ force?: boolean, silent?: boolean }} opts
   *   force  – ignore the cache and always hit the network
   *   silent – suppress loading state (used for background refresh)
   */
  const fetchTemplates = useCallback(async ({ force = false, silent = false } = {}) => {
    // Return cached data if still fresh
    if (!force && templates.length > 0 && Date.now() - lastFetchRef.current < CACHE_TTL) {
      return templates;
    }

    // Deduplicate: if a request is already in progress, piggy-back on it
    if (pendingRef.current) {
      return pendingRef.current;
    }

    if (!silent) setLoading(true);

    const request = (async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/templates`, {
          params: { dedupe: 'true' },
          timeout: 20000,
        });
        const data = response.data.templates || [];
        setTemplates(data);
        lastFetchRef.current = Date.now();
        return data;
      } catch (err) {
        // On failure keep stale data if available
        if (templates.length > 0) return templates;
        throw err;
      } finally {
        pendingRef.current = null;
        if (!silent) setLoading(false);
      }
    })();

    pendingRef.current = request;
    return request;
  }, [templates, isOnline]);

  /** Invalidate the cache so the next consumer triggers a fresh fetch. */
  const invalidate = useCallback(() => {
    lastFetchRef.current = 0;
  }, []);

  return (
    <TemplateContext.Provider value={{ templates, loading, fetchTemplates, invalidate }}>
      {children}
    </TemplateContext.Provider>
  );
};

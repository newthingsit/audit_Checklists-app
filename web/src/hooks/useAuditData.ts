import { useState, useCallback, useEffect } from 'react';
import { AuditChecklist } from '../types';

interface UseAuditDataReturn {
  audits: AuditChecklist[];
  currentAudit: AuditChecklist | null;
  isLoading: boolean;
  error: string | null;
  loadAudits: () => Promise<void>;
  loadAudit: (id: string) => Promise<void>;
  createAudit: (audit: AuditChecklist) => Promise<void>;
  updateAudit: (id: string, audit: Partial<AuditChecklist>) => Promise<void>;
  deleteAudit: (id: string) => Promise<void>;
  searchAudits: (query: string) => AuditChecklist[];
}

/**
 * useAuditData Hook
 * Handles loading and managing audit checklist data
 * 
 * @returns {UseAuditDataReturn} Data state and handlers
 */
export const useAuditData = (): UseAuditDataReturn => {
  const [audits, setAudits] = useState<AuditChecklist[]>([]);
  const [currentAudit, setCurrentAudit] = useState<AuditChecklist | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Mock API call - replace with actual API endpoint
      const response = await fetch('/api/audits');
      if (!response.ok) throw new Error('Failed to load audits');
      const data = await response.json();
      setAudits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audits/${id}`);
      if (!response.ok) throw new Error('Failed to load audit');
      const data = await response.json();
      setCurrentAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAudit = useCallback(async (audit: AuditChecklist) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audit),
      });
      if (!response.ok) throw new Error('Failed to create audit');
      const data = await response.json();
      setAudits(prev => [...prev, data]);
      setCurrentAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateAudit = useCallback(async (id: string, updates: Partial<AuditChecklist>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update audit');
      const data = await response.json();
      setAudits(prev => prev.map(a => (a.id === id ? data : a)));
      if (currentAudit?.id === id) {
        setCurrentAudit(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentAudit?.id]);

  const deleteAudit = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audits/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete audit');
      setAudits(prev => prev.filter(a => a.id !== id));
      if (currentAudit?.id === id) {
        setCurrentAudit(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentAudit?.id]);

  const searchAudits = useCallback((query: string): AuditChecklist[] => {
    const lowerQuery = query.toLowerCase();
    return audits.filter(
      audit =>
        audit.auditName.toLowerCase().includes(lowerQuery) ||
        audit.createdBy?.toLowerCase().includes(lowerQuery) ||
        audit.location?.toLowerCase().includes(lowerQuery)
    );
  }, [audits]);

  return {
    audits,
    currentAudit,
    isLoading,
    error,
    loadAudits,
    loadAudit,
    createAudit,
    updateAudit,
    deleteAudit,
    searchAudits,
  };
};

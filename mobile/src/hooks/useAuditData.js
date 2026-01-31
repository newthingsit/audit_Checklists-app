import { useState, useEffect, useCallback } from 'react';

/**
 * useAuditData Hook (Mobile)
 * Manages audit data loading, item filtering by category
 * Handles data refresh and error handling
 * 
 * @param {string} auditId - Current audit ID
 * @param {string} selectedCategory - Currently selected category
 * @returns {Object} Data state and utilities
 */
export const useAuditData = (auditId, selectedCategory) => {
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load audit items
  const loadItems = useCallback(async () => {
    if (!auditId) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await auditAPI.getItems(auditId);
      // setAllItems(response.data);

      // Mock data for now
      setAllItems([]);
    } catch (err) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  // Filter items by selected category
  useEffect(() => {
    if (!selectedCategory || !allItems) {
      setItems([]);
      return;
    }

    const filtered = allItems.filter(
      item => item.category === selectedCategory
    );
    setItems(filtered);
  }, [selectedCategory, allItems]);

  // Initial load
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refreshItems = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [loadItems]);

  const getItemsForCategory = useCallback((category) => {
    return allItems.filter(item => item.category === category);
  }, [allItems]);

  const getItemById = useCallback((itemId) => {
    return allItems.find(item => item.id === itemId);
  }, [allItems]);

  return {
    items,
    allItems,
    loading,
    error,
    refreshing,
    loadItems,
    refreshItems,
    getItemsForCategory,
    getItemById,
  };
};

export default useAuditData;

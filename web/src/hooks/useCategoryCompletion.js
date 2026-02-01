import { useMemo } from 'react';
import { calculateCategoryCompletionStatus } from '../utils/auditHelpers';

/**
 * useCategoryCompletion Hook
 * Calculates category completion status based on audit items
 * Uses shared utility for consistency across platforms
 * 
 * @param {Array} items - All audit items
 * @param {Array} categories - Selected categories
 * @param {Object} formData - Current form data (responses, photos, etc.)
 * @returns {Object} Category status and helper functions
 */
export const useCategoryCompletion = (items, categories, formData) => {
  const categoryStatus = useMemo(() => {
    if (!items || !categories) return {};
    return calculateCategoryCompletionStatus(categories, items);
  }, [items, categories]);

  const isFormComplete = useMemo(() => {
    if (!Object.keys(categoryStatus).length) return false;
    return Object.values(categoryStatus).every(status => status.isComplete);
  }, [categoryStatus]);

  const completionPercentage = useMemo(() => {
    if (!Object.keys(categoryStatus).length) return 0;
    const completed = Object.values(categoryStatus).filter(s => s.isComplete).length;
    const total = Object.keys(categoryStatus).length;
    return Math.round((completed / total) * 100);
  }, [categoryStatus]);

  const incompleteCategories = useMemo(() => {
    return Object.entries(categoryStatus)
      .filter(([, status]) => !status.isComplete)
      .map(([category]) => category);
  }, [categoryStatus]);

  const nextIncompleteCategory = useMemo(() => {
    return incompleteCategories[0] || null;
  }, [incompleteCategories]);

  return {
    categoryStatus,
    isFormComplete,
    completionPercentage,
    incompleteCategories,
    nextIncompleteCategory,
  };
};

export default useCategoryCompletion;

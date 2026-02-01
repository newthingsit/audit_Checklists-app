import { useState, useCallback } from 'react';
import { getFirstIncompleteCategory, getCategoryStatistics } from '../utils/auditHelpers';

/**
 * useCategoryNavigation Hook (Mobile)
 * Manages category navigation logic, auto-selection of incomplete categories
 * Handles step progression through audit workflow
 * 
 * @param {Array<string>} categories - Available categories
 * @param {Array} items - All audit items
 * @param {Object} formData - Current form responses
 * @returns {Object} Navigation state and handlers
 */
export const useCategoryNavigation = (categories, items, formData) => {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [step, setStep] = useState(0); // 0: info, 1: categories, 2: checklist

  // Auto-select first incomplete category
  const autoSelectFirstIncomplete = useCallback(() => {
    if (!categories || categories.length === 0) return;

    const firstIncomplete = getFirstIncompleteCategory(categories, items);
    if (firstIncomplete) {
      const index = categories.indexOf(firstIncomplete);
      setSelectedCategoryIndex(Math.max(0, index));
    }
  }, [categories, items]);

  const handleNextCategory = useCallback(() => {
    if (!categories) return;
    const nextIndex = Math.min(selectedCategoryIndex + 1, categories.length - 1);
    setSelectedCategoryIndex(nextIndex);
  }, [categories, selectedCategoryIndex]);

  const handlePreviousCategory = useCallback(() => {
    const prevIndex = Math.max(selectedCategoryIndex - 1, 0);
    setSelectedCategoryIndex(prevIndex);
  }, [selectedCategoryIndex]);

  const handleSelectCategory = useCallback((index) => {
    setSelectedCategoryIndex(Math.max(0, Math.min(index, categories?.length - 1)));
  }, [categories]);

  const handleNextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 2));
  }, []);

  const handlePreviousStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleSkipCategories = useCallback(() => {
    handleNextStep();
  }, [handleNextStep]);

  const getSelectedCategory = useCallback(() => {
    if (!categories) return null;
    return categories[selectedCategoryIndex];
  }, [categories, selectedCategoryIndex]);

  const getCategoryProgress = useCallback(() => {
    if (!categories) return { completed: 0, total: 0 };
    return {
      completed: selectedCategoryIndex + 1,
      total: categories.length,
    };
  }, [categories, selectedCategoryIndex]);

  return {
    // State
    selectedCategoryIndex,
    step,

    // Single select
    selectCategory: handleSelectCategory,
    nextCategory: handleNextCategory,
    previousCategory: handlePreviousCategory,

    // Step navigation
    nextStep: handleNextStep,
    previousStep: handlePreviousStep,
    skipCategories: handleSkipCategories,

    // Getters
    getSelectedCategory,
    getCategoryProgress,

    // Auto-select
    autoSelectFirstIncomplete,
  };
};

export default useCategoryNavigation;

import { useState, useCallback, useEffect } from 'react';
import { AuditCategory, CategoryCompletion } from '../types';
import { calculateCategoryCompletion } from '../utils/auditHelpers';

interface UseCategoryNavigationReturn {
  activeCategory: number;
  activeStep: number;
  completedCategories: Set<string>;
  totalCategories: number;
  totalSteps: number;
  isFirstCategory: boolean;
  isLastCategory: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentCompletion: CategoryCompletion | null;
  goToCategory: (index: number) => void;
  nextCategory: () => void;
  previousCategory: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  markCategoryComplete: (categoryId: string) => void;
  markCategoryIncomplete: (categoryId: string) => void;
  reset: () => void;
}

/**
 * useCategoryNavigation Hook
 * Manages category and step navigation for multi-step forms
 * 
 * @param {AuditCategory[]} categories - Array of audit categories
 * @param {string[]} completedIds - Initial completed category IDs
 * @returns {UseCategoryNavigationReturn} Navigation state and handlers
 */
export const useCategoryNavigation = (
  categories: AuditCategory[] = [],
  completedIds: string[] = []
): UseCategoryNavigationReturn => {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(
    new Set(completedIds)
  );

  const totalCategories = categories.length;
  const currentCategory = categories[activeCategory];
  const totalSteps = currentCategory?.items?.length || 0;

  const isFirstCategory = activeCategory === 0;
  const isLastCategory = activeCategory === totalCategories - 1;
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  const currentCompletion = currentCategory
    ? calculateCategoryCompletion(currentCategory)
    : null;

  const goToCategory = useCallback((index: number) => {
    if (index >= 0 && index < totalCategories) {
      setActiveCategory(index);
      setActiveStep(0);
    }
  }, [totalCategories]);

  const nextCategory = useCallback(() => {
    if (!isLastCategory) {
      goToCategory(activeCategory + 1);
    }
  }, [activeCategory, isLastCategory, goToCategory]);

  const previousCategory = useCallback(() => {
    if (!isFirstCategory) {
      goToCategory(activeCategory - 1);
    }
  }, [activeCategory, isFirstCategory, goToCategory]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setActiveStep(step);
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      setActiveStep(prev => prev + 1);
    } else if (!isLastCategory) {
      nextCategory();
    }
  }, [isLastStep, isLastCategory, nextCategory]);

  const previousStep = useCallback(() => {
    if (!isFirstStep) {
      setActiveStep(prev => prev - 1);
    } else if (!isFirstCategory) {
      previousCategory();
      setActiveStep(totalSteps - 1);
    }
  }, [isFirstStep, isFirstCategory, previousCategory, totalSteps]);

  const markCategoryComplete = useCallback((categoryId: string) => {
    setCompletedCategories(prev => new Set([...prev, categoryId]));
  }, []);

  const markCategoryIncomplete = useCallback((categoryId: string) => {
    setCompletedCategories(prev => {
      const updated = new Set(prev);
      updated.delete(categoryId);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setActiveCategory(0);
    setActiveStep(0);
    setCompletedCategories(new Set());
  }, []);

  return {
    activeCategory,
    activeStep,
    completedCategories,
    totalCategories,
    totalSteps,
    isFirstCategory,
    isLastCategory,
    isFirstStep,
    isLastStep,
    currentCompletion,
    goToCategory,
    nextCategory,
    previousCategory,
    goToStep,
    nextStep,
    previousStep,
    markCategoryComplete,
    markCategoryIncomplete,
    reset,
  };
};

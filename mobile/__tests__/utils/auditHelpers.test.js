/**
 * Audit Helpers Unit Tests
 * Tests audit calculation and helper utilities
 */

import {
  calculateCategoryCompletionStatus,
  getFirstIncompleteCategory,
  getCategoryStatistics,
} from '../../src/utils/auditHelpers';

describe('auditHelpers', () => {
  describe('calculateCategoryCompletionStatus', () => {
    it('should calculate completion status for multiple categories', () => {
      const categories = ['Safety', 'Quality', 'Cleanliness'];
      const items = [
        { category: 'Safety', mark: 'pass', status: 'complete' },
        { category: 'Safety', mark: 'fail', status: 'complete' },
        { category: 'Safety', mark: null, status: 'pending' },
        { category: 'Quality', mark: 'pass', status: 'complete' },
        { category: 'Quality', mark: 'pass', status: 'complete' },
        { category: 'Cleanliness', mark: null, status: 'pending' },
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result).toEqual({
        Safety: { completed: 2, total: 3, isComplete: false, percentage: 67 },
        Quality: { completed: 2, total: 2, isComplete: true, percentage: 100 },
        Cleanliness: { completed: 0, total: 1, isComplete: false, percentage: 0 },
      });
    });

    it('should mark items with marks as completed', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: 'pass', status: 'pending' },
        { category: 'Test', mark: 'fail', status: 'pending' },
        { category: 'Test', mark: 'na', status: null },
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result.Test).toEqual({
        completed: 3,
        total: 3,
        isComplete: true,
        percentage: 100,
      });
    });

    it('should mark items with status as completed', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: null, status: 'complete' },
        { category: 'Test', mark: null, status: 'reviewed' },
        { category: 'Test', mark: null, status: 'approved' },
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result.Test).toEqual({
        completed: 3,
        total: 3,
        isComplete: true,
        percentage: 100,
      });
    });

    it('should not count items with empty marks or pending status', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: '', status: 'pending' },
        { category: 'Test', mark: ' ', status: '' },
        { category: 'Test', mark: null, status: null },
        { category: 'Test', mark: undefined, status: undefined },
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result.Test).toEqual({
        completed: 0,
        total: 4,
        isComplete: false,
        percentage: 0,
      });
    });

    it('should handle categories with no items', () => {
      const categories = ['Empty'];
      const items = [];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result.Empty).toEqual({
        completed: 0,
        total: 0,
        isComplete: false,
        percentage: 0,
      });
    });

    it('should return empty object for null categories', () => {
      const result = calculateCategoryCompletionStatus(null, []);
      expect(result).toEqual({});
    });

    it('should return empty object for null items', () => {
      const result = calculateCategoryCompletionStatus(['Test'], null);
      expect(result).toEqual({});
    });

    it('should filter items by category correctly', () => {
      const categories = ['A', 'B'];
      const items = [
        { category: 'A', mark: 'pass' },
        { category: 'B', mark: 'pass' },
        { category: 'C', mark: 'pass' }, // Wrong category
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      expect(result.A.total).toBe(1);
      expect(result.B.total).toBe(1);
      expect(result.C).toBeUndefined();
    });

    it('should round percentages correctly', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: 'pass' },
        { category: 'Test', mark: null },
        { category: 'Test', mark: null },
      ];

      const result = calculateCategoryCompletionStatus(categories, items);

      // 1/3 = 33.333... should round to 33
      expect(result.Test.percentage).toBe(33);
    });
  });

  describe('getFirstIncompleteCategory', () => {
    it('should return first incomplete category', () => {
      const categories = ['Safety', 'Quality', 'Cleanliness'];
      const items = [
        { category: 'Safety', mark: 'pass' },
        { category: 'Quality', mark: null }, // Incomplete
        { category: 'Cleanliness', mark: null },
      ];

      const result = getFirstIncompleteCategory(categories, items);
      expect(result).toBe('Quality');
    });

    it('should skip complete categories', () => {
      const categories = ['Safety', 'Quality', 'Cleanliness'];
      const items = [
        { category: 'Safety', mark: 'pass' },
        { category: 'Quality', mark: 'pass' },
        { category: 'Cleanliness', mark: null }, // First incomplete
      ];

      const result = getFirstIncompleteCategory(categories, items);
      expect(result).toBe('Cleanliness');
    });

    it('should return first category when all complete', () => {
      const categories = ['Safety', 'Quality'];
      const items = [
        { category: 'Safety', mark: 'pass' },
        { category: 'Quality', mark: 'pass' },
      ];

      const result = getFirstIncompleteCategory(categories, items);
      expect(result).toBe('Safety');
    });

    it('should return null for empty categories', () => {
      const result = getFirstIncompleteCategory([], []);
      expect(result).toBeNull();
    });

    it('should return null for null categories', () => {
      const result = getFirstIncompleteCategory(null, []);
      expect(result).toBeNull();
    });

    it('should handle single category', () => {
      const categories = ['Only'];
      const items = [{ category: 'Only', mark: null }];

      const result = getFirstIncompleteCategory(categories, items);
      expect(result).toBe('Only');
    });
  });

  describe('getCategoryStatistics', () => {
    it('should aggregate statistics across all categories', () => {
      const categories = ['Safety', 'Quality', 'Cleanliness'];
      const items = [
        { category: 'Safety', mark: 'pass' },
        { category: 'Safety', mark: 'pass' },
        { category: 'Quality', mark: 'pass' },
        { category: 'Quality', mark: null },
        { category: 'Cleanliness', mark: null },
        { category: 'Cleanliness', mark: null },
      ];

      const result = getCategoryStatistics(categories, items);

      expect(result).toEqual({
        total: 6,
        completed: 3,
        percentage: 50,
      });
    });

    it('should handle all items complete', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: 'pass' },
        { category: 'Test', mark: 'fail' },
      ];

      const result = getCategoryStatistics(categories, items);

      expect(result).toEqual({
        total: 2,
        completed: 2,
        percentage: 100,
      });
    });

    it('should handle no items complete', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: null },
        { category: 'Test', mark: null },
      ];

      const result = getCategoryStatistics(categories, items);

      expect(result).toEqual({
        total: 2,
        completed: 0,
        percentage: 0,
      });
    });

    it('should return zero statistics for empty categories', () => {
      const result = getCategoryStatistics([], []);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        percentage: 0,
      });
    });

    it('should return zero statistics for null categories', () => {
      const result = getCategoryStatistics(null, []);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        percentage: 0,
      });
    });

    it('should calculate percentage correctly for partial completion', () => {
      const categories = ['Test'];
      const items = [
        { category: 'Test', mark: 'pass' },
        { category: 'Test', mark: null },
        { category: 'Test', mark: null },
        { category: 'Test', mark: null },
      ];

      const result = getCategoryStatistics(categories, items);

      // 1/4 = 25%
      expect(result).toEqual({
        total: 4,
        completed: 1,
        percentage: 25,
      });
    });

    it('should aggregate multiple categories correctly', () => {
      const categories = ['A', 'B', 'C'];
      const items = [
        { category: 'A', mark: 'pass' },
        { category: 'A', mark: 'pass' },
        { category: 'B', mark: 'pass' },
        { category: 'B', mark: null },
        { category: 'B', mark: null },
        { category: 'C', mark: null },
        { category: 'C', mark: null },
        { category: 'C', mark: null },
      ];

      const result = getCategoryStatistics(categories, items);

      // 3 completed out of 8 total = 37.5% rounds to 38%
      expect(result.total).toBe(8);
      expect(result.completed).toBe(3);
      expect(result.percentage).toBe(38);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for audit flow', () => {
      const categories = ['Safety', 'Quality', 'Cleanliness'];
      const items = [
        { category: 'Safety', mark: 'pass', status: 'complete' },
        { category: 'Safety', mark: 'pass', status: 'complete' },
        { category: 'Quality', mark: null, status: 'pending' },
        { category: 'Quality', mark: null, status: 'pending' },
        { category: 'Cleanliness', mark: null, status: 'pending' },
      ];

      // Get overall stats
      const stats = getCategoryStatistics(categories, items);
      expect(stats.percentage).toBe(40); // 2/5

      // Get first incomplete category to work on
      const nextCategory = getFirstIncompleteCategory(categories, items);
      expect(nextCategory).toBe('Quality');

      // Get detailed status
      const status = calculateCategoryCompletionStatus(categories, items);
      expect(status.Safety.isComplete).toBe(true);
      expect(status.Quality.isComplete).toBe(false);
      expect(status.Cleanliness.isComplete).toBe(false);
    });
  });
});

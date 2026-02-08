/// <reference types="jest" />
import {
  calculateCategoryCompletionStatus,
  getFirstIncompleteCategory,
  getCategoryStatistics,
} from './auditHelpers';

type AuditItem = {
  id: string;
  category: string;
  mark?: string | number | null;
  status?: string;
};

describe('Mobile - Audit Helpers', () => {
  const categories = ['Safety', 'Cleanliness'];
  const items: AuditItem[] = [
    { id: 'item1', category: 'Safety', mark: 1, status: 'completed' },
    { id: 'item2', category: 'Safety', mark: null, status: 'pending' },
    { id: 'item3', category: 'Cleanliness', mark: 1, status: 'completed' },
  ];

  describe('calculateCategoryCompletionStatus', () => {
    it('calculates completion status per category', () => {
      const status = calculateCategoryCompletionStatus(categories, items);
      expect(status.Safety.total).toBe(2);
      expect(status.Safety.completed).toBe(1);
      expect(status.Safety.percentage).toBe(50);
      expect(status.Cleanliness.completed).toBe(1);
      expect(status.Cleanliness.isComplete).toBe(true);
    });
  });

  describe('getFirstIncompleteCategory', () => {
    it('returns the first incomplete category', () => {
      const result = getFirstIncompleteCategory(categories, items);
      expect(result).toBe('Safety');
    });
  });

  describe('getCategoryStatistics', () => {
    it('aggregates totals across categories', () => {
      const stats = getCategoryStatistics(categories, items);
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.percentage).toBe(67);
    });
  });
});

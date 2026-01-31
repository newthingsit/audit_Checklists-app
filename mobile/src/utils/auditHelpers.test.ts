import { describe, it, expect } from 'vitest';
import {
  calculateCategoryCompletion,
  calculateChecklistProgress,
  isCategoryComplete,
  getCompletionMessage,
  formatDate,
  formatTime,
} from '@utils/auditHelpers';
import { AuditCategory, AuditChecklist } from '@types';

describe('Mobile - Audit Helpers', () => {
  const mockCategory: AuditCategory = {
    id: 'cat1',
    name: 'Safety',
    nameUrdu: 'سیفٹی',
    items: [
      { id: 'item1', categoryId: 'cat1', question: 'Is area safe?', response: 'Yes' },
      { id: 'item2', categoryId: 'cat1', question: 'Are exits clear?', response: '' },
    ],
  };

  describe('calculateCategoryCompletion', () => {
    it('calculates completion percentage', () => {
      const completion = calculateCategoryCompletion(mockCategory);
      expect(completion.totalItems).toBe(2);
      expect(completion.completedItems).toBe(1);
      expect(completion.percentage).toBe(50);
    });

    it('handles empty categories', () => {
      const empty: AuditCategory = {
        id: 'empty',
        name: 'Empty',
        nameUrdu: 'خالی',
        items: [],
      };
      const completion = calculateCategoryCompletion(empty);
      expect(completion.percentage).toBe(0);
    });
  });

  describe('isCategoryComplete', () => {
    it('returns true when all items have responses', () => {
      const complete: AuditCategory = {
        ...mockCategory,
        items: [
          { ...mockCategory.items[0], response: 'Yes' },
          { ...mockCategory.items[1], response: 'No' },
        ],
      };
      expect(isCategoryComplete(complete)).toBe(true);
    });

    it('returns false when items are missing responses', () => {
      expect(isCategoryComplete(mockCategory)).toBe(false);
    });
  });

  describe('getCompletionMessage', () => {
    it('returns appropriate message based on progress', () => {
      const checklist: AuditChecklist = {
        id: '1',
        auditName: 'Test',
        createdDate: '2024-01-31',
        categories: [mockCategory],
      };
      const message = getCompletionMessage(checklist);
      expect(message).toBe('50% complete');
    });
  });

  describe('formatDate', () => {
    it('formats date string correctly', () => {
      const formatted = formatDate('2024-01-31');
      expect(formatted).toContain('January');
    });
  });

  describe('formatTime', () => {
    it('formats timestamp correctly', () => {
      const timestamp = new Date('2024-01-31T14:30:00').getTime();
      const formatted = formatTime(timestamp);
      expect(formatted).toContain('2:30 PM');
    });
  });
});

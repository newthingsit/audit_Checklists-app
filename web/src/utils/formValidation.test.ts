/// <reference types="jest" />
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateCategoryCompletion,
  validateChecklistData,
} from './formValidation';

describe('Form Validation Utilities', () => {
  describe('validateRequired', () => {
    it('returns error for empty value', () => {
      expect(validateRequired('', 'Audit Name')).toBe('Audit Name is required');
    });

    it('returns null for valid value', () => {
      expect(validateRequired('Valid Audit Name', 'Audit Name')).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('returns null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('returns error for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe('Invalid email format');
    });
  });

  describe('validatePhone', () => {
    it('returns null for valid phone', () => {
      expect(validatePhone('03001234567')).toBeNull();
    });

    it('returns error for invalid phone', () => {
      expect(validatePhone('123')).toBe('Invalid phone format (minimum 10 digits)');
    });
  });

  describe('validateDateFormat', () => {
    it('returns null for valid date', () => {
      expect(validateDateFormat('2024-01-31')).toBeNull();
    });

    it('returns error for invalid date format', () => {
      expect(validateDateFormat('invalid-date')).toBe('Date must be in YYYY-MM-DD format');
    });
  });

  describe('validateCategoryCompletion', () => {
    it('returns true when all items have responses', () => {
      const category = {
        id: '1',
        name: 'Test',
        items: [{ id: '1', categoryId: '1', question: 'Q1', response: 'Yes' }],
      };
      expect(validateCategoryCompletion(category as any)).toBe(true);
    });
  });

  describe('validateChecklistData', () => {
    it('returns valid for complete checklist data', () => {
      const validData = {
        auditName: 'Test Audit',
        createdDate: '2024-01-31',
        categories: [{ categoryId: '1', items: [] }],
      };
      const result = validateChecklistData(validData as any);
      expect(result.isValid).toBe(true);
    });
  });
});

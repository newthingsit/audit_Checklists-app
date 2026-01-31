import { describe, it, expect } from 'vitest';
import {
  validateAuditName,
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateCategoryData,
  validateChecklistData,
} from '@utils/formValidation';

describe('Form Validation Utilities', () => {
  describe('validateAuditName', () => {
    it('validates audit name', () => {
      expect(validateAuditName('Valid Audit Name')).toBe(true);
      expect(validateAuditName('')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('validates email format', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates phone format', () => {
      expect(validatePhone('03001234567')).toBe(true);
      expect(validatePhone('123')).toBe(false);
    });
  });

  describe('validateDateFormat', () => {
    it('validates date format', () => {
      expect(validateDateFormat('2024-01-31')).toBe(true);
      expect(validateDateFormat('invalid-date')).toBe(false);
    });
  });

  describe('validateCategoryData', () => {
    it('validates category data structure', () => {
      const validData = {
        categoryId: '1',
        items: [{ id: '1', response: 'Yes' }],
      };
      expect(validateCategoryData(validData)).toBe(true);
    });
  });

  describe('validateChecklistData', () => {
    it('validates complete checklist data', () => {
      const validData = {
        auditName: 'Test Audit',
        createdDate: '2024-01-31',
        categories: [{ categoryId: '1', items: [] }],
      };
      expect(validateChecklistData(validData)).toBe(true);
    });
  });
});

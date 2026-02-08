/// <reference types="jest" />
import {
  validateField,
  validateAuditForm,
} from '@shared/utils/formValidation';

describe('Mobile - Form Validation', () => {
  describe('validateField', () => {
    it('returns a required error when missing', () => {
      const errors = validateField('', { required: true }, 'Name');
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Name is required');
    });

    it('returns no errors for valid input', () => {
      const errors = validateField('John Doe', { required: true }, 'Name');
      expect(errors).toEqual([]);
    });
  });

  describe('validateAuditForm', () => {
    it('returns errors for missing required fields', () => {
      const result = validateAuditForm({ name: '' }, ['name', 'location']);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('returns valid when required fields are present', () => {
      const result = validateAuditForm({ name: 'Test', location: 'Store 1' }, ['name', 'location']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});

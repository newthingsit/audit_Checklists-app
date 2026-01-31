import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validatePhone,
  normalizeText,
  sanitizeInput,
} from '@utils/formValidation';

describe('Mobile - Form Validation', () => {
  describe('validateRequired', () => {
    it('returns error for empty string', () => {
      expect(validateRequired('', 'Name')).toBe('Name is required');
    });

    it('returns error for whitespace only', () => {
      expect(validateRequired('   ', 'Name')).toBe('Name is required');
    });

    it('returns null for valid value', () => {
      expect(validateRequired('John Doe', 'Name')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('validates valid Pakistani phone number', () => {
      expect(validatePhone('03001234567')).toBeNull();
      expect(validatePhone('+92-300-1234567')).toBeNull();
    });

    it('returns error for invalid phone', () => {
      expect(validatePhone('123')).toBe('Invalid phone format (minimum 10 digits)');
    });
  });

  describe('normalizeText', () => {
    it('trims whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello');
    });

    it('removes extra spaces', () => {
      expect(normalizeText('hello    world')).toBe('hello world');
    });
  });

  describe('sanitizeInput', () => {
    it('sanitizes HTML input', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
    });
  });
});

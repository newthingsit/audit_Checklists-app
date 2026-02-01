import {
  FormField,
  FormErrors,
  ValidationResult,
  AuditChecklist,
  AuditCategory,
  AuditChecklistItem,
} from '../types';

/**
 * Validates a required field
 */
export const validateRequired = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

/**
 * Validates phone number format
 */
export const validatePhone = (phone: string): string | null => {
  const phoneRegex = /^[\d+\-\s()]{10,}$/;
  if (phone && !phoneRegex.test(phone)) {
    return 'Invalid phone format (minimum 10 digits)';
  }
  return null;
};

/**
 * Validates date format (YYYY-MM-DD)
 */
export const validateDateFormat = (date: string): string | null => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (date && !dateRegex.test(date)) {
    return 'Date must be in YYYY-MM-DD format';
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return null;
};

/**
 * Validates minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): string | null => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

/**
 * Validates maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): string | null => {
  if (value && value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  return null;
};

/**
 * Validates custom pattern (regex)
 */
export const validatePattern = (
  value: string,
  pattern: RegExp,
  fieldName: string
): string | null => {
  if (value && !pattern.test(value)) {
    return `${fieldName} format is invalid`;
  }
  return null;
};

/**
 * Validates a single field with multiple rules
 */
export const validateField = (field: FormField, fieldName: string): string | null => {
  if (field.required) {
    const requiredError = validateRequired(field.value as string, fieldName);
    if (requiredError) return requiredError;
  }

  const value = String(field.value);

  if (field.minLength) {
    const minError = validateMinLength(value, field.minLength, fieldName);
    if (minError) return minError;
  }

  if (field.maxLength) {
    const maxError = validateMaxLength(value, field.maxLength, fieldName);
    if (maxError) return maxError;
  }

  if (field.pattern) {
    const patternError = validatePattern(value, field.pattern, fieldName);
    if (patternError) return patternError;
  }

  return null;
};

/**
 * Validates audit checklist data
 */
export const validateChecklistData = (checklist: Partial<AuditChecklist>): ValidationResult => {
  const errors: FormErrors = {};

  if (!checklist.auditName || checklist.auditName.trim() === '') {
    errors.auditName = 'Audit name is required';
  }

  if (!checklist.createdDate) {
    errors.createdDate = 'Date is required';
  } else {
    const dateError = validateDateFormat(checklist.createdDate);
    if (dateError) errors.createdDate = dateError;
  }

  if (!checklist.categories || checklist.categories.length === 0) {
    errors.categories = 'At least one category is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates category completion
 */
export const validateCategoryCompletion = (category: AuditCategory): boolean => {
  if (!category.items || category.items.length === 0) {
    return false;
  }

  return category.items.every((item: AuditChecklistItem) => {
    return item.response && item.response.trim() !== '';
  });
};

/**
 * Validates CSV import data
 */
export const validateCSVData = (data: Record<string, string>[]): ValidationResult => {
  const errors: FormErrors = {};

  if (!data || data.length === 0) {
    errors.data = 'CSV data is empty';
    return { isValid: false, errors };
  }

  // Check required columns
  const requiredColumns = ['id', 'categoryId', 'question'];
  const firstRow = data[0];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      errors[column] = `Missing required column: ${column}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Sanitizes input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Trims and normalizes whitespace
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Validate a single audit item value using simple rules
 */
export const validateAuditItem = (
  value: string,
  rules: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp } = {}
): string | null => {
  if (rules.required) {
    const requiredError = validateRequired(value, 'Field');
    if (requiredError) return requiredError;
  }

  if (rules.minLength) {
    const minError = validateMinLength(value, rules.minLength, 'Field');
    if (minError) return minError;
  }

  if (rules.maxLength) {
    const maxError = validateMaxLength(value, rules.maxLength, 'Field');
    if (maxError) return maxError;
  }

  if (rules.pattern) {
    const patternError = validatePattern(value, rules.pattern, 'Field');
    if (patternError) return patternError;
  }

  return null;
};

/**
 * Validate location object
 */
export const validateLocation = (location?: { latitude?: number; longitude?: number }): string | null => {
  if (!location) return 'Location is required';
  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return 'Invalid location coordinates';
  }
  return null;
};

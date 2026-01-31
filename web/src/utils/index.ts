import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateMinLength,
  validateMaxLength,
  sanitizeInput,
  normalizeText,
} from './formValidation';

import {
  calculateCategoryCompletion,
  calculateChecklistProgress,
  isCategoryComplete,
  isChecklistComplete,
  getCompletionMessage,
  getAutoSelection,
  exportChecklistJSON,
  exportChecklistCSV,
  formatDate,
  formatTime,
  parseCSV,
} from './auditHelpers';

export {
  // Form validation
  validateRequired,
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateMinLength,
  validateMaxLength,
  sanitizeInput,
  normalizeText,
  // Audit helpers
  calculateCategoryCompletion,
  calculateChecklistProgress,
  isCategoryComplete,
  isChecklistComplete,
  getCompletionMessage,
  getAutoSelection,
  exportChecklistJSON,
  exportChecklistCSV,
  formatDate,
  formatTime,
  parseCSV,
};

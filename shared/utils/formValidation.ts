/**
 * Form Validation Utilities
 * Shared validation logic for both mobile and web versions
 * Eliminates code duplication and ensures consistent validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  itemId: number;
  field: string;
  message: string;
  code: string;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * Validate a single form field
 * 
 * @param value - Field value
 * @param rules - Validation rules
 * @param fieldName - Field name for error messages
 * @returns Validation errors (empty if valid)
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required check
  if (rules.required && (!value || String(value).trim() === '')) {
    errors.push({
      itemId: 0,
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'REQUIRED'
    });
    return errors;
  }

  if (!value) return errors; // Skip other checks if empty and not required

  const stringValue = String(value).trim();

  // Min length
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push({
      itemId: 0,
      field: fieldName,
      message: `${fieldName} must be at least ${rules.minLength} characters`,
      code: 'MIN_LENGTH'
    });
  }

  // Max length
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push({
      itemId: 0,
      field: fieldName,
      message: `${fieldName} must not exceed ${rules.maxLength} characters`,
      code: 'MAX_LENGTH'
    });
  }

  // Pattern match
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push({
      itemId: 0,
      field: fieldName,
      message: `${fieldName} format is invalid`,
      code: 'PATTERN'
    });
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (result !== true) {
      errors.push({
        itemId: 0,
        field: fieldName,
        message: typeof result === 'string' ? result : `${fieldName} is invalid`,
        code: 'CUSTOM'
      });
    }
  }

  return errors;
}

/**
 * Validate audit form before submission
 * 
 * @param formData - Form data to validate
 * @param requiredFields - List of required field names
 * @returns Validation result
 */
export function validateAuditForm(
  formData: Record<string, any>,
  requiredFields: string[]
): ValidationResult {
  const errors: ValidationError[] = [];

  requiredFields.forEach(field => {
    if (!formData[field] || String(formData[field]).trim() === '') {
      errors.push({
        itemId: 0,
        field,
        message: `${field} is required`,
        code: 'REQUIRED'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

/**
 * Validate audit item response
 * 
 * @param item - Template item
 * @param response - User's response to item
 * @param fieldType - Type of field
 * @returns Validation errors (empty if valid)
 */
export function validateAuditItem(
  item: any,
  response: any,
  fieldType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required check
  if (item.is_required) {
    if (fieldType === 'image_upload') {
      if (!response) {
        errors.push({
          itemId: item.id,
          field: 'photo',
          message: `Photo is required for: ${item.title}`,
          code: 'REQUIRED'
        });
      }
    } else if (fieldType === 'open_ended') {
      if (!response || String(response).trim() === '') {
        errors.push({
          itemId: item.id,
          field: 'comment',
          message: `Answer is required for: ${item.title}`,
          code: 'REQUIRED'
        });
      }
    } else {
      if (!response) {
        errors.push({
          itemId: item.id,
          field: 'response',
          message: `Response is required for: ${item.title}`,
          code: 'REQUIRED'
        });
      }
    }
  }

  return errors;
}

/**
 * Validate location data
 * 
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param accuracy - GPS accuracy in meters
 * @returns Validation errors
 */
export function validateLocation(
  latitude: number | null,
  longitude: number | null,
  accuracy: number | null
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (latitude === null || longitude === null) {
    errors.push({
      itemId: 0,
      field: 'location',
      message: 'Location is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  // Validate latitude range
  if (latitude < -90 || latitude > 90) {
    errors.push({
      itemId: 0,
      field: 'latitude',
      message: 'Invalid latitude',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate longitude range
  if (longitude < -180 || longitude > 180) {
    errors.push({
      itemId: 0,
      field: 'longitude',
      message: 'Invalid longitude',
      code: 'INVALID_FORMAT'
    });
  }

  // Check accuracy
  if (accuracy && accuracy > 100) {
    // Warning: GPS accuracy is low
    console.warn(`GPS accuracy is ${accuracy}m (> 100m threshold)`);
  }

  return errors;
}

/**
 * Validate distance from target location
 * 
 * @param currentLat - Current latitude
 * @param currentLon - Current longitude
 * @param targetLat - Target latitude
 * @param targetLon - Target longitude
 * @param maxDistance - Maximum allowed distance in meters
 * @returns Validation errors
 */
export function validateDistance(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  maxDistance: number = 1000
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Haversine formula to calculate distance
  const R = 6371000; // Earth's radius in meters
  const dLat = ((targetLat - currentLat) * Math.PI) / 180;
  const dLon = ((targetLon - currentLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((currentLat * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance > maxDistance) {
    errors.push({
      itemId: 0,
      field: 'distance',
      message: `You are ${Math.round(distance)}m away. Maximum allowed: ${maxDistance}m`,
      code: 'DISTANCE_EXCEEDED'
    });
  }

  return errors;
}

/**
 * Validate file upload
 * 
 * @param file - File object
 * @param maxSizeMB - Maximum file size in MB
 * @param allowedTypes - Allowed MIME types
 * @returns Validation errors
 */
export function validateFileUpload(
  file: any,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({
      itemId: 0,
      field: 'file',
      message: 'File is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size && file.size > maxSizeBytes) {
    errors.push({
      itemId: 0,
      field: 'file',
      message: `File size exceeds ${maxSizeMB}MB limit`,
      code: 'FILE_TOO_LARGE'
    });
  }

  // Check file type
  if (file.type && !allowedTypes.includes(file.type)) {
    errors.push({
      itemId: 0,
      field: 'file',
      message: `File type ${file.type} not allowed. Allowed: ${allowedTypes.join(', ')}`,
      code: 'FILE_TYPE_NOT_ALLOWED'
    });
  }

  return errors;
}

/**
 * Validate email format
 * 
 * @param email - Email address
 * @returns Validation errors
 */
export function validateEmail(email: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    errors.push({
      itemId: 0,
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }

  return errors;
}

/**
 * Validate phone number format
 * 
 * @param phone - Phone number
 * @returns Validation errors
 */
export function validatePhoneNumber(phone: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

  if (!phone || !phoneRegex.test(phone.replace(/\s/g, ''))) {
    errors.push({
      itemId: 0,
      field: 'phone',
      message: 'Invalid phone number format',
      code: 'INVALID_PHONE'
    });
  }

  return errors;
}

/**
 * Validate date is within acceptable range
 * 
 * @param date - Date to validate
 * @param minDate - Minimum allowed date
 * @param maxDate - Maximum allowed date
 * @returns Validation errors
 */
export function validateDate(
  date: Date | null,
  minDate?: Date,
  maxDate?: Date
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!date) {
    errors.push({
      itemId: 0,
      field: 'date',
      message: 'Date is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  if (minDate && date < minDate) {
    errors.push({
      itemId: 0,
      field: 'date',
      message: `Date must be on or after ${minDate.toLocaleDateString()}`,
      code: 'DATE_TOO_EARLY'
    });
  }

  if (maxDate && date > maxDate) {
    errors.push({
      itemId: 0,
      field: 'date',
      message: `Date must be on or before ${maxDate.toLocaleDateString()}`,
      code: 'DATE_TOO_LATE'
    });
  }

  return errors;
}

export default {
  validateField,
  validateAuditForm,
  validateAuditItem,
  validateLocation,
  validateDistance,
  validateFileUpload,
  validateEmail,
  validatePhoneNumber,
  validateDate
};

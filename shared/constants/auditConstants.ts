/**
 * Audit Application Constants & Enums
 * Centralized constants for both mobile and web versions
 * Prevents magic strings and enables type safety
 */

/**
 * Audit Status Enum
 */
export enum AuditStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DRAFT = 'draft'
}

/**
 * Audit Status Labels for UI
 */
export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  [AuditStatus.PENDING]: 'Pending',
  [AuditStatus.IN_PROGRESS]: 'In Progress',
  [AuditStatus.COMPLETED]: 'Completed',
  [AuditStatus.FAILED]: 'Failed',
  [AuditStatus.DRAFT]: 'Draft'
};

/**
 * Item Input Type Enum
 */
export enum InputType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_ANSWER = 'multiple_answer',
  MULTIPLE_CHOICE = 'multiple_choice',
  IMAGE_UPLOAD = 'image_upload',
  OPEN_ENDED = 'open_ended',
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  TASK = 'task',
  SIGNATURE = 'signature'
}

/**
 * Item Response Status Enum
 */
export enum ItemStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped'
}

/**
 * Item Status Labels for UI
 */
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.PENDING]: 'Pending',
  [ItemStatus.COMPLETED]: 'Completed',
  [ItemStatus.FAILED]: 'Failed',
  [ItemStatus.WARNING]: 'Warning',
  [ItemStatus.SKIPPED]: 'Skipped'
};

/**
 * Item Response Mark Enum (for scoring)
 */
export enum Mark {
  PASS = 'PASS',
  FAIL = 'FAIL',
  NA = 'NA',
  PARTIAL = 'PARTIAL'
}

/**
 * User Role Enum
 */
export enum UserRole {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
  MANAGER = 'manager'
}

/**
 * Severity Level Enum (for findings)
 */
export enum Severity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  INFO = 'INFO'
}

/**
 * Severity Colors for UI
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.CRITICAL]: '#f44336', // Red
  [Severity.MAJOR]: '#ff9800', // Orange
  [Severity.MINOR]: '#2196f3', // Blue
  [Severity.INFO]: '#4caf50' // Green
};

/**
 * Location Validation Constants
 */
export const LOCATION_CONSTRAINTS = {
  MAX_DISTANCE_METERS: 1000, // Must be within 1km
  WARNING_DISTANCE_METERS: 500, // Warn if > 500m
  MIN_ACCURACY_METERS: 100, // Accept if accuracy > 100m
  GPS_TIMEOUT_MS: 30000 // Wait max 30s for GPS
};

/**
 * File Upload Constants
 */
export const FILE_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_PHOTOS_PER_ITEM: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

/**
 * Form Validation Constants
 */
export const FORM_CONSTRAINTS = {
  MIN_STORE_NAME: 2,
  MAX_STORE_NAME: 100,
  MIN_COMMENT: 2,
  MAX_COMMENT: 2000,
  MIN_AUDIT_ITEMS: 5,
  REQUIRED_PHOTOS_PERCENTAGE: 80 // 80% of required photos must be provided
};

/**
 * API Configuration Constants
 */
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_MS: 5 * 60 * 1000 // 5 minutes
};

/**
 * Performance Thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_MAX_MS: 3000,
  API_RESPONSE_MAX_MS: 2000,
  FORM_SUBMISSION_MAX_MS: 5000
};

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INITIAL_PAGE: 1
};

/**
 * Date Format Constants
 */
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'YYYY-MM-DD',
  FULL: 'DDDD, MMMM D, YYYY',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss'
};

/**
 * Time Tracking Constants
 */
export const TIME_TRACKING = {
  AUTO_SAVE_INTERVAL_MS: 30000, // Auto-save every 30 seconds
  INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  SESSION_WARNING_MS: 14 * 60 * 1000 // Warn at 14 minutes
};

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  OFFLINE_SUPPORT: true,
  BACKGROUND_SYNC: true,
  COMPRESSION: true,
  ANALYTICS: true,
  ERROR_TRACKING: true,
  DARK_MODE: false,
  VOICE_NOTES: false,
  AI_SUGGESTIONS: false
};

/**
 * Error Codes & Messages
 */
export const ERROR_CODES = {
  LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  GPS_TIMEOUT: 'GPS_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  INVALID_FORM_DATA: 'INVALID_FORM_DATA',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT'
};

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.LOCATION_PERMISSION_DENIED]: 'Location permission denied. Please enable location access to continue.',
  [ERROR_CODES.LOCATION_NOT_FOUND]: 'Unable to determine current location.',
  [ERROR_CODES.GPS_TIMEOUT]: 'GPS location acquisition timed out. Please try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'Failed to upload file. Please try again.',
  [ERROR_CODES.INVALID_FORM_DATA]: 'Form contains invalid data. Please check and try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'Your session has expired. Please login again.',
  [ERROR_CODES.SERVER_ERROR]: 'Server error. Please try again later.',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found.',
  [ERROR_CODES.CONFLICT]: 'Data conflict. Please refresh and try again.'
};

/**
 * Category Order (standard audit categories)
 */
export const DEFAULT_CATEGORY_ORDER = [
  'DETAILS',
  'QUALITY',
  'SERVICE',
  'CLEANLINESS',
  'PRODUCT_KNOWLEDGE',
  'CUSTOMER_EXPERIENCE',
  'COMPLIANCE'
];

/**
 * Special Categories (should be filtered out)
 */
export const SPECIAL_CATEGORIES = [
  'Speed of Service - Tracking',
  'Time Tracking'
];

/**
 * Get human-readable label for input type
 */
export function getInputTypeLabel(type: InputType): string {
  const labels: Record<InputType, string> = {
    [InputType.SINGLE_CHOICE]: 'Yes/No/NA',
    [InputType.MULTIPLE_ANSWER]: 'Multiple Answers',
    [InputType.MULTIPLE_CHOICE]: 'Multiple Choice',
    [InputType.IMAGE_UPLOAD]: 'Photo Upload',
    [InputType.OPEN_ENDED]: 'Text Input',
    [InputType.TEXT]: 'Text',
    [InputType.NUMBER]: 'Number',
    [InputType.DATE]: 'Date',
    [InputType.TASK]: 'Task Status',
    [InputType.SIGNATURE]: 'Signature'
  };
  return labels[type] || type;
}

/**
 * Check if input type requires file upload
 */
export function isFileUploadType(type: string): boolean {
  return type === InputType.IMAGE_UPLOAD || type === InputType.SIGNATURE;
}

/**
 * Check if input type has options
 */
export function hasOptionsType(type: string): boolean {
  return (
    type === InputType.SINGLE_CHOICE ||
    type === InputType.MULTIPLE_CHOICE ||
    type === InputType.MULTIPLE_ANSWER
  );
}

/**
 * Check if input type requires text input
 */
export function isTextInputType(type: string): boolean {
  return (
    type === InputType.OPEN_ENDED ||
    type === InputType.TEXT ||
    type === InputType.NUMBER
  );
}

/**
 * Get default completion threshold percentage
 */
export function getCompletionThreshold(): number {
  return 100; // 100% of items must be completed
}

export default {
  AuditStatus,
  InputType,
  ItemStatus,
  Mark,
  UserRole,
  Severity,
  AUDIT_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  SEVERITY_COLORS,
  LOCATION_CONSTRAINTS,
  FILE_UPLOAD_CONSTRAINTS,
  FORM_CONSTRAINTS,
  API_CONFIG,
  PERFORMANCE_THRESHOLDS,
  PAGINATION,
  DATE_FORMATS,
  TIME_TRACKING,
  FEATURE_FLAGS,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_CATEGORY_ORDER,
  SPECIAL_CATEGORIES,
  getInputTypeLabel,
  isFileUploadType,
  hasOptionsType,
  isTextInputType,
  getCompletionThreshold
};

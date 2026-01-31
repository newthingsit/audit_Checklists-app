// Shared TypeScript types for mobile
export type { 
  FormField,
  FormErrors,
  FormTouched,
  ValidationResult,
  AuditChecklistItem,
  AuditCategory,
  AuditChecklist,
  FormState,
  ApiResponse,
  CategoryCompletion,
  LocationData,
  PhotoData,
} from './index';

export interface CategoryNavigationState {
  activeCategory: number;
  activeStep: number;
  categories: AuditCategory[];
  completedCategories: Set<string>;
}

export interface FormActionState {
  isSaving: boolean;
  isSubmitting: boolean;
  isUploading: boolean;
  error: string | null;
  success: boolean;
}

export interface CameraCapture {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export interface SignatureData {
  base64: string;
  timestamp: number;
  width: number;
  height: number;
}

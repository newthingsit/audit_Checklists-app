// Shared TypeScript types for mobile
export interface FormField {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormTouched {
  [key: string]: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

export interface AuditChecklistItem {
  id: string;
  categoryId: string;
  question: string;
  response?: string;
  comment?: string;
  photos?: string[];
  options?: string[];
  selectedOption?: string;
  multipleSelections?: string[];
}

export interface AuditCategory {
  id: string;
  name: string;
  nameUrdu: string;
  items: AuditChecklistItem[];
  completed?: boolean;
}

export interface AuditChecklist {
  id: string;
  auditName: string;
  location?: string;
  createdDate: string;
  createdBy?: string;
  categories: AuditCategory[];
  notes?: string;
  signature?: string;
  status?: 'draft' | 'submitted' | 'approved';
}

export interface FormState {
  notes: string;
  responses: { [key: string]: string };
  selectedOptions: { [key: string]: string };
  multipleSelections: { [key: string]: string[] };
  inputValues: { [key: string]: string };
  comments: { [key: string]: string };
  photos: { [key: string]: string[] };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CategoryCompletion {
  categoryId: string;
  totalItems: number;
  completedItems: number;
  percentage: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface PhotoData {
  uri: string;
  name: string;
  type: string;
  size: number;
  timestamp: number;
}

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

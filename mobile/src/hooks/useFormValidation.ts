import { useState, useCallback } from 'react';
import { FormErrors, FormTouched } from '../types';

interface UseFormValidationReturn {
  errors: FormErrors;
  touched: FormTouched;
  validateField: (fieldName: string, value: string, rules?: ValidationRules) => void;
  validateForm: (formData: Record<string, string>, rules?: Record<string, ValidationRules>) => boolean;
  clearErrors: () => void;
  setErrors: (errors: FormErrors) => void;
  setFieldTouched: (fieldName: string, isTouched: boolean) => void;
}

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  custom?: (value: string) => string | null;
}

export const useFormValidation = (): UseFormValidationReturn => {
  const [errors, setErrorsState] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<FormTouched>({});

  const validateField = useCallback(
    (fieldName: string, value: string, rules: ValidationRules = {}) => {
      let error: string | null = null;

      if (rules.required && (!value || value.trim() === '')) {
        error = `${fieldName} is required`;
      } else if (value) {
        if (rules.minLength && value.length < rules.minLength) {
          error = `${fieldName} must be at least ${rules.minLength} characters`;
        } else if (rules.maxLength && value.length > rules.maxLength) {
          error = `${fieldName} must not exceed ${rules.maxLength} characters`;
        } else if (rules.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'Invalid email format';
          }
        } else if (rules.phone) {
          const phoneRegex = /^[\d+\-\s()]{10,}$/;
          if (!phoneRegex.test(value)) {
            error = 'Invalid phone format';
          }
        } else if (rules.pattern && !rules.pattern.test(value)) {
          error = `${fieldName} format is invalid`;
        } else if (rules.custom) {
          error = rules.custom(value);
        }
      }

      setErrorsState(prev => ({
        ...prev,
        [fieldName]: error || undefined,
      }));

      setTouchedState(prev => ({
        ...prev,
        [fieldName]: true,
      }));
    },
    []
  );

  const validateForm = useCallback(
    (formData: Record<string, string>, rules: Record<string, ValidationRules> = {}): boolean => {
      const newErrors: FormErrors = {};

      Object.keys(formData).forEach(fieldName => {
        const value = formData[fieldName];
        const fieldRules = rules[fieldName] || {};

        if (fieldRules.required && (!value || value.trim() === '')) {
          newErrors[fieldName] = `${fieldName} is required`;
        } else if (value) {
          if (fieldRules.minLength && value.length < fieldRules.minLength) {
            newErrors[fieldName] = `${fieldName} must be at least ${fieldRules.minLength} characters`;
          } else if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            newErrors[fieldName] = `${fieldName} must not exceed ${fieldRules.maxLength} characters`;
          } else if (fieldRules.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[fieldName] = 'Invalid email format';
            }
          } else if (fieldRules.phone) {
            const phoneRegex = /^[\d+\-\s()]{10,}$/;
            if (!phoneRegex.test(value)) {
              newErrors[fieldName] = 'Invalid phone format';
            }
          } else if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
            newErrors[fieldName] = `${fieldName} format is invalid`;
          } else if (fieldRules.custom) {
            const customError = fieldRules.custom(value);
            if (customError) {
              newErrors[fieldName] = customError;
            }
          }
        }
      });

      setErrorsState(newErrors);

      const newTouched: FormTouched = {};
      Object.keys(formData).forEach(fieldName => {
        newTouched[fieldName] = true;
      });
      setTouchedState(newTouched);

      return Object.keys(newErrors).length === 0;
    },
    []
  );

  const clearErrors = useCallback(() => {
    setErrorsState({});
    setTouchedState({});
  }, []);

  const setErrors = useCallback((newErrors: FormErrors) => {
    setErrorsState(newErrors);
  }, []);

  const setFieldTouched = useCallback((fieldName: string, isTouched: boolean) => {
    setTouchedState(prev => ({
      ...prev,
      [fieldName]: isTouched,
    }));
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateForm,
    clearErrors,
    setErrors,
    setFieldTouched,
  };
};

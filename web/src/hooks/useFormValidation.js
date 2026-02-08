import { useState, useCallback } from 'react';
import { validateAuditItem, validateLocation as validateLocationField } from '../utils/formValidation';

/**
 * useFormValidation Hook
 * Centralized form validation logic
 * Uses shared validators for cross-platform consistency
 * 
 * @returns {Object} Validation functions and state
 */
export const useFormValidation = () => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((fieldName, value, rules = {}) => {
    let error = null;

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

    setErrors(prev => ({
      ...prev,
      [fieldName]: error || undefined,
    }));

    setTouched(prev => ({
      ...prev,
      [fieldName]: true,
    }));

    return !error;
  }, []);

  const validateLocation = useCallback((location) => {
    return validateLocationField(location);
  }, []);

  const markFieldTouched = useCallback((itemId) => {
    setTouched(prev => ({
      ...prev,
      [itemId]: true,
    }));
  }, []);

  const getFieldError = useCallback((itemId) => {
    return touched[itemId] ? errors[itemId] : null;
  }, [errors, touched]);

  const validateForm = useCallback((formDataOrItems, rulesOrFormData = {}) => {
    const newErrors = {};
    let isValid = true;

    if (Array.isArray(formDataOrItems)) {
      const items = formDataOrItems;
      const formData = rulesOrFormData || {};
      items.forEach(item => {
        if (item.required) {
          const itemData = formData[item.id];
          if (!itemData || (typeof itemData === 'string' && itemData.trim() === '')) {
            newErrors[item.id] = `${item.name} is required`;
            isValid = false;
          }
        }
      });
    } else {
      const formData = formDataOrItems || {};
      const rules = rulesOrFormData || {};
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
    }

    setErrors(newErrors);

    const newTouched = {};
    if (!Array.isArray(formDataOrItems)) {
      Object.keys(formDataOrItems || {}).forEach(fieldName => {
        newTouched[fieldName] = true;
      });
    }
    setTouched(prev => ({
      ...prev,
      ...newTouched,
    }));

    return Object.keys(newErrors).length === 0 && isValid;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const clearFieldError = useCallback((itemId) => {
    setErrors(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateLocation,
    markFieldTouched,
    getFieldError,
    validateForm,
    clearErrors,
    clearFieldError,
    setErrors,
    setTouched,
  };
};

export default useFormValidation;

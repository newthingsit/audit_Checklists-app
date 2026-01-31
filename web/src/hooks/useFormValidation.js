import { useState, useCallback } from 'react';
import { validateAuditItem, validateLocation } from '@shared/utils/formValidation';

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

  const validateField = useCallback((itemId, value, rules) => {
    const error = validateAuditItem(value, rules);
    
    setErrors(prev => ({
      ...prev,
      [itemId]: error,
    }));

    return !error;
  }, []);

  const validateLocation = useCallback((location) => {
    return validateLocation(location);
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

  const validateForm = useCallback((items, formData) => {
    const newErrors = {};
    let isValid = true;

    items.forEach(item => {
      if (item.required) {
        const itemData = formData[item.id];
        if (!itemData || (typeof itemData === 'string' && itemData.trim() === '')) {
          newErrors[item.id] = `${item.name} is required`;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
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
  };
};

export default useFormValidation;

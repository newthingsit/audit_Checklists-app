import { useState, useCallback } from 'react';

/**
 * useAuditFormState Hook
 * Centralized state management for audit form
 * Reduces prop drilling and component complexity
 * 
 * @returns {Object} Form state and handlers
 */
export const useAuditFormState = (initialValues = {}) => {
  const [responses, setResponses] = useState(initialValues.responses || {});
  const [selectedOptions, setSelectedOptions] = useState(initialValues.selectedOptions || {});
  const [multipleSelections, setMultipleSelections] = useState(initialValues.multipleSelections || {});
  const [inputValues, setInputValues] = useState(initialValues.inputValues || {});
  const [comments, setComments] = useState(initialValues.comments || {});
  const [photos, setPhotos] = useState(initialValues.photos || {});
  const [notes, setNotes] = useState(initialValues.notes || '');

  const updateResponse = useCallback((itemId, value) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const updateSelectedOption = useCallback((itemId, optionId) => {
    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: optionId,
    }));
  }, []);

  const updateMultipleSelection = useCallback((itemId, optionId) => {
    setMultipleSelections(prev => {
      const current = prev[itemId] || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [itemId]: updated,
      };
    });
  }, []);

  const updateInputValue = useCallback((itemId, value) => {
    setInputValues(prev => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const updateComment = useCallback((itemId, comment) => {
    setComments(prev => ({
      ...prev,
      [itemId]: comment,
    }));
  }, []);

  const updatePhoto = useCallback((itemId, photo) => {
    setPhotos(prev => ({
      ...prev,
      [itemId]: photo,
    }));
  }, []);

  const clearItemResponses = useCallback((itemId) => {
    setResponses(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
    setSelectedOptions(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
    setComments(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getFormData = useCallback(() => ({
    responses,
    selectedOptions,
    multipleSelections,
    inputValues,
    comments,
    photos,
    notes,
  }), [responses, selectedOptions, multipleSelections, inputValues, comments, photos, notes]);

  const resetForm = useCallback(() => {
    setResponses({});
    setSelectedOptions({});
    setMultipleSelections({});
    setInputValues({});
    setComments({});
    setPhotos({});
    setNotes('');
  }, []);

  return {
    // State
    responses,
    selectedOptions,
    multipleSelections,
    inputValues,
    comments,
    photos,
    notes,
    
    // Updates
    updateResponse,
    updateSelectedOption,
    updateMultipleSelection,
    updateInputValue,
    updateComment,
    updatePhoto,
    setNotes,
    setResponses,
    setSelectedOptions,
    setMultipleSelections,
    setInputValues,
    setComments,
    setPhotos,
    
    // Utilities
    clearItemResponses,
    getFormData,
    resetForm,
  };
};

export default useAuditFormState;

import { useState, useCallback, ReactNode } from 'react';
import { FormState } from '../types';

interface UseAuditFormStateInitial {
  responses?: { [key: string]: string };
  selectedOptions?: { [key: string]: string };
  multipleSelections?: { [key: string]: string[] };
  inputValues?: { [key: string]: string };
  comments?: { [key: string]: string };
  photos?: { [key: string]: string[] };
  notes?: string;
}

interface UseAuditFormStateReturn extends FormState {
  updateResponse: (itemId: string, value: string) => void;
  updateSelectedOption: (itemId: string, optionId: string) => void;
  updateMultipleSelection: (itemId: string, optionId: string) => void;
  updateInputValue: (itemId: string, value: string) => void;
  updateComment: (itemId: string, value: string) => void;
  addPhoto: (itemId: string, photoUri: string) => void;
  removePhoto: (itemId: string, photoUri: string) => void;
  setNotes: (value: string) => void;
  resetForm: () => void;
  getFormData: () => FormState;
}

/**
 * useAuditFormState Hook
 * Centralized state management for audit form
 * Reduces prop drilling and component complexity
 * 
 * @param {UseAuditFormStateInitial} initialValues - Initial form state
 * @returns {UseAuditFormStateReturn} Form state and handlers
 */
export const useAuditFormState = (
  initialValues: UseAuditFormStateInitial = {}
): UseAuditFormStateReturn => {
  const [responses, setResponses] = useState<{ [key: string]: string }>(
    initialValues.responses || {}
  );
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>(
    initialValues.selectedOptions || {}
  );
  const [multipleSelections, setMultipleSelections] = useState<{ [key: string]: string[] }>(
    initialValues.multipleSelections || {}
  );
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>(
    initialValues.inputValues || {}
  );
  const [comments, setComments] = useState<{ [key: string]: string }>(
    initialValues.comments || {}
  );
  const [photos, setPhotos] = useState<{ [key: string]: string[] }>(
    initialValues.photos || {}
  );
  const [notes, setNotesValue] = useState<string>(initialValues.notes || '');

  const updateResponse = useCallback((itemId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const updateSelectedOption = useCallback((itemId: string, optionId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [itemId]: optionId,
    }));
  }, []);

  const updateMultipleSelection = useCallback((itemId: string, optionId: string) => {
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

  const updateInputValue = useCallback((itemId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const updateComment = useCallback((itemId: string, value: string) => {
    setComments(prev => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const addPhoto = useCallback((itemId: string, photoUri: string) => {
    setPhotos(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), photoUri],
    }));
  }, []);

  const removePhoto = useCallback((itemId: string, photoUri: string) => {
    setPhotos(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(uri => uri !== photoUri),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setResponses({});
    setSelectedOptions({});
    setMultipleSelections({});
    setInputValues({});
    setComments({});
    setPhotos({});
    setNotesValue('');
  }, []);

  const getFormData = useCallback((): FormState => ({
    notes,
    responses,
    selectedOptions,
    multipleSelections,
    inputValues,
    comments,
    photos,
  }), [notes, responses, selectedOptions, multipleSelections, inputValues, comments, photos]);

  return {
    notes,
    responses,
    selectedOptions,
    multipleSelections,
    inputValues,
    comments,
    photos,
    setNotes: setNotesValue,
    updateResponse,
    updateSelectedOption,
    updateMultipleSelection,
    updateInputValue,
    updateComment,
    addPhoto,
    removePhoto,
    resetForm,
    getFormData,
  };
};

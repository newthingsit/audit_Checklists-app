import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditFormState } from '@hooks/useAuditFormState';

describe('useAuditFormState', () => {
  let hook;

  beforeEach(() => {
    const { result } = renderHook(() => useAuditFormState());
    hook = result;
  });

  it('initializes with empty state', () => {
    expect(hook.current.notes).toBe('');
    expect(hook.current.responses).toEqual({});
  });

  it('updates notes correctly', () => {
    act(() => {
      hook.current.setNotes('Test note');
    });
    expect(hook.current.notes).toBe('Test note');
  });

  it('handles response updates', () => {
    act(() => {
      hook.current.setResponses({
        category1: 'Yes',
        category2: 'No',
      });
    });
    expect(hook.current.responses).toEqual({
      category1: 'Yes',
      category2: 'No',
    });
  });

  it('handles selected options', () => {
    act(() => {
      hook.current.setSelectedOptions({
        item1: 'option1',
      });
    });
    expect(hook.current.selectedOptions).toEqual({
      item1: 'option1',
    });
  });

  it('handles multiple selections', () => {
    act(() => {
      hook.current.setMultipleSelections({
        item1: ['opt1', 'opt2'],
      });
    });
    expect(hook.current.multipleSelections).toEqual({
      item1: ['opt1', 'opt2'],
    });
  });

  it('handles comments', () => {
    act(() => {
      hook.current.setComments({
        item1: 'Comment text',
      });
    });
    expect(hook.current.comments).toEqual({
      item1: 'Comment text',
    });
  });

  it('handles photos', () => {
    const photoUri = 'file:///path/to/photo.jpg';
    act(() => {
      hook.current.setPhotos({
        item1: [photoUri],
      });
    });
    expect(hook.current.photos).toEqual({
      item1: [photoUri],
    });
  });

  it('resets form state', () => {
    act(() => {
      hook.current.setNotes('Note');
      hook.current.setResponses({ item: 'Yes' });
    });
    act(() => {
      hook.current.resetForm();
    });
    expect(hook.current.notes).toBe('');
    expect(hook.current.responses).toEqual({});
  });
});

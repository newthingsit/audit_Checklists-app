import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditFormState } from '@hooks/useAuditFormState';

describe('Mobile - useAuditFormState', () => {
  let hook;

  beforeEach(() => {
    const { result } = renderHook(() => useAuditFormState());
    hook = result;
  });

  it('initializes with empty state', () => {
    expect(hook.current.notes).toBe('');
    expect(hook.current.responses).toEqual({});
    expect(hook.current.photos).toEqual({});
  });

  it('handles photo addition', () => {
    const photoUri = 'file:///path/to/photo.jpg';
    act(() => {
      hook.current.addPhoto('item1', photoUri);
    });
    expect(hook.current.photos.item1).toContain(photoUri);
  });

  it('handles multiple photos per item', () => {
    const photo1 = 'file:///photo1.jpg';
    const photo2 = 'file:///photo2.jpg';
    act(() => {
      hook.current.addPhoto('item1', photo1);
      hook.current.addPhoto('item1', photo2);
    });
    expect(hook.current.photos.item1).toHaveLength(2);
    expect(hook.current.photos.item1).toContain(photo1);
    expect(hook.current.photos.item1).toContain(photo2);
  });

  it('removes photos correctly', () => {
    const photo1 = 'file:///photo1.jpg';
    const photo2 = 'file:///photo2.jpg';
    act(() => {
      hook.current.addPhoto('item1', photo1);
      hook.current.addPhoto('item1', photo2);
    });
    act(() => {
      hook.current.removePhoto('item1', photo1);
    });
    expect(hook.current.photos.item1).toHaveLength(1);
    expect(hook.current.photos.item1).not.toContain(photo1);
  });

  it('handles location data', () => {
    act(() => {
      hook.current.updateInputValue('location', 'Main Office');
    });
    expect(hook.current.inputValues.location).toBe('Main Office');
  });
});

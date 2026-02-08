/// <reference types="jest" />
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from './useFormValidation';

describe('useFormValidation', () => {
  let hook: any;

  beforeEach(() => {
    const { result } = renderHook(() => useFormValidation());
    hook = result;
  });

  it('initializes with no errors', () => {
    expect(hook.current.errors).toEqual({});
    expect(hook.current.touched).toEqual({});
  });

  it('validates required fields', () => {
    act(() => {
      hook.current.validateField('name', '', { required: true });
    });
    expect(hook.current.errors['name']).toBeDefined();
  });

  it('validates email format', () => {
    act(() => {
      hook.current.validateField('email', 'invalid-email', { email: true });
    });
    expect(hook.current.errors['email']).toBeDefined();
  });

  it('validates phone format', () => {
    act(() => {
      hook.current.validateField('phone', '123', { phone: true });
    });
    expect(hook.current.errors['phone']).toBeDefined();
  });

  it('clears errors for valid input', () => {
    act(() => {
      hook.current.validateField('name', 'John Doe', { required: true });
    });
    expect(hook.current.errors['name']).toBeUndefined();
  });

  it('marks fields as touched', () => {
    act(() => {
      hook.current.validateField('name', '', { required: true });
    });
    expect(hook.current.touched['name']).toBe(true);
  });

  it('validates entire form', () => {
    const formData = {
      name: '',
      email: 'test@example.com',
      phone: '',
    };
    const rules = {
      name: { required: true },
      phone: { required: true },
    };
    let isValid: boolean;
    act(() => {
      isValid = hook.current.validateForm(formData, rules);
    });
    expect(isValid!).toBe(false);
  });

  it('clears all errors', () => {
    act(() => {
      hook.current.validateField('name', '', { required: true });
    });
    act(() => {
      hook.current.validateField('email', '', { required: true });
    });
    act(() => {
      hook.current.clearErrors();
    });
    expect(hook.current.errors).toEqual({});
  });
});

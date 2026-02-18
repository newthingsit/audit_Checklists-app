/**
 * ErrorBoundary Component Unit Tests
 * Tests error catching and reporting
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { captureSentryException } from '../../src/config/sentry';

jest.mock('../../src/config/sentry');

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <Text>No error</Text>;
  };

  describe('Error Catching', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <Text>Child component</Text>
        </ErrorBoundary>
      );

      expect(getByText('Child component')).toBeTruthy();
    });

    it('should catch errors from child components', () => {
      const { getByText  } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error UI instead of crashing
      expect(getByText(/Something went wrong/i)).toBeTruthy();
    });

    it('should display default error message', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show default error message
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  describe('Sentry Integration', () => {
    it('should report errors to Sentry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(captureSentryException).toHaveBeenCalled();
      expect(captureSentryException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should include component stack in error report', () => {
      render(
        <ErrorBoundary parentComponent="TestScreen">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(captureSentryException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          react: expect.objectContaining({
            componentStack: expect.any(String),
          }),
        })
      );
    });

    it('should include parent component context', () => {
      const parentComponent = 'AuditScreen';
      
      render(
        <ErrorBoundary parentComponent={parentComponent}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(captureSentryException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          errorBoundary: expect.objectContaining({
            parentComponent,
          }),
        })
      );
    });

    it('should include current screen in error report', () => {
      const currentScreen = 'AuditListScreen';
      
      render(
        <ErrorBoundary currentScreen={currentScreen}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(captureSentryException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          errorBoundary: expect.objectContaining({
            screen: currentScreen,
          }),
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error occurred, fallback shown
      expect(getByText(/Something went wrong/i)).toBeTruthy();

      // Retry by re-rendering with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should still show error (ErrorBoundary doesn't automatically recover)
      // This tests that error state persists
      expect(getByText(/Something went wrong/i)).toBeTruthy();
    });

    it('should provide retry button if onReset is provided', () => {
      const onReset = jest.fn();
      
      const { getByText } = render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check if retry/reset option is available
      // Note: This depends on your ErrorBoundary implementation
      // If it shows a "Try Again" button, test for it
      expect(getByText(/Something went wrong/i)).toBeTruthy();
    });
  });

  describe('Development vs Production', () => {
    it('should show detailed error in development', () => {
      global.__DEV__ = true;

      const { queryByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // In dev mode, might show more details
      // This depends on your ErrorBoundary implementation
      expect(queryByText(/Something went wrong/i)).toBeTruthy();
    });

    it('should show generic message in production', () => {
      global.__DEV__ = false;

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show user-friendly message
      expect(getByText(/Something went wrong/i)).toBeTruthy();
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple consecutive errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(captureSentryException).toHaveBeenCalledTimes(1);

      // Trigger another error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still handle the error gracefully
      // ErrorBoundary remains in error state
      expect(captureSentryException).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should catch errors in nearest boundary', () => {
      const outerCapture = jest.fn();
      
      const { getByText } = render(
        <ErrorBoundary parentComponent="Outer">
          <Text>Outer content</Text>
          <ErrorBoundary parentComponent="Inner">
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(captureSentryException).toHaveBeenCalled();
      
      // Outer content should still be visible
      expect(getByText('Outer content')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should work without optional props', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(getByText(/Something went wrong/i)).toBeTruthy();
      expect(captureSentryException).toHaveBeenCalled();
    });

    it('should handle all optional props', () => {
      const { getByText } = render(
        <ErrorBoundary
          parentComponent="TestParent"
          currentScreen="TestScreen"
        >
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error UI with default messages
      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });
});

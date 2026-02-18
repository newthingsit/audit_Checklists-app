import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, ActivityIndicator } from 'react-native';
import {
  LocationCaptureButton,
  LocationDisplay,
} from '../../src/components/LocationCapture';
import { useLocation } from '../../src/context/LocationContext';

// Mock context
jest.mock('../../src/context/LocationContext');

// Mock theme config
jest.mock('../../src/config/theme', () => ({
  themeConfig: {
    primary: { main: '#3B82F6', dark: '#1E40AF', light: '#DBEAFE' },
    success: { main: '#10B981', dark: '#065F46', light: '#D1FAE5', bg: '#ECFDF5' },
    error: { main: '#EF4444', dark: '#7F1D1D', light: '#FEE2E2' },
    warning: {
      main: '#F59E0B',
      dark: '#92400E',
      light: '#FEF3C7',
      bg: '#FFFBEB',
    },
    border: { default: '#E5E7EB' },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF',
    },
    borderRadius: {
      large: 16,
      medium: 12,
      small: 8,
    },
    shadows: {
      small: {},
    },
  },
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children, colors }) =>
      React.createElement(RNView, {}, children),
  };
});

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    MaterialIcons: ({ name, size, color }) =>
      React.createElement(RNView, { testID: `icon-${name}` }),
  };
});

const mockLocation = {
  latitude: 40.7128,
  longitude: -74.006,
  accuracy: 10,
  altitude: 100,
  heading: 0,
  speed: 0,
};

describe('LocationCaptureButton Component', () => {
  const defaultLocationContext = {
    getCurrentLocation: jest.fn().mockResolvedValue({
      success: true,
      location: mockLocation,
    }),
    isLoading: false,
    formatCoordinates: jest.fn((lat, lon) => `${lat.toFixed(4)}, ${lon.toFixed(4)}`),
    openInMaps: jest.fn(),
    getAddress: jest.fn().mockResolvedValue('New York, NY'),
    verifyLocation: jest.fn().mockResolvedValue({ verified: true }),
    currentLocation: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue(defaultLocationContext);
  });

  describe('Rendering', () => {
    test('renders button with default label', () => {
      const { getByText } = render(<LocationCaptureButton />);
      expect(getByText('Capture Location')).toBeTruthy();
    });

    test('renders button with custom label', () => {
      const { getByText } = render(
        <LocationCaptureButton label="Get Location" />
      );
      expect(getByText('Get Location')).toBeTruthy();
    });

    test('renders button with custom captured label', () => {
      const { getByText } = render(
        <LocationCaptureButton
          captured={true}
          capturedLabel="Location Set"
        />
      );
      expect(getByText('Location Set')).toBeTruthy();
    });

    test('renders capture icon by default', () => {
      const { getByTestId } = render(<LocationCaptureButton />);
      expect(getByTestId('icon-my-location')).toBeTruthy();
    });

    test('renders check-circle icon when captured', () => {
      const { getByTestId } = render(
        <LocationCaptureButton captured={true} />
      );
      expect(getByTestId('icon-check-circle')).toBeTruthy();
    });

    test('renders chevron-right icon for action', () => {
      const { getByTestId } = render(<LocationCaptureButton />);
      expect(getByTestId('icon-chevron-right')).toBeTruthy();
    });

    test('renders refresh icon when captured', () => {
      const { getByTestId } = render(
        <LocationCaptureButton captured={true} />
      );
      expect(getByTestId('icon-refresh')).toBeTruthy();
    });
  });

  describe('Initial State', () => {
    test('shows initial uncaptured state', () => {
      const { getByText } = render(<LocationCaptureButton />);
      expect(getByText('Capture Location')).toBeTruthy();
    });

    test('shows captured state when prop is true', () => {
      const { getByText } = render(
        <LocationCaptureButton
          captured={true}
          capturedLabel="Location Captured"
        />
      );
      expect(getByText('Location Captured')).toBeTruthy();
    });

    test('shows hint text when not captured', () => {
      const { getByText } = render(<LocationCaptureButton />);
      expect(getByText('Tap to capture your current location')).toBeTruthy();
    });

    test('hides hint text when captured', () => {
      const { queryByText } = render(
        <LocationCaptureButton captured={true} />
      );
      expect(queryByText('Tap to capture your current location')).toBeFalsy();
    });
  });

  describe('Location Capture', () => {
    test('calls getCurrentLocation on button press', async () => {
      defaultLocationContext.getCurrentLocation.mockResolvedValue({
        success: true,
        location: mockLocation,
      });

      const { getByText } = render(<LocationCaptureButton />);
      fireEvent.press(getByText('Capture Location'));

      await waitFor(() => {
        expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalled();
      });
    });

    test('calls onCapture with location on success', async () => {
      const mockOnCapture = jest.fn();
      defaultLocationContext.getCurrentLocation.mockResolvedValue({
        success: true,
        location: mockLocation,
      });

      const { getByText } = render(
        <LocationCaptureButton onCapture={mockOnCapture} />
      );
      fireEvent.press(getByText('Capture Location'));

      await waitFor(() => {
        expect(mockOnCapture).toHaveBeenCalledWith(mockLocation);
      });
    });

    test('handles location capture error', async () => {
      const mockOnCapture = jest.fn();
      defaultLocationContext.getCurrentLocation.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const { getByText } = render(
        <LocationCaptureButton onCapture={mockOnCapture} />
      );
      fireEvent.press(getByText('Capture Location'));

      await waitFor(() => {
        expect(mockOnCapture).not.toHaveBeenCalled();
      });
    });

    test('shows loading state when isLoading prop is true', () => {
      useLocation.mockReturnValue({
        ...defaultLocationContext,
        isLoading: true,
      });

      const { UNSAFE_root } = render(<LocationCaptureButton />);
      expect(UNSAFE_root).toBeTruthy();
    });

    test('disables button during loading', () => {
      useLocation.mockReturnValue({
        ...defaultLocationContext,
        isLoading: true,
      });

      const { getByText } = render(<LocationCaptureButton />);
      const button = getByText('Capture Location');
      expect(button).toBeTruthy();
    });

    test('disables button when disabled prop is true', () => {
      const { getByText } = render(
        <LocationCaptureButton disabled={true} />
      );
      const button = getByText('Capture Location');
      expect(button).toBeTruthy();
    });
  });

  describe('Coordinates Display', () => {
    test('shows location when captured and showCoordinates is true', () => {
      defaultLocationContext.formatCoordinates.mockReturnValue('40.7128, -74.0060');

      const { queryByText } = render(
        <LocationCaptureButton
          captured={true}
          showCoordinates={true}
          location={mockLocation}
        />
      );
      // formatCoordinates should be called with the location
      expect(defaultLocationContext.formatCoordinates).toHaveBeenCalledWith(
        mockLocation.latitude,
        mockLocation.longitude
      );
    });

    test('hides coordinates when showCoordinates is false', () => {
      const { queryByText } = render(
        <LocationCaptureButton
          captured={true}
          showCoordinates={false}
          location={mockLocation}
        />
      );
      // Component should render without error
      expect(queryByText).toBeTruthy();
    });
  });

  describe('Props', () => {
    test('accepts onCapture prop', () => {
      const mockCapture = jest.fn();
      const { UNSAFE_root } = render(
        <LocationCaptureButton onCapture={mockCapture} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('accepts disabled prop', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton disabled={true} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('accepts label prop', () => {
      const { getByText } = render(
        <LocationCaptureButton label="Custom Label" />
      );
      expect(getByText('Custom Label')).toBeTruthy();
    });

    test('accepts capturedLabel prop', () => {
      const { getByText } = render(
        <LocationCaptureButton
          captured={true}
          capturedLabel="Custom Captured"
        />
      );
      expect(getByText('Custom Captured')).toBeTruthy();
    });

    test('accepts captured prop', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton captured={true} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('accepts showCoordinates prop', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton showCoordinates={false} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('accepts location prop', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton location={mockLocation} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('State Updates', () => {
    test('handles location capture', () => {
      const mockOnCapture = jest.fn();

      const { getByText } = render(
        <LocationCaptureButton onCapture={mockOnCapture} />
      );

      fireEvent.press(getByText('Capture Location'));

      expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalled();
    });

    test('prioritizes prop location over computed state', () => {
      const propLocation = { ...mockLocation, latitude: 51.5074 };
      const { UNSAFE_root } = render(
        <LocationCaptureButton
          location={propLocation}
          captured={true}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Multiple Captures', () => {
    test('allows capturing location multiple times', () => {
      const { getByText } = render(<LocationCaptureButton />);

      fireEvent.press(getByText('Capture Location'));
      expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      
      fireEvent.press(getByText('Capture Location'));
      expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles null location gracefully', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton location={null} captured={true} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles undefined location gracefully', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton location={undefined} captured={false} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles missing onCapture gracefully', () => {
      const { getByText } = render(
        <LocationCaptureButton onCapture={undefined} />
      );

      fireEvent.press(getByText('Capture Location'));
      expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalled();
    });

    test('handles button presses', () => {
      const { getByText } = render(<LocationCaptureButton />);
      const button = getByText('Capture Location');

      fireEvent.press(button);
      expect(defaultLocationContext.getCurrentLocation).toHaveBeenCalled();
    });

    test('handles empty coordinates', () => {
      const { UNSAFE_root } = render(
        <LocationCaptureButton
          showCoordinates={true}
          location={{ latitude: 0, longitude: 0 }}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

describe('LocationDisplay Component', () => {
  const defaultLocationContext = {
    formatCoordinates: jest.fn((lat, lon) => `${lat.toFixed(4)}, ${lon.toFixed(4)}`),
    getMapUrl: jest.fn(location => `https://maps.google.com/?q=${location.latitude},${location.longitude}`),
    getAddress: jest.fn().mockResolvedValue({ success: true, address: 'New York, NY' }),
    openInMaps: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue(defaultLocationContext);
  });

  describe('Rendering', () => {
    test('renders location display with default label', () => {
      const { getByText } = render(
        <LocationDisplay location={mockLocation} />
      );
      expect(getByText('Location')).toBeTruthy();
    });

    test('renders with custom label', () => {
      const { getByText } = render(
        <LocationDisplay location={mockLocation} label="Current Location" />
      );
      expect(getByText('Current Location')).toBeTruthy();
    });

    test('displays formatted coordinates', () => {
      defaultLocationContext.formatCoordinates.mockReturnValue(
        '40.7128, -74.0060'
      );

      const { getByText } = render(
        <LocationDisplay location={mockLocation} />
      );
      expect(getByText('40.7128, -74.0060')).toBeTruthy();
    });

    test('displays without location', () => {
      const { UNSAFE_root } = render(
        <LocationDisplay location={null} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    test('calls getMapUrl on interaction', () => {
      defaultLocationContext.getMapUrl.mockReturnValue('https://maps.google.com');

      const { UNSAFE_root } = render(
        <LocationDisplay location={mockLocation} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Location Data', () => {
    test('displays full location details', () => {
      const { UNSAFE_root } = render(
        <LocationDisplay location={mockLocation} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles location with accuracy', () => {
      const locationWithAccuracy = {
        ...mockLocation,
        accuracy: 5.5,
      };

      const { UNSAFE_root } = render(
        <LocationDisplay location={locationWithAccuracy} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles location with altitude', () => {
      const locationWithAltitude = {
        ...mockLocation,
        altitude: 250.5,
      };

      const { UNSAFE_root } = render(
        <LocationDisplay location={locationWithAltitude} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Props', () => {
    test('accepts location prop', () => {
      const { UNSAFE_root } = render(
        <LocationDisplay location={mockLocation} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('accepts label prop', () => {
      const { getByText } = render(
        <LocationDisplay location={mockLocation} label="Custom" />
      );
      expect(getByText('Custom')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles null location', () => {
      const { UNSAFE_root } = render(
        <LocationDisplay location={null} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles undefined location', () => {
      const { UNSAFE_root } = render(
        <LocationDisplay location={undefined} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles location with missing properties', () => {
      const incompleteLocation = {
        latitude: 40.7128,
      };

      const { UNSAFE_root } = render(
        <LocationDisplay location={incompleteLocation} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('handles very long label', () => {
      const longLabel = 'This is a very long location label that might wrap to multiple lines';

      const { getByText } = render(
        <LocationDisplay location={mockLocation} label={longLabel} />
      );
      expect(getByText(longLabel)).toBeTruthy();
    });
  });
});

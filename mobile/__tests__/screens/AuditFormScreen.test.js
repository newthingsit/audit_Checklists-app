import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLocation } from '../../src/context/LocationContext';
import { useNetwork } from '../../src/context/NetworkContext';
import AuditFormScreen from '../../src/screens/AuditFormScreen';

jest.mock('axios');
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => callback()),
}));
jest.mock('../../src/context/LocationContext', () => ({
  useLocation: jest.fn(),
}));
jest.mock('../../src/context/NetworkContext', () => ({
  useNetwork: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('mock-token'),
  setItemAsync: jest.fn().mockResolvedValue(),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

describe('AuditFormScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };

  const mockRoute = {
    params: {
      templateId: 1,
      scheduledAuditId: null,
      locationId: 101,
    },
  };

  const mockTemplate = {
    id: 1,
    name: 'Safety Audit',
    ui_version: 1,
    category_by: null,
  };

  const mockItems = [
    {
      id: 1,
      title: 'Check fire extinguisher',
      field_type: 'yes_no',
      category: 'Fire Safety',
      is_required: false,
      order_index: 1,
      status: 'pending',
    },
    {
      id: 2,
      title: 'Inspect emergency exits',
      field_type: 'yes_no',
      category: 'Fire Safety',
      is_required: false,
      order_index: 2,
      status: 'pending',
    },
  ];

  const mockLocationContext = {
    getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 40.7128, longitude: -74.006 }),
    permissionGranted: true,
    settings: { enabled: true },
    calculateDistance: jest.fn().mockReturnValue(50),
  };

  const checklistResponse = {
    data: {
      template: mockTemplate,
      items: mockItems,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    useRoute.mockReturnValue(mockRoute);
    useNavigation.mockReturnValue(mockNavigation);
    useFocusEffect.mockImplementation((callback) => callback());
    useLocation.mockReturnValue(mockLocationContext);
    useNetwork.mockReturnValue({ isOnline: true });

    axios.get.mockImplementation((url) => {
      if (url.includes('/checklists/1')) {
        return Promise.resolve(checklistResponse);
      }
      if (url.includes('/locations')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockResolvedValue({ data: { audit: { id: 123, status: 'draft' } } });
    axios.put.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    render(<AuditFormScreen />);
    expect(screen.getByText('Loading audit...')).toBeTruthy();
  });

  it('fetches checklist data from current endpoint', async () => {
    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/checklists/1'),
        expect.any(Object)
      );
    });
  });

  it('renders outlet and location verification step after checklist loads', async () => {
    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(screen.getByText('OUTLET (Required)')).toBeTruthy();
      expect(screen.getByText('Capture Your Location')).toBeTruthy();
    });
  });

  it('keeps checklist gated until location is verified', async () => {
    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(screen.getByText('Continue to Checklist')).toBeTruthy();
      expect(screen.getByText('Location is verified before starting the checklist.')).toBeTruthy();
    });
  });

  it('shows fallback error UI for invalid checklist payload', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/checklists/1')) {
        return Promise.resolve({ data: { template: null, items: [] } });
      }
      if (url.includes('/locations')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  it('navigates back in offline mode with no data', async () => {
    useNetwork.mockReturnValue({ isOnline: false });
    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'No Internet Connection',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  it('executes retry action from error screen', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/checklists/1')) {
        return Promise.resolve({ data: { template: null, items: [] } });
      }
      if (url.includes('/locations')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    render(<AuditFormScreen />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      const checklistCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/checklists/1'));
      expect(checklistCalls.length).toBeGreaterThan(1);
    });
  });
});
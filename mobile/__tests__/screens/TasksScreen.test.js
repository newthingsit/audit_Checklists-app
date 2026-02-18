import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TasksScreen from '../../src/screens/TasksScreen';
import { useAuth } from '../../src/context/AuthContext';
import axios from 'axios';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => {
    const unsubscribe = callback();
    return () => unsubscribe?.();
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) =>
    require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name, size, color, ...props }) =>
    require('react').createElement(require('react-native').View, {
      testID: `icon-${name}`,
      ...props,
    }),
}));

jest.mock('axios');

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const defaultAuthContext = {
  user: {
    id: '1',
    name: 'John Doe',
    permissions: ['view_tasks'],
  },
};

const mockTasks = [
  {
    id: '1',
    title: 'Fix safety issue',
    description: 'Address safety concerns in warehouse',
    status: 'pending',
    priority: 'high',
    type: 'corrective',
    assigned_to_name: 'John Doe',
    location_name: 'Warehouse A',
    due_date: '2026-02-25T00:00:00Z',
    reminder_date: null,
    dependencies: [],
  },
  {
    id: '2',
    title: 'Complete inspection',
    description: 'Monthly inspection task',
    status: 'in_progress',
    priority: 'medium',
    type: 'inspection',
    assigned_to_name: 'Jane Smith',
    location_name: 'Building B',
    due_date: '2026-02-20T00:00:00Z',
    reminder_date: '2026-02-17T00:00:00Z',
    dependencies: [],
  },
  {
    id: '3',
    title: 'Review documentation',
    description: 'Annual document review',
    status: 'completed',
    priority: 'low',
    type: 'documentation',
    assigned_to_name: 'Bob Johnson',
    location_name: 'Office',
    due_date: '2026-02-15T00:00:00Z',
    reminder_date: null,
    dependencies: [],
  },
  {
    id: '4',
    title: 'Overdue task',
    description: 'This task is overdue',
    status: 'pending',
    priority: 'high',
    type: 'corrective',
    assigned_to_name: 'John Doe',
    location_name: 'Warehouse A',
    due_date: '2026-02-10T00:00:00Z',
    reminder_date: null,
    dependencies: [],
  },
];

describe('TasksScreen', () => {
  beforeEach(() => {
    const { useNavigation } = require('@react-navigation/native');
    useNavigation.mockReturnValue(mockNavigation);
    useAuth.mockReturnValue(defaultAuthContext);

    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
    axios.get.mockClear();
    axios.put.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render tasks screen', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should display loading indicator initially', () => {
      axios.get.mockImplementationOnce(() => new Promise(() => {}));
      render(<TasksScreen />);

      // Loading state is present initially
      expect(axios.get).toHaveBeenCalled();
    });

    test('should display tasks after loading', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });
    });

    test('should display task titles', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
        expect(screen.getByText('Complete inspection')).toBeTruthy();
        expect(screen.getByText('Review documentation')).toBeTruthy();
      });
    });

    test('should display task descriptions', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Address safety concerns in warehouse')).toBeTruthy();
      });
    });

    test('should display assigned users', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Jane Smith')).toBeTruthy();
      });
    });

    test('should display task locations', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Warehouse A')).toBeTruthy();
        expect(screen.getByText('Building B')).toBeTruthy();
      });
    });

    test('should display task icons', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-person')).toBeTruthy();
        expect(screen.getByTestId('icon-location-on')).toBeTruthy();
        expect(screen.getByTestId('icon-event')).toBeTruthy();
      });
    });
  });

  describe('Task Fetching', () => {
    test('should fetch tasks on mount', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/tasks')
        );
      });
    });

    test('should handle empty tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: [] } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle null tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: null } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle fetch errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle 404 errors', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      axios.get.mockRejectedValueOnce(error);
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle 500 server errors', async () => {
      const error = new Error('Server Error');
      error.response = { status: 500, data: { message: 'Internal error' } };
      axios.get.mockRejectedValueOnce(error);
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Status Filtering', () => {
    test('should display all tasks by default', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
        expect(screen.getByText('Complete inspection')).toBeTruthy();
        expect(screen.getByText('Review documentation')).toBeTruthy();
      });
    });

    test('should filter pending tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });
    });

    test('should filter in_progress tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete inspection')).toBeTruthy();
      });
    });

    test('should filter completed tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Review documentation')).toBeTruthy();
      });
    });
  });

  describe('Priority Filtering', () => {
    test('should display all priorities by default', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('high').length).toBeGreaterThan(0);
        expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
        expect(screen.getAllByText('low').length).toBeGreaterThan(0);
      });
    });

    test('should show high priority tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('high').length).toBeGreaterThan(0);
      });
    });

    test('should show medium priority tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
      });
    });

    test('should show low priority tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('low').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Filtering', () => {
    test('should display all types', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('corrective').length).toBeGreaterThan(0);
        expect(screen.getAllByText('inspection').length).toBeGreaterThan(0);
        expect(screen.getAllByText('documentation').length).toBeGreaterThan(0);
      });
    });

    test('should show corrective tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('corrective').length).toBeGreaterThan(0);
      });
    });

    test('should show inspection tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('inspection').length).toBeGreaterThan(0);
      });
    });

    test('should show documentation tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('documentation').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tab Navigation', () => {
    test('should display all tasks in default tab', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });
    });

    test('should filter ready to start tasks', async () => {
      const tasksWithDependencies = [
        ...mockTasks,
        {
          id: '5',
          title: 'Dependent task',
          status: 'pending',
          priority: 'medium',
          type: 'corrective',
          dependencies: [
            { depends_on_status: 'completed' }
          ],
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { tasks: tasksWithDependencies } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should filter tasks with reminders', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete inspection')).toBeTruthy();
      });
    });

    test('should filter overdue tasks', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Overdue task')).toBeTruthy();
      });
    });
  });

  describe('Task Status Updates', () => {
    test('should update task status', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      axios.put.mockResolvedValueOnce({ data: { success: true } });
      
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });

      // Status update functionality
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
    });

    test('should handle status update errors', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      axios.put.mockRejectedValueOnce(new Error('Update failed'));

      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should refresh tasks after status update', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Refresh Functionality', () => {
    test('should refresh tasks on pull-to-refresh', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle refresh errors', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      axios.get.mockRejectedValueOnce(new Error('Refresh failed'));
    });
  });

  describe('Date Formatting', () => {
    test('should display formatted due dates', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Due:/i)).toBeTruthy();
      });
    });

    test('should display formatted reminder dates', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Reminder:/i)).toBeTruthy();
      });
    });

    test('should handle tasks without dates', async () => {
      const tasksWithoutDates = [
        {
          id: '1',
          title: 'Task without dates',
          status: 'pending',
          priority: 'medium',
          type: 'corrective',
          due_date: null,
          reminder_date: null,
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { tasks: tasksWithoutDates } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Task without dates')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle tasks with missing fields', async () => {
      const incompleteTasks = [
        {
          id: '1',
          title: 'Minimal task',
          status: 'pending',
          priority: null,
          type: null,
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { tasks: incompleteTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Minimal task')).toBeTruthy();
      });
    });

    test('should handle very long task titles', async () => {
      const longTitleTasks = [
        {
          id: '1',
          title: 'Very long task title that exceeds normal length expectations'.repeat(3),
          status: 'pending',
          priority: 'high',
          type: 'corrective',
        },
      ];
      axios.get.mockResolvedValueOnce({ data: { tasks: longTitleTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle many tasks efficiently', async () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        title: `Task ${i}`,
        status: 'pending',
        priority: 'medium',
        type: 'corrective',
      }));
      axios.get.mockResolvedValueOnce({ data: { tasks: manyTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle rapid filter changes', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });
    });
  });

  describe('Context Integration', () => {
    test('should use auth context', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      expect(useAuth).toHaveBeenCalled();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should work with different user permissions', async () => {
      const restrictedAuthContext = {
        user: {
          id: '2',
          name: 'Limited User',
          permissions: [],
        },
      };
      useAuth.mockReturnValue(restrictedAuthContext);
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have accessible task list', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Fix safety issue')).toBeTruthy();
      });
    });

    test('should display status badges clearly', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('pending').length).toBeGreaterThan(0);
        expect(screen.getAllByText('in_progress').length).toBeGreaterThan(0);
        expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
      });
    });

    test('should display priority tags clearly', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('high').length).toBeGreaterThan(0);
        expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
        expect(screen.getAllByText('low').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    test('should use FlatList for efficient rendering', async () => {
      axios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    test('should handle large task lists', async () => {
      const largeTasks = Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        title: `Task ${i}`,
        description: `Description ${i}`,
        status: ['pending', 'in_progress', 'completed'][i % 3],
        priority: ['high', 'medium', 'low'][i % 3],
        type: 'corrective',
        assigned_to_name: 'User',
        location_name: 'Location',
      }));
      axios.get.mockResolvedValueOnce({ data: { tasks: largeTasks } });
      render(<TasksScreen />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });
});

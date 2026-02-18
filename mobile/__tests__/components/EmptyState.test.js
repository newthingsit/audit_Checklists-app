import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import EmptyState, {
  NoAudits,
  NoTemplates,
  NoTasks,
  NoScheduledAudits,
  NoSearchResults,
  NoHistory,
} from '../../src/components/EmptyState';
import * as themeConfig from '../../src/config/theme';

// Mock theme config
jest.mock('../../src/config/theme', () => ({
  themeConfig: {
    primary: { main: '#3B82F6' },
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    warning: {
      main: '#F59E0B',
      dark: '#92400E',
      light: '#FEF3C7',
      bg: '#FFFBEB',
    },
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
    },
    shadows: {
      small: {},
    },
    dashboardCards: {
      card1: ['#3B82F6', '#8B5CF6'],
    },
  },
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => {
  const { View: RNView } = require('react-native');
  const React = require('react');
  return {
    MaterialIcons: ({ name, size, color }) =>
      React.createElement(RNView, { testID: `icon-${name}` }),
  };
});

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children, colors }) =>
      React.createElement(RNView, {}, children),
  };
});

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    test('renders with default type', () => {
      const { getByText } = render(<EmptyState />);
      expect(getByText('Nothing Here')).toBeTruthy();
    });

    test('renders custom title', () => {
      const { getByText } = render(
        <EmptyState title="Custom Title" description="Custom desc" />
      );
      expect(getByText('Custom Title')).toBeTruthy();
    });

    test('renders custom description', () => {
      const { getByText } = render(
        <EmptyState title="Title" description="Custom Description" />
      );
      expect(getByText('Custom Description')).toBeTruthy();
    });

    test('renders icon with correct testID', () => {
      const { getByTestId } = render(
        <EmptyState icon="custom-icon" title="Title" description="Desc" />
      );
      expect(getByTestId('icon-custom-icon')).toBeTruthy();
    });

    test('renders default icon when not custom', () => {
      const { getByTestId } = render(
        <EmptyState type="default" description="Desc" />
      );
      expect(getByTestId('icon-inbox')).toBeTruthy();
    });
  });

  describe('Empty State Types', () => {
    test('audits type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="audits" description="" />
      );
      expect(getByText('No Audits Yet')).toBeTruthy();
      expect(getByTestId('icon-assignment')).toBeTruthy();
    });

    test('templates type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="templates" description="" />
      );
      expect(getByText('No Templates Available')).toBeTruthy();
      expect(getByTestId('icon-checklist')).toBeTruthy();
    });

    test('tasks type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="tasks" description="" />
      );
      expect(getByText('No Tasks Found')).toBeTruthy();
      expect(getByTestId('icon-task-alt')).toBeTruthy();
    });

    test('scheduled type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="scheduled" description="" />
      );
      expect(getByText('No Scheduled Audits')).toBeTruthy();
      expect(getByTestId('icon-schedule')).toBeTruthy();
    });

    test('search type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="search" description="" />
      );
      expect(getByText('No Results Found')).toBeTruthy();
      expect(getByTestId('icon-search-off')).toBeTruthy();
    });

    test('history type renders correct content', () => {
      const { getByText, getByTestId } = render(
        <EmptyState type="history" description="" />
      );
      expect(getByText('No History')).toBeTruthy();
      expect(getByTestId('icon-history')).toBeTruthy();
    });
  });

  describe('Action Button', () => {
    test('renders action button when showAction is true and actionLabel provided', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Create Item"
          onAction={mockAction}
          showAction={true}
        />
      );
      expect(getByText('Create Item')).toBeTruthy();
    });

    test('does not render action button when showAction is false', () => {
      const { queryByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Create Item"
          showAction={false}
        />
      );
      expect(queryByText('Create Item')).toBeFalsy();
    });

    test('does not render action button without actionLabel', () => {
      const { queryByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          showAction={true}
        />
      );
      expect(queryByText('Create Item')).toBeFalsy();
    });

    test('does not render action button without onAction handler', () => {
      const { queryByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Create Item"
          showAction={true}
          onAction={undefined}
        />
      );
      expect(queryByText('Create Item')).toBeFalsy();
    });

    test('calls onAction when button is pressed', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Create Item"
          onAction={mockAction}
          showAction={true}
        />
      );
      
      fireEvent.press(getByText('Create Item'));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    test('action button includes add icon', () => {
      const mockAction = jest.fn();
      const { getByTestId } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Create Item"
          onAction={mockAction}
          showAction={true}
        />
      );
      expect(getByTestId('icon-add')).toBeTruthy();
    });
  });

  describe('Custom Overrides', () => {
    test('custom title overrides type title', () => {
      const { getByText, queryByText } = render(
        <EmptyState
          type="audits"
          title="Override Title"
          description="Desc"
        />
      );
      expect(getByText('Override Title')).toBeTruthy();
      expect(queryByText('No Audits Yet')).toBeFalsy();
    });

    test('custom icon overrides type icon', () => {
      const { getByTestId, queryByTestId } = render(
        <EmptyState
          type="audits"
          icon="custom-icon"
          title="Title"
          description="Desc"
        />
      );
      expect(getByTestId('icon-custom-icon')).toBeTruthy();
      expect(queryByTestId('icon-assignment')).toBeFalsy();
    });

    test('custom description overrides type description', () => {
      const { getByText, queryByText } = render(
        <EmptyState
          type="audits"
          title="Title"
          description="Custom description"
        />
      );
      expect(getByText('Custom description')).toBeTruthy();
      expect(queryByText('Start your first audit to see it here')).toBeFalsy();
    });

    test('all custom overrides together', () => {
      const mockAction = jest.fn();
      const { getByText, getByTestId } = render(
        <EmptyState
          type="audits"
          icon="star"
          title="Fully Custom"
          description="Completely overridden"
          actionLabel="Do Something"
          onAction={mockAction}
          showAction={true}
        />
      );
      expect(getByText('Fully Custom')).toBeTruthy();
      expect(getByText('Completely overridden')).toBeTruthy();
      expect(getByText('Do Something')).toBeTruthy();
      expect(getByTestId('icon-star')).toBeTruthy();
    });
  });

  describe('Preset Components', () => {
    test('NoAudits renders with correct props', () => {
      const mockAction = jest.fn();
      const { getByText } = render(<NoAudits onAction={mockAction} />);
      expect(getByText('No Audits Yet')).toBeTruthy();
      expect(getByText('Create First Audit')).toBeTruthy();
    });

    test('NoAudits calls onAction when button pressed', () => {
      const mockAction = jest.fn();
      const { getByText } = render(<NoAudits onAction={mockAction} />);
      fireEvent.press(getByText('Create First Audit'));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    test('NoTemplates renders with correct props', () => {
      const mockAction = jest.fn();
      const { getByText } = render(<NoTemplates onAction={mockAction} />);
      expect(getByText('No Templates Available')).toBeTruthy();
      expect(getByText('Browse Templates')).toBeTruthy();
    });

    test('NoTasks renders without action button', () => {
      const { getByText, queryByText } = render(<NoTasks />);
      expect(getByText('No Tasks Found')).toBeTruthy();
      expect(queryByText('Do something')).toBeFalsy();
    });

    test('NoScheduledAudits renders with correct props', () => {
      const mockAction = jest.fn();
      const { getByText } = render(<NoScheduledAudits onAction={mockAction} />);
      expect(getByText('No Scheduled Audits')).toBeTruthy();
      expect(getByText('Schedule Audit')).toBeTruthy();
    });

    test('NoSearchResults renders with default message', () => {
      const { getByText } = render(<NoSearchResults />);
      expect(getByText('No Results Found')).toBeTruthy();
      expect(getByText(/Try a different search term/)).toBeTruthy();
    });

    test('NoSearchResults renders with query in description', () => {
      const { getByText } = render(<NoSearchResults query="test" />);
      expect(getByText(/No results for "test"/)).toBeTruthy();
    });

    test('NoHistory renders without action button', () => {
      const { getByText, queryByText } = render(<NoHistory />);
      expect(getByText('No History')).toBeTruthy();
      expect(queryByText(/Do something/)).toBeFalsy();
    });
  });

  describe('Styling and Layout', () => {
    test('applies correct container styles', () => {
      const { UNSAFE_root } = render(
        <EmptyState title="Title" description="Desc" />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    test('renders icon container', () => {
      const { getByTestId } = render(
        <EmptyState icon="test-icon" title="Title" description="Desc" />
      );
      expect(getByTestId('icon-test-icon')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty title string', () => {
      const { getByText } = render(
        <EmptyState icon="icon" title="" description="Description" />
      );
      // Should still render description
      expect(getByText('Description')).toBeTruthy();
    });

    test('handles empty description string', () => {
      const { getByText } = render(
        <EmptyState icon="icon" title="Title" description="" />
      );
      // Should still render title
      expect(getByText('Title')).toBeTruthy();
    });

    test('handles very long title', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines';
      const { getByText } = render(
        <EmptyState title={longTitle} description="Desc" />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    test('handles very long description', () => {
      const longDesc = 'This is a very long description that might wrap to multiple lines and should still render correctly without any issues';
      const { getByText } = render(
        <EmptyState title="Title" description={longDesc} />
      );
      expect(getByText(longDesc)).toBeTruthy();
    });

    test('handles multiple rapid action button presses', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Action"
          onAction={mockAction}
          showAction={true}
        />
      );

      const button = getByText('Action');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockAction).toHaveBeenCalledTimes(3);
    });

    test('handles null onAction gracefully', () => {
      const { getByText } = render(
        <EmptyState
          title="Title"
          description="Desc"
          actionLabel="Action"
          onAction={null}
          showAction={true}
        />
      );
      // Should not render button without valid onAction
      expect(() => getByText('Action')).toThrow();
    });

    test('handles undefined type defaults to default', () => {
      const { getByText } = render(
        <EmptyState type={undefined} title="Title" description="Desc" />
      );
      expect(getByText('Title')).toBeTruthy();
    });

    test('handles unknown type defaults to default config', () => {
      const { getByTestId } = render(
        <EmptyState type="unknown_type" title="Title" description="Desc" />
      );
      // Should use default icon
      expect(getByTestId('icon-inbox')).toBeTruthy();
    });
  });

  describe('Content Variations', () => {
    test('renders correctly with all customizations', () => {
      const mockAction = jest.fn();
      const { getByText, getByTestId } = render(
        <EmptyState
          type="custom"
          icon="star"
          title="Custom Title"
          description="Custom description with more details"
          actionLabel="Take Action"
          onAction={mockAction}
          showAction={true}
        />
      );

      expect(getByText('Custom Title')).toBeTruthy();
      expect(getByText('Custom description with more details')).toBeTruthy();
      expect(getByText('Take Action')).toBeTruthy();
      expect(getByTestId('icon-star')).toBeTruthy();
    });

    test('renders as view-only with showAction=false', () => {
      const { getByText, queryByText } = render(
        <EmptyState
          title="View Only"
          description="This is view only"
          actionLabel="Action"
          showAction={false}
        />
      );

      expect(getByText('View Only')).toBeTruthy();
      expect(queryByText('Action')).toBeFalsy();
    });

    test('renders different presets successfully', () => {
      const { rerender, getByText } = render(<NoAudits onAction={jest.fn()} />);
      expect(getByText('No Audits Yet')).toBeTruthy();

      rerender(<NoTasks />);
      expect(getByText('No Tasks Found')).toBeTruthy();

      rerender(<NoHistory />);
      expect(getByText('No History')).toBeTruthy();
    });
  });
});

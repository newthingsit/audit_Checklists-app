import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { themeConfig } from '../../config/theme';

const icons = {
  inbox: InboxIcon,
  search: SearchOffIcon,
  error: ErrorOutlineIcon,
  audit: AssignmentIcon,
  history: HistoryIcon,
  store: StoreIcon,
  users: PeopleIcon,
  analytics: AnalyticsIcon,
};

const EmptyState = ({
  icon = 'inbox',
  title = 'No data found',
  description = 'There is nothing to display here yet.',
  actionLabel,
  onAction,
  actionIcon,
  variant = 'default', // 'default', 'search', 'error'
}) => {
  const IconComponent = icons[icon] || InboxIcon;
  
  const getIconBg = () => {
    switch (variant) {
      case 'search':
        return themeConfig.info.bg;
      case 'error':
        return themeConfig.error.bg;
      default:
        return themeConfig.border.light;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'search':
        return themeConfig.info.main;
      case 'error':
        return themeConfig.error.main;
      default:
        return themeConfig.text.secondary;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease-out',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: getIconBg(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          transition: themeConfig.transitions.normal,
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        <IconComponent 
          sx={{ 
            fontSize: 48, 
            color: getIconColor(),
            opacity: 0.8,
          }} 
        />
      </Box>
      
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600, 
          color: themeConfig.text.primary,
          mb: 1,
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body2" 
        sx={{ 
          color: themeConfig.text.secondary,
          maxWidth: 400,
          mb: actionLabel ? 3 : 0,
        }}
      >
        {description}
      </Typography>
      
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          startIcon={actionIcon}
          sx={{
            borderRadius: themeConfig.borderRadius.medium,
            textTransform: 'none',
            px: 3,
            py: 1,
            background: themeConfig.dashboardCards.card1,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: themeConfig.shadows.medium,
              transform: 'translateY(-2px)',
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

// Preset empty states
export const NoAuditsState = ({ onAction }) => (
  <EmptyState
    icon="audit"
    title="No audits yet"
    description="Start your first audit to see it appear here. Track your quality checks and compliance."
    actionLabel="Create First Audit"
    onAction={onAction}
  />
);

export const NoSearchResultsState = ({ searchTerm }) => (
  <EmptyState
    icon="search"
    variant="search"
    title="No results found"
    description={`We couldn't find anything matching "${searchTerm}". Try different keywords or filters.`}
  />
);

export const NoStoresState = ({ onAction }) => (
  <EmptyState
    icon="store"
    title="No stores added"
    description="Add your first store to start managing locations and conducting audits."
    actionLabel="Add Store"
    onAction={onAction}
  />
);

export const NoUsersState = ({ onAction }) => (
  <EmptyState
    icon="users"
    title="No users found"
    description="Invite team members to collaborate on audits and quality management."
    actionLabel="Add User"
    onAction={onAction}
  />
);

export const NoDataState = () => (
  <EmptyState
    icon="analytics"
    title="No data available"
    description="Complete some audits to see analytics and insights here."
  />
);

export default EmptyState;


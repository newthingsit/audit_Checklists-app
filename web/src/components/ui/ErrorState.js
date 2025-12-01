import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import { themeConfig } from '../../config/theme';

const ErrorState = ({
  type = 'generic', // 'generic', 'network', 'auth', '404', '500'
  title,
  description,
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = false,
}) => {
  const errorConfigs = {
    generic: {
      icon: ErrorOutlineIcon,
      defaultTitle: 'Something went wrong',
      defaultDescription: 'An unexpected error occurred. Please try again.',
      color: themeConfig.error.main,
      bgColor: themeConfig.error.bg,
    },
    network: {
      icon: WifiOffIcon,
      defaultTitle: 'Connection error',
      defaultDescription: 'Unable to connect to the server. Check your internet connection and try again.',
      color: themeConfig.warning.main,
      bgColor: themeConfig.warning.bg,
    },
    auth: {
      icon: LockIcon,
      defaultTitle: 'Access denied',
      defaultDescription: "You don't have permission to view this content.",
      color: themeConfig.error.main,
      bgColor: themeConfig.error.bg,
    },
    '404': {
      icon: ErrorOutlineIcon,
      defaultTitle: 'Page not found',
      defaultDescription: "The page you're looking for doesn't exist or has been moved.",
      color: themeConfig.info.main,
      bgColor: themeConfig.info.bg,
    },
    '500': {
      icon: ErrorOutlineIcon,
      defaultTitle: 'Server error',
      defaultDescription: 'Our servers are having trouble. Please try again later.',
      color: themeConfig.error.main,
      bgColor: themeConfig.error.bg,
    },
  };

  const config = errorConfigs[type] || errorConfigs.generic;
  const IconComponent = config.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        py: 8,
        px: 3,
        textAlign: 'center',
        animation: 'shake 0.5s ease-out, fadeIn 0.3s ease-out',
        '@keyframes shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: themeConfig.borderRadius.xl,
          background: 'white',
          border: `1px solid ${themeConfig.border.light}`,
          maxWidth: 450,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <IconComponent 
            sx={{ 
              fontSize: 40, 
              color: config.color,
            }} 
          />
        </Box>

        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            color: themeConfig.text.primary,
            mb: 1.5,
          }}
        >
          {title || config.defaultTitle}
        </Typography>

        <Typography 
          variant="body1" 
          sx={{ 
            color: themeConfig.text.secondary,
            mb: 4,
            lineHeight: 1.6,
          }}
        >
          {description || config.defaultDescription}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {showRetry && onRetry && (
            <Button
              variant="contained"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: themeConfig.borderRadius.medium,
                textTransform: 'none',
                px: 3,
                py: 1,
                background: themeConfig.dashboardCards.card1,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: themeConfig.shadows.medium,
                },
              }}
            >
              Try Again
            </Button>
          )}
          
          {showHome && onGoHome && (
            <Button
              variant="outlined"
              onClick={onGoHome}
              startIcon={<HomeIcon />}
              sx={{
                borderRadius: themeConfig.borderRadius.medium,
                textTransform: 'none',
                px: 3,
                py: 1,
                borderColor: themeConfig.border.dark,
                color: themeConfig.text.secondary,
                '&:hover': {
                  borderColor: themeConfig.primary.main,
                  color: themeConfig.primary.main,
                },
              }}
            >
              Go Home
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

// Preset error states
export const NetworkError = ({ onRetry }) => (
  <ErrorState type="network" onRetry={onRetry} />
);

export const AuthError = ({ onGoHome }) => (
  <ErrorState type="auth" showRetry={false} showHome onGoHome={onGoHome} />
);

export const NotFoundError = ({ onGoHome }) => (
  <ErrorState type="404" showRetry={false} showHome onGoHome={onGoHome} />
);

export const ServerError = ({ onRetry }) => (
  <ErrorState type="500" onRetry={onRetry} />
);

export default ErrorState;


import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider as CustomThemeProvider, useThemeMode } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import PermissionRoute from './components/PermissionRoute';
import Toast from './components/Toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Checklists from './pages/Checklists';
import AuditForm from './pages/AuditForm';
import AuditDetail from './pages/AuditDetail';
import AuditHistory from './pages/AuditHistory';
import Analytics from './pages/Analytics';
// import ActionPlans from './pages/ActionPlans'; // Feature disabled
import Stores from './pages/Stores';
import ScheduledAudits from './pages/ScheduledAudits';
// import Tasks from './pages/Tasks'; // Feature disabled
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import MonthlyScorecard from './pages/MonthlyScorecard';
import ScheduledAuditsReport from './pages/ScheduledAuditsReport';
import StoreAnalytics from './pages/StoreAnalytics';
import LocationVerificationReport from './pages/LocationVerificationReport';
import StoreGroups from './pages/StoreGroups';
import { themeConfig } from './config/theme';

const getTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: themeConfig.primary.main,
      light: themeConfig.primary.light,
      dark: themeConfig.primary.dark,
      contrastText: themeConfig.primary.contrast,
    },
    secondary: {
      main: themeConfig.secondary.main,
      light: themeConfig.secondary.light,
      dark: themeConfig.secondary.dark,
    },
    success: {
      main: themeConfig.success.main,
      light: themeConfig.success.light,
      dark: themeConfig.success.dark,
    },
    warning: {
      main: themeConfig.warning.main,
      light: themeConfig.warning.light,
      dark: themeConfig.warning.dark,
    },
    error: {
      main: themeConfig.error.main,
      light: themeConfig.error.light,
      dark: themeConfig.error.dark,
    },
    info: {
      main: themeConfig.info.main,
      light: themeConfig.info.light,
      dark: themeConfig.info.dark,
    },
    background: {
      default: darkMode ? '#0f172a' : themeConfig.background.default,
      paper: darkMode ? '#1e293b' : themeConfig.background.paper,
    },
    text: {
      primary: darkMode ? '#f8fafc' : themeConfig.text.primary,
      secondary: darkMode ? '#94a3b8' : themeConfig.text.secondary,
    },
    divider: darkMode ? 'rgba(255,255,255,0.08)' : themeConfig.border.light,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 500 },
  },
  shape: {
    borderRadius: themeConfig.borderRadius.small,
  },
  shadows: [
    'none',
    themeConfig.shadows.small,
    themeConfig.shadows.small,
    themeConfig.shadows.medium,
    themeConfig.shadows.medium,
    themeConfig.shadows.medium,
    themeConfig.shadows.large,
    themeConfig.shadows.large,
    themeConfig.shadows.large,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
    themeConfig.shadows.xl,
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: themeConfig.shadows.card,
          transition: themeConfig.transitions.normal,
          borderRadius: themeConfig.borderRadius.medium,
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : themeConfig.border.light}`,
          '&:hover': {
            boxShadow: themeConfig.shadows.cardHover,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: themeConfig.borderRadius.small,
          padding: '8px 20px',
          fontWeight: 500,
          transition: themeConfig.transitions.fast,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: themeConfig.shadows.medium,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderColor: darkMode ? 'rgba(255,255,255,0.2)' : themeConfig.border.default,
          '&:hover': {
            borderColor: themeConfig.primary.main,
            backgroundColor: darkMode ? 'rgba(13, 148, 136, 0.08)' : 'rgba(13, 148, 136, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: themeConfig.borderRadius.small,
            transition: themeConfig.transitions.fast,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: themeConfig.primary.light,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: themeConfig.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius.small,
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: themeConfig.borderRadius.medium,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: darkMode ? 'rgba(255,255,255,0.08)' : themeConfig.border.light,
        },
        head: {
          fontWeight: 600,
          backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : themeConfig.background.default,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: themeConfig.borderRadius.large,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: themeConfig.borderRadius.medium,
          boxShadow: themeConfig.shadows.large,
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : themeConfig.border.light}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: themeConfig.borderRadius.small,
          backgroundColor: darkMode ? '#334155' : '#1e293b',
          fontSize: '0.75rem',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius.medium,
        },
        standardSuccess: {
          backgroundColor: themeConfig.success.bg,
          color: themeConfig.success.dark,
        },
        standardError: {
          backgroundColor: themeConfig.error.bg,
          color: themeConfig.error.dark,
        },
        standardWarning: {
          backgroundColor: themeConfig.warning.bg,
          color: themeConfig.warning.dark,
        },
        standardInfo: {
          backgroundColor: themeConfig.info.bg,
          color: themeConfig.info.dark,
        },
      },
    },
  },
});

function AppContent() {
  return (
    <CustomThemeProvider>
      <ThemeWrapper />
    </CustomThemeProvider>
  );
}

function ThemeWrapper() {
  const { darkMode, loading } = useThemeMode();
  const theme = getTheme(darkMode);

  // Show loading state while theme is being determined
  // Use a default light theme for the loading spinner to prevent unmounting
  if (loading) {
    const defaultTheme = getTheme(false); // Use light theme as default
    return (
      <ThemeProvider theme={defaultTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100%',
            backgroundColor: 'background.default'
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/checklists"
              element={
                <PrivateRoute>
                  <Checklists />
                </PrivateRoute>
              }
            />
            <Route
              path="/audit/new/:templateId"
              element={
                <PrivateRoute>
                  <AuditForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/audit/:id"
              element={
                <PrivateRoute>
                  <AuditDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/audits"
              element={
                <PrivateRoute>
                  <AuditHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              }
            />
            <Route
              path="/store-analytics"
              element={
                <PrivateRoute>
                  <StoreAnalytics />
                </PrivateRoute>
              }
            />
            <Route
              path="/location-verification"
              element={
                <PrivateRoute>
                  <LocationVerificationReport />
                </PrivateRoute>
              }
            />
            {/* Action Plans route disabled
            <Route
              path="/actions"
              element={
                <PrivateRoute>
                  <ActionPlans />
                </PrivateRoute>
              }
            />
            */}
            <Route
              path="/stores"
              element={
                <PrivateRoute>
                  <Stores />
                </PrivateRoute>
              }
            />
            <Route path="/locations" element={<Navigate to="/stores" replace />} />
            <Route
              path="/store-groups"
              element={
                <PrivateRoute>
                  <StoreGroups />
                </PrivateRoute>
              }
            />
            <Route
              path="/scheduled"
              element={
                <PrivateRoute>
                  <ScheduledAudits />
                </PrivateRoute>
              }
            />
            {/* Tasks route disabled
            <Route
              path="/tasks"
              element={
                <PrivateRoute>
                  <Tasks />
                </PrivateRoute>
              }
            />
            */}
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/scorecard"
              element={
                <PrivateRoute>
                  <MonthlyScorecard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scheduled-report"
              element={
                <PrivateRoute>
                  <ScheduledAuditsReport />
                </PrivateRoute>
              }
            />
                <Route
                  path="/users"
                  element={
                    <PermissionRoute requiredPermissions={['create_users', 'manage_users', 'view_users']}>
                      <UserManagement />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <AdminRoute>
                      <RoleManagement />
                    </AdminRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
      <Toast />
    </ThemeProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;


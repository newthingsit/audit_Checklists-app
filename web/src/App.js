import React, { Suspense, lazy } from 'react';
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
import { themeConfig } from './config/theme';

// Lazy load all pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Checklists = lazy(() => import('./pages/Checklists'));
const AuditForm = lazy(() => import('./pages/AuditForm'));
const AuditDetail = lazy(() => import('./pages/AuditDetail'));
const AuditReport = lazy(() => import('./pages/AuditReport'));
const AuditHistory = lazy(() => import('./pages/AuditHistory'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Stores = lazy(() => import('./pages/Stores'));
const ScheduledAudits = lazy(() => import('./pages/ScheduledAudits'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const MonthlyScorecard = lazy(() => import('./pages/MonthlyScorecard'));
const ScheduledAuditsReport = lazy(() => import('./pages/ScheduledAuditsReport'));
const StoreAnalytics = lazy(() => import('./pages/StoreAnalytics'));
const DashboardReport = lazy(() => import('./pages/DashboardReport'));
const LocationVerificationReport = lazy(() => import('./pages/LocationVerificationReport'));
const StoreGroups = lazy(() => import('./pages/StoreGroups'));
const RecurringFailures = lazy(() => import('./pages/RecurringFailures'));
const StoreAssignments = lazy(() => import('./pages/StoreAssignments'));
const Tasks = lazy(() => import('./pages/Tasks'));
const ActionPlans = lazy(() => import('./pages/ActionPlans'));

// Loading fallback component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      width: '100%',
    }}
  >
    <CircularProgress size={40} />
  </Box>
);

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
  const theme = React.useMemo(() => getTheme(darkMode), [darkMode]);

  // Show loading state while theme is being determined
  if (loading) {
    const defaultTheme = getTheme(false);
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
          <Suspense fallback={<PageLoader />}>
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
                path="/audit/:id/report"
                element={
                  <PrivateRoute>
                    <AuditReport />
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
                path="/dashboard-report"
                element={
                  <PrivateRoute>
                    <PermissionRoute permissions={['view_analytics']}>
                      <DashboardReport />
                    </PermissionRoute>
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
                path="/recurring-failures"
                element={
                  <PrivateRoute>
                    <RecurringFailures />
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
              <Route
                path="/store-assignments"
                element={
                  <PermissionRoute requiredPermissions={['manage_locations']}>
                    <StoreAssignments />
                  </PermissionRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <PrivateRoute>
                    <PermissionRoute requiredPermissions={['view_tasks', 'manage_tasks']}>
                      <Tasks />
                    </PermissionRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/actions"
                element={
                  <PrivateRoute>
                    <PermissionRoute requiredPermissions={['view_actions', 'create_actions', 'manage_actions']}>
                      <ActionPlans />
                    </PermissionRoute>
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
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

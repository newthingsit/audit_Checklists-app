import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider as CustomThemeProvider, useThemeMode } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Toast from './components/Toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Checklists from './pages/Checklists';
import AuditForm from './pages/AuditForm';
import AuditDetail from './pages/AuditDetail';
import AuditHistory from './pages/AuditHistory';
import Analytics from './pages/Analytics';
import ActionPlans from './pages/ActionPlans';
import Stores from './pages/Stores';
import ScheduledAudits from './pages/ScheduledAudits';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import MonthlyScorecard from './pages/MonthlyScorecard';
import ScheduledAuditsReport from './pages/ScheduledAuditsReport';
import { themeConfig } from './config/theme';

const getTheme = (darkMode) => createTheme({
  palette: {
    mode: 'light', // Always light mode to match screenshot
    primary: {
      main: themeConfig.primary.main,
      light: themeConfig.primary.light,
      dark: themeConfig.primary.dark,
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: themeConfig.background.default,
      paper: themeConfig.background.paper,
    },
    text: {
      primary: themeConfig.text.primary,
      secondary: themeConfig.text.secondary,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 24px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#fff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: themeConfig.borderRadius.medium,
          border: `1px solid ${themeConfig.border.default}`,
        },
      },
    },
  },
});

function AppContent() {
  const theme = getTheme(false); // Always use light theme to match screenshot

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
              path="/actions"
              element={
                <PrivateRoute>
                  <ActionPlans />
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
              path="/scheduled"
              element={
                <PrivateRoute>
                  <ScheduledAudits />
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute>
                  <Tasks />
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
                    <AdminRoute>
                      <UserManagement />
                    </AdminRoute>
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
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
}

export default App;


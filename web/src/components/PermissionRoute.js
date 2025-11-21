import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';
import { CircularProgress, Box } from '@mui/material';

const PermissionRoute = ({ children, requiredPermissions = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to everything
  if (isAdmin(user)) {
    return children;
  }

  // Check if user has at least one of the required permissions
  const userPermissions = user?.permissions || [];
  const hasRequiredPermission = requiredPermissions.some(permission =>
    hasPermission(userPermissions, permission)
  );

  if (!hasRequiredPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PermissionRoute;


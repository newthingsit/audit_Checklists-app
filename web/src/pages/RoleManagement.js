import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';

const normalizePermissionsSelection = (permissionDefs, selectedPermissions = []) => {
  const selectedSet = new Set(selectedPermissions);
  permissionDefs.forEach(permission => {
    if (permission.children && permission.children.length > 0) {
      const childIds = permission.children.map(child => child.id);
      const hasParent = permission.id && selectedSet.has(permission.id);
      const hasAllChildren = childIds.every(id => selectedSet.has(id));

      if (hasParent && !hasAllChildren) {
        childIds.forEach(id => selectedSet.add(id));
      }

      if (!hasParent && hasAllChildren && permission.id) {
        selectedSet.add(permission.id);
      }
    }
  });
  return Array.from(selectedSet);
};

const RoleManagement = () => {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/roles', {
        params: { search: searchTerm }
      });
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('/api/roles/permissions/list');
      setPermissions(response.data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    if (searchTerm !== undefined) {
      fetchRoles();
    }
  }, [searchTerm]);

  useEffect(() => {
    if (!openDialog || permissions.length === 0) return;
    setFormData(prev => {
      const normalized = normalizeSelection(prev.permissions);
      if (normalized.length === prev.permissions.length &&
        normalized.every((perm, idx) => perm === prev.permissions[idx])) {
        return prev;
      }
      return { ...prev, permissions: normalized };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  const normalizeSelection = useCallback(
    (selected = []) => normalizePermissionsSelection(permissions, selected),
    [permissions]
  );

  const handleOpenDialog = (role = null) => {
    if (role) {
      const normalizedPermissions = normalizeSelection(role.permissions || []);
      setEditingRole(role);
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        permissions: normalizedPermissions
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
        permissions: []
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRole(null);
    setFormData({ name: '', display_name: '', description: '', permissions: [] });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.name)) {
      newErrors.name = 'Name must contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, formData);
        showSuccess('Role updated successfully');
      } else {
        await axios.post('/api/roles', formData);
        showSuccess('Role created successfully');
      }
      handleCloseDialog();
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      showError(error.response?.data?.error || 'Failed to save role');
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors.reduce((acc, err) => {
          acc[err.param] = err.msg;
          return acc;
        }, {}));
      }
    }
  };

  const handleDelete = async (role) => {
    if (role.is_system_role) {
      showError('Cannot delete system roles');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the role "${role.display_name}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/api/roles/${role.id}`);
        showSuccess('Role deleted successfully');
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
        showError(error.response?.data?.error || 'Failed to delete role');
      }
    }
  };

  const selectedPermissionsSet = useMemo(() => new Set(formData.permissions), [formData.permissions]);

  const toggleSimplePermission = useCallback((permissionId) => {
    setFormData(prev => {
      const updated = new Set(prev.permissions);
      if (updated.has(permissionId)) {
        updated.delete(permissionId);
      } else {
        updated.add(permissionId);
      }
      return { ...prev, permissions: Array.from(updated) };
    });
  }, []);

  const toggleParentPermission = useCallback((permission) => {
    if (!permission.children || permission.children.length === 0) {
      toggleSimplePermission(permission.id);
      return;
    }
    setFormData(prev => {
      const updated = new Set(prev.permissions);
      const childIds = permission.children.map(child => child.id);
      const allSelected = childIds.every(id => updated.has(id));

      if (allSelected) {
        childIds.forEach(id => updated.delete(id));
        if (permission.id) updated.delete(permission.id);
      } else {
        childIds.forEach(id => updated.add(id));
        if (permission.id) updated.add(permission.id);
      }

      return { ...prev, permissions: Array.from(updated) };
    });
  }, [toggleSimplePermission]);

  const toggleChildPermission = useCallback((permission, childId) => {
    setFormData(prev => {
      const updated = new Set(prev.permissions);
      if (updated.has(childId)) {
        updated.delete(childId);
      } else {
        updated.add(childId);
      }

      if (permission.children && permission.children.length > 0) {
        const childIds = permission.children.map(child => child.id);
        const allSelected = childIds.every(id => updated.has(id));

        if (allSelected) {
          if (permission.id) updated.add(permission.id);
        } else if (permission.id) {
          updated.delete(permission.id);
        }
      }

      return { ...prev, permissions: Array.from(updated) };
    });
  }, []);

  const getRoleColor = (role) => {
    if (role.is_system_role) return 'primary';
    return 'default';
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
              Role Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Manage user roles and permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
              }
            }}
          >
            Add Role
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Display Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Permissions</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No roles found' : 'No roles yet'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow
                    key={role.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {role.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {role.display_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {role.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 300 }}>
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((perm) => (
                            <Chip
                              key={perm}
                              label={perm.replace(/_/g, ' ')}
                              size="small"
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">No permissions</Typography>
                        )}
                        {role.permissions && role.permissions.length > 3 && (
                          <Chip
                            label={`+${role.permissions.length - 3} more`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.is_system_role ? 'System' : 'Custom'}
                        size="small"
                        color={getRoleColor(role)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Role">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(role)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {!role.is_system_role && (
                        <Tooltip title="Delete Role">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(role)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Role Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 2, 
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '1.25rem'
          }}>
            {editingRole ? 'Edit Role' : 'Add New Role'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                error={!!errors.name}
                helperText={errors.name || 'Lowercase letters, numbers, and underscores only (e.g., custom_role)'}
                required
                disabled={!!editingRole}
                autoFocus
              />
              <TextField
                fullWidth
                label="Display Name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                error={!!errors.display_name}
                helperText={errors.display_name}
                required
              />
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                  Permissions
                </Typography>
                <Grid container spacing={2}>
                  {permissions.map((permission) => {
                    const hasChildren = permission.children && permission.children.length > 0;
                    const childIds = hasChildren ? permission.children.map(child => child.id) : [];
                    const parentChecked = hasChildren
                      ? childIds.every(id => selectedPermissionsSet.has(id))
                      : selectedPermissionsSet.has(permission.id);
                    const parentIndeterminate = hasChildren
                      ? childIds.some(id => selectedPermissionsSet.has(id)) && !parentChecked
                      : false;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={permission.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            border: parentChecked ? 2 : 1,
                            borderColor: parentChecked ? 'primary.main' : 'divider',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          onClick={() =>
                            hasChildren
                              ? toggleParentPermission(permission)
                              : toggleSimplePermission(permission.id)
                          }
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={parentChecked}
                                  indeterminate={parentIndeterminate}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    hasChildren
                                      ? toggleParentPermission(permission)
                                      : toggleSimplePermission(permission.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  size="small"
                                />
                              }
                              label={
                                <Box
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    hasChildren
                                      ? toggleParentPermission(permission)
                                      : toggleSimplePermission(permission.id);
                                  }}
                                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {permission.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {permission.description}
                                  </Typography>
                                </Box>
                              }
                              sx={{ m: 0, width: '100%' }}
                            />
                            {hasChildren && (
                              <Box sx={{ pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                                {permission.children.map((child) => (
                                  <FormControlLabel
                                    key={child.id}
                                    control={
                                      <Checkbox
                                        checked={selectedPermissionsSet.has(child.id)}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleChildPermission(permission, child.id);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        size="small"
                                      />
                                    }
                                    label={
                                      <Box sx={{ userSelect: 'none' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {child.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {child.description}
                                        </Typography>
                                      </Box>
                                    }
                                    sx={{ m: 0 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                borderColor: '#e0e0e0',
                color: '#666',
                '&:hover': {
                  borderColor: '#1976d2',
                  color: '#1976d2',
                },
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
              }}
            >
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default RoleManagement;


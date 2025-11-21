import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  TextField as SearchField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import { hasPermission, isAdmin } from '../utils/permissions';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const userPermissions = currentUser?.permissions || [];
  const canCreateUser = hasPermission(userPermissions, 'create_users') || 
                       hasPermission(userPermissions, 'manage_users') || 
                       isAdmin(currentUser);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [csvData, setCsvData] = useState('');
  const [parsedUsers, setParsedUsers] = useState([]);
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/roles');
      const fetchedRoles = response.data.roles || [];
      setRoles(fetchedRoles);

      // Ensure the selected role is always one of the available roles
      if (fetchedRoles.length > 0) {
        const roleNames = fetchedRoles.map(role => role.name);
        setFormData(prev => {
          if (!prev.role || !roleNames.includes(prev.role)) {
            return { ...prev, role: fetchedRoles[0].name };
          }
          return prev;
        });
      } else {
        setFormData(prev => ({ ...prev, role: '' }));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users || []);
      setFilteredUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (roles.length === 0) {
      showError('Please create a role before managing users');
      return;
    }

    const availableRoleNames = roles.map(role => role.name);
    if (user) {
      setEditingUser(user);
      const userRole = user.role && availableRoleNames.includes(user.role)
        ? user.role
        : (roles[0]?.name || '');
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: userRole
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: roles[0]?.name || ''
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: roles[0]?.name || '' });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!editingUser && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, payload);
        showSuccess('User updated successfully');
      } else {
        await axios.post('/api/users', payload);
        showSuccess('User created successfully');
      }

      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to save user';
      showError(errorMsg);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors.reduce((acc, err) => {
          acc[err.param] = err.msg;
          return acc;
        }, {}));
      }
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      showSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete user';
      showError(errorMsg);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'auditor':
        return 'info';
      default:
        return 'default';
    }
  };

  // Improved CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVData = (csvText) => {
    try {
      setParseError('');
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setParseError('CSV must have at least a header row and one data row');
        setParsedUsers([]);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const headerMap = {
        name: headers.findIndex(h => h === 'name' || h === 'full name' || h === 'fullname'),
        email: headers.findIndex(h => h === 'email' || h === 'email address'),
        role: headers.findIndex(h => h === 'role'),
        password: headers.findIndex(h => h === 'password' || h === 'pwd')
      };

      // Check for required fields
      if (headerMap.name === -1 || headerMap.email === -1 || headerMap.role === -1) {
        setParseError('CSV must have "Name", "Email", and "Role" columns');
        setParsedUsers([]);
        return;
      }

      // Parse data rows
      const users = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const name = headerMap.name >= 0 ? values[headerMap.name]?.replace(/^"|"$/g, '').trim() : '';
        const email = headerMap.email >= 0 ? values[headerMap.email]?.replace(/^"|"$/g, '').trim() : '';
        const role = headerMap.role >= 0 ? values[headerMap.role]?.replace(/^"|"$/g, '').trim() : '';
        const password = headerMap.password >= 0 ? values[headerMap.password]?.replace(/^"|"$/g, '').trim() : '';
        
        if (name && email && role) {
          users.push({
            name,
            email,
            role,
            password: password || undefined
          });
        }
      }

      if (users.length === 0) {
        setParseError('No valid users found in CSV');
        setParsedUsers([]);
        return;
      }

      setParsedUsers(users);
    } catch (error) {
      setParseError(`Error parsing CSV: ${error.message}`);
      setParsedUsers([]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvData(text);
      parseCSVData(text);
    };
    reader.onerror = () => {
      showError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleCsvDataChange = (text) => {
    setCsvData(text);
    if (text.trim()) {
      parseCSVData(text);
    } else {
      setParsedUsers([]);
      setParseError('');
    }
  };

  const handleCSVImport = async () => {
    if (!csvData || parsedUsers.length === 0) {
      showError('Please provide valid CSV data');
      return;
    }

    if (parseError) {
      showError('Please fix CSV errors before importing');
      return;
    }

    setImporting(true);
    try {
      const response = await axios.post('/api/users/import', { users: parsedUsers });
      setImportResults(response.data.results);
      showSuccess(response.data.message);
      fetchUsers();
      setOpenImportDialog(false);
      setCsvData('');
      setParsedUsers([]);
      setParseError('');
    } catch (error) {
      console.error('Import error:', error);
      showError(error.response?.data?.error || 'Failed to import CSV file');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Name,Email,Role,Password
John Doe,john.doe@example.com,auditor,SecurePass123!
Jane Smith,jane.smith@example.com,manager,SecurePass123!
Bob Johnson,bob.johnson@example.com,user,SecurePass123!
Alice Williams,alice.williams@example.com,auditor,`;
    
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenImportDialog = () => {
    setCsvData('');
    setParsedUsers([]);
    setParseError('');
    setImportResults(null);
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    if (!importing) {
      setOpenImportDialog(false);
      setCsvData('');
      setParsedUsers([]);
      setParseError('');
      setImportResults(null);
    }
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
              User Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Manage users, roles, and permissions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenImportDialog}
            >
              Import CSV
            </Button>
            {canCreateUser && (
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
                Add User
              </Button>
            )}
          </Box>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <SearchField
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 250 }}
            />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  {roles.map(role => (
                    <MenuItem key={role.name} value={role.name}>
                      {role.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || roleFilter !== 'all' ? 'No users found' : 'No users yet'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(user.id === currentUser?.id && { bgcolor: 'primary.light', opacity: 0.1 })
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ color: 'text.secondary' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" component="span" sx={{ fontWeight: user.id === currentUser?.id ? 600 : 400 }}>
                            {user.name}
                          </Typography>
                          {user.id === currentUser?.id && (
                            <Chip label="You" size="small" />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user.id !== currentUser?.id && (
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(user)}
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

        {/* Add/Edit User Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
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
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
              <TextField
                fullWidth
                label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password || (editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters')}
                required={!editingUser}
              />
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  error={!!errors.role}
                  disabled={editingUser && editingUser.id === currentUser.id}
                >
                  {roles.length === 0 && (
                    <MenuItem value="" disabled>
                      No roles available
                    </MenuItem>
                  )}
                  {roles.map(role => (
                    <MenuItem key={role.name} value={role.name}>
                      {role.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {errors.role && (
                <Alert severity="error">{errors.role}</Alert>
              )}
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
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
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
            Delete User?
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Typography>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
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
              onClick={handleDelete} 
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#f44336',
                '&:hover': {
                  bgcolor: '#d32f2f',
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog
          open={openImportDialog}
          onClose={handleCloseImportDialog}
          maxWidth="lg"
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
            fontSize: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Import Users from CSV</span>
            <IconButton
              onClick={handleCloseImportDialog}
              disabled={importing}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload a CSV file with columns: Name, Email, Role, Password (optional). 
                  If password is not provided, a default password will be assigned.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    disabled={importing}
                  >
                    Upload CSV File
                    <input
                      type="file"
                      hidden
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadSampleCsv}
                    disabled={importing}
                  >
                    Download Sample
                  </Button>
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Or paste CSV data here"
                value={csvData}
                onChange={(e) => handleCsvDataChange(e.target.value)}
                disabled={importing}
                placeholder="Name,Email,Role,Password&#10;John Doe,john@example.com,auditor,SecurePass123!"
                sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              />

              {parseError && (
                <Alert severity="error">{parseError}</Alert>
              )}

              {importResults && (
                <Alert severity={importResults.failed === 0 ? 'success' : 'warning'}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Import Results:
                  </Typography>
                  <Typography variant="body2">
                    ✓ Successful: {importResults.success}
                  </Typography>
                  {importResults.failed > 0 && (
                    <>
                      <Typography variant="body2">
                        ✗ Failed: {importResults.failed}
                      </Typography>
                      {importResults.errors.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Errors:
                          </Typography>
                          {importResults.errors.slice(0, 5).map((err, idx) => (
                            <Typography key={idx} variant="body2" sx={{ ml: 1, fontSize: '0.75rem' }}>
                              Row {err.row} ({err.email}): {err.error}
                            </Typography>
                          ))}
                          {importResults.errors.length > 5 && (
                            <Typography variant="body2" sx={{ ml: 1, fontSize: '0.75rem', fontStyle: 'italic' }}>
                              ... and {importResults.errors.length - 5} more errors
                            </Typography>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </Alert>
              )}

              {parsedUsers.length > 0 && !parseError && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Preview ({parsedUsers.length} users):
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedUsers.slice(0, 10).map((user, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={user.role}
                                color={getRoleColor(user.role)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{user.password ? '••••••' : 'Default'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedUsers.length > 10 && (
                      <Box sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          ... and {parsedUsers.length - 10} more rows
                        </Typography>
                      </Box>
                    )}
                  </TableContainer>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseImportDialog}
              disabled={importing}
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
              onClick={handleCSVImport}
              disabled={importing || parsedUsers.length === 0 || !!parseError}
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
              {importing ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Importing...
                </>
              ) : (
                `Import ${parsedUsers.length} Users`
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default UserManagement;


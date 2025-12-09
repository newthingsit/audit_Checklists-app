import React, { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StoreIcon from '@mui/icons-material/Store';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const StoreAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState({});
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [assignDialog, setAssignDialog] = useState({ open: false, type: null, item: null });
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Add cache-busting timestamp to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const [usersRes, locationsRes, assignmentsRes, summaryRes] = await Promise.all([
        axios.get(`/api/users?${cacheBuster}`),
        axios.get(`/api/locations?all=true&${cacheBuster}`),
        axios.get(`/api/locations/assignments/all?${cacheBuster}`),
        axios.get(`/api/locations/assignments/summary?${cacheBuster}`)
      ]);
      
      setUsers(usersRes.data.users || []);
      setLocations(locationsRes.data.locations || []);
      setAssignments(assignmentsRes.data.assignments || []);
      setSummary(summaryRes.data.summary || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showLoading) {
        showError('Failed to load data');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleAssignToUser = async (userId) => {
    if (selectedItems.length === 0) {
      showError('Please select at least one store');
      return;
    }
    
    try {
      const response = await axios.post(`/api/locations/assignments/user/${userId}`, {
        location_ids: selectedItems
      });
      showSuccess(response.data.message || 'Stores assigned successfully');
      setAssignDialog({ open: false, type: null, item: null });
      setSelectedItems([]);
      
      // Immediate refresh (without loading spinner for better UX)
      await fetchData(false);
      
      // Second refresh after delay to ensure backend has fully processed
      setTimeout(async () => {
        await fetchData(false);
      }, 800);
    } catch (error) {
      console.error('Error assigning stores:', error);
      const errorMsg = error.response?.data?.error || 'Failed to assign stores';
      showError(errorMsg);
      // Refresh on error to ensure UI is in sync (without loading spinner)
      await fetchData(false).catch(err => {
        console.error('Error refreshing data after assignment failure:', err);
      });
    }
  };

  const handleAssignToStore = async (locationId) => {
    if (selectedItems.length === 0) {
      showError('Please select at least one user');
      return;
    }
    
    try {
      const response = await axios.post(`/api/locations/assignments/location/${locationId}`, {
        user_ids: selectedItems
      });
      showSuccess(response.data.message || 'Users assigned successfully');
      setAssignDialog({ open: false, type: null, item: null });
      setSelectedItems([]);
      
      // Immediate refresh (without loading spinner for better UX)
      await fetchData(false);
      
      // Second refresh after delay to ensure backend has fully processed
      setTimeout(async () => {
        await fetchData(false);
      }, 800);
    } catch (error) {
      console.error('Error assigning users:', error);
      const errorMsg = error.response?.data?.error || 'Failed to assign users';
      showError(errorMsg);
      // Refresh on error to ensure UI is in sync (without loading spinner)
      await fetchData(false).catch(err => {
        console.error('Error refreshing data after assignment failure:', err);
      });
    }
  };

  const handleRemoveAssignment = async (userId, locationId) => {
    if (!window.confirm('Remove this assignment?')) return;
    
    try {
      await axios.delete(`/api/locations/assignments/user/${userId}/location/${locationId}`);
      showSuccess('Assignment removed');
      
      // Immediate refresh (without loading spinner for better UX)
      await fetchData(false);
      
      // Second refresh after delay to ensure backend has fully processed
      setTimeout(async () => {
        await fetchData(false);
      }, 800);
    } catch (error) {
      console.error('Error removing assignment:', error);
      const errorMsg = error.response?.data?.error || 'Failed to remove assignment';
      showError(errorMsg);
      // Refresh on error to ensure UI is in sync (without loading spinner)
      await fetchData(false).catch(err => {
        console.error('Error refreshing data after removal failure:', err);
      });
    }
  };

  const handleRemoveAllUserAssignments = async (userId, userName) => {
    if (!window.confirm(`Remove all store assignments for ${userName}?`)) return;
    
    try {
      const response = await axios.delete(`/api/locations/assignments/user/${userId}`);
      showSuccess(response.data.message || 'All assignments removed');
      
      // Immediate refresh (without loading spinner for better UX)
      await fetchData(false);
      
      // Second refresh after delay to ensure backend has fully processed
      setTimeout(async () => {
        await fetchData(false);
      }, 800);
    } catch (error) {
      console.error('Error removing assignments:', error);
      const errorMsg = error.response?.data?.error || 'Failed to remove assignments';
      showError(errorMsg);
      // Refresh on error to ensure UI is in sync (without loading spinner)
      await fetchData(false).catch(err => {
        console.error('Error refreshing data after removal failure:', err);
      });
    }
  };

  // Group assignments by user (memoized for performance and proper updates)
  const assignmentsByUser = useMemo(() => {
    return assignments.reduce((acc, a) => {
      if (!acc[a.user_id]) {
        acc[a.user_id] = {
          user_id: a.user_id,
          user_name: a.user_name,
          user_email: a.user_email,
          user_role: a.user_role,
          locations: []
        };
      }
      acc[a.user_id].locations.push({
        id: a.location_id,
        name: a.location_name,
        store_number: a.store_number,
        access_type: a.access_type,
        assigned_at: a.assigned_at
      });
      return acc;
    }, {});
  }, [assignments]);

  // Group assignments by location (memoized for performance and proper updates)
  const assignmentsByLocation = useMemo(() => {
    return assignments.reduce((acc, a) => {
      if (!acc[a.location_id]) {
        acc[a.location_id] = {
          location_id: a.location_id,
          location_name: a.location_name,
          store_number: a.store_number,
          users: []
        };
      }
      acc[a.location_id].users.push({
        id: a.user_id,
        name: a.user_name,
        email: a.user_email,
        role: a.user_role,
        access_type: a.access_type,
        assigned_at: a.assigned_at
      });
      return acc;
    }, {});
  }, [assignments]);

  // Filter users for assignment (non-admin only) - memoized
  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'admin' && u.role !== 'manager');
  }, [users]);

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
      <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
            Store Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign stores to employees. Users will only see stores assigned to them.
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon />
                  <Typography variant="h4">{summary.users_with_assignments || 0}</Typography>
                </Box>
                <Typography variant="body2">Users with Assignments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon />
                  <Typography variant="h4">{summary.locations_with_assignments || 0}</Typography>
                </Box>
                <Typography variant="body2">Stores with Assignments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  <Typography variant="h4">{summary.total_assignments || 0}</Typography>
                </Box>
                <Typography variant="body2">Total Assignments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {summary.total_non_admin_users || 0} assignable users
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.total_locations || 0} total stores
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="By User" icon={<GroupIcon />} iconPosition="start" />
            <Tab label="By Store" icon={<StoreIcon />} iconPosition="start" />
            <Tab label="All Assignments" icon={<AssignmentIcon />} iconPosition="start" />
          </Tabs>

          <CardContent>
            {/* Tab 0: By User */}
            {tabValue === 0 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search users..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> }}
                  />
                </Box>
                
                {assignableUsers
                  .filter(u => !searchText || u.name.toLowerCase().includes(searchText.toLowerCase()) || u.email.toLowerCase().includes(searchText.toLowerCase()))
                  .map(user => {
                    const userAssignments = assignmentsByUser[user.id];
                    return (
                      <Paper key={user.id} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>{user.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{user.email} • {user.role}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<PersonAddIcon />}
                              onClick={() => {
                                setAssignDialog({ open: true, type: 'user', item: user });
                                setSelectedItems(userAssignments?.locations?.map(l => l.id) || []);
                              }}
                            >
                              Assign Stores
                            </Button>
                            {userAssignments && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleRemoveAllUserAssignments(user.id, user.name)}
                              >
                                Remove All
                              </Button>
                            )}
                          </Box>
                        </Box>
                        
                        {userAssignments ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {userAssignments.locations.map(loc => (
                              <Chip
                                key={loc.id}
                                label={loc.store_number ? `#${loc.store_number} - ${loc.name}` : loc.name}
                                onDelete={() => handleRemoveAssignment(user.id, loc.id)}
                                color="primary"
                                variant="outlined"
                                size="small"
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No stores assigned (user can see all stores)
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
              </Box>
            )}

            {/* Tab 1: By Store */}
            {tabValue === 1 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search stores..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> }}
                  />
                </Box>
                
                {locations
                  .filter(l => !searchText || l.name.toLowerCase().includes(searchText.toLowerCase()) || (l.store_number && l.store_number.includes(searchText)))
                  .map(location => {
                    const locAssignments = assignmentsByLocation[location.id];
                    return (
                      <Paper key={location.id} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {location.store_number ? `#${location.store_number} - ${location.name}` : location.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {[location.city, location.state].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<GroupIcon />}
                            onClick={() => {
                              setAssignDialog({ open: true, type: 'location', item: location });
                              setSelectedItems(locAssignments?.users?.map(u => u.id) || []);
                            }}
                          >
                            Assign Users
                          </Button>
                        </Box>
                        
                        {locAssignments ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {locAssignments.users.map(user => (
                              <Chip
                                key={user.id}
                                label={`${user.name} (${user.role})`}
                                onDelete={() => handleRemoveAssignment(user.id, location.id)}
                                color="secondary"
                                variant="outlined"
                                size="small"
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No specific users assigned (all users can access)
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
              </Box>
            )}

            {/* Tab 2: All Assignments */}
            {tabValue === 2 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>User</strong></TableCell>
                      <TableCell><strong>Role</strong></TableCell>
                      <TableCell><strong>Store</strong></TableCell>
                      <TableCell><strong>Assigned By</strong></TableCell>
                      <TableCell><strong>Assigned At</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((a, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{a.user_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.user_email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={a.user_role} size="small" />
                        </TableCell>
                        <TableCell>
                          {a.store_number ? `#${a.store_number} - ${a.location_name}` : a.location_name}
                        </TableCell>
                        <TableCell>{a.assigned_by_name || '-'}</TableCell>
                        <TableCell>{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveAssignment(a.user_id, a.location_id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {assignments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No assignments yet</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Assign Dialog */}
        <Dialog
          open={assignDialog.open}
          onClose={() => {
            setAssignDialog({ open: false, type: null, item: null });
            setSelectedItems([]);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {assignDialog.type === 'user' 
              ? `Assign Stores to ${assignDialog.item?.name}`
              : `Assign Users to ${assignDialog.item?.name}`
            }
          </DialogTitle>
          <DialogContent>
            {assignDialog.type === 'user' ? (
              <Autocomplete
                multiple
                options={locations}
                getOptionLabel={(option) => option.store_number ? `#${option.store_number} - ${option.name}` : option.name}
                value={locations.filter(l => selectedItems.includes(l.id))}
                onChange={(e, newValue) => setSelectedItems(newValue.map(v => v.id))}
                renderInput={(params) => (
                  <TextField {...params} label="Select Stores" placeholder="Search stores..." margin="normal" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.store_number ? `#${option.store_number}` : option.name}
                      {...getTagProps({ index })}
                      size="small"
                    />
                  ))
                }
              />
            ) : (
              <Autocomplete
                multiple
                options={assignableUsers}
                getOptionLabel={(option) => `${option.name} (${option.role})`}
                value={assignableUsers.filter(u => selectedItems.includes(u.id))}
                onChange={(e, newValue) => setSelectedItems(newValue.map(v => v.id))}
                renderInput={(params) => (
                  <TextField {...params} label="Select Users" placeholder="Search users..." margin="normal" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      size="small"
                    />
                  ))
                }
              />
            )}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              {assignDialog.type === 'user' 
                ? 'Selected stores will be the only stores this user can see and audit.'
                : 'Selected users will be able to see and audit this store.'
              }
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => {
              setAssignDialog({ open: false, type: null, item: null });
              setSelectedItems([]);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (assignDialog.type === 'user') {
                  handleAssignToUser(assignDialog.item.id);
                } else {
                  handleAssignToStore(assignDialog.item.id);
                }
              }}
            >
              Save Assignments
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default StoreAssignments;

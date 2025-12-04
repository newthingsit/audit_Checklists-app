import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import StoreIcon from '@mui/icons-material/Store';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';

const StoreGroups = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const [groups, setGroups] = useState([]);
  const [stores, setStores] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'region',
    parent_group_id: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [groupAnalytics, setGroupAnalytics] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  const canManageGroups = hasPermission(userPermissions, 'manage_locations') || isAdmin(user);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, storesRes, treeRes] = await Promise.all([
        axios.get('/api/store-groups'),
        axios.get('/api/locations'),
        axios.get('/api/store-groups/tree')
      ]);
      setGroups(groupsRes.data.groups || []);
      setStores(storesRes.data.locations || []);
      setTreeData(treeRes.data.tree || []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupAnalytics = async (groupId) => {
    try {
      const response = await axios.get(`/api/store-groups/${groupId}/analytics`);
      setGroupAnalytics(prev => ({
        ...prev,
        [groupId]: response.data
      }));
    } catch (err) {
      console.error('Failed to fetch group analytics:', err);
    }
  };

  const handleOpenDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        type: group.type || 'region',
        parent_group_id: group.parent_group_id || '',
        description: group.description || ''
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        type: 'region',
        parent_group_id: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGroup(null);
    setFormData({
      name: '',
      type: 'region',
      parent_group_id: '',
      description: ''
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingGroup) {
        await axios.put(`/api/store-groups/${editingGroup.id}`, formData);
        setSuccess('Group updated successfully');
      } else {
        await axios.post('/api/store-groups', formData);
        setSuccess('Group created successfully');
      }
      handleCloseDialog();
      await fetchData();
      // Auto-clear success after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save group');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      await axios.delete(`/api/store-groups/${groupId}`);
      setSuccess('Group deleted successfully');
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete group');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleOpenAssignDialog = (group) => {
    setSelectedGroup(group);
    const groupStores = stores.filter(s => s.group_id === group.id).map(s => s.id);
    setSelectedStores(groupStores);
    setOpenAssignDialog(true);
  };

  const handleAssignStores = async () => {
    setSaving(true);
    try {
      // First, remove all stores from this group
      const currentGroupStores = stores.filter(s => s.group_id === selectedGroup.id);
      if (currentGroupStores.length > 0) {
        await axios.delete(`/api/store-groups/${selectedGroup.id}/stores`, {
          data: { store_ids: currentGroupStores.map(s => s.id) }
        });
      }
      
      // Then assign the selected stores
      if (selectedStores.length > 0) {
        await axios.post(`/api/store-groups/${selectedGroup.id}/stores`, {
          store_ids: selectedStores
        });
      }
      
      setSuccess('Stores assigned successfully');
      setOpenAssignDialog(false);
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign stores');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreSelection = (storeId) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const toggleExpandGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
    if (!groupAnalytics[groupId]) {
      fetchGroupAnalytics(groupId);
    }
  };

  const getGroupTypeColor = (type) => {
    const colors = {
      region: 'primary',
      district: 'secondary',
      brand: 'warning',
      franchise: 'info',
      custom: 'default'
    };
    return colors[type] || 'default';
  };

  const getStoreCountForGroup = (groupId) => {
    return stores.filter(s => s.group_id === groupId).length;
  };

  const renderTreeNode = (node, level = 0) => {
    const storeCount = getStoreCountForGroup(node.id);
    const analytics = groupAnalytics[node.id];
    
    return (
      <Box key={node.id} sx={{ ml: level * 3 }}>
        <Accordion 
          expanded={expandedGroups[node.id] || false}
          onChange={() => toggleExpandGroup(node.id)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
              <FolderIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {node.name}
              </Typography>
              <Chip 
                label={node.type} 
                size="small" 
                color={getGroupTypeColor(node.type)}
              />
              <Chip 
                label={`${storeCount} stores`}
                size="small"
                variant="outlined"
              />
              {canManageGroups && (
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  <Tooltip title="Assign Stores">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenAssignDialog(node); }}>
                      <StoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog(node); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {analytics ? (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                    <Typography variant="h4">{analytics.totalAudits || 0}</Typography>
                    <Typography variant="body2">Total Audits</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                    <Typography variant="h4">{analytics.completedAudits || 0}</Typography>
                    <Typography variant="body2">Completed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                    <Typography variant="h4">{Math.round(analytics.avgScore || 0)}%</Typography>
                    <Typography variant="body2">Avg Score</Typography>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <LinearProgress sx={{ mb: 2 }} />
            )}
            
            {node.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {node.description}
              </Typography>
            )}
            
            {/* Stores in this group */}
            {storeCount > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Stores in this group:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {stores.filter(s => s.group_id === node.id).map(store => (
                    <Chip
                      key={store.id}
                      icon={<StoreIcon />}
                      label={store.store_number ? `#${store.store_number} - ${store.name}` : store.name}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Child groups */}
            {node.children && node.children.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {node.children.map(child => renderTreeNode(child, 0))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    );
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
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupWorkIcon color="primary" /> Store Groups
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Organize stores by region, district, brand, or custom groups
              </Typography>
            </Box>
            {canManageGroups && (
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
                Add Group
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GroupWorkIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{groups.length}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Groups</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StoreIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{stores.length}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Stores</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AccountTreeIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {groups.filter(g => g.type === 'region').length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Regions</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FolderIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {groups.filter(g => g.type === 'district').length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Districts</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Hierarchical Tree View */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AccountTreeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Group Hierarchy
              </Typography>
            </Box>
            
            {treeData.length > 0 ? (
              <Box>
                {treeData.map(node => renderTreeNode(node))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No groups created yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first group to organize stores
                </Typography>
                {canManageGroups && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                  >
                    Create First Group
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* All Groups Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              All Groups
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Parent Group</TableCell>
                    <TableCell>Stores</TableCell>
                    <TableCell>Description</TableCell>
                    {canManageGroups && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FolderIcon color="primary" />
                          {group.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={group.type} 
                          size="small" 
                          color={getGroupTypeColor(group.type)}
                        />
                      </TableCell>
                      <TableCell>
                        {group.parent_group_id ? (
                          groups.find(g => g.id === group.parent_group_id)?.name || '-'
                        ) : (
                          <Typography variant="body2" color="text.secondary">Root</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStoreCountForGroup(group.id)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                          {group.description || '-'}
                        </Typography>
                      </TableCell>
                      {canManageGroups && (
                        <TableCell align="right">
                          <Tooltip title="Assign Stores">
                            <IconButton size="small" onClick={() => handleOpenAssignDialog(group)}>
                              <StoreIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenDialog(group)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(group.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {groups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          No groups found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Create/Edit Group Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingGroup ? 'Edit Group' : 'Create New Group'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Group Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="region">Region</MenuItem>
                  <MenuItem value="district">District</MenuItem>
                  <MenuItem value="brand">Brand</MenuItem>
                  <MenuItem value="franchise">Franchise</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Parent Group (Optional)</InputLabel>
                <Select
                  value={formData.parent_group_id}
                  label="Parent Group (Optional)"
                  onChange={(e) => setFormData({ ...formData, parent_group_id: e.target.value })}
                >
                  <MenuItem value="">None (Root Level)</MenuItem>
                  {groups
                    .filter(g => g.id !== editingGroup?.id)
                    .map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name} ({group.type})
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.name || saving}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : (editingGroup ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Stores Dialog */}
        <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assign Stores to {selectedGroup?.name}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select stores to assign to this group
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {stores.map((store) => (
                <ListItem 
                  key={store.id} 
                  button 
                  onClick={() => toggleStoreSelection(store.id)}
                  sx={{
                    bgcolor: selectedStores.includes(store.id) ? 'primary.light' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5
                  }}
                >
                  <Checkbox
                    checked={selectedStores.includes(store.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText
                    primary={store.name}
                    secondary={store.store_number ? `Store #${store.store_number}` : store.address}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" color="text.secondary">
              {selectedStores.length} stores selected
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAssignDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAssignStores} variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Assign Stores'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default StoreGroups;


import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import Tooltip from '@mui/material/Tooltip';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const ActionPlans = () => {
  const [actions, setActions] = useState([]);
  const [filteredActions, setFilteredActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [escalationFilter, setEscalationFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [audits, setAudits] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    audit_id: ''
  });
  // Escalation history state
  const [showEscalationHistory, setShowEscalationHistory] = useState(false);
  const [selectedActionForHistory, setSelectedActionForHistory] = useState(null);
  const [escalationHistory, setEscalationHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchActions();
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const response = await axios.get('/api/audits');
      setAudits(response.data.audits || []);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching audits:', error);
    }
  };

  useEffect(() => {
    let filtered = actions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(action => action.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(action => action.priority === priorityFilter);
    }
    if (escalationFilter !== 'all') {
      if (escalationFilter === 'escalated') {
        filtered = filtered.filter(action => action.escalated === true || action.escalated === 1);
      } else if (escalationFilter === 'not_escalated') {
        filtered = filtered.filter(action => !action.escalated || action.escalated === 0);
      }
    }

    setFilteredActions(filtered);
  }, [statusFilter, priorityFilter, escalationFilter, actions]);
  
  const fetchEscalationHistory = async (actionId) => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(`/api/assignment-rules/escalation-history/${actionId}`);
      setEscalationHistory(response.data);
      setSelectedActionForHistory(actionId);
      setShowEscalationHistory(true);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching escalation history:', error);
      showError('Failed to load escalation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchActions = async () => {
    try {
      const response = await axios.get('/api/actions');
      setActions(response.data.actions || []);
      setFilteredActions(response.data.actions || []);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (action = null) => {
    if (action) {
      setEditingAction(action);
      setFormData({
        title: action.title,
        description: action.description || '',
        priority: action.priority,
        due_date: action.due_date ? action.due_date.split('T')[0] : '',
        assigned_to: action.assigned_to || '',
        audit_id: action.audit_id || ''
      });
    } else {
      setEditingAction(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: '',
        audit_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAction(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showError('Title is required');
      return;
    }

    try {
      if (editingAction) {
        await axios.put(`/api/actions/${editingAction.id}`, formData);
      } else {
        // Create new action item - audit_id is optional
        const payload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_date: formData.due_date || null,
          assigned_to: formData.assigned_to || null
        };
        
        // Only include audit_id if provided
        if (formData.audit_id) {
          payload.audit_id = parseInt(formData.audit_id);
        }
        
        await axios.post('/api/actions', payload);
      }
      handleCloseDialog();
      showSuccess('Action item saved successfully!');
      fetchActions();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error saving action:', error);
      showError(error.response?.data?.error || 'Error saving action item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this action item?')) {
      try {
        await axios.delete(`/api/actions/${id}`);
        showSuccess('Action item deleted successfully!');
        fetchActions();
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error deleting action:', error);
        showError('Error deleting action item');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/actions/${id}`, { status: newStatus });
      showSuccess(`Action item marked as ${newStatus}!`);
      fetchActions();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error updating status:', error);
      showError('Error updating action status');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
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
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Action Plans & Corrective Actions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Action
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Escalation</InputLabel>
            <Select
              value={escalationFilter}
              label="Escalation"
              onChange={(e) => setEscalationFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="escalated">Escalated</MenuItem>
              <MenuItem value="not_escalated">Not Escalated</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredActions.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" align="center">
                No action items found. Click "New Action" to create a new action item.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {filteredActions.map((action) => (
              <Grid item xs={12} md={6} key={action.id}>
                <Card sx={{ 
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    borderColor: action.priority === 'high' ? 'error.main' : action.priority === 'medium' ? 'warning.main' : 'info.main'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <AssignmentIcon sx={{ 
                            fontSize: 24, 
                            color: action.priority === 'high' ? 'error.main' : action.priority === 'medium' ? 'warning.main' : 'info.main',
                            mr: 1
                          }} />
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {action.title}
                          </Typography>
                        </Box>
                        {action.restaurant_name && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            🏢 Restaurant: {action.restaurant_name}
                          </Typography>
                        )}
                        {action.item_title && (
                          <Typography variant="body2" color="text.secondary">
                            📋 Related to: {action.item_title}
                          </Typography>
                        )}
                        {(action.escalated === true || action.escalated === 1) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                            <Tooltip title="This action item has been escalated">
                              <Chip 
                                icon={<TrendingUpIcon />}
                                label="Escalated" 
                                size="small" 
                                color="warning"
                                sx={{ fontWeight: 600 }}
                              />
                            </Tooltip>
                            {action.escalated_to_name && (
                              <Typography variant="caption" color="text.secondary">
                                → {action.escalated_to_name}
                              </Typography>
                            )}
                            {action.escalated_at && (
                              <Typography variant="caption" color="text.secondary">
                                on {new Date(action.escalated_at).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                      <Box>
                        {(action.escalated === true || action.escalated === 1) && (
                          <Tooltip title="View Escalation History">
                            <IconButton
                              size="small"
                              onClick={() => fetchEscalationHistory(action.id)}
                              sx={{ mr: 1, color: 'warning.main' }}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(action)}
                          sx={{ mr: 1, color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(action.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    {action.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {action.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={action.status}
                        color={getStatusColor(action.status)}
                        size="small"
                        icon={action.status === 'completed' ? <CheckCircleIcon /> : <PendingIcon />}
                        onClick={() => {
                          const newStatus = action.status === 'completed' ? 'pending' : 'completed';
                          handleStatusChange(action.id, newStatus);
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                      <Chip
                        label={action.priority}
                        color={getPriorityColor(action.priority)}
                        size="small"
                      />
                      {action.assigned_to_name && (
                        <Chip
                          label={`Assigned: ${action.assigned_to_name}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {action.due_date && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(action.due_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

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
            {editingAction ? 'Edit Action Item' : 'New Action Item'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            {!editingAction && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Related Audit (Optional)</InputLabel>
                <Select
                  value={formData.audit_id}
                  label="Related Audit (Optional)"
                  onChange={(e) => setFormData({ ...formData, audit_id: e.target.value })}
                >
                  <MenuItem value="">None - Standalone Action</MenuItem>
                  {audits.map(audit => (
                    <MenuItem key={audit.id} value={audit.id}>
                      {audit.restaurant_name} - {new Date(audit.created_at).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Escalation History Dialog */}
        <Dialog
          open={showEscalationHistory}
          onClose={() => {
            setShowEscalationHistory(false);
            setEscalationHistory(null);
            setSelectedActionForHistory(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              <Typography variant="h6">Escalation History</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {loadingHistory ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : escalationHistory ? (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  {escalationHistory.action?.title}
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Original Assignee: {escalationHistory.action?.assigned_to_name || 'Unassigned'}
                  </Typography>
                  {escalationHistory.action?.escalated_to_name && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Escalated To: {escalationHistory.action.escalated_to_name}
                    </Typography>
                  )}
                  {escalationHistory.action?.escalated_at && (
                    <Typography variant="body2" color="text.secondary">
                      Escalated At: {new Date(escalationHistory.action.escalated_at).toLocaleString()}
                    </Typography>
                  )}
                </Box>

                {escalationHistory.escalationComments && escalationHistory.escalationComments.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      Escalation Comments
                    </Typography>
                    {escalationHistory.escalationComments.map((comment, index) => (
                      <Card key={index} sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <CardContent>
                          <Typography variant="body2" paragraph>
                            {comment.comment}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {comment.user_name || 'System'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No escalation comments found.
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography>No escalation history available.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowEscalationHistory(false);
              setEscalationHistory(null);
              setSelectedActionForHistory(null);
            }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default ActionPlans;


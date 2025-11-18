import React, { useEffect, useState, useMemo } from 'react';
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
  IconButton,
  Tabs,
  Tab,
  Autocomplete,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dependencyOptions, setDependencyOptions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    priority: 'medium',
    due_date: '',
    reminder_date: '',
    assigned_to: '',
    location_id: '',
    audit_id: '',
    dependency_ids: []
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchLocations();
    fetchDependencyOptions();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.type === typeFilter);
    }

    // Tab filtering
    if (tabValue === 1) {
      // Ready to start (dependencies completed)
      filtered = filtered.filter(task => {
        if (task.status !== 'pending') return false;
        if (!task.dependencies || task.dependencies.length === 0) return true;
        return task.dependencies.every(dep => dep.depends_on_status === 'completed');
      });
    } else if (tabValue === 2) {
      // With reminders
      filtered = filtered.filter(task => {
        if (!task.reminder_date) return false;
        const reminderDate = new Date(task.reminder_date);
        const now = new Date();
        return reminderDate <= now && task.status !== 'completed';
      });
    } else if (tabValue === 3) {
      // Overdue
      filtered = filtered.filter(task => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return dueDate < now;
      });
    }

    setFilteredTasks(filtered);
  }, [statusFilter, priorityFilter, typeFilter, tabValue, tasks]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencyOptions = async () => {
    try {
      const response = await axios.get('/api/tasks/dependencies/options');
      setDependencyOptions(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching dependency options:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations');
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const mergedDependencyOptions = useMemo(() => {
    const map = new Map();
    dependencyOptions.forEach(task => {
      if (task && task.id) {
        map.set(task.id, {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority
        });
      }
    });
    if (editingTask?.dependencies) {
      editingTask.dependencies.forEach(dep => {
        const depId = dep.id || dep.depends_on_task_id;
        if (depId && !map.has(depId)) {
          map.set(depId, {
            id: depId,
            title: dep.depends_on_title || dep.title || `Task #${depId}`,
            status: dep.depends_on_status || dep.status || 'pending'
          });
        }
      });
    }
    return Array.from(map.values());
  }, [dependencyOptions, editingTask]);

  const filteredDependencyOptions = useMemo(() => {
    return mergedDependencyOptions.filter(option => option.id !== editingTask?.id);
  }, [mergedDependencyOptions, editingTask]);

  const selectedDependencyValues = useMemo(() => {
    if (!formData.dependency_ids || formData.dependency_ids.length === 0) {
      return [];
    }
    return formData.dependency_ids
      .map(id => mergedDependencyOptions.find(option => option.id === id))
      .filter(Boolean);
  }, [formData.dependency_ids, mergedDependencyOptions]);

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        type: task.type || 'general',
        priority: task.priority || 'medium',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        reminder_date: task.reminder_date ? task.reminder_date.split('T')[0] : '',
        assigned_to: task.assigned_to || '',
        location_id: task.location_id || '',
        audit_id: task.audit_id || '',
        dependency_ids: task.dependencies ? task.dependencies.map(d => d.id || d.depends_on_task_id) : []
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        type: 'general',
        priority: 'medium',
        due_date: '',
        reminder_date: '',
        assigned_to: '',
        location_id: '',
        audit_id: '',
        dependency_ids: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'put' : 'post';

      await axios[method](url, formData);
      showSuccess(editingTask ? 'Task updated successfully' : 'Task created successfully');
      handleCloseDialog();
      fetchTasks();
      fetchDependencyOptions();
    } catch (error) {
      console.error('Error saving task:', error);
      showError(error.response?.data?.error || 'Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(`/api/tasks/${id}`);
      showSuccess('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/tasks/${id}`, { status: newStatus });
      showSuccess('Task status updated');
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      showError('Failed to update task status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'audit': return 'primary';
      case 'maintenance': return 'secondary';
      case 'training': return 'info';
      case 'compliance': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const canStart = (task) => {
    if (task.status !== 'pending') return false;
    if (!task.dependencies || task.dependencies.length === 0) return true;
    return task.dependencies.every(dep => dep.depends_on_status === 'completed');
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Tasks & Workflows
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2 }}
          >
            New Task
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`All Tasks (${tasks.length})`} />
            <Tab label={`Ready to Start (${tasks.filter(t => canStart(t)).length})`} />
            <Tab label={`Reminders (${tasks.filter(t => t.reminder_date && new Date(t.reminder_date) <= new Date() && t.status !== 'completed').length})`} />
            <Tab label={`Overdue (${tasks.filter(t => isOverdue(t.due_date, t.status)).length})`} />
          </Tabs>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
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

          <FormControl size="small" sx={{ minWidth: 120 }}>
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

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="audit">Audit</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="training">Training</MenuItem>
              <MenuItem value="compliance">Compliance</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Tasks Grid */}
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No tasks found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {tabValue === 0 ? 'Create your first task to get started' : 'No tasks match the current filters'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredTasks.map((task) => (
              <Grid item xs={12} md={6} lg={4} key={task.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isOverdue(task.due_date, task.status) ? '2px solid red' : '1px solid',
                    borderColor: 'divider',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
                        {task.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(task)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(task.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {task.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {task.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip
                        label={task.status}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                      <Chip
                        label={task.priority}
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                      <Chip
                        label={task.type}
                        color={getTypeColor(task.type)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {task.dependencies && task.dependencies.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Dependencies:
                        </Typography>
                        {task.dependencies.map((dep, idx) => (
                          <Chip
                            key={idx}
                            label={dep.depends_on_title || dep.title}
                            size="small"
                            icon={<LinkIcon />}
                            sx={{ mr: 0.5, mb: 0.5 }}
                            color={dep.depends_on_status === 'completed' ? 'success' : 'default'}
                          />
                        ))}
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      {task.assigned_to_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Assigned to: {task.assigned_to_name}
                        </Typography>
                      )}
                      {task.location_name && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Store: {task.location_name}
                        </Typography>
                      )}
                      {task.due_date && (
                        <Typography
                          variant="caption"
                          color={isOverdue(task.due_date, task.status) ? 'error' : 'text.secondary'}
                          sx={{ display: 'block', fontWeight: isOverdue(task.due_date, task.status) ? 600 : 400 }}
                        >
                          Due: {formatDate(task.due_date)}
                          {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                        </Typography>
                      )}
                      {task.reminder_date && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          <NotificationsIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                          Reminder: {formatDate(task.reminder_date)}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                      {canStart(task) && task.status === 'pending' && (
                        <Tooltip title="Start Task">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        </Tooltip>
                      )}
                      {task.status === 'pending' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleStatusChange(task.id, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStatusChange(task.id, 'pending')}
                        >
                          Reopen
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Title"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="audit">Audit</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="training">Training</MenuItem>
                    <MenuItem value="compliance">Compliance</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
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
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />

                <TextField
                  label="Reminder Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    value={formData.assigned_to}
                    label="Assign To"
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={formData.location_id}
                    label="Store"
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  >
                    <MenuItem value="">No Store</MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Autocomplete
                multiple
                options={filteredDependencyOptions}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option?.title || `Task #${option?.id}` || ''}
                value={selectedDependencyValues}
                onChange={(e, newValue) => {
                  setFormData({ ...formData, dependency_ids: newValue.map(v => v.id) });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Dependencies (Tasks that must complete first)"
                    placeholder="Select dependent tasks"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Tasks;


import React, { useEffect, useState } from 'react';
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
  TextField,
  Grid,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';

const ScheduledAudits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    template_id: '',
    location_id: '',
    scheduled_date: '',
    frequency: 'once',
    assigned_to: ''
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const promises = [
        axios.get('/api/scheduled-audits').catch(() => ({ data: { schedules: [] } })),
        axios.get('/api/templates'),
        axios.get('/api/locations').catch(() => ({ data: { locations: [] } }))
      ];
      
      // Only fetch users if user is admin
      if (user?.role === 'admin') {
        promises.push(axios.get('/api/users').catch(() => ({ data: { users: [] } })));
      }
      
      const results = await Promise.all(promises);
      setSchedules(results[0].data.schedules || []);
      setTemplates(results[1].data.templates || []);
      setLocations(results[2].data.locations || []);
      if (user?.role === 'admin' && results[3]) {
        setUsers(results[3].data.users || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        template_id: schedule.template_id,
        location_id: schedule.location_id || '',
        scheduled_date: schedule.scheduled_date ? schedule.scheduled_date.split('T')[0] : '',
        frequency: schedule.frequency || 'once',
        assigned_to: schedule.assigned_to || ''
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        template_id: '',
        location_id: '',
        scheduled_date: '',
        frequency: 'once',
        assigned_to: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
  };

  const handleSave = async () => {
    try {
      if (editingSchedule) {
        await axios.put(`/api/scheduled-audits/${editingSchedule.id}`, formData);
        showSuccess('Schedule updated successfully!');
      } else {
        await axios.post('/api/scheduled-audits', formData);
        showSuccess('Schedule created successfully!');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      showError('Error saving schedule. Make sure the backend API is implemented.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await axios.delete(`/api/scheduled-audits/${id}`);
        showSuccess('Schedule deleted successfully!');
        fetchData();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        showError('Error deleting schedule');
      }
    }
  };

  const handleStartAudit = (schedule) => {
    const params = new URLSearchParams();
    params.set('scheduled_id', schedule.id);
    if (schedule.location_id) {
      params.set('location_id', schedule.location_id);
    }
    const queryString = params.toString();
    navigate(`/audit/new/${schedule.template_id}${queryString ? `?${queryString}` : ''}`);
  };

  const canStartSchedule = (schedule) => {
    if (!schedule) return false;
    if (schedule.status !== 'pending') return false;
    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    if (schedule.assigned_to) {
      return isCreator || isAssignee;
    }
    return isCreator;
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
            Scheduled Audits
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={() => window.location.href = '/scheduled-report'}
            >
              View Report
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              New Schedule
            </Button>
          </Box>
        </Box>

        {schedules.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ScheduleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No scheduled audits
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create recurring audit schedules to automate your audit process
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Create First Schedule
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {schedules.map((schedule) => (
              <Grid item xs={12} sm={6} md={4} key={schedule.id}>
                <Card sx={{ 
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    borderColor: 'primary.main'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'start', flex: 1 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <CalendarTodayIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {schedule.template_name || 'Template'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {schedule.location_name || 'All Stores'}
                          </Typography>
                          {schedule.assigned_to_name && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              {schedule.assigned_to_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(schedule)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(schedule.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(schedule.scheduled_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={schedule.frequency}
                        size="small"
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Chip
                        label={schedule.status}
                        size="small"
                        color={schedule.status === 'completed' ? 'success' : 'default'}
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      {/* Start Audit Button - only show if user can start */}
                      {canStartSchedule(schedule) && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleStartAudit(schedule)}
                          fullWidth
                          sx={{
                            mt: 1,
                            textTransform: 'none',
                            borderRadius: 1
                          }}
                        >
                          Start Audit
                        </Button>
                      )}
                      {schedule.status === 'completed' && (
                        <Chip
                          label="Completed"
                          size="small"
                          color="success"
                          sx={{ alignSelf: 'flex-start', mt: 1 }}
                        />
                      )}
                    </Box>
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
            {editingSchedule ? 'Edit Scheduled Audit' : 'Create Scheduled Audit'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Template</InputLabel>
              <Select
                value={formData.template_id}
                label="Template"
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
              >
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Store (Optional)</InputLabel>
              <Select
                value={formData.location_id}
                    label="Store (Optional)"
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              >
                    <MenuItem value="">All Stores</MenuItem>
                {locations.map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Scheduled Date"
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequency}
                label="Frequency"
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <MenuItem value="once">Once</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            {user?.role === 'admin' && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Assign To (Optional)</InputLabel>
                <Select
                  value={formData.assigned_to}
                  label="Assign To (Optional)"
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map(userItem => (
                    <MenuItem key={userItem.id} value={userItem.id}>
                      {userItem.name} ({userItem.email})
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
      </Container>
    </Layout>
  );
};

export default ScheduledAudits;


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
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError, showInfo } from '../utils/toast';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';

const ScheduledAudits = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const navigate = useNavigate();

  // Permission checks
  const canManageScheduled = hasPermission(userPermissions, 'manage_scheduled_audits') || 
                             hasPermission(userPermissions, 'create_scheduled_audits') ||
                             hasPermission(userPermissions, 'update_scheduled_audits') ||
                             hasPermission(userPermissions, 'delete_scheduled_audits') ||
                             isAdmin(user);
  const canCreateScheduled = hasPermission(userPermissions, 'manage_scheduled_audits') || 
                             hasPermission(userPermissions, 'create_scheduled_audits') ||
                             isAdmin(user);
  const canViewReport = hasPermission(userPermissions, 'view_analytics') || 
                        hasPermission(userPermissions, 'manage_scheduled_audits') ||
                        isAdmin(user);
  const canViewLocations = hasPermission(userPermissions, 'view_locations') ||
                           hasPermission(userPermissions, 'manage_locations') ||
                           isAdmin(user);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedAudits, setLinkedAudits] = useState({}); // Map of scheduleId -> auditId
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openRescheduleDialog, setOpenRescheduleDialog] = useState(false);
  const [reschedulingSchedule, setReschedulingSchedule] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [rescheduleCount, setRescheduleCount] = useState({ count: 0, limit: 2, remaining: 2 });
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [parsedSchedules, setParsedSchedules] = useState([]);
  const [parseError, setParseError] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const getStatusValue = (status) => {
    if (!status) return 'pending';
    return status.toLowerCase();
  };

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
    fetchRescheduleCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRescheduleCount = async () => {
    try {
      const response = await axios.get('/api/scheduled-audits/reschedule-count');
      setRescheduleCount(response.data);
    } catch (error) {
      console.error('Error fetching reschedule count:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [
        axios.get('/api/scheduled-audits').catch((err) => {
          console.error('Error fetching scheduled audits:', err);
          return { data: { schedules: [] } };
        }),
        axios.get('/api/templates').catch((err) => {
          console.error('Error fetching templates:', err);
          return { data: { templates: [] } };
        }),
        canViewLocations
          ? axios.get('/api/locations').catch((err) => {
              console.error('Error fetching locations:', err);
              return { data: { locations: [] } };
            })
          : Promise.resolve({ data: { locations: [] } })
      ];
      
      // Fetch users for table view (needed for employee info)
      // Try to fetch users even if not admin, but it might fail
      if (user?.role === 'admin') {
        promises.push(axios.get('/api/users').catch((err) => {
          console.error('Error fetching users:', err);
          return { data: { users: [] } };
        }));
      }
      
      const results = await Promise.all(promises);
      let schedulesData = results[0].data.schedules || [];
      const templatesData = results[1].data.templates || [];
      const locationsData = results[2].data.locations || [];
      
      // Filter out completed scheduled audits on frontend as backup
      // (Backend should also filter, but this ensures it works)
      schedulesData = schedulesData.filter(schedule => {
        const status = getStatusValue(schedule.status);
        return status !== 'completed';
      });
      
      setSchedules(schedulesData);
      setTemplates(templatesData);
      setLocations(locationsData);
      
      if (user?.role === 'admin' && results[3]) {
        const usersData = results[3].data.users || [];
        setUsers(usersData);
      }

      // Fetch linked audits for in_progress scheduled audits
      const inProgressSchedules = schedulesData.filter(s => getStatusValue(s.status) === 'in_progress');
      if (inProgressSchedules.length > 0) {
        const auditPromises = inProgressSchedules.map(schedule =>
          axios.get(`/api/audits/by-scheduled/${schedule.id}`)
            .then(response => ({ scheduleId: schedule.id, auditId: response.data.audit.id }))
            .catch((error) => {
              // Silently handle 404 errors (no audit linked yet)
              if (error.response?.status !== 404) {
                console.error('Error fetching linked audit:', error);
              }
              return { scheduleId: schedule.id, auditId: null };
            })
        );
        const auditResults = await Promise.all(auditPromises);
        const auditsMap = {};
        auditResults.forEach(({ scheduleId, auditId }) => {
          if (auditId) {
            auditsMap[scheduleId] = auditId;
          }
        });
        setLinkedAudits(auditsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error loading scheduled audits. Please refresh the page.');
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

  const handleContinueAudit = (schedule) => {
    const auditId = linkedAudits[schedule.id];
    if (auditId) {
      navigate(`/audit/${auditId}`);
    }
  };

  const canContinueSchedule = (schedule) => {
    return getStatusValue(schedule.status) === 'in_progress' && linkedAudits[schedule.id];
  };

  const canStartSchedule = (schedule) => {
    if (!schedule) return false;
    
    // Check permission to start scheduled audits
    const hasStartPermission = hasPermission(userPermissions, 'start_scheduled_audits') || 
                               hasPermission(userPermissions, 'manage_scheduled_audits') || 
                               isAdmin(user);
    
    if (!hasStartPermission) return false;
    
    // Allow starting if status is null (pending) or 'pending', but not if 'completed' or 'in_progress'
    const statusValue = getStatusValue(schedule.status);
    const isPending = !schedule.status || statusValue === 'pending';
    if (!isPending) return false;
    
    // Check if scheduled date has arrived (cannot start before scheduled date)
    if (schedule.scheduled_date) {
      const scheduledDate = new Date(schedule.scheduled_date);
      scheduledDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today < scheduledDate) {
        return false; // Cannot start before scheduled date
      }
    }
    
    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    if (schedule.assigned_to) {
      return isCreator || isAssignee;
    }
    return isCreator;
  };
  
  // Helper to check if schedule date hasn't arrived yet
  const isScheduleDatePending = (schedule) => {
    if (!schedule?.scheduled_date) return false;
    const scheduledDate = new Date(schedule.scheduled_date);
    scheduledDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today < scheduledDate;
  };

  const canReschedule = (schedule) => {
    if (!schedule) return false;
    
    // Check permission to reschedule
    const hasReschedulePermission = hasPermission(userPermissions, 'reschedule_scheduled_audits') || 
                                    hasPermission(userPermissions, 'manage_scheduled_audits') || 
                                    isAdmin(user);
    
    if (!hasReschedulePermission) return false;
    
    // User can reschedule if they are assigned to it or created it
    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    const statusValue = getStatusValue(schedule.status);
    const isPending = !schedule.status || statusValue === 'pending';
    // Can only reschedule pending audits
    return isPending && (isCreator || isAssignee || isAdmin(user));
  };

  const handleOpenRescheduleDialog = (schedule) => {
    if (rescheduleCount.count >= rescheduleCount.limit) {
      showError(`You have already rescheduled ${rescheduleCount.count} audits this month. The limit is ${rescheduleCount.limit} reschedules per month.`);
      return;
    }
    setReschedulingSchedule(schedule);
    setNewRescheduleDate(schedule.scheduled_date || '');
    setOpenRescheduleDialog(true);
  };

  const handleCloseRescheduleDialog = () => {
    setOpenRescheduleDialog(false);
    setReschedulingSchedule(null);
    setNewRescheduleDate('');
  };

  const handleReschedule = async () => {
    if (!reschedulingSchedule || !newRescheduleDate) {
      showError('Please select a new date');
      return;
    }

    if (rescheduleCount.count >= rescheduleCount.limit) {
      showInfo(`You have already rescheduled ${rescheduleCount.count} audits this month. The limit is ${rescheduleCount.limit} reschedules per month.`);
      return;
    }

    try {
      const response = await axios.post(
        `/api/scheduled-audits/${reschedulingSchedule.id}/reschedule`,
        { new_date: newRescheduleDate }
      );
      showSuccess(response.data.message || 'Audit rescheduled successfully!');
      handleCloseRescheduleDialog();
      fetchData();
      fetchRescheduleCount();
    } catch (error) {
      console.error('Error rescheduling audit:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to reschedule audit';
      
      // Check if it's a limit reached error - show as info notification, not error
      if (error.response?.status === 400 && 
          (errorMessage.toLowerCase().includes('limit') || 
           errorMessage.toLowerCase().includes('rescheduled') ||
           errorMessage.toLowerCase().includes('already rescheduled'))) {
        showInfo(errorMessage);
      } else {
        showError(errorMessage);
      }
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
        setParsedSchedules([]);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const headerMap = {
        employee: headers.findIndex(h => h === 'employee' || h === 'employee email' || h === 'email'),
        name: headers.findIndex(h => (h === 'name' || h === 'user name') && !h.includes('store')),
        checklist: headers.findIndex(h => h === 'checklist' || h === 'template' || h === 'template name'),
        store: headers.findIndex(h => h === 'store' || h === 'store number' || h === 'storenumber'),
        storeName: headers.findIndex(h => h === 'store name' || h === 'storename' || h === 'location'),
        startDate: headers.findIndex(h => h === 'start date' || h === 'startdate' || h === 'date' || h === 'scheduled date'),
        status: headers.findIndex(h => h === 'status')
      };

      // Check for required fields
      if (headerMap.checklist === -1) {
        setParseError('CSV must have a "Checklist" or "Template" column');
        setParsedSchedules([]);
        return;
      }
      if (headerMap.startDate === -1) {
        setParseError('CSV must have a "Start Date" or "Date" column');
        setParsedSchedules([]);
        return;
      }

      // Parse data rows
      const schedules = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const checklist = headerMap.checklist >= 0 ? values[headerMap.checklist]?.replace(/^"|"$/g, '').trim() : '';
        const startDate = headerMap.startDate >= 0 ? values[headerMap.startDate]?.replace(/^"|"$/g, '').trim() : '';
        
        if (checklist && startDate) {
          schedules.push({
            employee: headerMap.employee >= 0 ? (values[headerMap.employee]?.replace(/^"|"$/g, '').trim() || '') : '',
            name: headerMap.name >= 0 ? (values[headerMap.name]?.replace(/^"|"$/g, '').trim() || '') : '',
            checklist: checklist,
            store: headerMap.store >= 0 ? (values[headerMap.store]?.replace(/^"|"$/g, '').trim() || '') : '',
            storeName: headerMap.storeName >= 0 ? (values[headerMap.storeName]?.replace(/^"|"$/g, '').trim() || '') : '',
            startDate: startDate,
            status: headerMap.status >= 0 ? (values[headerMap.status]?.replace(/^"|"$/g, '').trim() || 'pending') : 'pending'
          });
        }
      }

      if (schedules.length === 0) {
        setParseError('No valid schedules found in CSV. Make sure Checklist and Start Date columns are present.');
        setParsedSchedules([]);
        return;
      }

      setParsedSchedules(schedules);
    } catch (error) {
      setParseError(`Error parsing CSV: ${error.message}`);
      setParsedSchedules([]);
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
      setParsedSchedules([]);
      setParseError('');
    }
  };

  const handleCSVImport = async () => {
    if (!csvData || parsedSchedules.length === 0) {
      showError('Please provide valid CSV data');
      return;
    }

    if (parseError) {
      showError('Please fix CSV errors before importing');
      return;
    }

    setImporting(true);
    try {
      const response = await axios.post('/api/scheduled-audits/import', { schedules: parsedSchedules });
      
      // Show detailed results
      if (response.data.results) {
        const { success, failed, skipped, errors } = response.data.results;
        let message = `Import completed: ${success} successful`;
        if (failed > 0) message += `, ${failed} failed`;
        if (skipped > 0) message += `, ${skipped} skipped`;
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
          message += `. Errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
        }
        showSuccess(message);
      } else {
        showSuccess(response.data.message);
      }
      
      // Refresh data after import
      await fetchData();
      setOpenImportDialog(false);
      setCsvData('');
      setParsedSchedules([]);
      setParseError('');
    } catch (error) {
      console.error('Import error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to import CSV file';
      showError(errorMsg);
      
      // Still refresh data in case some records were imported
      fetchData();
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Employee,Name,Checklist,Store,Store Name,Start Date,Status
ankit@test.com,Ankit,Food Safety Checklist,5438,PG Ambience Mall GGN,2024-12-20,pending
admin@test.com,Admin,Equipment Maintenance,5046,PG Palladium Mumbai,2024-12-21,pending
ankit@test.com,Ankit,Cleanliness Audit,5040,PG Phoenix Pune,2024-12-22,pending`;
    
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scheduled-audits-sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenImportDialog = () => {
    setCsvData('');
    setParsedSchedules([]);
    setParseError('');
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    if (!importing) {
      setOpenImportDialog(false);
      setCsvData('');
      setParsedSchedules([]);
      setParseError('');
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
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
              Scheduled Audits
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={viewMode === 'cards' ? <TableChartIcon /> : <ScheduleIcon />}
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            >
              {viewMode === 'cards' ? 'Table View' : 'Card View'}
            </Button>
            {canCreateScheduled && (
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={handleOpenImportDialog}
              >
                Import CSV
              </Button>
            )}
            {canViewReport && (
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => window.location.href = '/scheduled-report'}
              >
                View Report
              </Button>
            )}
            {canCreateScheduled && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                New Schedule
              </Button>
            )}
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
                  {canCreateScheduled 
                    ? 'Create recurring audit schedules to automate your audit process'
                    : 'No scheduled audits available'}
                </Typography>
                {canCreateScheduled && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                  >
                    Create First Schedule
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Employee</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Checklist</strong></TableCell>
                  <TableCell><strong>Store</strong></TableCell>
                  <TableCell><strong>Store Name</strong></TableCell>
                  <TableCell><strong>Start Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((schedule) => {
                  // Get employee ID from email or use a default format
                  const assignedUser = users.find(u => u.id === schedule.assigned_to);
                  let employeeId = '';
                  if (schedule.assigned_to_email) {
                    employeeId = schedule.assigned_to_email.split('@')[0].toUpperCase();
                  } else if (assignedUser?.email) {
                    employeeId = assignedUser.email.split('@')[0].toUpperCase();
                  }
                  
                  const employeeName = schedule.assigned_to_name || assignedUser?.name || 'Unassigned';
                  
                  // Format date to match "Nov 30, 2025" format
                  const formatDate = (dateStr) => {
                    const date = new Date(dateStr);
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                  };
                  
                  return (
                    <TableRow key={schedule.id} hover>
                      <TableCell>{employeeId || 'N/A'}</TableCell>
                      <TableCell>{employeeName}</TableCell>
                      <TableCell>{schedule.template_name || 'N/A'}</TableCell>
                      <TableCell>{schedule.store_number || schedule.location_id || 'N/A'}</TableCell>
                      <TableCell>{schedule.location_name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(schedule.scheduled_date)}</TableCell>
                      <TableCell>
                        {(() => {
                          const statusValue = getStatusValue(schedule.status);
                          const statusLabel = (schedule.status || 'pending').replace(/_/g, ' ');
                          return (
                            <Chip
                              label={statusLabel}
                              size="small"
                              color={
                                statusValue === 'completed' ? 'success' :
                                statusValue === 'in_progress' ? 'warning' :
                                'default'
                              }
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {canReschedule(schedule) && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenRescheduleDialog(schedule)}
                            color="info"
                            title="Reschedule Audit"
                            sx={{ mr: 0.5 }}
                          >
                            <EventAvailableIcon />
                          </IconButton>
                        )}
                        {canManageScheduled && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(schedule)}
                              sx={{ color: 'primary.main' }}
                              title="Edit"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(schedule.id)}
                              color="error"
                              title="Delete"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                        {canContinueSchedule(schedule) && (
                          <IconButton
                            size="small"
                            onClick={() => handleContinueAudit(schedule)}
                            color="warning"
                            title="Continue Audit"
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        )}
                        {canStartSchedule(schedule) && (
                          <IconButton
                            size="small"
                            onClick={() => handleStartAudit(schedule)}
                            color="primary"
                            title="Start Audit"
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        )}
                        {isScheduleDatePending(schedule) && !canContinueSchedule(schedule) && (
                          <Tooltip title={`Scheduled for ${new Date(schedule.scheduled_date).toLocaleDateString()}`}>
                            <Chip 
                              label="Not Yet" 
                              size="small" 
                              color="warning" 
                              variant="outlined"
                              sx={{ ml: 0.5 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
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
                      {canManageScheduled && (
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
                      )}
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
                      {(() => {
                        const statusValue = getStatusValue(schedule.status);
                        const statusLabel = (schedule.status || 'pending').replace(/_/g, ' ');
                        return (
                          <Chip
                            label={statusLabel}
                            size="small"
                            color={
                              statusValue === 'completed' ? 'success' : 
                              statusValue === 'in_progress' ? 'warning' : 
                              'default'
                            }
                            sx={{ alignSelf: 'flex-start' }}
                          />
                        );
                      })()}
                      {/* Continue Audit Button - for in_progress audits */}
                      {canContinueSchedule(schedule) && (
                        <Button
                          variant="contained"
                          size="small"
                          color="warning"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleContinueAudit(schedule)}
                          fullWidth
                          sx={{
                            mt: 1,
                            textTransform: 'none',
                            borderRadius: 1
                          }}
                        >
                          Continue Audit
                        </Button>
                      )}
                      {/* Reschedule Button */}
                      {canReschedule(schedule) && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EventAvailableIcon />}
                          onClick={() => handleOpenRescheduleDialog(schedule)}
                          fullWidth
                          sx={{
                            mt: 1,
                            textTransform: 'none',
                            borderRadius: 1
                          }}
                        >
                          Reschedule
                        </Button>
                      )}
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
                      {/* Show message when schedule date hasn't arrived */}
                      {isScheduleDatePending(schedule) && !canContinueSchedule(schedule) && (
                        <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                          Scheduled for {new Date(schedule.scheduled_date).toLocaleDateString()}
                        </Alert>
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
                    {location.store_number ? `Store ${location.store_number} - ${location.name}` : location.name}
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
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid #e0e0e0'
          }}>
            Import Scheduled Audits from CSV
            <IconButton onClick={handleCloseImportDialog} size="small" sx={{ color: '#666' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-upload-scheduled"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="csv-upload-scheduled">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                >
                  Upload CSV File
                </Button>
              </label>
            </Box>
            <Button
              variant="text"
              onClick={handleDownloadSampleCsv}
              startIcon={<DownloadIcon />}
              sx={{ mb: 2 }}
            >
              Download Sample CSV
            </Button>
            <TextField
              fullWidth
              label="Paste CSV Data or Edit Below"
              value={csvData}
              onChange={(e) => handleCsvDataChange(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="Employee,Name,Checklist,Store,Store Name,Start Date,Status&#10;ankit@test.com,Ankit,Food Safety Checklist,5438,PG Ambience Mall GGN,2024-12-20,pending"
              helperText="Required: Checklist, Start Date. Optional: Employee/Name, Store/Store Name, Status"
            />
            
            {parseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {parseError}
              </Alert>
            )}

            {parsedSchedules.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Preview: {parsedSchedules.length} schedule(s) found
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Checklist</strong></TableCell>
                        <TableCell><strong>Store</strong></TableCell>
                        <TableCell><strong>Store Name</strong></TableCell>
                        <TableCell><strong>Start Date</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedSchedules.map((schedule, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{schedule.employee || '-'}</TableCell>
                          <TableCell>{schedule.name || '-'}</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {schedule.checklist || '-'}
                          </TableCell>
                          <TableCell>{schedule.store || '-'}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {schedule.storeName || '-'}
                          </TableCell>
                          <TableCell>{schedule.startDate || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={schedule.status || 'pending'} 
                              size="small" 
                              color={schedule.status === 'pending' ? 'default' : schedule.status === 'completed' ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Simple CSV Format:</strong><br />
                • <strong>Required:</strong> Checklist (or Template), Start Date (or Date)<br />
                • <strong>Optional:</strong> Employee (email), Name, Store (number), Store Name, Status<br />
                • <strong>Column names are flexible:</strong> "Checklist" or "Template", "Start Date" or "Date", etc.<br />
                • <strong>Quoted fields supported:</strong> Use quotes for values containing commas<br />
                • <strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-12-20)<br />
                <br />
                <strong>Example:</strong><br />
                <code style={{ fontSize: '11px' }}>
                  Employee,Name,Checklist,Store,Store Name,Start Date,Status<br />
                  ankit@test.com,Ankit,Food Safety Checklist,5438,PG Ambience Mall GGN,2024-12-20,pending<br />
                  admin@test.com,Admin,Equipment Maintenance,5046,PG Palladium Mumbai,2024-12-21,pending
                </code>
              </Typography>
            </Paper>
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
              variant="contained"
              disabled={!csvData || !parsedSchedules.length || parseError || importing}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
                '&:disabled': {
                  bgcolor: '#e0e0e0',
                },
              }}
            >
              {importing ? 'Importing...' : `Import ${parsedSchedules.length} Schedule(s)`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={openRescheduleDialog} onClose={handleCloseRescheduleDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Reschedule Audit</Typography>
              <IconButton onClick={handleCloseRescheduleDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {reschedulingSchedule && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Template: <strong>{reschedulingSchedule.template_name}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Date: <strong>{new Date(reschedulingSchedule.scheduled_date).toLocaleDateString()}</strong>
                  </Typography>
                  {reschedulingSchedule.location_name && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Location: <strong>{reschedulingSchedule.location_name}</strong>
                    </Typography>
                  )}
                </Box>
                <TextField
                  fullWidth
                  label="New Scheduled Date"
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0] // Prevent selecting past dates
                  }}
                  margin="normal"
                  required
                />
                {rescheduleCount.count >= rescheduleCount.limit && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    You have reached the monthly reschedule limit of {rescheduleCount.limit}. 
                    You cannot reschedule more audits this month.
                  </Alert>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseRescheduleDialog}>Cancel</Button>
            <Button
              onClick={handleReschedule}
              variant="contained"
              disabled={!newRescheduleDate || rescheduleCount.count >= rescheduleCount.limit}
            >
              Reschedule
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default ScheduledAudits;


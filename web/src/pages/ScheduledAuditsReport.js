import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import Layout from '../components/Layout';
import { showError } from '../utils/toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ScheduledAuditsReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [locationId, setLocationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [status, setStatus] = useState('');
  const [frequency, setFrequency] = useState('');
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchTemplates();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, locationId, templateId, status, frequency]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations').catch(() => ({ data: { locations: [] } }));
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (locationId) params.location_id = locationId;
      if (templateId) params.template_id = templateId;
      if (status) params.status = status;
      if (frequency) params.frequency = frequency;
      
      const response = await axios.get('/api/scheduled-audits/report', { params });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      showError('Error loading scheduled audits report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (locationId) params.append('location_id', locationId);
    if (templateId) params.append('template_id', templateId);
    window.open(`/api/reports/scheduled-audits/pdf?${params.toString()}`, '_blank');
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (locationId) params.append('location_id', locationId);
    if (templateId) params.append('template_id', templateId);
    const link = document.createElement('a');
    link.href = `/api/reports/scheduled-audits/csv?${params.toString()}`;
    link.download = 'scheduled-audits-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (!data) {
    return (
      <Layout>
        <Container>
          <Typography>No data available</Typography>
        </Container>
      </Layout>
    );
  }

  const { summary, byTemplate, byLocation, upcoming, overdue, schedules } = data;

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Scheduled Audits Report
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Date From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Date To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={locationId}
                    label="Store"
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <MenuItem value="">All Stores</MenuItem>
                    {locations.map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={templateId}
                    label="Template"
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <MenuItem value="">All Templates</MenuItem>
                    {templates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={1}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={1}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={frequency}
                    label="Frequency"
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="once">Once</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Schedules
                </Typography>
                <Typography variant="h4">{summary.totalSchedules}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Upcoming
                </Typography>
                <Typography variant="h4" color="info.main">
                  {summary.upcoming}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: summary.overdue > 0 ? '2px solid' : '1px solid', borderColor: summary.overdue > 0 ? 'error.main' : 'divider' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Overdue
                </Typography>
                <Typography variant="h4" color={summary.overdue > 0 ? 'error.main' : 'text.primary'}>
                  {summary.overdue}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary.byStatus.find(s => s.status === 'completed')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Status Distribution */}
          {summary.byStatus.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Status Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summary.byStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {summary.byStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Frequency Distribution */}
          {summary.byFrequency.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Frequency Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.byFrequency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="frequency" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Overdue Alerts */}
        {overdue.length > 0 && (
          <Card sx={{ mb: 3, bgcolor: 'error.light', border: '2px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ color: 'error.main', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: 'error.dark', fontWeight: 600 }}>
                  Overdue Scheduled Audits ({overdue.length})
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Scheduled Date</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overdue.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.template_name}</TableCell>
                        <TableCell>{schedule.location_name || 'N/A'}</TableCell>
                        <TableCell>{new Date(schedule.scheduled_date).toLocaleDateString()}</TableCell>
                        <TableCell>{schedule.assigned_to_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Chip label={schedule.status || 'pending'} size="small" color="error" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Schedules */}
        {upcoming.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ color: 'info.main', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Upcoming Scheduled Audits
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Scheduled Date</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcoming.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.template_name}</TableCell>
                        <TableCell>{schedule.location_name || 'N/A'}</TableCell>
                        <TableCell>{new Date(schedule.scheduled_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip label={schedule.frequency} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{schedule.assigned_to_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Chip label={schedule.status || 'pending'} size="small" color="warning" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* By Template */}
        {byTemplate.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedules by Template
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byTemplate.map((template) => (
                      <TableRow key={template.template}>
                        <TableCell>{template.template}</TableCell>
                        <TableCell align="right">{template.count}</TableCell>
                        <TableCell align="right">{template.completed}</TableCell>
                        <TableCell align="right">{template.pending}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* By Store */}
        {byLocation.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedules by Store
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byLocation.map((location) => (
                      <TableRow key={location.location}>
                        <TableCell>{location.location}</TableCell>
                        <TableCell align="right">{location.count}</TableCell>
                        <TableCell align="right">{location.completed}</TableCell>
                        <TableCell align="right">{location.pending}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* All Schedules */}
        {schedules.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Scheduled Audits ({schedules.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Scheduled Date</TableCell>
                      <TableCell>Next Run</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.template_name}</TableCell>
                        <TableCell>{schedule.location_name || 'N/A'}</TableCell>
                        <TableCell>{new Date(schedule.scheduled_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {schedule.next_run_date ? new Date(schedule.next_run_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip label={schedule.frequency} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{schedule.assigned_to_name || 'Unassigned'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={schedule.status || 'pending'}
                            size="small"
                            color={schedule.status === 'completed' ? 'success' : schedule.status === 'pending' ? 'warning' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {schedules.length === 0 && (
          <Card>
            <CardContent>
              <Typography align="center" color="textSecondary">
                No scheduled audits found for the selected filters
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Layout>
  );
};

export default ScheduledAuditsReport;


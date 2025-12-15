import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DashboardIcon from '@mui/icons-material/Dashboard';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';

const DashboardReport = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  const canViewAnalytics = hasPermission(userPermissions, 'view_analytics') || isAdmin(user);

  useEffect(() => {
    if (!canViewAnalytics) {
      setError('You do not have permission to view dashboard reports.');
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [canViewAnalytics]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/analytics/dashboard');
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('standard'); // 'standard' or 'enhanced'

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      setError(null);

      const endpoint = reportType === 'enhanced' 
        ? '/api/reports/dashboard/enhanced'
        : '/api/reports/dashboard/excel';
      
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

      const response = await axios.get(url, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url_download = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_download;
      link.download = `${reportType === 'enhanced' ? 'enhanced-' : ''}dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_download);
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!canViewAnalytics) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">
            You do not have permission to access this page.
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  Dashboard Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive analytics and statistics export
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadExcel}
              disabled={downloading || !analytics}
              size="large"
            >
              {downloading ? 'Downloading...' : 'Download Excel Report'}
            </Button>
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Report Options
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    <MenuItem value="standard">Standard Dashboard Report</MenuItem>
                    <MenuItem value="enhanced">Enhanced Detailed Report</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date From"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date To"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            {reportType === 'enhanced' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Enhanced report includes detailed audit tracking with deviations, action plans, and strike rates matching the Excel structure.
              </Alert>
            )}
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Report Options
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    <MenuItem value="standard">Standard Dashboard Report</MenuItem>
                    <MenuItem value="enhanced">Enhanced Detailed Report</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date From"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date To"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            {reportType === 'enhanced' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Enhanced report includes detailed audit tracking with deviations, action plans, and strike rates matching the Excel structure.
              </Alert>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {analytics && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                Report Preview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The Excel report will include the following sections:
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Summary Statistics
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Total Audits:</Typography>
                          <Chip label={analytics.total || 0} size="small" color="primary" />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Completed:</Typography>
                          <Chip label={analytics.completed || 0} size="small" color="success" />
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">In Progress:</Typography>
                          <Chip label={analytics.inProgress || 0} size="small" color="warning" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Average Score:</Typography>
                          <Chip 
                            label={`${analytics.avgScore || 0}%`} 
                            size="small" 
                            color={analytics.avgScore >= 80 ? 'success' : analytics.avgScore >= 60 ? 'warning' : 'error'} 
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Schedule Adherence
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {analytics.scheduleAdherence && (
                          <>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2">Total Scheduled:</Typography>
                              <Chip label={analytics.scheduleAdherence.total || 0} size="small" />
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2">Completed On Time:</Typography>
                              <Chip label={analytics.scheduleAdherence.onTime || 0} size="small" color="success" />
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2">Adherence Rate:</Typography>
                              <Chip 
                                label={`${analytics.scheduleAdherence.adherence || 0}%`} 
                                size="small" 
                                color={analytics.scheduleAdherence.adherence >= 80 ? 'success' : analytics.scheduleAdherence.adherence >= 60 ? 'warning' : 'error'} 
                              />
                            </Box>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Monthly Trends
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.byMonth?.length || 0} months of data
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Top Stores
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.topStores?.length || 0} stores
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Top Auditors
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.topUsers?.length || 0} auditors
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Audits
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.recent?.length || 0} recent audits
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Report Sections Included:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  <li>Summary - Key metrics and statistics</li>
                  <li>Status Breakdown - Audits by status</li>
                  <li>Monthly Trends - 12-month trend analysis</li>
                  <li>Top Stores - Performance by store</li>
                  <li>Top Auditors - Performance by auditor</li>
                  <li>Recent Audits - Latest audit details</li>
                  <li>Schedule Adherence - On-time completion metrics</li>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default DashboardReport;


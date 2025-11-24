import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
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
  Button,
  TextField,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import DownloadIcon from '@mui/icons-material/Download';
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';

const StoreAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'card' or 'list'
  const [downloadAnchor, setDownloadAnchor] = useState(null);

  useEffect(() => {
    fetchStoreAnalytics();
  }, []);

  const fetchStoreAnalytics = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await axios.get('/api/reports/analytics-by-store', { params });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching store analytics:', error);
      toast.error('Failed to load store analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = { format: 'csv' };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await axios.get('/api/reports/analytics-by-store', {
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `planner-analytics-bystore-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully');
      setDownloadAnchor(null);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadClick = (event) => {
    setDownloadAnchor(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setDownloadAnchor(null);
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleFilter = () => {
    fetchStoreAnalytics();
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

  if (!data || !data.stores) {
    return (
      <Layout>
        <Container>
          <Alert severity="info">No store analytics data available</Alert>
        </Container>
      </Layout>
    );
  }

  const chartData = data.stores.map(store => ({
    name: store.store_number ? `Store ${store.store_number}` : store.store_name,
    'Total Audits': store.total_audits,
    'Completed': store.completed_audits,
    'In Progress': store.in_progress_audits,
    'Avg Score': store.average_score
  }));

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Planner Analytics by Store
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
            >
              <ToggleButton value="card" aria-label="card view">
                <ViewModuleIcon sx={{ mr: 1 }} />
                Card
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <ViewListIcon sx={{ mr: 1 }} />
                List
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadClick}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Download'}
            </Button>
            <Menu
              anchorEl={downloadAnchor}
              open={Boolean(downloadAnchor)}
              onClose={handleDownloadClose}
            >
              <MenuItem onClick={handleExportCSV} disabled={exporting}>
                Download as CSV
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Date Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleFilter}
                  sx={{ height: '56px' }}
                >
                  Apply Filter
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Stores
                </Typography>
                <Typography variant="h4">{data.summary.total_stores}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Audits
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {data.summary.total_audits}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Date Range
                </Typography>
                <Typography variant="body1">
                  {data.summary.date_range.from === 'all' && data.summary.date_range.to === 'all'
                    ? 'All Time'
                    : `${data.summary.date_range.from || 'Start'} to ${data.summary.date_range.to || 'End'}`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Audits by Store
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Audits" fill="#8884d8" />
                <Bar dataKey="Completed" fill="#00C49F" />
                <Bar dataKey="In Progress" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Store Details - Card or List View */}
        {viewMode === 'card' ? (
          <Grid container spacing={3}>
            {data.stores.map((store, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="flex-start" mb={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                          flexShrink: 0
                        }}
                      >
                        <StorefrontIcon sx={{ color: 'white', fontSize: 28 }} />
                      </Box>
                      <Box flexGrow={1}>
                        <Typography variant="caption" color="text.secondary">
                          Store #{store.store_number || 'N/A'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {store.store_name}
                        </Typography>
                        {store.address && (
                          <Typography variant="body2" color="text.secondary">
                            {store.address}
                            {store.city && `, ${store.city}`}
                            {store.state && `, ${store.state}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Total Audits
                          </Typography>
                          <Typography variant="h6" color="primary.main">
                            {store.total_audits}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Completed
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {store.completed_audits}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            In Progress
                          </Typography>
                          <Typography variant="h6" color="warning.main">
                            {store.in_progress_audits}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Avg Score
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {store.average_score.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`Completion: ${store.completion_rate}%`}
                          size="small"
                          color={store.completion_rate >= 80 ? 'success' : store.completion_rate >= 50 ? 'warning' : 'error'}
                        />
                        {store.min_score !== null && store.max_score !== null && (
                          <Chip 
                            label={`Score: ${store.min_score}% - ${store.max_score}%`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Store Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Store #</strong></TableCell>
                      <TableCell><strong>Store Name</strong></TableCell>
                      <TableCell><strong>Address</strong></TableCell>
                      <TableCell align="right"><strong>Total Audits</strong></TableCell>
                      <TableCell align="right"><strong>Completed</strong></TableCell>
                      <TableCell align="right"><strong>In Progress</strong></TableCell>
                      <TableCell align="right"><strong>Avg Score</strong></TableCell>
                      <TableCell align="right"><strong>Min Score</strong></TableCell>
                      <TableCell align="right"><strong>Max Score</strong></TableCell>
                      <TableCell align="right"><strong>Completion Rate</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.stores.map((store, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{store.store_number || '-'}</TableCell>
                        <TableCell>{store.store_name}</TableCell>
                        <TableCell>
                          {store.address ? (
                            <>
                              {store.address}
                              {store.city && `, ${store.city}`}
                              {store.state && `, ${store.state}`}
                            </>
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">{store.total_audits}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          {store.completed_audits}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>
                          {store.in_progress_audits}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {store.average_score.toFixed(1)}%
                        </TableCell>
                        <TableCell align="right">
                          {store.min_score !== null ? `${store.min_score}%` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {store.max_score !== null ? `${store.max_score}%` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {store.completion_rate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Container>
    </Layout>
  );
};

export default StoreAnalytics;


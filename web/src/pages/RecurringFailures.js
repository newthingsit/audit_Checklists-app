import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Tooltip,
  IconButton,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StoreIcon from '@mui/icons-material/Store';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import Layout from '../components/Layout';
import { themeConfig } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/permissions';

const COLORS = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'];

const RecurringFailures = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({
    template_id: '',
    location_id: '',
    date_from: '',
    date_to: ''
  });
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.template_id) params.template_id = filters.template_id;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const [recurringRes, trendRes, templatesRes, locationsRes] = await Promise.all([
        axios.get('/api/analytics/recurring-failures', { params }),
        axios.get('/api/analytics/recurring-failures/trend', { params: { ...params, months: 6 } }),
        axios.get('/api/checklists').catch(() => ({ data: { templates: [] } })),
        axios.get('/api/locations').catch(() => ({ data: { locations: [] } }))
      ]);

      setData(recurringRes.data);
      setTrend(trendRes.data.trend || []);
      setTemplates(templatesRes.data.templates || []);
      setLocations(locationsRes.data.locations || []);
    } catch (error) {
      console.error('Error fetching recurring failures:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Create CSV data
      const items = data?.all_items || [];
      const headers = ['Item Title', 'Category', 'Template', 'Failure Count', 'Stores Affected', 'Last Failure', 'Critical'];
      const csvData = items.map(item => [
        item.title,
        item.category || 'N/A',
        item.template_name,
        item.failure_count,
        item.stores_affected,
        item.last_failure_date ? new Date(item.last_failure_date).toLocaleDateString() : 'N/A',
        item.is_critical ? 'Yes' : 'No'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `recurring_failures_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityColor = (failureCount) => {
    if (failureCount >= 5) return 'error';
    if (failureCount >= 3) return 'warning';
    return 'info';
  };

  const getSeverityLabel = (failureCount) => {
    if (failureCount >= 5) return 'Critical';
    if (failureCount >= 3) return 'High';
    return 'Medium';
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const summary = data?.summary || {};
  const byTemplate = data?.by_template || [];
  const byStore = data?.by_store || [];
  const allItems = data?.all_items || [];

  // Prepare chart data
  const templateChartData = byTemplate.map(t => ({
    name: t.template_name?.substring(0, 20) + (t.template_name?.length > 20 ? '...' : ''),
    count: t.recurring_items?.length || 0
  }));

  const storeChartData = byStore.slice(0, 10).map((s, index) => {
    // Create unique, readable store name
    let storeName = s.store_name || `Store ${s.store_number || index + 1}`;
    // Truncate long names but keep them readable
    if (storeName.length > 25) {
      storeName = storeName.substring(0, 22) + '...';
    }
    return {
      name: storeName,
      fullName: s.store_name || `Store ${s.store_number}`, // For tooltip
      failures: s.recurring_items || 0,
      storeNumber: s.store_number
    };
  });

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'bottom', color: 'warning.main' }} />
              Recurring Failures Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track and analyze items that repeatedly fail across audits
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              disabled={exporting || allItems.length === 0}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterListIcon color="action" />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Template</InputLabel>
              <Select
                value={filters.template_id}
                label="Template"
                onChange={(e) => handleFilterChange('template_id', e.target.value)}
              >
                <MenuItem value="">All Templates</MenuItem>
                {templates.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Location</InputLabel>
              <Select
                value={filters.location_id}
                label="Location"
                onChange={(e) => handleFilterChange('location_id', e.target.value)}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map(l => (
                  <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From Date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To Date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff5f5', borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Recurring Items
                </Typography>
                <Typography variant="h3" fontWeight={700} color="error.main">
                  {summary.total_recurring_items || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed 2+ times in 6 months
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff8e5', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Critical Recurring
                </Typography>
                <Typography variant="h3" fontWeight={700} color="warning.dark">
                  {summary.critical_recurring || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed 3+ times
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid', borderLeftColor: 'info.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Stores Affected
                </Typography>
                <Typography variant="h3" fontWeight={700} color="info.dark">
                  {summary.stores_with_recurring || byStore.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  With recurring issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid', borderLeftColor: 'secondary.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Most Failed Item
                </Typography>
                <Typography variant="body1" fontWeight={600} noWrap title={summary.most_failed_item?.title}>
                  {summary.most_failed_item?.title?.substring(0, 25) || 'N/A'}
                  {summary.most_failed_item?.title?.length > 25 ? '...' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {summary.most_failed_item?.failure_count || 0} failures
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Trend Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Failure Trend (Last 6 Months)
              </Typography>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="failed_items" 
                      name="Failed Items"
                      stroke={themeConfig.error.main} 
                      strokeWidth={2}
                      dot={{ fill: themeConfig.error.main }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_audits" 
                      name="Total Audits"
                      stroke={themeConfig.primary.main} 
                      strokeWidth={2}
                      dot={{ fill: themeConfig.primary.main }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No trend data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Template Distribution */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                By Template
              </Typography>
              {templateChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={templateChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {templateChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Stores with Most Issues */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <StoreIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Stores with Most Recurring Issues
              </Typography>
              {storeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(400, storeChartData.length * 45)}>
                  <BarChart 
                    data={storeChartData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis 
                      type="number" 
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={200}
                      tick={{ fontSize: 12, fill: '#333' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip 
                      formatter={(value, name, props) => [`${value} recurring items`, props.payload.fullName || props.payload.name]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                      labelFormatter={(label) => label}
                    />
                    <Bar 
                      dataKey="failures" 
                      fill={themeConfig.error.main} 
                      name="Recurring Items"
                      radius={[0, 4, 4, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No store data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Detailed Items by Template */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Recurring Items by Template
        </Typography>
        
        {byTemplate.length > 0 ? (
          byTemplate.map((template) => (
            <Accordion key={template.template_id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography fontWeight={600}>{template.template_name}</Typography>
                  <Chip 
                    size="small" 
                    label={`${template.recurring_items?.length || 0} recurring items`}
                    color="warning"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="center">Failure Count</TableCell>
                        <TableCell align="center">Stores Affected</TableCell>
                        <TableCell>Last Failure</TableCell>
                        <TableCell align="center">Severity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(template.recurring_items || []).map((item, index) => (
                        <TableRow 
                          key={index}
                          sx={{ 
                            bgcolor: item.failure_count >= 5 ? '#ffebee' : 
                                    item.failure_count >= 3 ? '#fff8e1' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {item.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={item.category || 'General'} variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              fontWeight={700}
                              color={item.failure_count >= 5 ? 'error.main' : 
                                    item.failure_count >= 3 ? 'warning.dark' : 'text.primary'}
                            >
                              {item.failure_count}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{item.stores_affected}</TableCell>
                          <TableCell>
                            {item.last_failure_date 
                              ? new Date(item.last_failure_date).toLocaleDateString()
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={getSeverityLabel(item.failure_count)}
                              color={getSeverityColor(item.failure_count)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No recurring failures found for the selected filters. This is good news! 🎉
          </Alert>
        )}

        {/* All Items Table */}
        {allItems.length > 0 && (
          <Paper sx={{ mt: 4, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              All Recurring Items ({allItems.length})
            </Typography>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Template</TableCell>
                    <TableCell align="center">Failures</TableCell>
                    <TableCell align="center">Stores</TableCell>
                    <TableCell>Last Failed</TableCell>
                    <TableCell align="center">Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allItems.map((item, index) => (
                    <TableRow 
                      key={`${item.item_id}-${index}`}
                      hover
                      sx={{ 
                        bgcolor: item.failure_count >= 5 ? '#ffebee' : 
                                item.failure_count >= 3 ? '#fff8e1' : 'inherit'
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Tooltip title={item.title} arrow>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                            {item.title}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.category || 'General'} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {item.template_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          fontWeight={700}
                          color={item.failure_count >= 5 ? 'error.main' : 
                                item.failure_count >= 3 ? 'warning.dark' : 'text.primary'}
                        >
                          {item.failure_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.stores_affected}</TableCell>
                      <TableCell>
                        {item.last_failure_date 
                          ? new Date(item.last_failure_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          size="small" 
                          label={getSeverityLabel(item.failure_count)}
                          color={getSeverityColor(item.failure_count)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default RecurringFailures;

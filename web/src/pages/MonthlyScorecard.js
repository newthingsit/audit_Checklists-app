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
  Checkbox,
  ListItemText,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import axios from 'axios';
import Layout from '../components/Layout';
import { showError } from '../utils/toast';

const MonthlyScorecard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState([new Date().getMonth() + 1]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchScorecard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedMonths, selectedLocations, compareMode]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations').catch(() => ({ data: { locations: [] } }));
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchScorecard = async () => {
    setLoading(true);
    try {
      const params = { 
        year, 
        month: selectedMonths.join(','),
        compare_mode: compareMode && selectedMonths.length > 1 ? 'true' : 'false'
      };
      if (selectedLocations.length > 0) {
        params.location_id = selectedLocations.join(',');
      }
      
      const response = await axios.get('/api/reports/monthly-scorecard', { params });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching scorecard:', error);
      showError('Error loading monthly scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams({ 
        year, 
        month: selectedMonths.join(',')
      });
      if (selectedLocations.length > 0) {
        params.append('location_id', selectedLocations.join(','));
      }
      
      // Use axios to fetch the PDF as a blob to avoid React Router interception
      const response = await axios.get(`/api/reports/monthly-scorecard/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `monthly-scorecard-${year}-${selectedMonths.map(m => String(m).padStart(2, '0')).join('-')}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Error exporting PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({ 
        year, 
        month: selectedMonths.join(','),
        format: 'excel'
      });
      if (selectedLocations.length > 0) {
        params.append('location_id', selectedLocations.join(','));
      }
      
      const response = await axios.get(`/api/reports/monthly-scorecard?${params.toString()}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `monthly-scorecard-${year}-${selectedMonths.map(m => String(m).padStart(2, '0')).join('-')}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showError('Error exporting Excel');
    }
  };

  const handleMonthChange = (event) => {
    const value = event.target.value;
    setSelectedMonths(typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const handleLocationChange = (event) => {
    const value = event.target.value;
    setSelectedLocations(typeof value === 'string' ? value.split(',').map(Number) : value);
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

  const { period, summary, byTemplate, byLocation, dailyBreakdown, audits, monthComparison } = data;
  const isMultipleMonths = selectedMonths.length > 1;
  const showComparison = compareMode && isMultipleMonths && monthComparison;

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Monthly Scorecard Report
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={year}
                    label="Year"
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Month(s)</InputLabel>
                  <Select
                    multiple
                    value={selectedMonths}
                    label="Month(s)"
                    onChange={handleMonthChange}
                    renderValue={(selected) => 
                      selected.map(m => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })).join(', ')
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <MenuItem key={m} value={m}>
                        <Checkbox checked={selectedMonths.indexOf(m) > -1} />
                        <ListItemText primary={new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Store(s) (Optional)</InputLabel>
                  <Select
                    multiple
                    value={selectedLocations}
                    label="Store(s) (Optional)"
                    onChange={handleLocationChange}
                    renderValue={(selected) => {
                      if (selected.length === 0) return 'All Stores';
                      return selected.map(id => {
                        const loc = locations.find(l => l.id === id);
                        return loc ? loc.name : id;
                      }).join(', ');
                    }}
                  >
                    {locations.map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        <Checkbox checked={selectedLocations.indexOf(location.id) > -1} />
                        <ListItemText primary={location.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={compareMode && isMultipleMonths}
                      onChange={(e) => setCompareMode(e.target.checked)}
                      disabled={!isMultipleMonths}
                    />
                  }
                  label="Compare Months"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Month Comparison View */}
        {showComparison && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Month-wise Comparison
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      {Object.keys(monthComparison).map(monthName => (
                        <TableCell key={monthName} align="right">
                          {monthName} {year}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Total Audits</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">{month.totalAudits}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Completed Audits</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">{month.completedAudits}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>In Progress</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">{month.inProgressAudits}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Average Score</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">
                          {month.avgScore > 0 ? `${month.avgScore}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Min Score</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">
                          {month.minScore > 0 ? `${month.minScore}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Max Score</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">
                          {month.maxScore > 0 ? `${month.maxScore}%` : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Completion Rate</strong></TableCell>
                      {Object.values(monthComparison).map((month, idx) => (
                        <TableCell key={idx} align="right">{month.completionRate}%</TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Comparison Chart */}
        {showComparison && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Month Comparison Chart
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={Object.values(monthComparison).map(month => ({
                    name: month.monthName,
                    'Total Audits': month.totalAudits,
                    'Completed': month.completedAudits,
                    'Average Score': month.avgScore,
                    'Completion Rate': month.completionRate
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Total Audits" fill="#1976d2" />
                  <Bar dataKey="Completed" fill="#4caf50" />
                  <Bar dataKey="Average Score" fill="#ff9800" />
                  <Bar dataKey="Completion Rate" fill="#9c27b0" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Audits
                </Typography>
                <Typography variant="h4">{summary.totalAudits}</Typography>
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
                  {summary.completedAudits}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {summary.avgScore}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completion Rate
                </Typography>
                <Typography variant="h4" color="info.main">
                  {summary.completionRate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Daily Breakdown Chart */}
          {dailyBreakdown.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Audit Count
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#1976d2" name="Total Audits" />
                      <Bar dataKey="completed" fill="#4caf50" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Average Score Trend */}
          {dailyBreakdown.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Average Score
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgScore" stroke="#ff9800" name="Average Score %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* By Template */}
        {byTemplate.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance by Template
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell align="right">Total Audits</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Average Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byTemplate.map((template) => (
                      <TableRow key={template.template_name}>
                        <TableCell>{template.template_name}</TableCell>
                        <TableCell align="right">{template.count}</TableCell>
                        <TableCell align="right">{template.completed}</TableCell>
                        <TableCell align="right">
                          {template.avgScore > 0 ? `${template.avgScore}%` : 'N/A'}
                        </TableCell>
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
                Performance by Store
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Total Audits</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Average Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byLocation.map((location) => (
                      <TableRow key={location.location_name}>
                        <TableCell>{location.location_name}</TableCell>
                        <TableCell align="right">{location.count}</TableCell>
                        <TableCell align="right">{location.completed}</TableCell>
                        <TableCell align="right">
                          {location.avgScore > 0 ? `${location.avgScore}%` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Audit List */}
        {audits.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Audit Details {
                  period.monthName 
                    ? `${period.monthName} ${period.year}`
                    : period.months 
                      ? period.months.map(m => m.monthName).join(', ') + ` ${period.year}`
                      : `${year}`
                }
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Restaurant</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Template</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell>{audit.restaurant_name}</TableCell>
                        <TableCell>{audit.location_name || 'N/A'}</TableCell>
                        <TableCell>{audit.template_name}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={audit.status}
                            color={audit.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {audit.score !== null ? `${audit.score}%` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(audit.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {audits.length === 0 && (
          <Card>
            <CardContent>
              <Typography align="center" color="textSecondary">
                No audits found {
                  period.monthName 
                    ? `for ${period.monthName} ${period.year}`
                    : period.months 
                      ? `for ${period.months.map(m => m.monthName).join(', ')} ${period.year}`
                      : `for ${year}`
                }
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Layout>
  );
};

export default MonthlyScorecard;

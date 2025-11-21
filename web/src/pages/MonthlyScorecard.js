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
  Chip
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchScorecard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, locationId]);

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
      const params = { year, month };
      if (locationId) params.location_id = locationId;
      
      const response = await axios.get('/api/reports/monthly-scorecard', { params });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching scorecard:', error);
      showError('Error loading monthly scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const params = new URLSearchParams({ year, month });
    if (locationId) params.append('location_id', locationId);
    window.open(`/api/reports/monthly-scorecard/pdf?${params.toString()}`, '_blank');
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

  const { period, summary, byTemplate, byLocation, dailyBreakdown, audits } = data;

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Monthly Scorecard Report
          </Typography>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={month}
                    label="Month"
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <MenuItem key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Store (Optional)</InputLabel>
                  <Select
                    value={locationId}
                    label="Store (Optional)"
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
            </Grid>
          </CardContent>
        </Card>

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
                Audit Details ({period.monthName} {period.year})
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
                No audits found for {period.monthName} {period.year}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Layout>
  );
};

export default MonthlyScorecard;


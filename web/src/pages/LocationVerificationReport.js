import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Alert,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import MapIcon from '@mui/icons-material/Map';
import axios from 'axios';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';

const LocationVerificationReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    fetchData();
    fetchFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFilters = async () => {
    try {
      const [usersRes, locationsRes] = await Promise.all([
        axios.get('/api/users').catch(() => ({ data: { users: [] } })),
        axios.get('/api/locations').catch(() => ({ data: { locations: [] } }))
      ]);
      setUsers(usersRes.data.users || usersRes.data || []);
      setLocations(locationsRes.data.locations || locationsRes.data || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (selectedUser) params.user_id = selectedUser;
      if (selectedLocation) params.location_id = selectedLocation;

      const response = await axios.get('/api/reports/location-verification', { params });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching location verification data:', error);
      toast.error('Failed to load location verification report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (selectedUser) params.user_id = selectedUser;
      if (selectedLocation) params.location_id = selectedLocation;

      const response = await axios.get('/api/reports/location-verification/csv', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `location-verification-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'nearby': return 'info';
      case 'far': return 'warning';
      case 'suspicious': return 'error';
      case 'no_store_coords': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircleIcon fontSize="small" />;
      case 'nearby': return <LocationOnIcon fontSize="small" />;
      case 'far': return <WarningIcon fontSize="small" />;
      case 'suspicious': return <ErrorIcon fontSize="small" />;
      default: return <HelpOutlineIcon fontSize="small" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified': return 'Verified (≤100m)';
      case 'nearby': return 'Nearby (≤500m)';
      case 'far': return 'Far (≤1km)';
      case 'suspicious': return 'Suspicious (>1km)';
      case 'no_store_coords': return 'No Store GPS';
      default: return 'Unknown';
    }
  };

  const openInMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !data) {
    return (
      <Layout>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GpsFixedIcon color="primary" />
              Location Verification Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Compare store location vs GPS location captured during audits
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={exporting || !data?.users?.length}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="User"
                >
                  <MenuItem value="">All Users</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Store</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Store"
                >
                  <MenuItem value="">All Stores</MenuItem>
                  {locations.map(loc => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.store_number ? `${loc.store_number} - ` : ''}{loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={fetchData}
                disabled={loading}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Summary Cards */}
        {data?.summary && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {data.summary.total_audits}
                  </Typography>
                  <Typography variant="body2">Total Audits with GPS</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {data.summary.verification_breakdown.verified}
                  </Typography>
                  <Typography variant="body2">Verified (≤100m)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {data.summary.verification_breakdown.nearby}
                  </Typography>
                  <Typography variant="body2">Nearby (≤500m)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {data.summary.verification_breakdown.far}
                  </Typography>
                  <Typography variant="body2">Far (≤1km)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {data.summary.verification_breakdown.suspicious}
                  </Typography>
                  <Typography variant="body2">Suspicious (>1km)</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* No Data Message */}
        {!data?.users?.length && !loading && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No audits with GPS location data found. Make sure to capture GPS location when performing audits.
          </Alert>
        )}

        {/* User-wise Reports */}
        {data?.users?.map((user, index) => (
          <Accordion
            key={user.user_id || index}
            expanded={expandedUser === user.user_id}
            onChange={() => setExpandedUser(expandedUser === user.user_id ? null : user.user_id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', flexWrap: 'wrap' }}>
                <PersonIcon color="primary" />
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {user.user_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.user_email}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={`${user.stats.total} Audits`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    icon={<CheckCircleIcon />}
                    label={`${user.stats.verified} Verified`}
                    color="success"
                    variant="outlined"
                  />
                  {user.stats.suspicious > 0 && (
                    <Chip
                      size="small"
                      icon={<ErrorIcon />}
                      label={`${user.stats.suspicious} Suspicious`}
                      color="error"
                      variant="outlined"
                    />
                  )}
                  <Chip
                    size="small"
                    label={`${user.stats.verification_rate}% Rate`}
                    color={user.stats.verification_rate >= 80 ? 'success' : user.stats.verification_rate >= 50 ? 'warning' : 'error'}
                  />
                  <Chip
                    size="small"
                    label={`Avg: ${user.stats.avg_distance}m`}
                    variant="outlined"
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>Audit Date</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Store Coordinates</TableCell>
                      <TableCell>GPS Captured</TableCell>
                      <TableCell align="center">Distance</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {user.audits.map((audit) => (
                      <TableRow key={audit.audit_id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(audit.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {audit.location_name || audit.restaurant_name}
                          </Typography>
                          {audit.store_number && (
                            <Typography variant="caption" color="text.secondary">
                              Store #{audit.store_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {audit.store_latitude && audit.store_longitude ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOnIcon fontSize="small" color="action" />
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {audit.store_latitude.toFixed(6)}, {audit.store_longitude.toFixed(6)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Not set
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <GpsFixedIcon fontSize="small" color="primary" />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {audit.gps_latitude.toFixed(6)}, {audit.gps_longitude.toFixed(6)}
                            </Typography>
                          </Box>
                          {audit.gps_accuracy && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Accuracy: ±{Math.round(audit.gps_accuracy)}m
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={
                              audit.distance_meters === null ? 'text.secondary' :
                              audit.distance_meters <= 100 ? 'success.main' :
                              audit.distance_meters <= 500 ? 'info.main' :
                              audit.distance_meters <= 1000 ? 'warning.main' : 'error.main'
                            }
                          >
                            {audit.distance_display}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={getStatusLabel(audit.verification_status)}>
                            <Chip
                              size="small"
                              icon={getStatusIcon(audit.verification_status)}
                              label={audit.verification_status.replace(/_/g, ' ')}
                              color={getStatusColor(audit.verification_status)}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          {audit.score !== null ? (
                            <Chip
                              size="small"
                              label={`${audit.score}%`}
                              color={audit.score >= 80 ? 'success' : audit.score >= 60 ? 'warning' : 'error'}
                              variant="outlined"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View GPS Location on Map">
                            <IconButton
                              size="small"
                              onClick={() => openInMaps(audit.gps_latitude, audit.gps_longitude)}
                            >
                              <MapIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Legend */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Verification Status Legend:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip size="small" icon={<CheckCircleIcon />} label="Verified: ≤100m from store" color="success" />
            <Chip size="small" icon={<LocationOnIcon />} label="Nearby: ≤500m from store" color="info" />
            <Chip size="small" icon={<WarningIcon />} label="Far: ≤1km from store" color="warning" />
            <Chip size="small" icon={<ErrorIcon />} label="Suspicious: >1km from store" color="error" />
            <Chip size="small" icon={<HelpOutlineIcon />} label="No Store GPS: Store coordinates not set" />
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
};

export default LocationVerificationReport;


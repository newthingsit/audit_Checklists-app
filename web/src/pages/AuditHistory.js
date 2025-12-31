import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Toolbar,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import SortIcon from '@mui/icons-material/Sort';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import Pagination from '@mui/material/Pagination';
import axios from 'axios';
import Layout from '../components/Layout';
import ExportMenu from '../components/ExportMenu';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { NoAuditsState, NoSearchResultsState } from '../components/ui/EmptyState';
import { showSuccess, showError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';
import { themeConfig } from '../config/theme';

const AuditHistory = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const [audits, setAudits] = useState([]);
  const [filteredAudits, setFilteredAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [templates, setTemplates] = useState([]);
  const [selectedAudits, setSelectedAudits] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'compact'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'score', 'name', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [quickDateFilter, setQuickDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'year'
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewAudit, setPreviewAudit] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAudits();
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = audits;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(audit =>
        audit.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(audit => audit.status === statusFilter);
    }

    // Apply template filter
    if (templateFilter !== 'all') {
      filtered = filtered.filter(audit => audit.template_id === parseInt(templateFilter));
    }

    // Apply quick date filter
    if (quickDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(audit => {
        const auditDate = new Date(audit.created_at);
        auditDate.setHours(0, 0, 0, 0);
        
        switch (quickDateFilter) {
          case 'today':
            return auditDate.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return auditDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return auditDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return auditDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Apply date range filter (if not using quick filter)
    if (quickDateFilter === 'all') {
      if (dateRange.from) {
        filtered = filtered.filter(audit => {
          const auditDate = new Date(audit.created_at);
          return auditDate >= new Date(dateRange.from);
        });
      }
      if (dateRange.to) {
        filtered = filtered.filter(audit => {
          const auditDate = new Date(audit.created_at);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return auditDate <= toDate;
        });
      }
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'name':
          comparison = a.restaurant_name.localeCompare(b.restaurant_name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredAudits(filtered);
    setPage(0); // Reset to first page when filters change
  }, [audits, searchTerm, statusFilter, templateFilter, dateRange, quickDateFilter, sortBy, sortOrder]);

  const fetchAudits = async () => {
    try {
      const response = await axios.get('/api/audits');
      const auditsData = response.data.audits || [];
      setAudits(auditsData);
      setFilteredAudits(auditsData);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedAudits(new Set(filteredAudits.map(a => a.id)));
    } else {
      setSelectedAudits(new Set());
    }
  };

  const handleSelectAudit = (auditId, checked) => {
    const newSelected = new Set(selectedAudits);
    if (checked) {
      newSelected.add(auditId);
    } else {
      newSelected.delete(auditId);
    }
    setSelectedAudits(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedAudits.size === 0) {
      showError('Please select audits to delete');
      return;
    }

    try {
      await axios.post('/api/audits/bulk-delete', {
        auditIds: Array.from(selectedAudits)
      });
      showSuccess(`${selectedAudits.size} audit(s) deleted successfully`);
      setSelectedAudits(new Set());
      setDeleteDialogOpen(false);
      fetchAudits();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete audits');
    }
  };

  const handleBulkExport = () => {
    if (selectedAudits.size === 0) {
      showError('Please select audits to export');
      return;
    }

    const auditIds = Array.from(selectedAudits).join(',');
    window.open(`/api/reports/audits/csv?ids=${auditIds}`, '_blank');
    showSuccess(`Exporting ${selectedAudits.size} audit(s)`);
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Box sx={{ width: 200, height: 32, bgcolor: themeConfig.border.light, borderRadius: 1, mb: 1 }} />
                <Box sx={{ width: 300, height: 20, bgcolor: themeConfig.border.light, borderRadius: 1 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 1, height: 56, bgcolor: themeConfig.border.light, borderRadius: 1 }} />
              <Box sx={{ width: 150, height: 56, bgcolor: themeConfig.border.light, borderRadius: 1 }} />
              <Box sx={{ width: 150, height: 56, bgcolor: themeConfig.border.light, borderRadius: 1 }} />
            </Box>
          </Box>
          <CardSkeleton count={6} />
        </Container>
      </Layout>
    );
  }

  const allSelected = filteredAudits.length > 0 && selectedAudits.size === filteredAudits.length;
  const someSelected = selectedAudits.size > 0 && selectedAudits.size < filteredAudits.length;

  // Calculate statistics
  const stats = {
    total: filteredAudits.length,
    completed: filteredAudits.filter(a => a.status === 'completed').length,
    inProgress: filteredAudits.filter(a => a.status === 'in_progress').length,
    averageScore: filteredAudits.filter(a => a.score !== null).length > 0
      ? Math.round(filteredAudits.filter(a => a.score !== null).reduce((sum, a) => sum + (a.score || 0), 0) / filteredAudits.filter(a => a.score !== null).length)
      : 0,
    completionRate: filteredAudits.length > 0
      ? Math.round((filteredAudits.filter(a => a.status === 'completed').length / filteredAudits.length) * 100)
      : 0
  };

  // Pagination
  const paginatedAudits = filteredAudits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.ceil(filteredAudits.length / rowsPerPage);

  const handleQuickPreview = async (auditId) => {
    try {
      const response = await axios.get(`/api/audits/${auditId}`);
      setPreviewAudit(response.data);
      setPreviewDialogOpen(true);
    } catch (error) {
      showError('Failed to load audit preview');
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: themeConfig.text.primary, mb: 0.5 }}>
              Audit History
            </Typography>
            <Typography variant="body2" sx={{ color: themeConfig.text.secondary }}>
              View and manage all your completed and in-progress audits
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, mr: 1 }}>
              <Tooltip title="Grid View">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  sx={{ borderRadius: 0 }}
                >
                  <ViewModuleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  sx={{ borderRadius: 0 }}
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Compact View">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('compact')}
                  color={viewMode === 'compact' ? 'primary' : 'default'}
                  sx={{ borderRadius: 0 }}
                >
                  <ViewCompactIcon />
                </IconButton>
              </Tooltip>
            </Box>
            {selectedAudits.size > 0 && (
              <>
                <Button
                  startIcon={<FileDownloadIcon />}
                  variant="outlined"
                  onClick={handleBulkExport}
                  size="small"
                >
                  Export ({selectedAudits.size})
                </Button>
                {(hasPermission(userPermissions, 'delete_audits') || 
                  hasPermission(userPermissions, 'manage_audits') || 
                  isAdmin(user)) && (
                  <Button
                    startIcon={<DeleteIcon />}
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                    size="small"
                  >
                    Delete ({selectedAudits.size})
                  </Button>
                )}
              </>
            )}
            <ExportMenu audits={filteredAudits} />
          </Box>
        </Box>

        {/* Statistics Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2">Total Audits</Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.completed}
                    </Typography>
                    <Typography variant="body2">Completed</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.averageScore}%
                    </Typography>
                    <Typography variant="body2">Avg Score</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.completionRate}%
                    </Typography>
                    <Typography variant="body2">Completion Rate</Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {selectedAudits.size > 0 && (
          <Paper sx={{ 
            mb: 3, 
            p: 2, 
            background: themeConfig.dashboardCards.card1,
            borderRadius: themeConfig.borderRadius.medium,
            color: 'white' 
          }}>
            <Toolbar sx={{ minHeight: '48px !important', px: '0 !important' }}>
              <Typography sx={{ flexGrow: 1, fontWeight: 500 }}>
                {selectedAudits.size} audit(s) selected
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedAudits(new Set())}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
                variant="outlined"
              >
                Clear Selection
              </Button>
            </Toolbar>
          </Paper>
        )}

        <Paper sx={{ p: 2.5, mb: 3, borderRadius: themeConfig.borderRadius.medium }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              placeholder="Search audits by restaurant name, location, or template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: themeConfig.text.secondary }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                flex: 1, 
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  borderRadius: themeConfig.borderRadius.medium,
                },
              }}
              size="small"
            />
            <FormControl sx={{ minWidth: 140 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: themeConfig.borderRadius.small }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 140 }} size="small">
              <InputLabel>Template</InputLabel>
              <Select
                value={templateFilter}
                label="Template"
                onChange={(e) => setTemplateFilter(e.target.value)}
                sx={{ borderRadius: themeConfig.borderRadius.small }}
              >
                <MenuItem value="all">All Templates</MenuItem>
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 140 }} size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ borderRadius: themeConfig.borderRadius.small }}
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="score">Score</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <SortIcon />
            </IconButton>
          </Box>
          
          {/* Quick Date Filters */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: themeConfig.text.secondary, mr: 1 }}>
              Quick Filters:
            </Typography>
            {['all', 'today', 'week', 'month', 'year'].map((filter) => (
              <Chip
                key={filter}
                label={filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                onClick={() => {
                  setQuickDateFilter(filter);
                  if (filter !== 'all') {
                    setDateRange({ from: '', to: '' });
                  }
                }}
                color={quickDateFilter === filter ? 'primary' : 'default'}
                variant={quickDateFilter === filter ? 'filled' : 'outlined'}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
            ))}
            {quickDateFilter === 'all' && (
              <>
                <TextField
                  label="From"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    minWidth: 140,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: themeConfig.borderRadius.small,
                    },
                  }}
                  size="small"
                />
                <TextField
                  label="To"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    minWidth: 140,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: themeConfig.borderRadius.small,
                    },
                  }}
                  size="small"
                />
              </>
            )}
          </Box>
        </Paper>

        {filteredAudits.length === 0 ? (
          <Card sx={{ borderRadius: themeConfig.borderRadius.medium }}>
            <CardContent>
              {searchTerm || statusFilter !== 'all' || templateFilter !== 'all' || dateRange.from || dateRange.to ? (
                <NoSearchResultsState searchTerm={searchTerm || 'your filters'} />
              ) : (
                <NoAuditsState onAction={() => navigate('/checklists')} />
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <Typography variant="body2" color="text.secondary">
                Select All ({filteredAudits.length} audits)
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {paginatedAudits.map((audit, index) => (
                <Grid item xs={12} sm={6} md={4} key={audit.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: audit.status === 'completed' ? '2px solid' : '1px solid',
                      borderColor: selectedAudits.has(audit.id) 
                        ? 'primary.main' 
                        : audit.status === 'completed' 
                          ? 'success.main' 
                          : 'divider',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'visible',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                        borderColor: audit.status === 'completed' ? 'success.dark' : 'primary.main'
                      },
                      // Green tick badge in corner for completed audits
                      ...(audit.status === 'completed' && {
                        '&::after': {
                          content: '"✓"',
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          boxShadow: 2,
                          zIndex: 1
                        }
                      })
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
                      <Checkbox
                        checked={selectedAudits.has(audit.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectAudit(audit.id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                      />
                      <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/audit/${audit.id}`)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                          <Box sx={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: 2,
                            bgcolor: audit.status === 'completed' ? 'success.light' : 'warning.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}>
                            {audit.status === 'completed' ? (
                              <CheckCircleIcon sx={{ color: 'success.main' }} />
                            ) : (
                              <ScheduleIcon sx={{ color: 'warning.main' }} />
                            )}
                          </Box>
                          <Box sx={{ flexGrow: 1, pr: 4 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                              {audit.restaurant_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {audit.location || 'No location specified'}
                            </Typography>
                            {audit.user_name && (
                              <Typography variant="caption" color="text.secondary">
                                By: {audit.user_name}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        
                        <Chip
                          label={audit.template_name}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={audit.status}
                            color={audit.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                          {audit.score !== null && (
                            <Box sx={{ 
                              px: 1.5, 
                              py: 0.5, 
                              borderRadius: 2,
                              bgcolor: audit.score >= 80 ? 'success.light' : audit.score >= 60 ? 'warning.light' : 'error.light'
                            }}>
                              <Typography variant="body2" fontWeight="bold" color={audit.score >= 80 ? 'success.dark' : audit.score >= 60 ? 'warning.dark' : 'error.dark'}>
                                {audit.score}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                          {new Date(audit.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                    <Box sx={{ display: 'flex', gap: 1, p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickPreview(audit.id);
                        }}
                        sx={{ flex: 1 }}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/audit/${audit.id}`);
                          setTimeout(() => {
                            window.print();
                          }, 500);
                        }}
                        sx={{ flex: 1 }}
                      >
                        Print
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EmailIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/audit/${audit.id}`);
                        }}
                        sx={{ flex: 1 }}
                      >
                        Email
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {/* Pagination */}
            {filteredAudits.length > rowsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page + 1}
                  onChange={(event, value) => setPage(value - 1)}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
            
            {/* Rows per page selector */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, filteredAudits.length)} of {filteredAudits.length}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={rowsPerPage}
                  label="Per Page"
                  onChange={(e) => {
                    setRowsPerPage(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value={6}>6</MenuItem>
                  <MenuItem value={12}>12</MenuItem>
                  <MenuItem value={24}>24</MenuItem>
                  <MenuItem value={48}>48</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {/* Quick Preview Dialog */}
        <Dialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {previewAudit?.audit?.restaurant_name || 'Audit Preview'}
              </Typography>
              <IconButton onClick={() => setPreviewDialogOpen(false)} size="small">
                <CancelIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {previewAudit && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body1">{previewAudit.audit.location || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Template</Typography>
                    <Typography variant="body1">{previewAudit.audit.template_name || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Chip 
                      label={previewAudit.audit.status} 
                      color={previewAudit.audit.status === 'completed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Score</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {previewAudit.audit.score !== null ? `${previewAudit.audit.score}%` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Date</Typography>
                    <Typography variant="body1">
                      {new Date(previewAudit.audit.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Items</Typography>
                    <Typography variant="body1">
                      {previewAudit.audit.completed_items || 0} / {previewAudit.audit.total_items || 0}
                    </Typography>
                  </Grid>
                </Grid>
                {previewAudit.items && previewAudit.items.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Items ({previewAudit.items.length})
                    </Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {previewAudit.items.slice(0, 10).map((item, idx) => (
                        <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.title}
                          </Typography>
                          {item.selected_option && (
                            <Typography variant="caption" color="text.secondary">
                              Option: {item.selected_option.option_text} ({item.mark})
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {previewAudit.items.length > 10 && (
                        <Typography variant="caption" color="text.secondary">
                          ... and {previewAudit.items.length - 10} more items
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setPreviewDialogOpen(false);
                navigate(`/audit/${previewAudit?.audit?.id}`);
              }}
            >
              View Full Details
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
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
            Delete Selected Audits?
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <DialogContentText>
              Are you sure you want to delete {selectedAudits.size} audit(s)? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
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
              onClick={handleBulkDelete} 
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#f44336',
                '&:hover': {
                  bgcolor: '#d32f2f',
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default AuditHistory;

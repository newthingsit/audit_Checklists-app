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
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import Layout from '../components/Layout';
import ExportMenu from '../components/ExportMenu';
import { showSuccess, showError } from '../utils/toast';

const AuditHistory = () => {
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

    // Apply date range filter
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

    setFilteredAudits(filtered);
  }, [audits, searchTerm, statusFilter, templateFilter, dateRange]);

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
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const allSelected = filteredAudits.length > 0 && selectedAudits.size === filteredAudits.length;
  const someSelected = selectedAudits.size > 0 && selectedAudits.size < filteredAudits.length;

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Audit History
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedAudits.size > 0 && (
              <>
                <Button
                  startIcon={<FileDownloadIcon />}
                  variant="outlined"
                  onClick={handleBulkExport}
                >
                  Export Selected ({selectedAudits.size})
                </Button>
                <Button
                  startIcon={<DeleteIcon />}
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Selected ({selectedAudits.size})
                </Button>
              </>
            )}
            <ExportMenu audits={filteredAudits} />
          </Box>
        </Box>

        {selectedAudits.size > 0 && (
          <Paper sx={{ mb: 2, p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Toolbar sx={{ minHeight: '48px !important', px: '0 !important' }}>
              <Typography sx={{ flexGrow: 1 }}>
                {selectedAudits.size} audit(s) selected
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedAudits(new Set())}
                sx={{ color: 'white' }}
              >
                Clear Selection
              </Button>
            </Toolbar>
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            placeholder="Search audits by restaurant name, location, or template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Template</InputLabel>
            <Select
              value={templateFilter}
              label="Template"
              onChange={(e) => setTemplateFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {templates.map(template => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date From"
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="Date To"
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </Box>

        {filteredAudits.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" align="center">
                {searchTerm ? 'No audits found matching your search' : 'No audits yet'}
              </Typography>
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
              {filteredAudits.map((audit, index) => (
                <Grid item xs={12} sm={6} md={4} key={audit.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid',
                      borderColor: selectedAudits.has(audit.id) ? 'primary.main' : 'divider',
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                        borderColor: 'primary.main'
                      }
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
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

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

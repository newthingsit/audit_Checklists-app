import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import StoreIcon from '@mui/icons-material/Store';
import DescriptionIcon from '@mui/icons-material/Description';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';
import Layout from '../components/Layout';
import ExportMenu from '../components/ExportMenu';
import PrintButton from '../components/PrintButton';
import { showSuccess, showError } from '../utils/toast';

// Helper: normalize category name for display and grouping
const normalizeCategoryName = (name) => {
  if (!name) return '';
  let normalized = String(name).trim().replace(/\s+/g, ' ');
  normalized = normalized.replace(/\s*&\s*/g, ' & ');
  normalized = normalized.replace(/\s+and\s+/gi, ' & ');
  normalized = normalized.replace(/\s*–\s*/g, ' - ');
  normalized = normalized.replace(/\s*-\s*/g, ' - ');
  normalized = normalized.replace(/\bAcknowledgment\b/gi, 'Acknowledgement');
  return normalized;
};

// Helper: group category scores by normalized name (merge duplicates)
const normalizeAndMergeCategoryScores = (rawScores) => {
  const merged = {};
  Object.entries(rawScores || {}).forEach(([rawCat, data]) => {
    const normalizedCat = normalizeCategoryName(rawCat);
    if (!normalizedCat) return;
    if (merged[normalizedCat]) {
      // Merge with existing - combine totals
      merged[normalizedCat] = {
        completedItems: (merged[normalizedCat].completedItems || 0) + (data.completedItems || 0),
        totalItems: (merged[normalizedCat].totalItems || 0) + (data.totalItems || 0),
        actualScore: (merged[normalizedCat].actualScore || 0) + (data.actualScore || 0),
        totalPossibleScore: (merged[normalizedCat].totalPossibleScore || 0) + (data.totalPossibleScore || 0),
        hasCriticalFailure: merged[normalizedCat].hasCriticalFailure || data.hasCriticalFailure,
        rawCategories: [...(merged[normalizedCat].rawCategories || []), rawCat]
      };
      // Recalculate score
      merged[normalizedCat].score = merged[normalizedCat].totalPossibleScore > 0
        ? Math.round((merged[normalizedCat].actualScore / merged[normalizedCat].totalPossibleScore) * 100)
        : (merged[normalizedCat].totalItems > 0 ? Math.round((merged[normalizedCat].completedItems / merged[normalizedCat].totalItems) * 100) : 0);
    } else {
      merged[normalizedCat] = {
        ...data,
        rawCategories: [rawCat]
      };
    }
  });
  return merged;
};

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [actions, setActions] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [rawCategoryScores, setRawCategoryScores] = useState({}); // For debug
  const [timeStats, setTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false); // Debug toggle for dev mode
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });
  const [itemForm, setItemForm] = useState({
    selected_option_id: '',
    comment: '',
    status: 'pending'
  });
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    recipientName: ''
  });
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState(null);
  
  // Action Plan state
  const [actionPlan, setActionPlan] = useState(null);
  const [editingActionId, setEditingActionId] = useState(null);
  const [actionEditForm, setActionEditForm] = useState({});
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAudit();
    fetchUsers();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users', { params: { scope: 'assignable' } });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActionPlan = async (auditId) => {
    try {
      const response = await axios.get(`/api/audits/${auditId}/action-plan`);
      setActionPlan(response.data);
    } catch (error) {
      console.error('Error fetching action plan:', error);
      // Action plan not available is not an error for in-progress audits
    }
  };

  const handleUpdateActionItem = async (actionId) => {
    try {
      await axios.put(`/api/audits/${id}/action-items/${actionId}`, actionEditForm);
      showSuccess('Action item updated successfully!');
      setEditingActionId(null);
      fetchActionPlan(id);
    } catch (error) {
      console.error('Error updating action item:', error);
      showError('Error updating action item');
    }
  };

  const fetchAudit = async () => {
    try {
      setError(null);
      const [auditResponse, actionsResponse] = await Promise.all([
        axios.get(`/api/audits/${id}`),
        axios.get(`/api/actions/audit/${id}`).catch(() => ({ data: { actions: [] } }))
      ]);
      setAudit(auditResponse.data.audit);
      
      // Ensure photo_urls are properly constructed with full URLs
      // Backend should already handle this, but add safety check here too
      const itemsWithPhotos = (auditResponse.data.items || []).map(item => {
        if (item.photo_url) {
          const raw = String(item.photo_url);
          const isFullUrl = raw.startsWith('http://') || raw.startsWith('https://');
          const hasDomain = raw.includes('://') || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(raw);
          
          if (!isFullUrl && !hasDomain) {
            // Only prepend baseUrl if it's a relative path
            const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
            item.photo_url = `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`;
          } else if (hasDomain && !isFullUrl) {
            // If it has a domain but no protocol, add https://
            item.photo_url = `https://${raw.replace(/^https?:\/\//, '')}`;
          }
          // If it's already a full URL, leave it as is
        }
        return item;
      });
      
      setItems(itemsWithPhotos);
      
      // Store raw scores for debugging, then normalize and merge duplicates
      const raw = auditResponse.data.categoryScores || {};
      setRawCategoryScores(raw);
      setCategoryScores(normalizeAndMergeCategoryScores(raw));
      
      setTimeStats(auditResponse.data.timeStats || null);
      setActions(actionsResponse.data.actions || []);
      
      // Fetch action plan for completed audits
      if (auditResponse.data.audit.status === 'completed') {
        fetchActionPlan(id);
      }
    } catch (error) {
      console.error('Error fetching audit:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load audit';
      const statusCode = error.response?.status;
      
      if (statusCode === 404) {
        setError('Audit not found. It may have been deleted or you may not have permission to view it.');
      } else if (statusCode === 403) {
        setError('You do not have permission to view this audit.');
      } else if (statusCode === 500) {
        setError('Server error. Please try again later.');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleCreateAction = async (item) => {
    setSelectedItem(item);
    setActionForm({
      title: `Fix: ${item.title}`,
      description: item.comment || '',
      priority: item.status === 'failed' ? 'high' : 'medium',
      due_date: ''
    });
    setShowActionDialog(true);
  };

  const handleSaveAction = async () => {
    try {
      await axios.post('/api/actions', {
        audit_id: parseInt(id),
        item_id: selectedItem.item_id,
        ...actionForm
      });
      setShowActionDialog(false);
      showSuccess('Action item created successfully!');
      fetchAudit();
    } catch (error) {
      console.error('Error creating action:', error);
      showError('Error creating action item');
    }
  };

  const handleOpenItemDialog = (item) => {
    // Prevent editing completed audits
    if (audit && audit.status === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    setSelectedItem(item);
    setItemForm({
      selected_option_id: item.selected_option_id || '',
      comment: item.comment || '',
      status: item.status || 'pending'
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    try {
      // If an option is selected but status is still 'pending', automatically set to 'completed'
      const finalStatus = itemForm.selected_option_id && itemForm.status === 'pending' 
        ? 'completed' 
        : itemForm.status;
      
      const updateData = {
        status: finalStatus,
        comment: itemForm.comment,
        selected_option_id: itemForm.selected_option_id || null
      };
      
      await axios.put(`/api/audits/${id}/items/${selectedItem.item_id}`, updateData);
      setShowItemDialog(false);
      showSuccess('Item updated successfully!');
      fetchAudit();
    } catch (error) {
      console.error('Error updating item:', error);
      showError('Error updating item');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'failed':
        return <CancelIcon sx={{ color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleOpenEmailDialog = () => {
    setEmailForm({
      recipientEmail: '',
      recipientName: ''
    });
    setEmailSuccess('');
    setEmailError('');
    setShowEmailDialog(true);
  };

  // Download Enhanced QA Report with Executive Summary, Top-3 Deviations & Action Plan
  const handleDownloadEnhancedReport = async () => {
    try {
      const response = await axios.get(`/api/reports/audit/${id}/enhanced-pdf`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${audit.restaurant_name || 'QA Audit'} - Report.pdf`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      
      showSuccess('QA Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading enhanced report:', error);
      showError('Failed to download QA report. Please try again.');
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.recipientEmail) {
      setEmailError('Please enter a recipient email');
      return;
    }

    setEmailSending(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      await axios.post(`/api/reports/audit/${id}/email`, {
        recipientEmail: emailForm.recipientEmail,
        recipientName: emailForm.recipientName || emailForm.recipientEmail.split('@')[0]
      });
      setEmailSuccess('Audit report sent successfully!');
      showSuccess('Audit report sent successfully!');
      setTimeout(() => {
        setShowEmailDialog(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError(error.response?.data?.error || 'Failed to send email');
      showError('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendToStore = async () => {
    setEmailSending(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const response = await axios.post(`/api/reports/audit/${id}/email-store`);
      setEmailSuccess(`Report sent to ${response.data.recipientEmail}`);
      showSuccess(`Report sent to store manager!`);
      setTimeout(() => {
        setShowEmailDialog(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError(error.response?.data?.error || 'Failed to send email to store');
      showError('Failed to send email to store');
    } finally {
      setEmailSending(false);
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

  if (!audit) {
    return (
      <Layout>
        <Container>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || 'Audit not found'}
            </Alert>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/audits')}
              variant="contained"
            >
              Back to Audits
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  const progress = audit.total_items > 0 
    ? (audit.completed_items / audit.total_items) * 100 
    : 0;

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/audits')}
          >
            Back to Audits
          </Button>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Download Full QA Report with Executive Summary, Deviations & Action Plan">
              <Button
                variant="contained"
                color="primary"
                startIcon={<DescriptionIcon />}
                onClick={handleDownloadEnhancedReport}
                sx={{ fontWeight: 600 }}
              >
                Download QA Report
              </Button>
            </Tooltip>
            <Tooltip title="View Storewise Report">
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => navigate(`/audit/${audit.id}/report`)}
                disabled={audit.status !== 'completed'}
              >
                View Report
              </Button>
            </Tooltip>
            <Tooltip title="Email Report">
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={handleOpenEmailDialog}
                sx={{ minWidth: 'auto' }}
              >
                Email
              </Button>
            </Tooltip>
            <PrintButton audit={{ ...audit, items }} />
            <ExportMenu 
              auditId={audit.id} 
              auditName={audit.restaurant_name}
            />
          </Box>
        </Box>

        <Paper sx={{ 
          p: 4, 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                <Box sx={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <RestaurantIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                    {audit.restaurant_name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    📍 {audit.location || 'No location specified'}
                  </Typography>
                  <Chip
                    label={audit.template_name}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Chip
                  label={audit.status}
                  color={audit.status === 'completed' ? 'success' : 'warning'}
                  sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 600, px: 2, py: 0.5 }}
                />
                {audit.score !== null && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: audit.score >= 80 ? 'success.light' : audit.score >= 60 ? 'warning.light' : 'error.light'
                  }}>
                    <TrendingUpIcon sx={{ mr: 1, color: audit.score >= 80 ? 'success.dark' : audit.score >= 60 ? 'warning.dark' : 'error.dark' }} />
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      color: audit.score >= 80 ? 'success.dark' : audit.score >= 60 ? 'warning.dark' : 'error.dark'
                    }}>
                      {audit.score}%
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {audit.completed_items} / {audit.total_items} items completed
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Progress
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
          </Box>

          {audit.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {audit.notes}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Created: {new Date(audit.created_at).toLocaleString()}
            {audit.completed_at && ` | Completed: ${new Date(audit.completed_at).toLocaleString()}`}
          </Typography>
          
          {/* Critical Failure Warning */}
          {audit.has_critical_failure === 1 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                ⚠️ Critical Failure Detected
              </Typography>
              <Typography variant="body2">
                One or more critical items have failed. This audit requires immediate attention.
              </Typography>
            </Alert>
          )}
          
          {/* Weighted Score Display */}
          {audit.weighted_score !== null && audit.weighted_score !== audit.score && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Weighted Score (accounts for item importance)
              </Typography>
              {/* Time Statistics */}
              {timeStats && timeStats.itemsWithTime > 0 && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    ⏱️ Item Making Performance
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Average Time per Item</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {timeStats.averageTime} min
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Time</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {timeStats.totalTime} min
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Items Tracked</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {timeStats.itemsWithTime} / {timeStats.totalItems}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              <Typography variant="h5" sx={{ fontWeight: 600, color: audit.weighted_score >= 80 ? 'success.main' : audit.weighted_score >= 60 ? 'warning.main' : 'error.main' }}>
                {audit.weighted_score}%
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Category-wise Scores */}
        {Object.keys(categoryScores).length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                📊 Category Scores
              </Typography>
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => setShowDebug(prev => !prev)}
                  sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                >
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </Button>
              )}
            </Box>
            <Grid container spacing={2}>
              {Object.entries(categoryScores).map(([category, data]) => {
                // Calculate effective display score:
                // If score is 0 but items are completed, show completion % instead
                const effectiveScore = data.score > 0 
                  ? data.score 
                  : (data.totalItems > 0 ? Math.round((data.completedItems / data.totalItems) * 100) : 0);
                const isNonScoredCategory = (data.totalPossibleScore === 0 || data.totalPossibleScore === undefined) && data.totalItems > 0;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={category}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: effectiveScore >= 80 ? 'success.light' : effectiveScore >= 60 ? 'warning.light' : 'error.light',
                      border: data.hasCriticalFailure ? '2px solid' : '1px solid',
                      borderColor: data.hasCriticalFailure ? 'error.main' : 'transparent'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {category}
                        </Typography>
                        {data.hasCriticalFailure && (
                          <Chip label="Critical Failure" size="small" color="error" sx={{ fontSize: '0.7rem' }} />
                        )}
                        {isNonScoredCategory && (
                          <Chip label="Completion" size="small" color="info" sx={{ fontSize: '0.65rem', height: 18 }} />
                        )}
                      </Box>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700,
                        color: effectiveScore >= 80 ? 'success.dark' : effectiveScore >= 60 ? 'warning.dark' : 'error.dark'
                      }}>
                        {effectiveScore}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.completedItems} / {data.totalItems} items completed
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={effectiveScore} 
                        sx={{ 
                          mt: 1, 
                          height: 6, 
                          borderRadius: 1,
                          bgcolor: 'rgba(255,255,255,0.5)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: effectiveScore >= 80 ? 'success.main' : effectiveScore >= 60 ? 'warning.main' : 'error.main'
                          }
                        }} 
                      />
                      {/* Debug info - only shown in dev mode with toggle */}
                      {showDebug && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.65rem' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                            Raw Score: {data.score}% | Actual: {data.actualScore}/{data.totalPossibleScore}
                          </Typography>
                          {data.rawCategories && data.rawCategories.length > 1 && (
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: 'warning.main' }}>
                              Merged from: {data.rawCategories.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            {/* Raw categories debug panel */}
            {showDebug && Object.keys(rawCategoryScores).length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed grey' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  🔍 Raw Backend Categories (before normalization):
                </Typography>
                {Object.entries(rawCategoryScores).map(([rawCat, rawData]) => (
                  <Typography key={rawCat} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                    "{rawCat}" → {rawData.completedItems}/{rawData.totalItems} items, score={rawData.score}%
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        )}

        {/* Top 3 Deviations Summary - Quick glance cards */}
        {audit.status === 'completed' && actionPlan && actionPlan.action_items && actionPlan.action_items.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              🚨 Top {actionPlan.action_items.length} Deviation{actionPlan.action_items.length > 1 ? 's' : ''} Identified
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              These items require immediate attention based on audit findings.
            </Typography>
            
            <Grid container spacing={2}>
              {actionPlan.action_items.map((item, index) => {
                // Find matching audit item to check for photo evidence
                const matchingItem = items.find(i => 
                  i.title === item.deviation || 
                  (i.item_id && item.item_id && i.item_id === item.item_id)
                );
                const hasPhoto = matchingItem?.photo_url;
                
                return (
                  <Grid item xs={12} md={4} key={item.id}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      border: '2px solid',
                      borderColor: item.severity === 'CRITICAL' ? 'error.main' : item.severity === 'MAJOR' ? 'warning.main' : 'grey.400',
                      bgcolor: item.severity === 'CRITICAL' ? 'error.light' : item.severity === 'MAJOR' ? 'warning.light' : 'grey.50',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Header with severity and rank */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Chip 
                          label={item.severity} 
                          size="small" 
                          color={item.severity === 'CRITICAL' ? 'error' : item.severity === 'MAJOR' ? 'warning' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          bgcolor: 'rgba(0,0,0,0.08)', 
                          borderRadius: 1, 
                          px: 1, 
                          py: 0.25 
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            #{index + 1}
                          </Typography>
                          {hasPhoto && (
                            <Tooltip title="Photo evidence available">
                              <PhotoCameraIcon sx={{ fontSize: 14, color: 'info.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      
                      {/* Category */}
                      <Chip 
                        label={item.category || 'General'} 
                        size="small" 
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start', mb: 1, fontSize: '0.7rem', height: 20 }}
                      />
                      
                      {/* Deviation text */}
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        mb: 1,
                        flex: 1,
                        lineHeight: 1.4,
                        color: item.severity === 'CRITICAL' ? 'error.dark' : item.severity === 'MAJOR' ? 'warning.dark' : 'text.primary'
                      }}>
                        {item.deviation}
                      </Typography>
                      
                      {/* Reason */}
                      {item.reason && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                          Reason: {item.reason}
                        </Typography>
                      )}
                      
                      {/* Status indicator */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                        <Typography variant="caption" color="text.secondary">
                          Status:
                        </Typography>
                        <Chip 
                          label={item.status || 'OPEN'} 
                          size="small" 
                          color={item.status === 'CLOSED' ? 'success' : item.status === 'IN_PROGRESS' ? 'info' : 'warning'}
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        )}

        {/* Action Plan Table - Detailed view with corrective actions */}
        {audit.status === 'completed' && actionPlan && actionPlan.action_items && actionPlan.action_items.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              📋 Action Plan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Corrective actions assigned to address the identified deviations.
            </Typography>
            
            {/* Desktop Table View */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a365d', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '90px' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Deviation</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '80px' }}>Severity</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '200px' }}>Corrective Action</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, width: '110px' }}>Owner</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '90px' }}>Target Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '80px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, width: '50px' }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {actionPlan.action_items.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                      {editingActionId === item.id ? (
                        <>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#666', fontSize: '0.8rem' }}>{item.category || '—'}</Typography>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.deviation}</Typography>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <Chip 
                              label={item.severity} 
                              size="small" 
                              color={item.severity === 'CRITICAL' ? 'error' : item.severity === 'MAJOR' ? 'warning' : 'default'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              rows={2}
                              value={actionEditForm.corrective_action || ''}
                              onChange={(e) => setActionEditForm({ ...actionEditForm, corrective_action: e.target.value })}
                              placeholder="Enter corrective action..."
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <FormControl fullWidth size="small">
                              <Select
                                value={actionEditForm.responsible_person_id || ''}
                                onChange={(e) => setActionEditForm({ ...actionEditForm, responsible_person_id: e.target.value })}
                                displayEmpty
                                sx={{ fontSize: '0.8rem' }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                {users.map(user => (
                                  <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              type="date"
                              size="small"
                              value={actionEditForm.target_date || ''}
                              onChange={(e) => setActionEditForm({ ...actionEditForm, target_date: e.target.value })}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 70 }}>
                              <Select
                                value={actionEditForm.status || 'OPEN'}
                                onChange={(e) => setActionEditForm({ ...actionEditForm, status: e.target.value })}
                                sx={{ fontSize: '0.75rem' }}
                              >
                                <MenuItem value="OPEN">OPEN</MenuItem>
                                <MenuItem value="IN_PROGRESS">IN PROG</MenuItem>
                                <MenuItem value="CLOSED">CLOSED</MenuItem>
                              </Select>
                            </FormControl>
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <IconButton size="small" color="primary" onClick={() => handleUpdateActionItem(item.id)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setEditingActionId(null)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#666', fontSize: '0.8rem' }}>{item.category || '—'}</Typography>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.deviation}</Typography>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <Chip 
                              label={item.severity} 
                              size="small" 
                              color={item.severity === 'CRITICAL' ? 'error' : item.severity === 'MAJOR' ? 'warning' : 'default'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </td>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" color={item.corrective_action ? 'text.primary' : 'text.secondary'} sx={{ fontSize: '0.85rem' }}>
                              {item.corrective_action || '—'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <Typography variant="body2" color={item.responsible_person ? 'text.primary' : 'text.secondary'} sx={{ fontSize: '0.85rem' }}>
                              {item.responsible_person || '—'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <Typography variant="body2" color={item.target_date ? 'text.primary' : 'text.secondary'} sx={{ fontSize: '0.8rem' }}>
                              {item.target_date ? new Date(item.target_date).toLocaleDateString() : '—'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <Chip 
                              label={item.status} 
                              size="small" 
                              color={item.status === 'CLOSED' ? 'success' : item.status === 'IN_PROGRESS' ? 'info' : 'warning'}
                              variant="filled"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setEditingActionId(item.id);
                                setActionEditForm({
                                  corrective_action: item.corrective_action || '',
                                  responsible_person_id: item.responsible_person_id || '',
                                  target_date: item.target_date ? item.target_date.split('T')[0] : '',
                                  status: item.status || 'OPEN'
                                });
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {actionPlan.action_items.map((item, index) => (
                <Card key={item.id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Chip 
                          label={item.severity} 
                          size="small" 
                          color={item.severity === 'CRITICAL' ? 'error' : item.severity === 'MAJOR' ? 'warning' : 'default'}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {item.category || 'General'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={item.status || 'OPEN'} 
                        size="small" 
                        color={item.status === 'CLOSED' ? 'success' : item.status === 'IN_PROGRESS' ? 'info' : 'warning'}
                      />
                    </Box>
                    
                    {/* Deviation */}
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                      {item.deviation}
                    </Typography>
                    
                    {/* Details Grid */}
                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Owner</Typography>
                        <Typography variant="body2">{item.responsible_person || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Target Date</Typography>
                        <Typography variant="body2">
                          {item.target_date ? new Date(item.target_date).toLocaleDateString() : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    {/* Corrective Action */}
                    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Corrective Action
                      </Typography>
                      <Typography variant="body2" color={item.corrective_action ? 'text.primary' : 'text.secondary'}>
                        {item.corrective_action || 'Not yet defined'}
                      </Typography>
                    </Box>
                    
                    {/* Edit Button */}
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          setEditingActionId(item.id);
                          setActionEditForm({
                            corrective_action: item.corrective_action || '',
                            responsible_person_id: item.responsible_person_id || '',
                            target_date: item.target_date ? item.target_date.split('T')[0] : '',
                            status: item.status || 'OPEN'
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        )}

        {audit.status === 'in_progress' && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.dark' }}>
                  Continue Your Audit
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You have {audit.completed_items} of {audit.total_items} items completed. Click below to resume and complete the remaining items.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/audit/new/${audit.template_id}?audit_id=${audit.id}`)}
                sx={{
                  minWidth: 200,
                  py: 1.5,
                  px: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Resume Audit
              </Button>
            </Box>
          </Paper>
        )}

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#333', mt: 4, mb: 2 }}>
          Checklist Items
        </Typography>

        {items.filter(item => item.status === 'pending').length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
              ⚠️ {items.filter(item => item.status === 'pending').length} item(s) still pending - Please review and update their status
            </Typography>
          </Paper>
        )}

        {items.map((item, index) => (
          <Card 
            key={item.id} 
            sx={{ 
              mb: 2,
              border: item.status === 'pending' ? '2px solid' : '1px solid',
              borderColor: item.status === 'pending' ? 'warning.main' : 'divider',
              bgcolor: item.status === 'pending' ? 'warning.light' : 'background.paper'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {index + 1}. {item.title}
                </Typography>
                {getStatusIcon(item.status)}
              </Box>
              {item.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {item.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label={item.category}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={item.status === 'pending' ? 'Not Started' : item.status}
                  size="small"
                  color={item.status === 'pending' ? 'default' : getStatusColor(item.status)}
                  variant={item.status === 'pending' ? 'outlined' : 'filled'}
                />
                {item.mark && (
                  <Chip
                    label={`Mark: ${item.mark}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {item.selected_option_text && (
                  <Chip
                    label={item.selected_option_text}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
              
              {/* Display options if available */}
              {item.options && item.options.length > 0 && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                    Options:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {item.options.map((option) => (
                      <Button
                        key={option.id}
                        variant={item.selected_option_id === option.id ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleOpenItemDialog(item)}
                        disabled={audit && audit.status === 'completed'}
                        sx={{
                          minWidth: 'auto',
                          px: 2,
                          py: 0.5,
                          border: item.selected_option_id === option.id ? '2px solid' : '1px solid',
                          borderColor: item.selected_option_id === option.id ? 'primary.main' : 'divider',
                          bgcolor: item.selected_option_id === option.id ? 'primary.main' : 'transparent',
                          color: item.selected_option_id === option.id ? 'white' : 'text.primary',
                          '&:hover': {
                            bgcolor: item.selected_option_id === option.id ? 'primary.dark' : 'action.hover'
                          }
                        }}
                      >
                        {option.option_text}
                        <Chip
                          label={option.mark}
                          size="small"
                          sx={{
                            ml: 1,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: item.selected_option_id === option.id ? 'rgba(255,255,255,0.3)' : 'grey.200',
                            color: item.selected_option_id === option.id ? 'white' : 'text.primary'
                          }}
                        />
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* If no options, show edit button */}
              {(!item.options || item.options.length === 0) && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleOpenItemDialog(item)}
                    disabled={audit && audit.status === 'completed'}
                  >
                    Update Item
                  </Button>
                </Box>
              )}
              {item.comment && (
                <Paper sx={{ p: 1, mt: 1, bgcolor: 'grey.100' }}>
                  <Typography variant="body2">
                    <strong>Comment:</strong> {item.comment}
                  </Typography>
                </Paper>
              )}
              {item.photo_url && (
                <Box sx={{ mt: 2 }}>
                  <img 
                    src={item.photo_url.startsWith('http') 
                      ? item.photo_url 
                      : `${process.env.REACT_APP_API_URL?.replace('/api', '') || ''}${item.photo_url}`} 
                    alt="Audit evidence"
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                    onError={(e) => {
                      console.error('Error loading image:', item.photo_url);
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
              )}
              {/* Action item creation is handled in Action Plans page - removed from audit detail for cleaner view */}
            </CardContent>
          </Card>
        ))}

        {/* Action Items section - hidden for cleaner audit view. Actions can be managed in Action Plans page */}
        {false && actions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#333', mb: 2 }}>
              Action Items ({actions.length})
            </Typography>
            {actions.map((action) => (
              <Card key={action.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{action.title}</Typography>
                      {action.description && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {action.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip label={action.status} size="small" color={action.status === 'completed' ? 'success' : 'default'} />
                        <Chip label={action.priority} size="small" />
                        {action.due_date && (
                          <Chip label={`Due: ${new Date(action.due_date).toLocaleDateString()}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Item Update Dialog */}
        <Dialog 
          open={showItemDialog} 
          onClose={() => setShowItemDialog(false)} 
          maxWidth="md" 
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
            Update Item: {selectedItem?.title}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedItem && (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedItem.description}
                </Typography>
                
                {selectedItem.options && selectedItem.options.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Select Option:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {selectedItem.options.map((option) => (
                        <Button
                          key={option.id}
                          variant={itemForm.selected_option_id === option.id ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => setItemForm({ 
                            ...itemForm, 
                            selected_option_id: option.id,
                            // Automatically set status to 'completed' when an option is selected
                            status: itemForm.status === 'pending' ? 'completed' : itemForm.status
                          })}
                          sx={{
                            py: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textTransform: 'none',
                            border: itemForm.selected_option_id === option.id ? '2px solid' : '1px solid',
                            borderColor: itemForm.selected_option_id === option.id ? 'primary.main' : 'divider'
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: itemForm.selected_option_id === option.id ? 600 : 400 }}>
                            {option.option_text}
                          </Typography>
                          <Chip
                            label={`Mark: ${option.mark}`}
                            size="small"
                            color={itemForm.selected_option_id === option.id ? 'primary' : 'default'}
                            sx={{ ml: 2 }}
                          />
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={itemForm.status}
                      label="Status"
                      onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}
                    >
                      <MenuItem value="pending">Not Started</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                    </Select>
                  </FormControl>
                )}
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Comment"
                  value={itemForm.comment}
                  onChange={(e) => setItemForm({ ...itemForm, comment: e.target.value })}
                  sx={{ mt: 3 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
            <Button onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveItem}
              disabled={selectedItem?.options && selectedItem.options.length > 0 && !itemForm.selected_option_id}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={showActionDialog} 
          onClose={() => setShowActionDialog(false)} 
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
            Create Action Item
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Title"
              value={actionForm.title}
              onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={actionForm.description}
              onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={actionForm.priority}
                label="Priority"
                onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={actionForm.due_date}
              onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={() => setShowActionDialog(false)}
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
              onClick={handleSaveAction} 
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
              Create Action
            </Button>
          </DialogActions>
        </Dialog>

        {/* Email Report Dialog */}
        <Dialog 
          open={showEmailDialog} 
          onClose={() => setShowEmailDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon color="primary" />
            Send Audit Report via Email
          </DialogTitle>
          <DialogContent>
            {emailSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {emailSuccess}
              </Alert>
            )}
            {emailError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {emailError}
              </Alert>
            )}
            
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Send this audit report to any email address or directly to the store manager.
              </Typography>
            </Box>

            {/* Quick Send to Store */}
            {audit?.location_id && (
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  bgcolor: 'primary.light', 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'primary.main', color: 'white' }
                }}
                onClick={handleSendToStore}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StoreIcon />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Send to Store Manager
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Automatically send to the registered store email
                    </Typography>
                  </Box>
                  {emailSending && <CircularProgress size={24} />}
                </Box>
              </Paper>
            )}

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Or send to a custom email:
            </Typography>
            
            <TextField
              fullWidth
              label="Recipient Email"
              type="email"
              value={emailForm.recipientEmail}
              onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="manager@example.com"
            />
            <TextField
              fullWidth
              label="Recipient Name (Optional)"
              value={emailForm.recipientName}
              onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
              placeholder="Store Manager"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setShowEmailDialog(false)}
              variant="outlined"
              disabled={emailSending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              variant="contained"
              startIcon={emailSending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={emailSending || !emailForm.recipientEmail}
            >
              {emailSending ? 'Sending...' : 'Send Report'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default AuditDetail;


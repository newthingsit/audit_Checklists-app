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
  MenuItem
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';
import Layout from '../components/Layout';
import ExportMenu from '../components/ExportMenu';
import PrintButton from '../components/PrintButton';
import { showSuccess, showError } from '../utils/toast';

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchAudit();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAudit = async () => {
    try {
      const [auditResponse, actionsResponse] = await Promise.all([
        axios.get(`/api/audits/${id}`),
        axios.get(`/api/actions/audit/${id}`).catch(() => ({ data: { actions: [] } }))
      ]);
      setAudit(auditResponse.data.audit);
      setItems(auditResponse.data.items || []);
      setActions(actionsResponse.data.actions || []);
    } catch (error) {
      console.error('Error fetching audit:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const updateData = {
        status: itemForm.status,
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
          <Typography>Audit not found</Typography>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
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
        </Paper>

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
                    src={`http://localhost:5000${item.photo_url}`} 
                    alt="Audit evidence"
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                  />
                </Box>
              )}
              {(item.status === 'failed' || item.status === 'warning') && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleCreateAction(item)}
                  >
                    Create Action Item
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}

        {actions.length > 0 && (
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
                          onClick={() => setItemForm({ ...itemForm, selected_option_id: option.id })}
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
      </Container>
    </Layout>
  );
};

export default AuditDetail;


import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import ChecklistIcon from '@mui/icons-material/Checklist';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const getTemplateId = (template) => {
  if (!template) return null;
  return (
    template.id ??
    template.ID ??
    template.template_id ??
    template.templateId ??
    null
  );
};

const defaultOptions = [
  { option_text: 'Yes', mark: '3' },
  { option_text: 'Warning', mark: '1' },
  { option_text: 'No', mark: '0' },
  { option_text: 'N/A', mark: 'NA' }
];

const createEmptyItem = (category = '') => ({
  title: '',
  description: '',
  category,
  required: true,
  options: defaultOptions.map(option => ({ ...option }))
});

const sampleCsvContent = `title,description,category,required,options
Designated hand wash sink,Ensure sink has soap and paper towels,Personal Hygiene,yes,"Yes:3;Warning:1;No:0;NA:NA"
Food storage temperature,Check refrigerators for 4°C or below,Food Safety,yes,"Yes:2;No:0;NA:NA"
Equipment cleanliness,Clean and sanitize food-contact surfaces,Cleanliness,yes,"Compliant:3;Needs Improvement:1;Non-compliant:0"
`;

const Checklists = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    description: ''
  });
  const [items, setItems] = useState([createEmptyItem('')]);
  const [csvData, setCsvData] = useState('');
  const [importForm, setImportForm] = useState({
    templateName: '',
    category: '',
    description: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAudit = (templateId) => {
    navigate(`/audit/new/${templateId}`);
  };

  const handleOpenAddDialog = () => {
    setEditingTemplateId(null);
    setTemplateForm({ name: '', category: '', description: '' });
    setItems([createEmptyItem('')]);
    setShowAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setEditingTemplateId(null);
    setSavingTemplate(false);
  };

  const handleOpenImportDialog = () => {
    setImportForm({ templateName: '', category: '', description: '' });
    setCsvData('');
    setShowImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'checklist-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddItem = () => {
    setItems([...items, createEmptyItem(templateForm.category || '')]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddOption = (itemIndex) => {
    const newItems = [...items];
    const currentOptions = newItems[itemIndex].options || [];
    newItems[itemIndex].options = [...currentOptions, { option_text: '', mark: '' }];
    setItems(newItems);
  };

  const handleRemoveOption = (itemIndex, optionIndex) => {
    const newItems = [...items];
    const currentOptions = newItems[itemIndex].options || [];
    newItems[itemIndex].options = currentOptions.filter((_, idx) => idx !== optionIndex);
    setItems(newItems);
  };

  const handleOptionChange = (itemIndex, optionIndex, field, value) => {
    const newItems = [...items];
    const currentOptions = newItems[itemIndex].options || [];
    currentOptions[optionIndex] = {
      ...currentOptions[optionIndex],
      [field]: value
    };
    newItems[itemIndex].options = currentOptions;
    setItems(newItems);
  };

  const handleAddDefaultOptions = (itemIndex) => {
    const newItems = [...items];
    newItems[itemIndex].options = defaultOptions.map(option => ({ ...option }));
    setItems(newItems);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.category) {
      showError('Name and category are required');
      return;
    }

    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) {
      showError('At least one checklist item is required');
      return;
    }

    setSavingTemplate(true);
    const payload = {
      name: templateForm.name,
      category: templateForm.category,
      description: templateForm.description,
      items: validItems.map((item, index) => ({
        title: item.title,
        description: item.description || '',
        category: item.category || templateForm.category,
        required: item.required !== false,
        order_index: index,
        options: (item.options || []).map((option, optionIndex) => ({
          option_text: option.option_text || '',
          mark: option.mark ?? '',
          order_index: optionIndex
        }))
      }))
    };

    try {
      if (editingTemplateId) {
        await axios.put(`/api/checklists/${editingTemplateId}`, payload);
        showSuccess('Template updated successfully!');
      } else {
        await axios.post('/api/checklists', payload);
        showSuccess('Template created successfully!');
      }
      handleCloseAddDialog();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showError(error.response?.data?.error || 'Error saving template');
    } finally {
      setSavingTemplate(false);
    }
  };
  const handleEditTemplate = async (templateId) => {
    try {
      const response = await axios.get(`/api/checklists/${templateId}`);
      const { template, items: templateItems } = response.data;
      setEditingTemplateId(templateId);
      setTemplateForm({
        name: template.name || '',
        category: template.category || '',
        description: template.description || ''
      });
      const mappedItems = (templateItems || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        required: item.required !== 0,
        options: (item.options || []).map(option => ({
          option_text: option.option_text || option.title || '',
          mark: option.mark ?? ''
        }))
      }));
      setItems(mappedItems.length > 0 ? mappedItems : [createEmptyItem(template.category)]);
      setShowAddDialog(true);
    } catch (error) {
      console.error('Error loading template:', error);
      showError('Failed to load template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/checklists/${templateId}`);
      showSuccess('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError(error.response?.data?.error || 'Failed to delete template');
    }
  };


  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvData(e.target.result);
    };
    reader.onerror = () => {
      showError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!importForm.templateName || !importForm.category || !csvData) {
      showError('Template name, category, and CSV data are required');
      return;
    }

    try {
      await axios.post('/api/checklists/import', {
        templateName: importForm.templateName,
        category: importForm.category,
        description: importForm.description,
        csvData
      });
      showSuccess('Template imported successfully!');
      handleCloseImportDialog();
      fetchTemplates();
    } catch (error) {
      console.error('Error importing template:', error);
      showError(error.response?.data?.error || 'Error importing template');
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

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
              Checklist Templates
            </Typography>
            <Typography variant="body1" sx={{ color: '#666' }}>
              Select a template to start a new audit
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenImportDialog}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
                }
              }}
            >
              Add Template
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {templates.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    No templates available
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            templates.map((template, index) => {
              const templateId = getTemplateId(template) ?? index;
              return (
              <Grid item xs={12} sm={6} md={4} key={templateId}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    borderColor: 'primary.main'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <ChecklistIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {template.name}
                        </Typography>
                        <Chip
                          label={template.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>
                    </Box>
                    {template.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {template.description}
                      </Typography>
                    )}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'grey.50'
                    }}>
                      <InfoIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {template.item_count || 0} checklist items
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStartAudit(getTemplateId(template))}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
                        }
                      }}
                    >
                      Start Audit
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditTemplate(getTemplateId(template))}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTemplate(getTemplateId(template))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            )})
          )}
        </Grid>

        {/* Add Template Dialog */}
        <Dialog 
          open={showAddDialog} 
          onClose={handleCloseAddDialog} 
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
            fontSize: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editingTemplateId ? 'Edit Template' : 'Create New Template'}
            </Typography>
            <IconButton onClick={handleCloseAddDialog} size="small" sx={{ color: '#666' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateForm.category}
                label="Category"
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              >
                <MenuItem value="Safety">Safety</MenuItem>
                <MenuItem value="Cleanliness">Cleanliness</MenuItem>
                <MenuItem value="Food Safety">Food Safety</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
                <MenuItem value="Compliance">Compliance</MenuItem>
                <MenuItem value="Staff">Staff</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Checklist Items</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
              >
                Add Item
              </Button>
            </Box>
            {items.map((item, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="subtitle2">Item {index + 1}</Typography>
                  {items.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <TextField
                  fullWidth
                  label="Title"
                  value={item.title}
                  onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                  margin="dense"
                  required
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  margin="dense"
                  multiline
                  rows={2}
                />
                <TextField
                  fullWidth
                  label="Category"
                  value={item.category}
                  onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                  margin="dense"
                  placeholder={templateForm.category || 'Item category'}
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel>Required</InputLabel>
                  <Select
                    value={item.required ? 'yes' : 'no'}
                    label="Required"
                    onChange={(e) => handleItemChange(index, 'required', e.target.value === 'yes')}
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Scoring Options</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleAddDefaultOptions(index)}
                      >
                        Add Yes/No/NA
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAddOption(index)}
                      >
                        Add Option
                      </Button>
                    </Box>
                  </Box>
                  {(item.options && item.options.length > 0) ? (
                    item.options.map((option, optionIndex) => (
                      <Box
                        key={optionIndex}
                        sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                          mb: 1
                        }}
                      >
                        <TextField
                          fullWidth
                          label="Label"
                          value={option.option_text || ''}
                          onChange={(e) => handleOptionChange(index, optionIndex, 'option_text', e.target.value)}
                          size="small"
                        />
                        <TextField
                          label="Score"
                          value={option.mark ?? ''}
                          onChange={(e) => handleOptionChange(index, optionIndex, 'mark', e.target.value)}
                          size="small"
                          sx={{ width: 120 }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveOption(index, optionIndex)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No scoring options yet.
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseAddDialog}
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
              onClick={handleSaveTemplate} 
              variant="contained"
              disabled={savingTemplate}
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
              {editingTemplateId ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import CSV Dialog */}
        <Dialog 
          open={showImportDialog} 
          onClose={handleCloseImportDialog} 
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
            fontSize: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Import Template from CSV</Typography>
            <IconButton onClick={handleCloseImportDialog} size="small" sx={{ color: '#666' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={importForm.templateName}
              onChange={(e) => setImportForm({ ...importForm, templateName: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={importForm.category}
                label="Category"
                onChange={(e) => setImportForm({ ...importForm, category: e.target.value })}
              >
                <MenuItem value="Safety">Safety</MenuItem>
                <MenuItem value="Cleanliness">Cleanliness</MenuItem>
                <MenuItem value="Food Safety">Food Safety</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
                <MenuItem value="Compliance">Compliance</MenuItem>
                <MenuItem value="Staff">Staff</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              value={importForm.description}
              onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="csv-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                >
                  Upload CSV File
                </Button>
              </label>
            </Box>
            <Button
              variant="text"
              onClick={handleDownloadSampleCsv}
              sx={{ mb: 2 }}
            >
              Download Sample CSV
            </Button>
            {csvData && (
              <TextField
                fullWidth
                label="CSV Preview"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                margin="normal"
                multiline
                rows={6}
                helperText="CSV format: title,description,category,required (header row required)"
              />
            )}
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>CSV Format:</strong><br />
                Required columns: title (or item)<br />
                Optional columns: description, category, required, options<br />
                Example:<br />
                title,description,category,required,options<br />
                Food Storage Temperature,Check refrigerators,Food Safety,yes,"Yes:3;Warning:1;No:0;NA:NA"<br />
                Use the options column to define scoring options separated by semicolons. Each option should be in the form Label:Score (e.g., Yes:3).
              </Typography>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseImportDialog}
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
              onClick={handleImportCSV} 
              variant="contained"
              disabled={!csvData}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
                '&:disabled': {
                  bgcolor: '#e0e0e0',
                  color: '#999',
                },
              }}
            >
              Import Template
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Checklists;


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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControlLabel,
  Checkbox,
  Tooltip,
  ButtonGroup
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScaleIcon from '@mui/icons-material/Scale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';
import { themeConfig } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';

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
  { option_text: 'No', mark: '0' },
  { option_text: 'N/A', mark: 'NA' }
];

// Scoring Presets for quick selection
const scoringPresets = {
  'yes_no_na': {
    name: 'Yes / No / N/A',
    description: 'Standard compliance check',
    options: [
      { option_text: 'Yes', mark: '3' },
      { option_text: 'No', mark: '0' },
      { option_text: 'N/A', mark: 'NA' }
    ]
  },
  'pass_fail': {
    name: 'Pass / Fail',
    description: 'Binary pass/fail assessment',
    options: [
      { option_text: 'Pass', mark: '100' },
      { option_text: 'Fail', mark: '0' }
    ]
  },
  'rating_5': {
    name: 'Rating 1-5',
    description: '5-point rating scale',
    options: [
      { option_text: '5 - Excellent', mark: '100' },
      { option_text: '4 - Good', mark: '80' },
      { option_text: '3 - Satisfactory', mark: '60' },
      { option_text: '2 - Needs Improvement', mark: '40' },
      { option_text: '1 - Poor', mark: '20' }
    ]
  },
  'compliance': {
    name: 'Compliance Level',
    description: 'Regulatory compliance assessment',
    options: [
      { option_text: 'Fully Compliant', mark: '100' },
      { option_text: 'Partially Compliant', mark: '50' },
      { option_text: 'Non-Compliant', mark: '0' },
      { option_text: 'N/A', mark: 'NA' }
    ]
  },
  'quality': {
    name: 'Quality Rating',
    description: 'Quality assessment scale',
    options: [
      { option_text: 'Excellent', mark: '100' },
      { option_text: 'Good', mark: '75' },
      { option_text: 'Average', mark: '50' },
      { option_text: 'Below Average', mark: '25' },
      { option_text: 'Poor', mark: '0' }
    ]
  },
  'temperature': {
    name: 'Temperature Check',
    description: 'Food safety temperature compliance',
    options: [
      { option_text: 'Within Range', mark: '100' },
      { option_text: 'Slightly Out', mark: '50' },
      { option_text: 'Out of Range', mark: '0' },
      { option_text: 'Not Measured', mark: 'NA' }
    ]
  }
};

// Weight options for item importance
const weightOptions = [
  { value: 1, label: 'Normal', description: 'Standard weight' },
  { value: 2, label: 'Important', description: '2x weight' },
  { value: 3, label: 'Critical', description: '3x weight' }
];

const createEmptyItem = (category = '') => ({
  title: '',
  description: '',
  category,
  required: true,
  weight: 1, // Default weight
  is_critical: false, // Critical items can auto-fail the audit
  options: defaultOptions.map(option => ({ ...option }))
});

const sampleCsvContent = `title,description,category,required,options
Designated hand wash sink,Ensure sink has soap and paper towels,Personal Hygiene,yes,"Yes:3;No:0;NA:NA"
Food storage temperature,Check refrigerators for 4°C or below,Food Safety,yes,"Yes:3;No:0;NA:NA"
Equipment cleanliness,Clean and sanitize food-contact surfaces,Cleanliness,yes,"Yes:3;No:0;NA:NA"
Fire extinguisher present,Verify fire extinguisher is accessible and not expired,Safety,yes,"Yes:3;No:0;NA:NA"
Staff wearing proper uniforms,All staff wearing clean uniforms and hairnets,Staff,yes,"Yes:3;No:0;NA:NA"
Temperature logs maintained,Check that temperature logs are being filled daily,Compliance,yes,"Yes:3;No:0;NA:NA"
Storage area organized,Storage area is clean and organized,Cleanliness,yes,"Yes:3;No:0;NA:NA"
Equipment maintenance,All equipment in good working condition,Equipment,yes,"Yes:3;No:0;NA:NA"
`;

const Checklists = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: ''
  });
  const [items, setItems] = useState([createEmptyItem('')]);
  const [csvData, setCsvData] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importForm, setImportForm] = useState({
    templateName: '',
    description: ''
  });
  const navigate = useNavigate();

  // Permission checks
  const canEdit = hasPermission(userPermissions, 'edit_templates') || hasPermission(userPermissions, 'manage_templates') || isAdmin(user);
  const canDelete = hasPermission(userPermissions, 'delete_templates') || hasPermission(userPermissions, 'manage_templates') || isAdmin(user);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data after create/update
      const response = await axios.get('/api/templates', {
        params: { _t: Date.now() }
      });
      const serverTemplates = response.data.templates || [];
      setTemplates(serverTemplates);
      
      // Group templates by category
      const categoryMap = {};
      serverTemplates.forEach(template => {
        const templateCategories = template.categories || [];
        if (templateCategories.length === 0) {
          const cat = 'General';
          if (!categoryMap[cat]) {
            categoryMap[cat] = [];
          }
          categoryMap[cat].push(template);
        } else {
          templateCategories.forEach(cat => {
            if (!categoryMap[cat]) {
              categoryMap[cat] = [];
            }
            categoryMap[cat].push(template);
          });
        }
      });
      
      const categoryList = Object.keys(categoryMap).map(cat => ({
        name: cat,
        templates: categoryMap[cat],
        count: categoryMap[cat].length
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories(categoryList);
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
    setTemplateForm({ name: '', description: '' });
    setItems([createEmptyItem('')]);
    setShowAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setEditingTemplateId(null);
    setSavingTemplate(false);
  };

  const handleOpenImportDialog = () => {
    setImportForm({ templateName: '', description: '' });
    setCsvData('');
    setParsedItems([]);
    setParseError('');
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
    setItems([...items, createEmptyItem('')]);
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

  // Apply a scoring preset to an item
  const handleApplyPreset = (itemIndex, presetKey) => {
    const preset = scoringPresets[presetKey];
    if (preset) {
      const newItems = [...items];
      newItems[itemIndex].options = preset.options.map(option => ({ ...option }));
      setItems(newItems);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name) {
      showError('Template name is required');
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
      category: '', // Category removed from template level
      description: templateForm.description,
      items: validItems.map((item, index) => ({
        title: item.title,
        description: item.description || '',
        category: item.category || '',
        required: item.required !== false,
        weight: item.weight || 1,
        is_critical: item.is_critical || false,
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
        weight: item.weight || 1,
        is_critical: item.is_critical === 1 || item.is_critical === true,
        options: (item.options || []).map(option => ({
          option_text: option.option_text || option.title || '',
          mark: option.mark ?? ''
        }))
      }));
      setItems(mappedItems.length > 0 ? mappedItems : [createEmptyItem('')]);
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


  // Improved CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVData = (csvText) => {
    try {
      setParseError('');
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setParseError('CSV must have at least a header row and one data row');
        setParsedItems([]);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('item') || h === 'name');
      const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
      const catIndex = headers.findIndex(h => h.includes('category') || h.includes('cat'));
      const reqIndex = headers.findIndex(h => h.includes('required') || h.includes('mandatory'));
      const optionsIndex = headers.findIndex(h => h.includes('option'));

      if (titleIndex === -1) {
        setParseError('CSV must have a "title", "item", or "name" column');
        setParsedItems([]);
        return;
      }

      // Parse data rows
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const title = values[titleIndex]?.replace(/^"|"$/g, '').trim();
        
        if (title) {
          // Parse options
          const itemOptions = [];
          if (optionsIndex !== -1 && values[optionsIndex]) {
            const optionsStr = values[optionsIndex].replace(/^"|"$/g, '');
            optionsStr.split(';').forEach((option, optionIndex) => {
              const trimmed = option.trim();
              if (trimmed) {
                const [label, score] = trimmed.split(':').map(s => s.trim());
                if (label) {
                  itemOptions.push({
                    option_text: label,
                    mark: score || '',
                    order_index: optionIndex
                  });
                }
              }
            });
          }

          // If no options provided, use defaults
          if (itemOptions.length === 0) {
            itemOptions.push(
              { option_text: 'Yes', mark: '3', order_index: 0 },
              { option_text: 'No', mark: '0', order_index: 1 },
              { option_text: 'N/A', mark: 'NA', order_index: 2 }
            );
          }

          items.push({
            title,
            description: descIndex !== -1 ? (values[descIndex]?.replace(/^"|"$/g, '').trim() || '') : '',
            category: catIndex !== -1 ? (values[catIndex]?.replace(/^"|"$/g, '').trim() || '') : '',
            required: reqIndex !== -1 
              ? (values[reqIndex]?.replace(/^"|"$/g, '').toLowerCase() === 'yes' || 
                 values[reqIndex]?.replace(/^"|"$/g, '').toLowerCase() === 'true' || 
                 values[reqIndex]?.replace(/^"|"$/g, '') === '1')
              : true,
            options: itemOptions
          });
        }
      }

      if (items.length === 0) {
        setParseError('No valid items found in CSV');
        setParsedItems([]);
        return;
      }

      setParsedItems(items);
    } catch (error) {
      setParseError(`Error parsing CSV: ${error.message}`);
      setParsedItems([]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvData(text);
      parseCSVData(text);
    };
    reader.onerror = () => {
      showError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleCsvDataChange = (text) => {
    setCsvData(text);
    if (text.trim()) {
      parseCSVData(text);
    } else {
      setParsedItems([]);
      setParseError('');
    }
  };

  const handleImportCSV = async () => {
    if (!importForm.templateName || !csvData) {
      showError('Template name and CSV data are required');
      return;
    }

    if (parseError || parsedItems.length === 0) {
      showError('Please fix CSV errors before importing');
      return;
    }

    try {
      const response = await axios.post('/api/checklists/import', {
        templateName: importForm.templateName,
        category: '', // Category removed from template level
        description: importForm.description,
        csvData
      });
      showSuccess(`Template imported successfully with ${response.data.itemsCount || parsedItems.length} items!`);
      handleCloseImportDialog();
      fetchTemplates();
    } catch (error) {
      console.error('Error importing template:', error);
      showError(error.response?.data?.error || error.response?.data?.details || 'Error importing template');
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
          {canEdit && (
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
          )}
        </Box>

        {selectedCategory ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setSelectedCategory(null)}
                sx={{ mr: 2 }}
              >
                Back to Categories
              </Button>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {selectedCategory.name} ({selectedCategory.count} templates)
              </Typography>
            </Box>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {selectedCategory.templates.length === 0 ? (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" align="center">
                        No templates in this category
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                selectedCategory.templates.map((template, index) => {
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
                                label={selectedCategory.name}
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
                              background: themeConfig.dashboardCards.card2,
                              '&:hover': {
                                background: 'linear-gradient(135deg, #3730A3 0%, #6366F1 100%)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(67, 56, 202, 0.4)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            Start Audit
                          </Button>
                          {canEdit && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditTemplate(getTemplateId(template))}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canDelete && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTemplate(getTemplateId(template))}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Select a Category
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {categories.length === 0 ? (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" align="center">
                        No categories available
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                categories.map((category) => (
                  <Grid item xs={12} sm={6} md={4} key={category.name}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => setSelectedCategory(category)}
                    >
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
                              {category.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {category.count} template{category.count !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions sx={{ p: 2, pt: 0 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          endIcon={<PlayArrowIcon />}
                          onClick={() => setSelectedCategory(category)}
                        >
                          View Templates
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}

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
            {editingTemplateId ? 'Edit Template' : 'Create New Template'}
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
                  placeholder="Item category (optional)"
                />
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
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
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Weight</InputLabel>
                      <Select
                        value={item.weight || 1}
                        label="Weight"
                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                        startAdornment={<ScaleIcon sx={{ mr: 1, color: 'action.active', fontSize: 18 }} />}
                      >
                        {weightOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span>{opt.label}</span>
                              <Typography variant="caption" color="text.secondary">
                                ({opt.value}x)
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Tooltip title="If a critical item fails, the entire audit may be flagged for immediate attention">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.is_critical || false}
                            onChange={(e) => handleItemChange(index, 'is_critical', e.target.checked)}
                            color="error"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarningAmberIcon sx={{ fontSize: 18, color: item.is_critical ? 'error.main' : 'action.active' }} />
                            <span>Critical Item</span>
                          </Box>
                        }
                      />
                    </Tooltip>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2">Scoring Options</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Apply Preset</InputLabel>
                        <Select
                          value=""
                          label="Apply Preset"
                          onChange={(e) => handleApplyPreset(index, e.target.value)}
                        >
                          {Object.entries(scoringPresets).map(([key, preset]) => (
                            <MenuItem key={key} value={key}>
                              <Box>
                                <Typography variant="body2">{preset.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {preset.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
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
            Import Template from CSV
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
            <TextField
              fullWidth
              label="Paste CSV Data or Edit Below"
              value={csvData}
              onChange={(e) => handleCsvDataChange(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="title,description,category,required,options&#10;Item 1,Description here,Category,yes,&quot;Yes:3;No:0;NA:NA&quot;"
              helperText="Only 'title' column is required. Other columns are optional. Options will default to Yes/No/NA if not provided."
            />
            
            {parseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {parseError}
              </Alert>
            )}

            {parsedItems.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Preview: {parsedItems.length} item(s) found
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Required</strong></TableCell>
                        <TableCell><strong>Options</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedItems.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.description || '-'}
                          </TableCell>
                          <TableCell>{item.category || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.required ? 'Yes' : 'No'} 
                              size="small" 
                              color={item.required ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {item.options.map((opt, optIdx) => (
                              <Chip
                                key={optIdx}
                                label={`${opt.option_text}:${opt.mark}`}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Simple CSV Format:</strong><br />
                • <strong>Required:</strong> title (or item/name column)<br />
                • <strong>Optional:</strong> description, category, required (yes/no), options<br />
                • <strong>Options format:</strong> "Yes:3;No:0;NA:NA" (semicolon-separated, Label:Score pairs)<br />
                • <strong>If options are missing:</strong> Default options (Yes:3, No:0, N/A:NA) will be added automatically<br />
                <br />
                <strong>Example:</strong><br />
                <code style={{ fontSize: '11px' }}>
                  title,description,category,required,options<br />
                  Food Storage Temperature,Check refrigerators,Food Safety,yes,"Yes:3;No:0;NA:NA"<br />
                  Equipment Cleanliness,Clean surfaces,Cleanliness,yes,"Yes:3;No:0;NA:NA"
                </code>
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
              disabled={!csvData || !importForm.templateName || parseError || parsedItems.length === 0}
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


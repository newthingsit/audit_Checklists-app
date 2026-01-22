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
  FormHelperText,
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
  Tooltip
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScaleIcon from '@mui/icons-material/Scale';
import TimerIcon from '@mui/icons-material/Timer';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import NumbersIcon from '@mui/icons-material/Numbers';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ShortTextIcon from '@mui/icons-material/ShortText';
import SubjectIcon from '@mui/icons-material/Subject';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import GridOnIcon from '@mui/icons-material/GridOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FolderIcon from '@mui/icons-material/Folder';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DownloadIcon from '@mui/icons-material/Download';
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
  },
  'preparation_time': {
    name: 'Preparation Time Audit',
    description: 'Time-based scoring for item preparation (e.g., beverage making)',
    isTimeBased: true,
    defaultTimeConstraints: {
      min_time_minutes: 1.5,
      target_time_minutes: 2,
      max_time_minutes: 3
    },
    options: [
      { option_text: 'Excellent (< 2 min)', mark: '100' },
      { option_text: 'Good (2-3 min)', mark: '90' },
      { option_text: 'Average (3-4 min)', mark: '80' },
      { option_text: 'Needs Improvement (> 4 min)', mark: '70' }
    ]
  },
  'dynamic_entry': {
    name: 'Dynamic Item Entry',
    description: 'Allow auditors to add items manually during audit with time tracking',
    isTimeBased: true,
    allowDynamicEntry: true,
    defaultTimeConstraints: {
      min_time_minutes: 1.5,
      target_time_minutes: 2,
      max_time_minutes: 3
    },
    options: [
      { option_text: 'Auto-calculated from time', mark: '0' }
    ]
  }
};

// Weight options for item importance
const weightOptions = [
  { value: 1, label: 'Normal', description: 'Standard weight' },
  { value: 2, label: 'Important', description: '2x weight' },
  { value: 3, label: 'Critical', description: '3x weight' }
];

// Checklist Item "Field Type" options (as per UI request)
const itemFieldTypes = [
  { value: 'single_answer', label: 'Single Answer', icon: <RadioButtonCheckedIcon fontSize="small" /> },
  { value: 'multiple_answer', label: 'Multiple Answer', icon: <CheckBoxIcon fontSize="small" /> },
  { value: 'short_answer', label: 'Short Answer', icon: <ShortTextIcon fontSize="small" /> },
  { value: 'long_answer', label: 'Long Answer', icon: <SubjectIcon fontSize="small" /> },
  { value: 'dropdown', label: 'Dropdown', icon: <ArrowDropDownCircleIcon fontSize="small" /> },
  { value: 'grid', label: 'Grid', icon: <GridOnIcon fontSize="small" /> },
  { value: 'date', label: 'Date', icon: <EventOutlinedIcon fontSize="small" /> },
  { value: 'time', label: 'Time', icon: <AccessTimeIcon fontSize="small" /> },
  { value: 'section', label: 'Section', icon: <FolderIcon fontSize="small" /> },
  { value: 'sub_section', label: 'Sub-Section', icon: <SubdirectoryArrowRightIcon fontSize="small" /> },
  { value: 'option_select', label: 'Option Select', icon: <CheckBoxOutlinedIcon fontSize="small" /> },
  { value: 'open_ended', label: 'Open Ended', icon: <EditOutlinedIcon fontSize="small" /> },
  { value: 'image_upload', label: 'Image Upload', icon: <ImageOutlinedIcon fontSize="small" /> },
  { value: 'select_from_data_source', label: 'Select from Data Source', icon: <StorageOutlinedIcon fontSize="small" /> },
  { value: 'number', label: 'Number', icon: <NumbersIcon fontSize="small" /> },
  { value: 'description', label: 'Description', icon: <DescriptionOutlinedIcon fontSize="small" /> },
  { value: 'task', label: 'Task', icon: <TaskAltOutlinedIcon fontSize="small" /> },
  { value: 'scan_code', label: 'Scan Code', icon: <QrCodeScannerOutlinedIcon fontSize="small" /> },
  { value: 'signature', label: 'Collect Signature', icon: <DrawOutlinedIcon fontSize="small" /> },
];

const inferItemFieldType = (item) => {
  // Legacy behavior: options => option select; otherwise a status/task style item.
  if (item?.options && Array.isArray(item.options) && item.options.length > 0) return 'option_select';
  return 'task';
};

const getEffectiveItemFieldType = (item) => {
  const t = item?.input_type || item?.inputType || 'auto';
  if (!t || t === 'auto') return inferItemFieldType(item);
  return t;
};

const fieldTypeSupportsOptions = (fieldType) =>
  fieldType === 'option_select' || 
  fieldType === 'select_from_data_source' ||
  fieldType === 'single_answer' ||
  fieldType === 'multiple_answer' ||
  fieldType === 'dropdown' ||
  fieldType === 'grid';

const createEmptyItem = (category = '', section = '') => ({
  title: '',
  description: '',
  category,
  section: section || '',
  input_type: 'option_select',
  required: true,
  weight: 1, // Default weight
  is_critical: false, // Critical items can auto-fail the audit
  is_time_based: false, // Enable time-based scoring for Item Making Performance
  target_time_minutes: '', // Target/ideal time in minutes for time-based items
  min_time_minutes: '', // Minimum acceptable time (if faster, may indicate rushing)
  max_time_minutes: '', // Maximum acceptable time (if slower, needs improvement)
  conditional_item_id: null, // ID of item to check for conditional display
  conditional_value: '', // Value that triggers showing this item
  conditional_operator: 'equals', // Operator: 'equals', 'not_equals', 'contains'
  options: defaultOptions.map(option => ({ ...option }))
});

// Sample CSV template for creating NEW checklists (blank template with examples)
// Format: category = main category, subcategory = sub-category, section = section within subcategory
// INPUT TYPES: option_select, short_answer, long_answer, number, date, time, image_upload, signature, task, dropdown
const sampleCsvContent = `title,description,category,subcategory,section,input_type,required,weight,is_critical,options
Food served at right temperature,Check food temperature before serving,QUALITY,Food Safety,Kitchen,option_select,yes,1,no,Yes:3|No:0|NA:NA
Hand wash sink with soap available,Verify sink has soap and paper towels,QUALITY,Personal Hygiene,Kitchen,option_select,yes,1,no,Yes:3|No:0|NA:NA
Staff wearing clean uniforms,All staff in proper clean attire,QUALITY,Staff Appearance,Front Area,option_select,yes,1,no,Yes:3|No:0|NA:NA
Floor is clean and dry,Check for spills and debris on floor,QUALITY,Cleanliness,Kitchen,option_select,yes,1,no,Yes:3|No:0|NA:NA
Tables cleaned after each customer,Verify tables are properly sanitized,QUALITY,Cleanliness,Dining Area,option_select,yes,1,no,Yes:3|No:0|NA:NA
Fire extinguisher present and accessible,Verify extinguisher not expired,SAFETY,Fire Safety,Front Area,option_select,yes,3,yes,Yes:3|No:0|NA:NA
Food stored at proper temperature,Refrigerator maintained at 4C or below,SAFETY,Food Safety,Kitchen,option_select,yes,3,yes,Yes:3|No:0|NA:NA
Emergency exits clearly marked,Check all exit signs are visible and lit,SAFETY,Emergency,All Areas,option_select,yes,2,yes,Yes:3|No:0|NA:NA
Health permit displayed,Permit visible to customers at entrance,COMPLIANCE,Regulatory,Front Area,option_select,yes,2,no,Yes:3|No:0|NA:NA
Temperature logs maintained daily,Check temperature records are complete,COMPLIANCE,Documentation,Kitchen,option_select,yes,1,no,Yes:3|No:0|NA:NA
Staff training records current,All food safety certifications valid,COMPLIANCE,Training,Back Office,option_select,yes,1,no,Yes:3|No:0|NA:NA
Greeting provided to customers,Staff welcomes customers on entry,SERVICE,Customer Experience,Front Area,option_select,yes,1,no,Yes:3|No:0|NA:NA
Order delivered within standard time,Check service speed meets standards,SERVICE,Speed,Dining Area,option_select,yes,1,no,Yes:3|No:0|NA:NA
Bill presented promptly,Check billing process is efficient,SERVICE,Customer Experience,Front Area,option_select,yes,1,no,Yes:3|No:0|NA:NA
Refrigerator Temperature Reading,Enter current fridge temperature in Celsius,DATA ENTRY,Temperature,Kitchen,number,yes,1,no,
Freezer Temperature Reading,Enter current freezer temperature in Celsius,DATA ENTRY,Temperature,Kitchen,number,yes,1,no,
Number of staff on duty,Enter total staff count for this shift,DATA ENTRY,Staff,General,number,yes,1,no,
Last deep cleaning date,When was kitchen last deep cleaned,DATA ENTRY,Cleaning,Kitchen,date,yes,1,no,
Next pest control visit,Scheduled date for pest control,DATA ENTRY,Maintenance,General,date,no,1,no,
Store opening time today,What time did store open today,DATA ENTRY,Operations,General,time,yes,1,no,
Shift start time,When did current shift begin,DATA ENTRY,Operations,General,time,yes,1,no,
Any equipment issues noted,Describe any equipment problems found,OBSERVATIONS,Issues,Kitchen,short_answer,no,1,no,
Customer complaints received,Note any complaints from customers,OBSERVATIONS,Issues,Front Area,short_answer,no,1,no,
General observations and comments,Detailed notes about overall store condition,OBSERVATIONS,General,All Areas,long_answer,no,1,no,
Action items from previous audit,List pending items from last inspection,OBSERVATIONS,Follow-up,General,long_answer,no,1,no,
Photo of store entrance,Capture entrance signage and cleanliness,DOCUMENTATION,Photos,Entrance,image_upload,yes,1,no,
Photo of kitchen area,Document kitchen cleanliness and organization,DOCUMENTATION,Photos,Kitchen,image_upload,yes,1,no,
Photo of dining area,Document dining area arrangement,DOCUMENTATION,Photos,Dining Area,image_upload,no,1,no,
Photo of restroom,Document restroom cleanliness,DOCUMENTATION,Photos,Restroom,image_upload,no,1,no,
Staff uniform condition rating,Rate overall staff uniform presentation,RATINGS,Staff,Front Area,dropdown,yes,1,no,Excellent:5|Good:4|Average:3|Poor:2|Very Poor:1
Overall cleanliness rating,Rate overall store cleanliness,RATINGS,Cleanliness,All Areas,dropdown,yes,1,no,Excellent:5|Good:4|Average:3|Poor:2|Very Poor:1
Customer service rating,Rate customer service quality observed,RATINGS,Service,Front Area,dropdown,yes,1,no,Excellent:5|Good:4|Average:3|Poor:2|Very Poor:1
Verify daily checklist completed,Confirm staff completed daily checklist,TASKS,Verification,Kitchen,task,yes,1,no,
Verify cash register balanced,Confirm cash count matches system,TASKS,Verification,Front Area,task,yes,1,no,
Verify staff break schedule followed,Confirm breaks taken as scheduled,TASKS,Verification,Back Office,task,no,1,no,
Manager Name,Enter the name of manager on duty,SIGN-OFF,Manager Details,Sign-Off,short_answer,yes,1,no,
Manager Remarks,Any additional comments or observations from manager,SIGN-OFF,Manager Details,Sign-Off,long_answer,no,1,no,
Manager Photo,Take photo of manager for verification,SIGN-OFF,Manager Details,Sign-Off,image_upload,yes,1,no,
Manager Signature,Manager acknowledges and approves this audit,SIGN-OFF,Manager Details,Sign-Off,signature,yes,1,no,
Auditor Signature,Auditor confirms audit completion and accuracy,SIGN-OFF,Auditor Details,Sign-Off,signature,yes,1,no,
`;

const Checklists = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const [templates, setTemplates] = useState([]);
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
      setLoading(true);
      // Add cache-busting parameter to ensure fresh data after create/update
      const response = await axios.get('/api/templates', {
        params: { _t: Date.now(), dedupe: 'true' }
      });
      const serverTemplates = response.data.templates || [];
      
      console.log('Templates fetched:', serverTemplates.length, 'templates');
      console.log('Template data:', serverTemplates);
      
      setTemplates(serverTemplates);
      
      if (serverTemplates.length === 0) {
        console.warn('No templates returned from API. Check:');
        console.warn('1. Database connection');
        console.warn('2. User permissions');
        console.warn('3. API endpoint: /api/templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (error.response?.status === 403) {
        console.error('Permission denied - user may not have access to templates');
      } else if (error.response?.status === 401) {
        console.error('Authentication required - user may need to login again');
      }
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
    link.setAttribute('download', 'checklist_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Sample CSV template downloaded');
  };

  const handleAddItem = () => {
    const last = items[items.length - 1];
    setItems([...items, createEmptyItem(last?.category || '', last?.section || '')]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'input_type') {
      const effective = value || 'auto';
      if (!fieldTypeSupportsOptions(effective)) {
        newItems[index].options = [];
      } else if (!newItems[index].options || newItems[index].options.length === 0) {
        // Provide a sensible default for option-based items.
        newItems[index].options = defaultOptions.map(option => ({ ...option }));
      }
    }

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

  // eslint-disable-next-line no-unused-vars
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
      
      // If preset has time-based configuration, apply it
      if (preset.isTimeBased) {
        newItems[itemIndex].is_time_based = true;
        if (preset.defaultTimeConstraints) {
          newItems[itemIndex].min_time_minutes = preset.defaultTimeConstraints.min_time_minutes || '';
          newItems[itemIndex].target_time_minutes = preset.defaultTimeConstraints.target_time_minutes || '';
          newItems[itemIndex].max_time_minutes = preset.defaultTimeConstraints.max_time_minutes || '';
        }
      }
      
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
        input_type: getEffectiveItemFieldType(item),
        required: item.required !== false,
        weight: item.weight || 1,
        is_critical: item.is_critical || false,
        is_time_based: item.is_time_based || false,
        target_time_minutes: item.is_time_based ? parseFloat(item.target_time_minutes) || null : null,
        min_time_minutes: item.is_time_based ? parseFloat(item.min_time_minutes) || null : null,
        max_time_minutes: item.is_time_based ? parseFloat(item.max_time_minutes) || null : null,
        section: item.section || null,
        conditional_item_id: item.conditional_item_id || null,
        conditional_value: item.conditional_value || '',
        conditional_operator: item.conditional_operator || 'equals',
        order_index: index,
        options: fieldTypeSupportsOptions(getEffectiveItemFieldType(item))
          ? (item.options || []).map((option, optionIndex) => ({
              option_text: option.option_text || '',
              mark: option.mark ?? '',
              order_index: optionIndex
            }))
          : []
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
        input_type: item.input_type || item.inputType || 'auto',
        required: item.required !== 0,
        weight: item.weight || 1,
        is_critical: item.is_critical === 1 || item.is_critical === true,
        is_time_based: item.is_time_based === 1 || item.is_time_based === true,
        target_time_minutes: item.target_time_minutes || '',
        min_time_minutes: item.min_time_minutes || '',
        max_time_minutes: item.max_time_minutes || '',
        section: item.section || null,
        conditional_item_id: item.conditional_item_id || null,
        conditional_value: item.conditional_value || '',
        conditional_operator: item.conditional_operator || 'equals',
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

  const handleCloneTemplate = async (templateId) => {
    try {
      const response = await axios.get(`/api/checklists/${templateId}`);
      const { template, items: templateItems } = response.data;
      
      // Create a copy with "Copy of" prefix
      const clonedName = `Copy of ${template.name}`;
      setTemplateForm({
        name: clonedName,
        description: template.description || ''
      });
      
      // Map items without IDs (so they're treated as new items)
      const mappedItems = (templateItems || []).map(item => ({
        title: item.title,
        description: item.description,
        category: item.category,
        input_type: item.input_type || item.inputType || 'auto',
        required: item.required !== 0,
        weight: item.weight || 1,
        is_critical: item.is_critical === 1 || item.is_critical === true,
        is_time_based: item.is_time_based === 1 || item.is_time_based === true,
        target_time_minutes: item.target_time_minutes || '',
        min_time_minutes: item.min_time_minutes || '',
        max_time_minutes: item.max_time_minutes || '',
        options: (item.options || []).map(option => ({
          option_text: option.option_text || option.title || '',
          mark: option.mark ?? ''
        }))
      }));
      
      setItems(mappedItems.length > 0 ? mappedItems : [createEmptyItem('')]);
      setEditingTemplateId(null); // New template, not editing
      setShowAddDialog(true);
      showSuccess('Template cloned. Please review and save.');
    } catch (error) {
      console.error('Error cloning template:', error);
      showError(error.response?.data?.error || 'Failed to clone template');
    }
  };

  // Export template as CSV
  const handleExportCSV = async (templateId, templateName) => {
    try {
      const response = await axios.get(`/api/checklists/${templateId}/export/csv`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `${templateName.replace(/[^a-zA-Z0-9]/g, '_')}_checklist.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSuccess(`Checklist "${templateName}" exported as CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError(error.response?.data?.error || 'Failed to export CSV');
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
      // Filter empty lines and comment lines (starting with #)
      const lines = csvText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#');
      });
      if (lines.length < 2) {
        setParseError('CSV must have at least a header row and one data row');
        setParsedItems([]);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('item') || h === 'name');
      const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
      const catIndex = headers.findIndex(h => h === 'category' || h === 'cat');
      const subCatIndex = headers.findIndex(h => h === 'subcategory' || h === 'subcat' || h === 'sub_category');
      const secIndex = headers.findIndex(h => h === 'section' || h === 'sec');
      const typeIndex = headers.findIndex(h => h === 'input_type' || h === 'type' || h === 'field_type');
      const reqIndex = headers.findIndex(h => h.includes('required') || h.includes('mandatory'));
      const weightIndex = headers.findIndex(h => h === 'weight');
      const criticalIndex = headers.findIndex(h => h === 'is_critical' || h === 'critical');
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
          // Parse options - support both pipe (|) and semicolon (;) separators
          const itemOptions = [];
          if (optionsIndex !== -1 && values[optionsIndex]) {
            const optionsStr = values[optionsIndex].replace(/^"|"$/g, '');
            // Detect separator: pipe or semicolon
            const separator = optionsStr.includes('|') ? '|' : ';';
            optionsStr.split(separator).forEach((option, optionIndex) => {
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

          // Extract values from columns
          const getValue = (index) => index !== -1 && values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';
          
          const normalizeCategoryName = (value) => {
            if (!value) return '';
            let normalized = String(value).trim().replace(/\s+/g, ' ');
            normalized = normalized.replace(/\s*&\s*/g, ' & ');
            normalized = normalized.replace(/\s+and\s+/gi, ' & ');
            normalized = normalized.replace(/\bAcknowledgment\b/gi, 'Acknowledgement');
            return normalized;
          };
          const normalizeSectionName = (value) => {
            if (!value) return '';
            return String(value).trim().replace(/\s+/g, ' ');
          };

          const mainCategory = normalizeCategoryName(getValue(catIndex));
          const subCategory = normalizeCategoryName(getValue(subCatIndex));
          const itemSection = normalizeSectionName(getValue(secIndex));
          const normalizeInputType = (rawType, title) => {
            const normalized = String(rawType || '').trim().toLowerCase();
            if (!normalized || normalized === 'auto') {
              return /photo/i.test(String(title || '')) ? 'image_upload' : (normalized || 'auto');
            }
            const aliasToPhoto = ['image', 'photo', 'attachment', 'file'];
            return aliasToPhoto.includes(normalized) ? 'image_upload' : normalized;
          };
          const itemType = normalizeInputType(getValue(typeIndex) || 'auto', title);
          const itemWeight = weightIndex !== -1 && values[weightIndex] ? parseInt(values[weightIndex]) || 1 : 1;
          const isCritical = criticalIndex !== -1 && values[criticalIndex] 
            ? (getValue(criticalIndex).toLowerCase() === 'yes' || getValue(criticalIndex).toLowerCase() === 'true' || getValue(criticalIndex) === '1')
            : false;
          const isRequired = reqIndex !== -1 
            ? (getValue(reqIndex).toLowerCase() === 'yes' || getValue(reqIndex).toLowerCase() === 'true' || getValue(reqIndex) === '1')
            : true;

          // Combine category and subcategory for storage: "CATEGORY (Subcategory)"
          let fullCategory = mainCategory;
          if (subCategory) {
            fullCategory = mainCategory ? `${mainCategory} (${subCategory})` : subCategory;
          }

          items.push({
            title,
            description: getValue(descIndex),
            category: fullCategory,
            subcategory: subCategory,
            section: itemSection,
            input_type: itemType,
            required: isRequired,
            weight: itemWeight,
            is_critical: isCritical,
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
      const response = await axios.post('/api/checklists/import/csv', {
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
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error importing template';
      showError(errorMessage);
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

        {/* Templates Grid - Direct view without category selection */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {templates.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    No templates available. Click "+ Add Template" to create one.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            templates.map((template, index) => {
              const templateId = getTemplateId(template) ?? index;
              const templateCategories = template.categories || [];
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
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {templateCategories.slice(0, 2).map((cat, idx) => (
                              <Chip
                                key={idx}
                                label={cat}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                              />
                            ))}
                            {templateCategories.length > 2 && (
                              <Chip
                                label={`+${templateCategories.length - 2}`}
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
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
                        <>
                          <Tooltip title="Edit Template">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditTemplate(getTemplateId(template))}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicate Template">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCloneTemplate(getTemplateId(template))}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download CSV">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleExportCSV(getTemplateId(template), template.name)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip title="Delete Template">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTemplate(getTemplateId(template))}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })
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
                  placeholder="e.g. SERVICE (Speed of Service)"
                />
                <FormControl fullWidth size="small" margin="dense">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={item.section || ''}
                    label="Section"
                    onChange={(e) => handleItemChange(index, 'section', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="Trnx-1">Trnx-1</MenuItem>
                    <MenuItem value="Trnx-2">Trnx-2</MenuItem>
                    <MenuItem value="Trnx-3">Trnx-3</MenuItem>
                    <MenuItem value="Trnx-4">Trnx-4</MenuItem>
                    <MenuItem value="Avg">Avg</MenuItem>
                  </Select>
                  <FormHelperText>For Speed of Service: use Trnx-1 to Trnx-4, or Avg</FormHelperText>
                </FormControl>
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
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field Type</InputLabel>
                      <Select
                        value={getEffectiveItemFieldType(item)}
                        label="Field Type"
                        onChange={(e) => handleItemChange(index, 'input_type', e.target.value)}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 360,
                              overflow: 'auto'
                            }
                          }
                        }}
                      >
                        {itemFieldTypes.map((ft) => (
                          <MenuItem key={ft.value} value={ft.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {ft.icon}
                              <span>{ft.label}</span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {item.category && String(item.category).toLowerCase().includes('speed of service') && (
                        <FormHelperText>Use <strong>Date</strong> for (Time) items, <strong>Number</strong> for (Sec) and Table no.</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Conditional Logic Section */}
                <Paper 
                  elevation={0} 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: item.conditional_item_id ? 'warning.light' : 'grey.50',
                    border: '1px solid',
                    borderColor: item.conditional_item_id ? 'warning.main' : 'grey.300',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Conditional Display (Show/Hide Logic)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Show this item only when another item has a specific value
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Show if item</InputLabel>
                        <Select
                          value={item.conditional_item_id !== null && item.conditional_item_id !== undefined ? item.conditional_item_id : ''}
                          label="Show if item"
                          onChange={(e) => {
                            const value = e.target.value;
                            handleItemChange(index, 'conditional_item_id', value === '' ? null : (typeof value === 'string' && value.startsWith('temp_') ? parseInt(value.replace('temp_', '')) : value));
                          }}
                        >
                          <MenuItem value="">Always show</MenuItem>
                          {items
                            .filter((it, idx) => idx < index && it.title.trim()) // Only show items before this one
                            .map((it, idx) => {
                              // Use item ID if available, otherwise use temp index
                              const itemId = it.id || `temp_${idx}`;
                              return (
                                <MenuItem key={idx} value={itemId}>
                                  {it.title || `Item ${idx + 1}`}
                                </MenuItem>
                              );
                            })}
                        </Select>
                      </FormControl>
                    </Grid>
                    {item.conditional_item_id && (
                      <>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Operator</InputLabel>
                            <Select
                              value={item.conditional_operator || 'equals'}
                              label="Operator"
                              onChange={(e) => handleItemChange(index, 'conditional_operator', e.target.value)}
                            >
                              <MenuItem value="equals">Equals</MenuItem>
                              <MenuItem value="not_equals">Not Equals</MenuItem>
                              <MenuItem value="contains">Contains</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Value"
                            value={item.conditional_value || ''}
                            onChange={(e) => handleItemChange(index, 'conditional_value', e.target.value)}
                            placeholder="e.g., 'No', 'Failed', 'Yes'"
                            helperText="Value that triggers showing this item"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Paper>
                
                {/* Time-Based Scoring Section for Item Making Performance */}
                <Paper 
                  elevation={0} 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: item.is_time_based ? 'info.light' : 'grey.50',
                    border: '1px solid',
                    borderColor: item.is_time_based ? 'info.main' : 'grey.300',
                    borderRadius: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: item.is_time_based ? 2 : 0 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.is_time_based || false}
                          onChange={(e) => handleItemChange(index, 'is_time_based', e.target.checked)}
                          color="info"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimerIcon sx={{ fontSize: 18, color: item.is_time_based ? 'info.main' : 'action.active' }} />
                          <span style={{ fontWeight: 500 }}>Time-Based Item (Item Making Performance)</span>
                        </Box>
                      }
                    />
                  </Box>
                  
                  {item.is_time_based && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Min Time (minutes)"
                          value={item.min_time_minutes || ''}
                          onChange={(e) => handleItemChange(index, 'min_time_minutes', e.target.value)}
                          placeholder="e.g., 2"
                          InputProps={{
                            startAdornment: <TimerIcon sx={{ mr: 1, color: 'warning.main', fontSize: 18 }} />,
                            inputProps: { min: 0.1, step: 0.1 }
                          }}
                          helperText="Minimum acceptable time"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Target Time (minutes)"
                          value={item.target_time_minutes || ''}
                          onChange={(e) => handleItemChange(index, 'target_time_minutes', e.target.value)}
                          placeholder="e.g., 3"
                          InputProps={{
                            startAdornment: <TimerIcon sx={{ mr: 1, color: 'success.main', fontSize: 18 }} />,
                            inputProps: { min: 0.1, step: 0.1 }
                          }}
                          helperText="Ideal/expected time"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Max Time (minutes)"
                          value={item.max_time_minutes || ''}
                          onChange={(e) => handleItemChange(index, 'max_time_minutes', e.target.value)}
                          placeholder="e.g., 5"
                          InputProps={{
                            startAdornment: <TimerIcon sx={{ mr: 1, color: 'error.main', fontSize: 18 }} />,
                            inputProps: { min: 0.1, step: 0.1 }
                          }}
                          helperText="Maximum acceptable time"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                          <strong>How it works:</strong> Auditor records multiple time entries while observing the task.
                          <br />
                          • <strong style={{color: '#2e7d32'}}>Within Min-Max range:</strong> 100% score
                          <br />
                          • <strong style={{color: '#ed6c02'}}>Below Min time:</strong> May indicate rushing - score reduces
                          <br />
                          • <strong style={{color: '#d32f2f'}}>Above Max time:</strong> Needs improvement - score reduces
                        </Alert>
                      </Grid>
                    </Grid>
                  )}
                </Paper>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2">Scoring Options</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 150 }} disabled={!fieldTypeSupportsOptions(getEffectiveItemFieldType(item))}>
                        <InputLabel>Apply Preset</InputLabel>
                        <Select
                          value=""
                          label="Apply Preset"
                          onChange={(e) => handleApplyPreset(index, e.target.value)}
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 300,
                                overflow: 'auto'
                              }
                            },
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'left'
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'left'
                            }
                          }}
                        >
                          {Object.entries(scoringPresets).map(([key, preset]) => (
                            <MenuItem key={key} value={key} sx={{ py: 1 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{preset.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
                        disabled={!fieldTypeSupportsOptions(getEffectiveItemFieldType(item))}
                      >
                        Add Option
                      </Button>
                    </Box>
                  </Box>
                  {(fieldTypeSupportsOptions(getEffectiveItemFieldType(item)) && item.options && item.options.length > 0) ? (
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
                      {fieldTypeSupportsOptions(getEffectiveItemFieldType(item))
                        ? 'No scoring options yet.'
                        : 'Scoring options are disabled for this field type.'}
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
              variant="outlined"
              color="info"
              onClick={handleDownloadSampleCsv}
              startIcon={<DownloadIcon />}
              sx={{ mb: 2 }}
            >
              Download Import Template (Sample CSV)
            </Button>
            <TextField
              fullWidth
              label="Paste CSV Data or Edit Below"
              value={csvData}
              onChange={(e) => handleCsvDataChange(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="title,description,category,section,input_type,required,weight,is_critical,options&#10;Check Item,Description,Category,Section,option_select,yes,1,no,Yes:3|No:0|NA:NA"
              helperText="Required: 'title' column. Optional: description, category, section (subcategory), input_type, required, weight, is_critical, options"
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
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Subcategory</strong></TableCell>
                        <TableCell><strong>Section</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Req</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedItems.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.title}
                          </TableCell>
                          <TableCell>
                            {item.category ? (
                              <Chip label={item.category.split('(')[0].trim()} size="small" color="primary" variant="outlined" />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {item.subcategory ? (
                              <Chip label={item.subcategory} size="small" color="secondary" variant="outlined" />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {item.section ? (
                              <Chip label={item.section} size="small" color="info" variant="outlined" />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip label={item.input_type || 'auto'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.required ? 'Y' : 'N'} 
                              size="small" 
                              color={item.required ? 'success' : 'default'}
                            />
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
                <strong>CSV Format for Import:</strong><br />
                • <strong>Required:</strong> title (or item/name column)<br />
                • <strong>Optional:</strong> description, category, <strong>subcategory</strong>, <strong>section</strong>, input_type, required, weight, is_critical, options<br />
                • <strong>Options format:</strong> "Yes:3|No:0|NA:NA" (pipe-separated, Label:Score pairs)<br />
                <br />
                <strong>Column Structure:</strong><br />
                • <strong>category:</strong> Main category (e.g., SERVICE, QUALITY, SAFETY)<br />
                • <strong>subcategory:</strong> Sub-category (e.g., Speed of Service, Food Safety)<br />
                • <strong>section:</strong> Section within subcategory (e.g., Trnx-1, Trnx-2, Kitchen)<br />
                <br />
                <strong>Columns:</strong><br />
                <code style={{ fontSize: '11px' }}>
                  title, description, category, subcategory, section, input_type, required, weight, is_critical, options
                </code>
                <br /><br />
                <strong>Example:</strong><br />
                <code style={{ fontSize: '11px' }}>
                  Table Number,Enter table,SERVICE,Speed of Service,Trnx-1,short_answer,yes,1,no,<br />
                  Time - Attempt 1,Time in minutes,SERVICE,Speed of Service,Trnx-1,number,yes,1,no,
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


import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Checkbox,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Autocomplete,
  useMediaQuery,
  useTheme,
  LinearProgress,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EventIcon from '@mui/icons-material/Event';
import NumbersIcon from '@mui/icons-material/Numbers';
import AddIcon from '@mui/icons-material/Add';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';
import { cvrTheme, isCvrTemplate } from '../config/theme';
import SignatureCanvas from 'react-signature-canvas';

const AuditForm = () => {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [template, setTemplate] = useState(null);
  const isCvr = isCvrTemplate(template?.name);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false); // Setter is used, value not read
  const [locationId, setLocationId] = useState(searchParams.get('location_id') || '');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({}); // Track selected_option_id for each item
  const [multipleSelections, setMultipleSelections] = useState({}); // Track multiple selected options for multiple_answer type
  const [inputValues, setInputValues] = useState({}); // Track values for number, date, open_ended input types
  const [comments, setComments] = useState({});
  const [photos, setPhotos] = useState({});
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const scheduledId = searchParams.get('scheduled_id');
  const auditId = searchParams.get('audit_id'); // Support resuming existing audit
  const [isEditing, setIsEditing] = useState(false);
  const [auditStatus, setAuditStatus] = useState(null);
  
  // Scheduled audit restrictions
  const [scheduledAudit, setScheduledAudit] = useState(null);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isBeforeScheduledDate, setIsBeforeScheduledDate] = useState(false);
  
  // Previous failures state for highlighting recurring issues
  const [previousFailures, setPreviousFailures] = useState([]);
  const [failedItemIds, setFailedItemIds] = useState(new Set());
  const [previousAuditInfo, setPreviousAuditInfo] = useState(null);
  const [, setShowFailuresAlert] = useState(false); // Setter is used, value not read
  const [signatureItemId, setSignatureItemId] = useState(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const signatureRef = useRef(null);
  
  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null); // Track selected section within a category
  const [categories, setCategories] = useState([]);
  
  // Time tracking state
  const [itemStartTimes, setItemStartTimes] = useState({}); // Track when each item was started
  const [itemElapsedTimes, setItemElapsedTimes] = useState({}); // Track elapsed time for each item in seconds
  const [filteredItems, setFilteredItems] = useState([]);
  const [categoryCompletionStatus, setCategoryCompletionStatus] = useState({}); // Track category completion
  const [expandedGroups, setExpandedGroups] = useState({}); // Track which category groups are expanded
  const [expandedSections, setExpandedSections] = useState({}); // Track which sections are expanded (e.g., Trnx-1, Trnx-2)

  // Helper function to group categories by their parent (e.g., "SERVICE (Speed of Service)" -> parent: "SERVICE")
  // Also handles sections within categories (e.g., items with section="Trnx-1" under "SPEED OF SERVICE - TRACKING")
  const groupCategories = useCallback((categoryList, itemsList) => {
    const groups = {};
    
    // Define known parent category patterns
    const parentPatterns = [
      { pattern: /^SERVICE\s*[-–]\s*/i, parent: 'SERVICE' },
      { pattern: /^SERVICE\s*\(/i, parent: 'SERVICE' },
      { pattern: /^HYGIENE\s*(AND|&)\s*CLEANLINESS/i, parent: 'HYGIENE & CLEANLINESS' },
      { pattern: /^SPEED\s*OF\s*SERVICE/i, parent: 'SPEED OF SERVICE' },
      { pattern: /^QUALITY/i, parent: 'QUALITY' },
      { pattern: /^PROCESSES/i, parent: 'PROCESSES' },
    ];
    
    categoryList.forEach(category => {
      if (!category) return;
      
      let parentName = null;
      let subCategoryName = category;
      
      // Try to match with known patterns
      for (const { pattern, parent } of parentPatterns) {
        if (pattern.test(category)) {
          parentName = parent;
          // Extract sub-category name
          if (category.includes('(') && category.includes(')')) {
            const match = category.match(/\(([^)]+)\)/);
            if (match) {
              subCategoryName = match[1].trim();
            }
          } else if (category.includes(' - ')) {
            subCategoryName = category.split(' - ').slice(1).join(' - ').trim() || category;
          } else if (category.includes(' – ')) {
            subCategoryName = category.split(' – ').slice(1).join(' – ').trim() || category;
          } else {
            subCategoryName = category.replace(pattern, '').trim() || category;
          }
          break;
        }
      }
      
      // If no pattern matched, use the category as its own group
      if (!parentName) {
        parentName = category;
        subCategoryName = null;
      }
      
      if (!groups[parentName]) {
        groups[parentName] = {
          name: parentName,
          subCategories: [],
          totalItems: 0,
          completedItems: 0
        };
      }
      
      // Get all items for this category
      const categoryItems = itemsList.filter(item => item.category === category);
      
      // Check if items have sections (e.g., Trnx-1, Trnx-2, Avg)
      const itemsBySection = {};
      categoryItems.forEach(item => {
        const section = item.section || 'General';
        if (!itemsBySection[section]) {
          itemsBySection[section] = [];
        }
        itemsBySection[section].push(item);
      });
      
      const hasSections = Object.keys(itemsBySection).length > 1 || 
        (Object.keys(itemsBySection).length === 1 && Object.keys(itemsBySection)[0] !== 'General');
      
      // For Speed of Service with sections, treat as single category (sections shown inside audit form, not as separate cards)
      const isSpeedOfService = category && (
        category.toLowerCase().includes('speed of service') || 
        category.toLowerCase().includes('service (speed')
      );
      
      if (hasSections && !isSpeedOfService) {
        // Group by sections within the category (for non-SOS categories)
        Object.keys(itemsBySection).sort().forEach(section => {
          const sectionItems = itemsBySection[section];
          const completedCount = sectionItems.filter(item => {
            const status = responses[item.id]?.status;
            return status && status !== 'pending';
          }).length;
          
          const sectionDisplayName = section === 'General' ? (subCategoryName || category) : section;
          
          groups[parentName].subCategories.push({
            fullName: category,
            displayName: sectionDisplayName,
            section: section,
            itemCount: sectionItems.length,
            completedCount: completedCount,
            isComplete: completedCount === sectionItems.length && sectionItems.length > 0
          });
          
          groups[parentName].totalItems += sectionItems.length;
          groups[parentName].completedItems += completedCount;
        });
      } else {
        // No sections, treat as single sub-category
        const completedCount = categoryItems.filter(item => {
          const status = responses[item.id]?.status;
          return status && status !== 'pending';
        }).length;
        
        groups[parentName].subCategories.push({
          fullName: category,
          displayName: subCategoryName || category,
          itemCount: categoryItems.length,
          completedCount: completedCount,
          isComplete: completedCount === categoryItems.length && categoryItems.length > 0
        });
        
        groups[parentName].totalItems += categoryItems.length;
        groups[parentName].completedItems += completedCount;
      }
    });
    
    // Sort groups and sub-categories
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [responses]);

  // Get grouped categories
  const groupedCategories = React.useMemo(() => {
    return groupCategories(categories, items);
  }, [categories, items, groupCategories]);

  const getNormalizedInputType = useCallback((item) => {
    if (!item) return 'auto';
    const raw = (item.input_type || item.inputType || 'auto').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;

    // Fix legacy CVR acknowledgement items imported without input_type
    if (category.includes('acknowledgement') || title.includes('manager on duty') || title.includes('signature')) {
      if (title.includes('signature')) return 'signature';
      if (title.includes('manager on duty')) return 'short_answer';
    }

    if (raw && raw !== 'auto') return raw;

    // CVR timing fields use short answer "Type Here"
    if (isCvr && (title.includes('(sec)') || title.includes('(time)'))) {
      return 'short_answer';
    }

    if (hasOptions) return 'option_select';

    return 'open_ended';
  }, [isCvr]);

  useEffect(() => {
    fetchLocations();
    // Fetch scheduled audit data if coming from scheduled audits
    if (scheduledId) {
      fetchScheduledAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledId]);

  const fetchScheduledAudit = async () => {
    try {
      const response = await axios.get(`/api/scheduled-audits/${scheduledId}`);
      const schedule = response.data.schedule;
      setScheduledAudit(schedule);
      
      // Check if location is pre-assigned - lock the store selection
      if (schedule.location_id) {
        setIsLocationLocked(true);
        setLocationId(schedule.location_id.toString());
      }
      
      // Check if current date matches scheduled date (scheduled audits can only be opened on the scheduled date)
      // Requirement: "Audit template should open on the same day of audit and not other days"
      if (schedule.scheduled_date) {
        const scheduledDate = new Date(schedule.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Only allow opening on the exact scheduled date (same day)
        if (scheduledDate.getTime() !== today.getTime()) {
          setIsBeforeScheduledDate(true);
          setError(`This audit is scheduled for ${scheduledDate.toLocaleDateString()}. Please open it on the scheduled date.`);
        }
      }
    } catch (error) {
      console.error('Error fetching scheduled audit:', error);
    }
  };

  useEffect(() => {
    if (auditId) {
      // Editing existing audit - fetch audit data (locations will be set after they load)
      setIsEditing(true);
      fetchAuditData();
    } else if (templateId) {
      // Creating new audit - fetch template
      fetchTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, auditId]);

  // Update selectedLocation when locationId changes (e.g., from URL params or audit data)
  useEffect(() => {
    if (locationId && locations.length > 0) {
      const location = locations.find(l => l.id === parseInt(locationId));
      if (location) {
        setSelectedLocation(location);
      }
    }
  }, [locationId, locations]);

  // Timer effect: Update elapsed times every second for items being tracked
  useEffect(() => {
    const interval = setInterval(() => {
      setItemElapsedTimes(prev => {
        const updated = { ...prev };
        Object.keys(itemStartTimes).forEach(itemId => {
          if (itemStartTimes[itemId]) {
            const elapsed = Math.floor((Date.now() - itemStartTimes[itemId]) / 1000);
            updated[itemId] = elapsed;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [itemStartTimes]);

  // Start tracking time for an item when user first interacts with it
  const startTrackingTime = useCallback((itemId) => {
    if (auditStatus === 'completed') return;
    setItemStartTimes(prev => {
      // Only start tracking if not already tracking
      if (!prev[itemId]) {
        return { ...prev, [itemId]: Date.now() };
      }
      return prev;
    });
  }, [auditStatus]);

  const fetchAuditData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch audit details
      const auditResponse = await axios.get(`/api/audits/${auditId}`);
      const audit = auditResponse.data.audit;
      const auditItems = auditResponse.data.items || [];

      // Check if audit is completed
      setAuditStatus(audit.status);
      if (audit.status === 'completed') {
        setError('This audit has been completed and cannot be modified.');
        showError('This audit has been completed and cannot be modified.');
        setTimeout(() => navigate(`/audit/${auditId}`), 2000);
        return;
      }

      // Set audit info
      setLocationId(audit.location_id?.toString() || '');
      setNotes(audit.notes || '');

      // Fetch template to get all items
      const templateResponse = await axios.get(`/api/checklists/${audit.template_id}`);
      setTemplate(templateResponse.data.template);
      const allItems = templateResponse.data.items || [];
      setItems(allItems);

      // Extract unique categories from items
      const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(cat => cat && cat.trim()))];
      setCategories(uniqueCategories);

      // For resume audit: ALWAYS show category selection if multiple categories exist
      // This allows users to switch between categories and continue completing the audit
      if (uniqueCategories.length > 1) {
        // Multiple categories - start at category selection step to allow user to choose/switch
        // Pre-select the audit's category if it has one, but allow changing
        if (audit.audit_category) {
          setSelectedCategory(audit.audit_category);
          setFilteredItems(allItems.filter(item => item.category === audit.audit_category));
        }
        // Go to category selection step (step 1) so user can choose which category to work on
        setActiveStep(1);
      } else if (uniqueCategories.length === 1) {
        // Single category - auto-select and go directly to checklist
        setSelectedCategory(uniqueCategories[0]);
        setFilteredItems(allItems.filter(item => item.category === uniqueCategories[0]));
        setActiveStep(1);
      } else {
        // No categories - show all items directly
        setFilteredItems(allItems);
        setActiveStep(1);
      }

      // Populate responses from audit items
      const responsesData = {};
      const optionsData = {};
      const commentsData = {};
      const photosData = {};
      const inputValuesData = {};

      auditItems.forEach(auditItem => {
        if (auditItem.status) {
          responsesData[auditItem.item_id] = auditItem.status;
        }
        if (auditItem.selected_option_id) {
          optionsData[auditItem.item_id] = auditItem.selected_option_id;
        }
        if (auditItem.comment) {
          commentsData[auditItem.item_id] = auditItem.comment;
        }
        if (auditItem.photo_url) {
          // Construct full URL if needed
          const photoUrl = auditItem.photo_url.startsWith('http') 
            ? auditItem.photo_url 
            : auditItem.photo_url;
          photosData[auditItem.item_id] = photoUrl;
        }
        // Load input values for number/date/open_ended items from mark field
        // Only if there's no selected_option_id (meaning it's not an option-based item)
        if (auditItem.mark && !auditItem.selected_option_id) {
          inputValuesData[auditItem.item_id] = auditItem.mark;
        }
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);
      setInputValues(inputValuesData);

      // (activeStep set above based on category scoping)
    } catch (error) {
      console.error('Error fetching audit data:', error);
      setError('Failed to load audit data');
      showError('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [auditId, navigate]);

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await axios.get(`/api/checklists/${templateId}`);
      setTemplate(response.data.template);
      const allItems = response.data.items || [];
      setItems(allItems);
      
      // Extract unique categories from items
      const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(cat => cat && cat.trim()))];
      setCategories(uniqueCategories);
      
      // If only one category, auto-select it
      if (uniqueCategories.length === 1) {
        setSelectedCategory(uniqueCategories[0]);
        setFilteredItems(allItems.filter(item => item.category === uniqueCategories[0]));
      } else if (uniqueCategories.length === 0) {
        // No categories, show all items
        setFilteredItems(allItems);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const fetchLocations = async () => {
    try {
      // If scheduled audit, pass scheduled_audit_id to override store assignments
      const params = scheduledId ? { scheduled_audit_id: scheduledId } : {};
      const response = await axios.get('/api/locations', { params }).catch(() => ({ data: { locations: [] } }));
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Fetch previous audit failures to highlight recurring issues
  const fetchPreviousFailures = useCallback(async (tmplId, locId) => {
    if (!tmplId || !locId) return;
    
    try {
      const response = await axios.get('/api/audits/previous-failures', {
        params: { template_id: tmplId, location_id: locId, months_back: 3 }
      });
      
      const data = response.data;
      setPreviousFailures(data.failedItems || []);
      setFailedItemIds(new Set((data.failedItems || []).map(f => f.item_id)));
      setPreviousAuditInfo(data.previousAudit);
      
      // Show alert if there are failures
      if ((data.failedItems && data.failedItems.length > 0) || (data.recurringFailures && data.recurringFailures.length > 0)) {
        setShowFailuresAlert(true);
      }
    } catch (error) {
      console.error('Error fetching previous failures:', error);
      // Don't show error to user, just continue without highlighting
    }
  }, []);

  // Fetch previous failures when template and location are selected
  useEffect(() => {
    const tmplId = template?.id || templateId;
    
    if (tmplId && locationId && !isEditing) {
      fetchPreviousFailures(tmplId, locationId);
    }
  }, [template?.id, templateId, locationId, isEditing, fetchPreviousFailures]);

  const handleResponseChange = (itemId, status) => {
    startTrackingTime(itemId);
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
    startTrackingTime(itemId);
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    
    setSelectedOptions({ ...selectedOptions, [itemId]: optionId });
    // Also update status to 'completed' when an option is selected
    setResponses({ ...responses, [itemId]: 'completed' });
    // Clear errors if any
  };

  const handleMultipleSelectionChange = (itemId, optionId, checked) => {
    startTrackingTime(itemId);
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    
    const currentSelections = multipleSelections[itemId] || [];
    let newSelections;
    if (checked) {
      newSelections = [...currentSelections, optionId];
    } else {
      newSelections = currentSelections.filter(id => id !== optionId);
    }
    setMultipleSelections({ ...multipleSelections, [itemId]: newSelections });
    // Update status to 'completed' if at least one option is selected
    if (newSelections.length > 0) {
      setResponses({ ...responses, [itemId]: 'completed' });
    } else {
      setResponses({ ...responses, [itemId]: 'pending' });
    }
    // Clear errors if any
    if (errors.items) {
      const remainingRequired = items.filter(i => 
        i.required && (!selectedOptions[i.id] && i.id !== itemId)
      );
      if (remainingRequired.length === 0) {
        setErrors({ ...errors, items: '' });
      }
    }
  };

  const handleCommentChange = (itemId, comment) => {
    startTrackingTime(itemId);
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    setComments({ ...comments, [itemId]: comment });
  };

  // Helper: find "Time – Attempt 1"..5 and "Average (Auto)" for SOS auto-calculation
  const getSosAverageItems = useCallback((allItems) => {
    if (!allItems?.length) return null;
    const attemptIds = [];
    for (let i = 1; i <= 5; i++) {
      const it = allItems.find(x => new RegExp('^Time\\s*[–-]\\s*Attempt\\s*' + i + '$', 'i').test((x.title || '').trim()));
      if (it) attemptIds.push(it.id); else return null;
    }
    const avgIt = allItems.find(x => /^Average\s*\(Auto\)$/i.test((x.title || '').trim()));
    if (!avgIt) return null;
    return { attemptIds, averageId: avgIt.id };
  }, []);

  // Handle input value changes for number, date, open_ended input types
  const handleInputValueChange = (itemId, value) => {
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    startTrackingTime(itemId);
    setInputValues(prev => {
      const next = { ...prev, [itemId]: value };
      const sos = getSosAverageItems(items);
      if (sos && sos.attemptIds.includes(itemId)) {
        const nums = sos.attemptIds.map(id => (id === itemId ? value : prev[id]))
          .map(s => parseFloat(String(s || '')))
          .filter(n => !isNaN(n));
        next[sos.averageId] = nums.length ? String((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : '';
      }
      return next;
    });
    setResponses(prev => {
      const next = { ...prev, [itemId]: (value && String(value).trim()) ? 'completed' : (prev[itemId] || 'pending') };
      const sos = getSosAverageItems(items);
      if (sos && sos.attemptIds.includes(itemId)) {
        const nums = sos.attemptIds.map(id => (id === itemId ? value : (inputValues[id] || '')))
          .map(s => parseFloat(String(s || '')))
          .filter(n => !isNaN(n));
        if (sos.averageId && nums.length > 0) next[sos.averageId] = 'completed';
      }
      return next;
    });
  };

  const handlePhotoUpload = async (itemId, file) => {
    startTrackingTime(itemId);
    if (!file) return;
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }

    setUploading({ ...uploading, [itemId]: true });

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const uploadResponse = await axios.post('/api/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPhotos({ ...photos, [itemId]: uploadResponse.data.photo_url });
      const item = items.find(i => i.id === itemId);
      if (item && (item.input_type || '').toLowerCase() === 'image_upload') {
        setResponses({ ...responses, [itemId]: 'completed' });
      }
      // Photo upload notification removed as per requirement
    } catch (error) {
      console.error('Error uploading photo:', error);
      showError('Failed to upload photo');
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const openSignatureModal = (itemId) => {
    setSignatureItemId(itemId);
    setSignatureModalOpen(true);
  };

  // Unused - kept for future signature functionality
  // const handleSaveSignature = async () => {
  //   if (!signatureRef.current || signatureRef.current.isEmpty()) {
  //     showError('Please provide a signature first');
  //     return;
  //   }
  //   if (!signatureItemId) {
  //     showError('Signature item not found');
  //     return;
  //   }

  //   try {
  //     const dataUrl = signatureRef.current.toDataURL('image/png');
  //     const blob = await fetch(dataUrl).then(res => res.blob());
  //     const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' });
  //     await handlePhotoUpload(signatureItemId, file);
  //     setInputValues({ ...inputValues, [signatureItemId]: 'Signed' });
  //     setResponses({ ...responses, [signatureItemId]: 'completed' });
  //     closeSignatureModal();
  //   } catch (error) {
  //     console.error('Error saving signature:', error);
  //     showError('Failed to save signature');
  //   }
  // };

  const isItemComplete = (item) => {
    const inputType = getNormalizedInputType(item);
    if (inputType === 'signature') {
      return !!photos[item.id] || (inputValues[item.id] !== undefined && String(inputValues[item.id]).trim() !== '');
    }
    if (inputType === 'image_upload') return !!photos[item.id];
    if (['number', 'date', 'open_ended', 'description', 'scan_code', 'signature'].includes(inputType)) {
      const value = inputValues[item.id];
      return value !== undefined && value !== null && String(value).trim() !== '';
    }
    if (item.options && item.options.length > 0) {
      return !!selectedOptions[item.id];
    }
    const status = responses[item.id];
    return status && status !== 'pending';
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!locationId) {
        newErrors.locationId = 'Store selection is required';
      }
    } else if (step === 1) {
      const requiredItems = items.filter(item => item.required);
      const missingRequired = requiredItems.filter(item => !isItemComplete(item));
      if (missingRequired.length > 0) {
        // Check for missing photos specifically
        const missingPhotos = missingRequired.filter(item => {
          const inputType = getNormalizedInputType(item);
          return inputType === 'image_upload' && !photos[item.id];
        });
        
        if (missingPhotos.length > 0) {
          const photoItems = missingPhotos.slice(0, 3).map(item => item.title).join(', ');
          const moreText = missingPhotos.length > 3 ? ` and ${missingPhotos.length - 3} more` : '';
          newErrors.items = `Missing required photos for: ${photoItems}${moreText}. Please add photos before submitting.`;
        } else {
          newErrors.items = `Please complete all required items (${missingRequired.length} remaining)`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!locationId) {
        setErrors({ ...errors, locationId: 'Please select a store' });
        setTouched({ ...touched, 0: true });
        return;
      }
      // If multiple categories, go to category selection, otherwise go to checklist
      if (categories.length > 1) {
        setActiveStep(1);
      } else {
        setActiveStep(1); // For single category or no categories, go directly to checklist
      }
    } else if (activeStep === 1 && categories.length > 1) {
      // Category selection step
      if (!selectedCategory) {
        setError('Please select a category');
        return;
      }
      setActiveStep(2);
    } else {
      // Regular step progression
      if (!validateStep(activeStep)) {
        setTouched({ ...touched, [activeStep]: true });
        return;
      }
      setError('');
      setActiveStep(activeStep + 1);
    }
  };

  // Unused - kept for future navigation functionality
  // const handleBack = () => {
  //   if (activeStep === (categories.length > 1 ? 2 : 1) && categories.length > 1) {
  //     setActiveStep(1);
  //   } else {
  //     setActiveStep(activeStep - 1);
  //   }
  // };
  
  // Evaluate conditional logic for items
  const evaluateConditionalItem = useCallback((item, allItems, responses, selectedOptions, comments, inputValues) => {
    // If no conditional logic, always show
    if (!item.conditional_item_id) {
      return true;
    }

    // Find the referenced item
    const referencedItem = allItems.find(it => it.id === item.conditional_item_id);
    if (!referencedItem) {
      // Referenced item not found, show by default
      return true;
    }

    // Get the value of the referenced item
    let referencedValue = null;
    const inputType = getNormalizedInputType(referencedItem);
    
    if (inputType === 'option_select' || inputType === 'select_from_data_source') {
      // For option select, get the selected option text
      const selectedOptionId = selectedOptions[referencedItem.id];
      if (selectedOptionId) {
        const option = referencedItem.options?.find(opt => opt.id === selectedOptionId);
        referencedValue = option?.option_text || option?.text || '';
      }
    } else if (['open_ended', 'description', 'number', 'date', 'scan_code'].includes(inputType)) {
      // For text/number inputs, use the input value
      referencedValue = inputValues[referencedItem.id] || comments[referencedItem.id] || '';
    } else {
      // For status-based items, use the status
      const status = responses[referencedItem.id]?.status || responses[referencedItem.id];
      referencedValue = status || '';
    }

    if (referencedValue === null || referencedValue === '') {
      // No value set yet, don't show conditional item
      return false;
    }

    // Evaluate condition
    const conditionValue = item.conditional_value || '';
    const operator = item.conditional_operator || 'equals';
    const refValueStr = String(referencedValue).toLowerCase().trim();
    const condValueStr = String(conditionValue).toLowerCase().trim();

    switch (operator) {
      case 'equals':
        return refValueStr === condValueStr;
      case 'not_equals':
        return refValueStr !== condValueStr;
      case 'contains':
        return refValueStr.includes(condValueStr);
      default:
        return refValueStr === condValueStr;
    }
  }, [getNormalizedInputType]);

  // Filter items based on conditional logic
  const filterItemsByCondition = useCallback((itemsToFilter, allItems, responses, selectedOptions, comments, inputValues) => {
    return itemsToFilter.filter(item => {
      return evaluateConditionalItem(item, allItems, responses, selectedOptions, comments, inputValues);
    });
  }, [evaluateConditionalItem]);

  const handleCategorySelect = (category, section = null) => {
    setSelectedCategory(category);
    setSelectedSection(section);
    // Filter items by category and optionally by section
    const filtered = items.filter(item => {
      if (item.category !== category) return false;
      if (section && item.section !== section) return false;
      return true;
    });
    setFilteredItems(filtered);
  };

  // Calculate category completion status
  const calculateCategoryCompletion = useCallback(() => {
    if (categories.length === 0) return {};
    
    const status = {};
    categories.forEach(cat => {
      const categoryItems = items.filter(item => item.category === cat);
      const completedInCategory = categoryItems.filter(item => {
        // Check if item has a response or selected option
        const hasResponse = responses[item.id] && responses[item.id] !== 'pending' && responses[item.id] !== '';
        const hasOption = selectedOptions[item.id] !== undefined && selectedOptions[item.id] !== null;
        // Also check if item has a mark from loaded audit data
        const hasMark = item.mark !== null && item.mark !== undefined && String(item.mark).trim() !== '';
        return hasResponse || hasOption || hasMark;
      }).length;
      
      status[cat] = {
        completed: completedInCategory,
        total: categoryItems.length,
        isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
      };
    });
    return status;
  }, [categories, items, responses, selectedOptions]);

  // Update category completion status when responses or options change
  useEffect(() => {
    if (categories.length > 0 && items.length > 0) {
      const status = calculateCategoryCompletion();
      setCategoryCompletionStatus(status);
    }
  }, [categories, items, responses, selectedOptions, calculateCategoryCompletion]);

  // Unused - kept for future submit functionality
  // eslint-disable-next-line no-unused-vars
  const handleSubmit = async () => {
    if (auditStatus === 'completed') {
      showError('Cannot modify a completed audit');
      return;
    }

    // Only validate store selection, allow partial saves
    if (!locationId) {
      setTouched({ ...touched, 0: true });
      setError('Please select a store');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Get selected store details
      const selectedStore = locations.find(l => l.id === parseInt(locationId));
      if (!selectedStore) {
        setError('Please select a store');
        setSaving(false);
        return;
      }

      let currentAuditId = auditId;

      // If editing existing audit, update it
      if (auditId) {
        try {
          await axios.put(`/api/audits/${auditId}`, {
            restaurant_name: selectedStore.name,
            location: selectedStore.store_number ? `Store ${selectedStore.store_number}` : selectedStore.name,
            location_id: parseInt(locationId),
            notes
          });
        } catch (updateError) {
          console.warn('Failed to update audit info, continuing with items:', updateError);
        }
      } else {
        // Create new audit
        const auditData = {
          template_id: parseInt(templateId),
          restaurant_name: selectedStore.name,
          location: selectedStore.store_number ? `Store ${selectedStore.store_number}` : selectedStore.name,
          location_id: parseInt(locationId),
          notes
        };

        // Category-wise audits: if a category is selected, scope the audit to that category only.
        if (selectedCategory) {
          auditData.audit_category = selectedCategory;
        }

        if (scheduledId) {
          auditData.scheduled_audit_id = parseInt(scheduledId, 10);
        }
        
        const auditResponse = await axios.post('/api/audits', auditData);
        currentAuditId = auditResponse.data.id;
      }

      // Update all items in a single batch request (much faster!)
      // IMPORTANT: For category-wise audits, only save items for the selected category.
      // Otherwise, saving would create/update "pending" rows for other categories and can flip status back to in_progress.
      const itemsToSave = selectedCategory ? filteredItems : items;

      const batchItems = itemsToSave
        .filter(item => item && item.id) // Filter out any items without valid IDs
        .map((item) => {
          const itemData = {
            itemId: item.id,
            status: responses[item.id] || 'pending',
          };
          
          if (selectedOptions[item.id]) {
            itemData.selected_option_id = parseInt(selectedOptions[item.id]);
            // Also include the mark from the selected option
            const selectedOpt = item.options?.find(o => o.id === parseInt(selectedOptions[item.id]));
            if (selectedOpt) {
              itemData.mark = selectedOpt.mark;
            }
          }
          
          // Include input values for number, date, open_ended input types
          if (inputValues[item.id] !== undefined && inputValues[item.id] !== '') {
            itemData.input_value = inputValues[item.id];
            // Store in mark field for compatibility
            itemData.mark = inputValues[item.id].toString();
          }
          
          if (comments[item.id]) {
            itemData.comment = comments[item.id];
          }
          
          if (photos[item.id]) {
            const photoUrl = photos[item.id];
            itemData.photo_url = photoUrl.startsWith('http') 
              ? photoUrl.replace(/^https?:\/\/[^/]+/, '') 
              : photoUrl;
          }

          // Add time tracking data if available
          if (itemStartTimes[item.id]) {
            const startTime = itemStartTimes[item.id];
            const elapsedSeconds = itemElapsedTimes[item.id] || Math.floor((Date.now() - startTime) / 1000);
            const timeTakenMinutes = elapsedSeconds > 0 ? (elapsedSeconds / 60).toFixed(2) : null;
            
            if (timeTakenMinutes) {
              itemData.time_taken_minutes = parseFloat(timeTakenMinutes);
              // Convert start time to ISO string for backend
              itemData.started_at = new Date(startTime).toISOString();
            }
          }

          return itemData;
        });

      console.log('[AuditForm] Saving batch items:', { auditId: currentAuditId, itemCount: batchItems.length, sampleItem: batchItems[0] });
      
      if (batchItems.length === 0) {
        throw new Error('No valid items to save. Please ensure all checklist items have valid IDs.');
      }

      // Single batch API call instead of multiple individual calls
      const response = await axios.put(`/api/audits/${currentAuditId}/items/batch`, { 
        items: batchItems,
        audit_category: selectedCategory || null
      });

      // Refresh category completion status after save
      if (response.data && categories.length > 0) {
        // Fetch updated audit items to recalculate completion
        const auditResponse = await axios.get(`/api/audits/${currentAuditId}`);
        const updatedAuditItems = auditResponse.data.items || [];
        
        // Update responses and options from server response
        const updatedResponses = { ...responses };
        const updatedOptions = { ...selectedOptions };
        
        updatedAuditItems.forEach(auditItem => {
          if (auditItem.status) {
            updatedResponses[auditItem.item_id] = auditItem.status;
          }
          if (auditItem.selected_option_id) {
            updatedOptions[auditItem.item_id] = auditItem.selected_option_id;
          }
          // Update mark in items array
          const itemIndex = items.findIndex(i => i.id === auditItem.item_id);
          if (itemIndex >= 0) {
            items[itemIndex].mark = auditItem.mark;
          }
        });
        
        setResponses(updatedResponses);
        setSelectedOptions(updatedOptions);
        // Category completion will be recalculated by useEffect
      }

      // Check if audit was completed - trigger PDF download
      if (response.data && response.data.status === 'completed') {
        // Trigger PDF download automatically
        const pdfUrl = response.data.pdfUrl || `/api/reports/audit/${currentAuditId}/pdf`;
        if (pdfUrl) {
          // Open PDF in new tab for download
          window.open(pdfUrl, '_blank');
        }
        showSuccess('Audit completed successfully! PDF report is downloading...');
      } else {
        showSuccess(isEditing ? 'Audit updated successfully!' : 'Audit saved successfully!');
      }
      navigate(`/audit/${currentAuditId}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save audit';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setSaving(false);
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
      case 'pending':
        return <Box sx={{ 
          width: 24, 
          height: 24, 
          borderRadius: '50%', 
          border: '2px solid', 
          borderColor: 'text.disabled',
          bgcolor: 'grey.100'
        }} />;
      default:
        return <Box sx={{ 
          width: 24, 
          height: 24, 
          borderRadius: '50%', 
          border: '2px solid', 
          borderColor: 'text.disabled',
          bgcolor: 'grey.100'
        }} />;
    }
  };

  // Group items by section for display (similar to mobile app) - MUST be before early returns
  const groupItemsBySection = useCallback((itemsList) => {
    const sections = {};
    const itemsWithoutSection = [];

    itemsList.forEach(item => {
      const section = item.section;
      if (section && section.trim()) {
        if (!sections[section]) {
          sections[section] = [];
        }
        sections[section].push(item);
      } else {
        itemsWithoutSection.push(item);
      }
    });

    // Sort sections (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg)
    const sortedSections = Object.keys(sections).sort((a, b) => {
      // Custom sort: Trnx-* first, then Avg, then others alphabetically
      if (a.startsWith('Trnx-') && b.startsWith('Trnx-')) {
        return a.localeCompare(b);
      }
      if (a.startsWith('Trnx-')) return -1;
      if (b.startsWith('Trnx-')) return 1;
      if (a === 'Avg') return 1;
      if (b === 'Avg') return -1;
      return a.localeCompare(b);
    });

    return { sections: sortedSections.map(s => ({ name: s, items: sections[s] })), itemsWithoutSection };
  }, []);

  // Calculate items to display - MUST be before early returns
  const steps = categories.length > 1 ? ['Store Information', 'Select Category', 'Audit Checklist'] : ['Store Information', 'Audit Checklist'];
  const completedItems = Object.values(responses).filter(r => r === 'completed').length;
  // Apply conditional logic filtering to items
  const itemsToDisplay = React.useMemo(() => {
    const baseItems = (activeStep === (categories.length > 1 ? 2 : 1) && selectedCategory) ? filteredItems : items;
    // Filter items based on conditional logic
    return filterItemsByCondition(baseItems, items, responses, selectedOptions, comments, inputValues);
  }, [activeStep, categories.length, selectedCategory, filteredItems, items, filterItemsByCondition, responses, selectedOptions, comments, inputValues]);

  // Get grouped items for current display - MUST be before early returns
  const groupedItems = React.useMemo(() => {
    return groupItemsBySection(itemsToDisplay);
  }, [itemsToDisplay, groupItemsBySection]);

  // Initialize expanded sections (expand all by default) - MUST be before early returns
  useEffect(() => {
    if (groupedItems.sections.length > 0) {
      const initialExpanded = {};
      groupedItems.sections.forEach(section => {
        initialExpanded[section.name] = true; // Expand all sections by default
      });
      setExpandedSections(prev => ({ ...prev, ...initialExpanded }));
    }
  }, [groupedItems.sections]);

  // Helper to render a simplified item field (for Time/Sec pairs - no card wrapper, no title)
  const renderAuditItemField = (item, index, showTitle = false) => {
    if (!item || !item.id) {
      return null;
    }
    
    const inputType = getNormalizedInputType(item);
    
    return (
      <Box>
        {showTitle && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <IconButton size="small" sx={{ cursor: 'grab' }}>
              <DragHandleIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
              {item.title}
            </Typography>
            <IconButton size="small">
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        
        {/* Render input based on input_type */}
        {(() => {
          if (inputType === 'number') {
            return (
              <TextField
                fullWidth
                type="number"
                placeholder="Enter seconds..."
                value={inputValues[item.id] || ''}
                onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                size="small"
                disabled={auditStatus === 'completed'}
              />
            );
          }
          
          if (inputType === 'date') {
            return (
              <TextField
                fullWidth
                type="datetime-local"
                value={inputValues[item.id] || ''}
                onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                disabled={auditStatus === 'completed'}
              />
            );
          }
          
          return null;
        })()}
      </Box>
    );
  };

  // Render a single audit item (extracted for reuse in section grouping)
  const renderAuditItem = (item, index) => {
    const isPreviousFailure = failedItemIds.has(item.id);
    const inputType = getNormalizedInputType(item);
    const isMissingRequiredPhoto = item.required && inputType === 'image_upload' && !photos[item.id];
    const failureInfo = previousFailures.find(f => f.item_id === item.id);
    
    return (
      <Card 
        key={item.id} 
        className={`audit-item-card ${isPreviousFailure ? 'previous-failure' : ''} ${isMissingRequiredPhoto ? 'missing-photo' : ''}`}
        sx={{ 
          mb: isMobile ? 2.5 : 2,
          border: isPreviousFailure || isMissingRequiredPhoto ? '2px solid' : '1px solid',
          borderColor: isPreviousFailure 
            ? 'error.main' 
            : isMissingRequiredPhoto
            ? 'error.main'
            : (selectedOptions[item.id] ? 'primary.main' : 'divider'),
          borderLeft: isMissingRequiredPhoto ? '4px solid' : 'none',
          borderLeftColor: isMissingRequiredPhoto ? 'error.main' : 'transparent',
          backgroundColor: isCvr && !isPreviousFailure && !isMissingRequiredPhoto ? cvrTheme.background.card : (isPreviousFailure ? '#FFF5F5' : isMissingRequiredPhoto ? '#FFF5F5' : 'background.paper'),
          transition: 'border-color 0.2s',
          borderRadius: isMobile ? 3 : 2
        }}
      >
        <CardContent sx={{ p: isMobile ? 2.5 : 3 }}>
          {/* Missing required photo warning */}
          {isMissingRequiredPhoto && (
            <Alert 
              severity="error" 
              icon={<PhotoCameraIcon />}
              sx={{
                mb: 2,
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Photo Required
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                A photo is required for this item before submission.
              </Typography>
            </Alert>
          )}
          
          {/* Previous failure warning banner */}
          {isPreviousFailure && (
            <Alert 
              severity="warning" 
              icon={<span style={{ fontSize: '1rem' }}>⚠️</span>}
              sx={{ 
                mb: 2,
                py: 0.5,
                backgroundColor: '#FFE5E5',
                '& .MuiAlert-message': { fontSize: '0.85rem' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} color="error.dark">
                  Failed in last audit
                  {failureInfo?.failure_count > 1 && ` (${failureInfo.failure_count}x in 6 months)`}
                </Typography>
                {failureInfo?.is_recurring && (
                  <Chip 
                    label="RECURRING" 
                    size="small" 
                    color="error" 
                    sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700 }} 
                  />
                )}
              </Box>
            </Alert>
          )}
          
          {/* Previous comment if available */}
          {isPreviousFailure && failureInfo?.comment && (
            <Box 
              sx={{ 
                mb: 2, 
                p: 1.5, 
                backgroundColor: '#FFF0E5', 
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: 'warning.main'
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Previous comment:
              </Typography>
              <Typography variant="body2" fontStyle="italic" sx={{ mt: 0.5 }}>
                "{failureInfo.comment}"
              </Typography>
            </Box>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            mb: 2,
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 1 : 0
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                flexGrow: 1, 
                fontSize: isMobile ? '1rem' : '1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <span style={{ fontWeight: 600 }}>{index + 1}.</span> <span style={isCvr ? { color: cvrTheme.text.primary } : {}}>{item.title}</span>
                  {/* Timer display */}
                  {itemStartTimes[item.id] && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>⏱</span>
                        {(() => {
                          const elapsed = itemElapsedTimes[item.id] || 0;
                          const minutes = Math.floor(elapsed / 60);
                          const seconds = elapsed % 60;
                          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        })()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              {item.required && (
                <Chip 
                  label="Required" 
                  size="small" 
                  color="error" 
                  sx={{ fontSize: '0.65rem', height: 20 }} 
                />
              )}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              ...(isMobile && { alignSelf: 'flex-end' })
            }}>
              {getStatusIcon(responses[item.id])}
            </Box>
          </Box>
          {item.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {item.description}
            </Typography>
          )}
          <Chip
            label={item.category}
            size="small"
            sx={{ mb: 2 }}
            color="primary"
            variant="outlined"
          />
          {/* Render input based on input_type */}
          {(() => {
            // Number input type
            if (inputType === 'number') {
              const isAverageAuto = /^Average\s*\(Auto\)$/i.test((item.title || '').trim());
              return (
                <TextField
                  fullWidth
                  type="number"
                  label={isAverageAuto ? 'Average (auto-calculated)' : 'Enter Value'}
                  placeholder={isAverageAuto ? '' : 'Enter a number...'}
                  value={inputValues[item.id] || ''}
                  onChange={isAverageAuto ? undefined : (e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  InputProps={{
                    readOnly: isAverageAuto,
                    inputProps: { min: 0 }
                  }}
                  disabled={auditStatus === 'completed' || isAverageAuto}
                  helperText={isAverageAuto ? 'Calculated from Time Attempts 1–5' : null}
                />
              );
            }
            
            // Date input type
            if (inputType === 'date') {
              return (
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Select Date/Time"
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  InputLabelProps={{ shrink: true }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }
            
            // Open ended / text input type
            if (inputType === 'open_ended' || inputType === 'description') {
              return (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Enter Response"
                  placeholder="Enter your response..."
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }

            // Scan code input type
            if (inputType === 'scan_code') {
              return (
                <TextField
                  fullWidth
                  label="Scan Code"
                  placeholder="Enter scanned code..."
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }

            // Signature input type (draw pad)
            if (inputType === 'signature') {
              return (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<DrawOutlinedIcon />}
                      onClick={() => openSignatureModal(item.id)}
                      disabled={auditStatus === 'completed'}
                    >
                      {photos[item.id] ? 'Edit Signature' : 'Add Signature'}
                    </Button>
                    {photos[item.id] && (
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => {
                          setPhotos({ ...photos, [item.id]: null });
                          setInputValues({ ...inputValues, [item.id]: '' });
                          setResponses({ ...responses, [item.id]: 'pending' });
                        }}
                        disabled={auditStatus === 'completed'}
                      >
                        Clear Signature
                      </Button>
                    )}
                  </Box>
                  {photos[item.id] && (
                    <Box sx={{ mt: 1 }}>
                      <img
                        src={photos[item.id].startsWith('http') ? photos[item.id] : photos[item.id]}
                        alt="Signature"
                        style={{ maxWidth: '100%', height: 120, border: '1px solid #e0e0e0', borderRadius: 6 }}
                      />
                    </Box>
                  )}
                </Box>
              );
            }

            // Single Answer - Radio buttons (single selection)
            if (inputType === 'single_answer' && item.options && item.options.length > 0) {
              return (
                <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                    Select One:
                  </FormLabel>
                  <RadioGroup
                    value={selectedOptions[item.id] || ''}
                    onChange={(e) => handleOptionChange(item.id, parseInt(e.target.value))}
                  >
                    {item.options.map((option) => (
                      <FormControlLabel
                        key={option.id}
                        value={option.id.toString()}
                        control={<Radio disabled={auditStatus === 'completed'} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{option.option_text}</Typography>
                            <Chip label={option.mark} size="small" variant="outlined" />
                          </Box>
                        }
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              );
            }

            // Multiple Answer - Checkboxes (multiple selection)
            if (inputType === 'multiple_answer' && item.options && item.options.length > 0) {
              const selectedIds = multipleSelections[item.id] || [];
              return (
                <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                    Select All That Apply:
                  </FormLabel>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {item.options.map((option) => (
                      <FormControlLabel
                        key={option.id}
                        control={
                          <Checkbox
                            checked={selectedIds.includes(option.id)}
                            onChange={(e) => handleMultipleSelectionChange(item.id, option.id, e.target.checked)}
                            disabled={auditStatus === 'completed'}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{option.option_text}</Typography>
                            <Chip label={option.mark} size="small" variant="outlined" />
                          </Box>
                        }
                      />
                    ))}
                  </Box>
                </FormControl>
              );
            }

            // Short Answer - Single line text input (CVR: "Type Here" placeholder)
            if (inputType === 'short_answer') {
              return (
                <TextField
                  fullWidth
                  label={isCvr ? 'Response' : 'Enter Answer'}
                  placeholder={isCvr ? 'Type Here' : 'Enter your answer...'}
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1, ...(isCvr && { '& .MuiOutlinedInput-root': { bgcolor: cvrTheme.input.bg, color: cvrTheme.text.primary } }) }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }

            // Long Answer - Multi-line text input
            if (inputType === 'long_answer') {
              return (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Enter Answer"
                  placeholder="Enter your detailed answer..."
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }

            // Dropdown - Select dropdown
            if (inputType === 'dropdown' && item.options && item.options.length > 0) {
              return (
                <FormControl fullWidth sx={{ mt: 2, mb: 1 }}>
                  <InputLabel>Select Option</InputLabel>
                  <Select
                    value={selectedOptions[item.id] || ''}
                    label="Select Option"
                    onChange={(e) => handleOptionChange(item.id, e.target.value)}
                    disabled={auditStatus === 'completed'}
                  >
                    {item.options.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.option_text} ({option.mark})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }

            // Time - Time picker
            if (inputType === 'time') {
              return (
                <TextField
                  fullWidth
                  type="time"
                  label="Select Time"
                  value={inputValues[item.id] || ''}
                  onChange={(e) => handleInputValueChange(item.id, e.target.value)}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                  InputLabelProps={{ shrink: true }}
                  disabled={auditStatus === 'completed'}
                />
              );
            }

            // Grid - Matrix/table input
            if (inputType === 'grid' && item.options && item.options.length > 0) {
              // For grid, we'll create a simple table with rows and columns
              // This is a basic implementation - can be enhanced based on specific grid requirements
              const gridOptions = item.options;
              const gridRows = item.grid_rows || ['Row 1', 'Row 2']; // Default rows if not specified
              return (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Select options for each row:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell></TableCell>
                          {gridOptions.map((option) => (
                            <TableCell key={option.id} align="center">
                              {option.option_text}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gridRows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            <TableCell component="th" scope="row">
                              {row}
                            </TableCell>
                            {gridOptions.map((option) => (
                              <TableCell key={option.id} align="center">
                                <Checkbox
                                  checked={
                                    (multipleSelections[item.id] || []).includes(`${rowIndex}-${option.id}`)
                                  }
                                  onChange={(e) => {
                                    const key = `${rowIndex}-${option.id}`;
                                    handleMultipleSelectionChange(item.id, key, e.target.checked);
                                  }}
                                  disabled={auditStatus === 'completed'}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            }

            // Section - Organizational divider (not an input)
            if (inputType === 'section') {
              return (
                <Box sx={{ mt: 3, mb: 2, pt: 2, borderTop: '2px solid', borderColor: 'primary.main' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {item.description}
                    </Typography>
                  )}
                </Box>
              );
            }

            // Sub-Section - Nested organizational divider
            if (inputType === 'sub_section') {
              return (
                <Box sx={{ mt: 2, mb: 1.5, pl: 2, borderLeft: '3px solid', borderColor: 'secondary.main' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {item.description}
                    </Typography>
                  )}
                </Box>
              );
            }
            
            // Option select - show options if available
            if ((inputType === 'option_select' || inputType === 'auto') && item.options && item.options.length > 0) {
              return (
                <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                    Select Option:
                  </FormLabel>
                  <Box className="audit-item-options" sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
                    {item.options.map((option) => (
                      <Button
                        key={option.id}
                        variant={selectedOptions[item.id] === option.id ? 'contained' : 'outlined'}
                        fullWidth
                        onClick={() => handleOptionChange(item.id, option.id)}
                        disabled={auditStatus === 'completed'}
                        sx={{
                          py: isMobile ? 2 : 1.5,
                          px: isMobile ? 2 : 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textTransform: 'none',
                          minHeight: isMobile ? 56 : 48,
                          border: selectedOptions[item.id] === option.id ? '2px solid' : '1px solid',
                          borderColor: selectedOptions[item.id] === option.id ? 'primary.main' : 'divider',
                          backgroundColor: selectedOptions[item.id] === option.id ? 'primary.main' : 'transparent',
                          color: selectedOptions[item.id] === option.id ? 'white' : 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: selectedOptions[item.id] === option.id ? 'primary.dark' : 'action.hover'
                          },
                          '&:active': {
                            transform: 'scale(0.98)',
                          }
                        }}
                      >
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: selectedOptions[item.id] === option.id ? 600 : 400,
                            fontSize: isMobile ? '1rem' : '1rem'
                          }}
                        >
                          {option.option_text}
                        </Typography>
                        <Chip
                          label={`${option.mark}`}
                          size="small"
                          sx={{
                            ml: 1,
                            minWidth: 40,
                            backgroundColor: selectedOptions[item.id] === option.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                            color: selectedOptions[item.id] === option.id ? 'white' : 'text.primary',
                            border: selectedOptions[item.id] === option.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid',
                            borderColor: selectedOptions[item.id] === option.id ? 'rgba(255,255,255,0.3)' : 'divider',
                            fontWeight: 600
                          }}
                        />
                      </Button>
                    ))}
                  </Box>
                </FormControl>
              );
            }
            
            // Default: Task/status radio buttons
            return (
              <FormControl component="fieldset" disabled={auditStatus === 'completed'}>
                <FormLabel component="legend">Status</FormLabel>
                <RadioGroup
                  row
                  value={responses[item.id] || 'pending'}
                  onChange={(e) => {
                    handleResponseChange(item.id, e.target.value);
                    if (errors.items && e.target.value !== 'pending') {
                      const remainingRequired = items.filter(i => 
                        i.required && (!responses[i.id] || responses[i.id] === 'pending') && i.id !== item.id
                      );
                      if (remainingRequired.length === 0) {
                        setErrors({ ...errors, items: '' });
                      }
                    }
                  }}
                >
                  <FormControlLabel
                    value="pending"
                    control={<Radio />}
                    label="Not Started"
                  />
                  <FormControlLabel
                    value="completed"
                    control={<Radio />}
                    label="Completed"
                  />
                  <FormControlLabel
                    value="failed"
                    control={<Radio />}
                    label="Failed"
                  />
                  <FormControlLabel
                    value="warning"
                    control={<Radio />}
                    label="Warning"
                  />
                </RadioGroup>
              </FormControl>
            );
          })()}

          <TextField
            fullWidth
            label={isCvr ? 'Remarks' : 'Add Comment'}
            placeholder={isCvr ? 'Add remarks...' : 'Add any notes or comments...'}
            value={comments[item.id] || ''}
            onChange={(e) => handleCommentChange(item.id, e.target.value)}
            multiline
            rows={2}
            size="small"
            sx={{ mb: 2, mt: 2, ...(isCvr && { '& .MuiOutlinedInput-root': { bgcolor: cvrTheme.input.bg, color: cvrTheme.text.primary } }) }}
            disabled={auditStatus === 'completed'}
          />

          {/* Photo: for image_upload always; for CVR also on Yes/No/NA (option) items */}
          {(inputType === 'image_upload' || (isCvr && item.options && item.options.length > 0)) && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mt: 2,
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              <input
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                id={`photo-upload-${item.id}`}
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handlePhotoUpload(item.id, file);
                }}
                disabled={auditStatus === 'completed'}
              />
              <label htmlFor={`photo-upload-${item.id}`} style={{ width: isMobile ? '100%' : 'auto' }}>
                <Tooltip title="Upload photo evidence">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCameraIcon sx={isCvr ? { color: cvrTheme.accent.purple } : {}} />}
                    size={isMobile ? "medium" : "small"}
                    disabled={uploading[item.id] || auditStatus === 'completed'}
                    className="photo-upload-btn"
                    sx={{
                      width: isMobile ? '100%' : 'auto',
                      minHeight: isMobile ? 48 : 36,
                      ...(isCvr && { borderColor: cvrTheme.accent.purple, color: cvrTheme.accent.purple, '&:hover': { borderColor: cvrTheme.accent.purple, bgcolor: cvrTheme.accent.purple + '20' } }),
                    }}
                  >
                    {uploading[item.id] ? 'Uploading...' : photos[item.id] ? 'Change Photo' : (isCvr ? 'Photo' : 'Take Photo')}
                  </Button>
                </Tooltip>
              </label>
              {photos[item.id] && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'center' : 'flex-start',
                  mt: isMobile ? 1 : 0
                }}>
                  <img
                    src={photos[item.id].startsWith('http') ? photos[item.id] : photos[item.id]}
                    alt="Uploaded"
                    style={{
                      width: isMobile ? 60 : 50,
                      height: isMobile ? 60 : 50,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: '2px solid #e0e0e0'
                    }}
                    crossOrigin="anonymous"
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setPhotos({ ...photos, [item.id]: null });
                      if (inputType === 'image_upload') {
                        setResponses({ ...responses, [item.id]: 'pending' });
                      }
                    }}
                    color="error"
                    disabled={auditStatus === 'completed'}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
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

  const tabAccent = isCvr ? cvrTheme.accent.purple : theme.palette.primary.main;
  const tabTextPrimary = isCvr ? cvrTheme.text.primary : theme.palette.text.primary;
  const tabTextSecondary = isCvr ? cvrTheme.text.secondary : theme.palette.text.secondary;
  const tabSuccess = isCvr ? cvrTheme.accent.green : theme.palette.success.main;
  const tabBorder = isCvr ? cvrTheme.input.border : theme.palette.divider;

  return (
    <Layout>
      <Container maxWidth="md" sx={{ ...(isCvr && { bgcolor: cvrTheme.background.primary, color: cvrTheme.text.primary }) }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 600, 
            color: isCvr ? cvrTheme.text.primary : '#333', 
            mb: 3,
            fontSize: isMobile ? '1.25rem' : '2rem',
            lineHeight: 1.3
          }}
        >
          {isEditing ? 'Resume Audit' : 'New Audit'}: {template?.name}
        </Typography>

        <Stepper 
          activeStep={activeStep} 
          sx={{ mt: 3, mb: 4, ...(isCvr && { '& .MuiStepLabel-label': { color: cvrTheme.text.secondary } }) }}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          alternativeLabel={!isMobile}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Paper sx={{ p: isMobile ? 2 : 3, ...(isCvr && { bgcolor: cvrTheme.background.card }) }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem', ...(isCvr && { color: cvrTheme.text.primary }) }}>
              {isCvr ? 'Details' : 'Store Information'}
            </Typography>
            
            {/* Warning for scheduled date restriction */}
            {isBeforeScheduledDate && scheduledAudit && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                ⚠️ This audit is scheduled for {new Date(scheduledAudit.scheduled_date).toLocaleDateString()}. 
                You cannot start the audit before the scheduled date.
              </Alert>
            )}
            
            {/* Info about locked location */}
            {isLocationLocked && scheduledAudit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                📍 This scheduled audit has a pre-assigned store. The store selection cannot be changed.
              </Alert>
            )}
            
            <Autocomplete
              fullWidth
              options={locations}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.store_number 
                  ? `Store ${option.store_number} - ${option.name}` 
                  : option.name;
              }}
              value={selectedLocation}
              onChange={(event, newValue) => {
                if (isLocationLocked) return; // Prevent changes if location is locked
                setSelectedLocation(newValue);
                setLocationId(newValue ? newValue.id.toString() : '');
                if (newValue) {
                  setErrors({ ...errors, locationId: '' });
                }
              }}
              disabled={isLocationLocked}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isCvr ? 'OUTLET (Required)' : 'Store *'}
                  required
                  margin="normal"
                  error={touched[0] && !!errors.locationId}
                  helperText={touched[0] ? errors.locationId : (isLocationLocked ? 'Store is locked for this scheduled audit' : '')}
                  placeholder={isCvr ? 'Search' : 'Search and select a store...'}
                  InputProps={{
                    ...params.InputProps,
                    readOnly: isLocationLocked
                  }}
                  sx={isCvr ? {
                    '& .MuiOutlinedInput-root': { bgcolor: cvrTheme.input.bg, color: cvrTheme.text.primary, '& fieldset': { borderColor: cvrTheme.input.border } },
                    '& .MuiInputLabel-root': { color: cvrTheme.text.secondary },
                    '& .MuiFormHelperText-root': { color: cvrTheme.text.secondary }
                  } : {}}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No stores found"
            />
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              margin="normal"
              sx={isCvr ? { '& .MuiOutlinedInput-root': { bgcolor: cvrTheme.input.bg, color: cvrTheme.text.primary } } : {}}
            />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: isCvr ? 'space-between' : (isMobile ? 'stretch' : 'flex-end'), 
              mt: 3,
              gap: 2
            }}>
              {isCvr && (
                <Button 
                  onClick={() => showSuccess('Draft saved')} 
                  variant="text"
                  sx={{ color: cvrTheme.accent.purple }}
                >
                  Save Draft
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                variant="contained"
                disabled={isBeforeScheduledDate}
                fullWidth={isMobile && !isCvr}
                sx={{ 
                  minHeight: isMobile ? 48 : 36,
                  fontSize: isMobile ? '1rem' : '0.875rem',
                  ...(isCvr && { background: cvrTheme.button.next, color: '#fff', '&:hover': { background: 'linear-gradient(135deg, #5a3ee6 0%, #8b52e6 100%)' } })
                }}
              >
                Next
              </Button>
            </Box>
          </Paper>
        )}

        {activeStep === 1 && categories.length > 1 && (
          <Paper sx={{ p: isMobile ? 2 : 3, ...(isCvr && { bgcolor: cvrTheme.background.card }) }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem', ...(isCvr && { color: cvrTheme.text.primary }) }}>
              Select Category
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: isCvr ? cvrTheme.text.secondary : 'text.secondary' }}>
              {template?.name}
            </Typography>
            
            {/* Grouped Categories with Accordions */}
            <Box sx={{ mb: 3 }}>
              {groupedCategories.map((group, groupIndex) => {
                const groupCompletionPercent = group.totalItems > 0 
                  ? Math.round((group.completedItems / group.totalItems) * 100) 
                  : 0;
                const isGroupComplete = group.completedItems === group.totalItems && group.totalItems > 0;
                const isExpanded = expandedGroups[group.name] !== false; // Default to expanded
                const hasSubCategories = group.subCategories.length > 1 || 
                  (group.subCategories.length === 1 && group.subCategories[0].displayName !== group.name);
                
                // If only one sub-category and it's the same as the group, render as simple card
                if (!hasSubCategories) {
                  const subCat = group.subCategories[0];
                  const status = categoryCompletionStatus[subCat.fullName] || { completed: 0, total: subCat.itemCount, isComplete: false };
                  const completionPercent = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
                  const isSelected = selectedCategory === subCat.fullName && (subCat.section ? selectedSection === subCat.section : !selectedSection);
                  
                  return (
                    <Card
                      key={group.name}
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        border: 2,
                        borderColor: status.isComplete 
                          ? (isCvr ? cvrTheme.accent.green : 'success.main')
                          : isSelected
                            ? (isCvr ? cvrTheme.accent.purple : 'primary.main')
                            : (isCvr ? cvrTheme.input.border : 'divider'),
                        bgcolor: isCvr 
                          ? cvrTheme.background.card
                          : (status.isComplete
                              ? 'success.light'
                              : isSelected
                                ? 'primary.light' 
                                : 'background.paper'),
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: status.isComplete 
                            ? (isCvr ? cvrTheme.accent.green : 'success.dark') 
                            : (isCvr ? cvrTheme.accent.purple : 'primary.main'),
                          bgcolor: isCvr ? cvrTheme.background.elevated : (status.isComplete ? 'success.light' : 'action.hover'),
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        }
                      }}
                      onClick={() => handleCategorySelect(subCat.fullName, subCat.section || null)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, color: isCvr ? cvrTheme.text.primary : 'text.primary' }}>
                            {group.name}
                          </Typography>
                          {status.isComplete && (
                            <CheckCircleIcon sx={{ fontSize: 24, color: isCvr ? cvrTheme.accent.green : 'success.main' }} />
                          )}
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ mb: 0.5, color: isCvr ? cvrTheme.text.secondary : 'text.secondary' }}>
                            {status.completed} / {status.total} items completed
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={completionPercent}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: isCvr ? cvrTheme.input.border : 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: status.isComplete 
                                  ? (isCvr ? cvrTheme.accent.green : 'success.main') 
                                  : (isCvr ? cvrTheme.accent.purple : 'primary.main'),
                                borderRadius: 3
                              }
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  );
                }
                
                // Render as accordion for groups with multiple sub-categories
                return (
                  <Accordion 
                    key={group.name}
                    expanded={isExpanded}
                    onChange={() => setExpandedGroups(prev => ({ ...prev, [group.name]: !isExpanded }))}
                    sx={{ 
                      mb: 2,
                      border: 2,
                      borderColor: isGroupComplete 
                        ? (isCvr ? cvrTheme.accent.green : 'success.main') 
                        : (isCvr ? cvrTheme.input.border : 'divider'),
                      borderRadius: '8px !important',
                      '&:before': { display: 'none' },
                      bgcolor: isCvr ? cvrTheme.background.card : (isGroupComplete ? 'success.light' : 'background.paper'),
                      overflow: 'hidden'
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: isCvr ? cvrTheme.text.secondary : undefined }} />}
                      sx={{ 
                        bgcolor: isCvr ? cvrTheme.background.card : (isGroupComplete ? 'success.light' : 'grey.50'),
                        '&:hover': { bgcolor: isCvr ? cvrTheme.background.elevated : (isGroupComplete ? 'success.light' : 'grey.100') }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                        {isExpanded ? (
                          <FolderOpenIcon sx={{ mr: 1.5, color: isGroupComplete ? (isCvr ? cvrTheme.accent.green : 'success.main') : (isCvr ? cvrTheme.accent.purple : 'primary.main') }} />
                        ) : (
                          <FolderIcon sx={{ mr: 1.5, color: isGroupComplete ? (isCvr ? cvrTheme.accent.green : 'success.main') : (isCvr ? cvrTheme.accent.purple : 'primary.main') }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: isCvr ? cvrTheme.text.primary : 'text.primary' }}>
                            {group.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: isCvr ? cvrTheme.text.secondary : 'text.secondary' }}>
                              {group.subCategories.length} sub-categories • {group.completedItems}/{group.totalItems} items
                            </Typography>
                            <Chip 
                              label={`${groupCompletionPercent}%`}
                              size="small"
                              color={isGroupComplete ? 'success' : 'default'}
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                ...(isCvr && !isGroupComplete && { bgcolor: cvrTheme.input.border, color: cvrTheme.text.secondary })
                              }}
                            />
                          </Box>
                        </Box>
                        {isGroupComplete && (
                          <CheckCircleIcon sx={{ fontSize: 24, color: isCvr ? cvrTheme.accent.green : 'success.main', ml: 1 }} />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2, bgcolor: isCvr ? cvrTheme.background.primary : 'background.paper' }}>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
                        gap: 1.5 
                      }}>
                        {group.subCategories.map((subCat, subIndex) => {
                          const status = categoryCompletionStatus[subCat.fullName] || { 
                            completed: 0, 
                            total: subCat.itemCount, 
                            isComplete: false 
                          };
                          const completionPercent = status.total > 0 
                            ? Math.round((status.completed / status.total) * 100) 
                            : 0;
                          const isSubSelected = selectedCategory === subCat.fullName && (subCat.section ? selectedSection === subCat.section : !selectedSection);
                          
                          return (
                            <Card
                              key={`${subCat.fullName}-${subCat.section || 'no-section'}-${subIndex}`}
                              sx={{
                                cursor: 'pointer',
                                border: 2,
                                borderColor: status.isComplete 
                                  ? (isCvr ? cvrTheme.accent.green : 'success.main')
                                  : isSubSelected
                                    ? (isCvr ? cvrTheme.accent.purple : 'primary.main')
                                    : (isCvr ? cvrTheme.input.border : 'grey.300'),
                                bgcolor: isCvr
                                  ? cvrTheme.background.card
                                  : (status.isComplete
                                      ? 'success.light'
                                      : isSubSelected
                                        ? 'primary.light' 
                                        : 'background.paper'),
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: status.isComplete 
                                    ? (isCvr ? cvrTheme.accent.green : 'success.dark') 
                                    : (isCvr ? cvrTheme.accent.purple : 'primary.main'),
                                  bgcolor: isCvr ? cvrTheme.background.elevated : (status.isComplete ? 'success.light' : 'action.hover'),
                                  transform: 'translateY(-2px)',
                                  boxShadow: 3
                                }
                              }}
                              onClick={() => handleCategorySelect(subCat.fullName, subCat.section || null)}
                            >
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9rem', flex: 1, color: isCvr ? cvrTheme.text.primary : 'text.primary' }}>
                                    {subCat.displayName}
                                  </Typography>
                                  {status.isComplete && (
                                    <CheckCircleIcon sx={{ fontSize: 18, color: isCvr ? cvrTheme.accent.green : 'success.main', ml: 0.5 }} />
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: isCvr ? cvrTheme.text.secondary : 'text.secondary' }}>
                                  {status.completed} / {status.total} items
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={completionPercent}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: isCvr ? cvrTheme.input.border : 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: status.isComplete 
                                        ? (isCvr ? cvrTheme.accent.green : 'success.main') 
                                        : (isCvr ? cvrTheme.accent.purple : 'primary.main'),
                                      borderRadius: 2
                                    }
                                  }}
                                />
                                {isSubSelected && !status.isComplete && (
                                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', color: isCvr ? cvrTheme.accent.purple : 'primary.main' }}>
                                    <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>Selected</Typography>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: isCvr ? 'space-between' : 'space-between', mt: 3 }}>
              <Button 
                onClick={() => setActiveStep(0)} 
                variant="outlined"
                sx={isCvr ? { borderColor: cvrTheme.accent.purple, color: cvrTheme.accent.purple } : {}}
              >
                Back
              </Button>
              {isCvr && (
                <Button 
                  variant="outlined"
                  onClick={() => showSuccess('Draft saved')}
                  sx={{ borderColor: cvrTheme.accent.purple, color: cvrTheme.accent.purple }}
                >
                  Save Draft
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                variant="contained"
                disabled={!selectedCategory}
                sx={isCvr ? { background: cvrTheme.button.next, color: '#fff', '&:hover': { background: cvrTheme.button.next, opacity: 0.9 } } : {}}
              >
                {isCvr ? 'Next' : 'Next: Start Audit'}
              </Button>
            </Box>
          </Paper>
        )}

        {activeStep === (categories.length > 1 ? 2 : 1) && (
          <Box className={isMobile ? 'has-bottom-actions' : ''}>
            {/* Enhanced Progress Bar with Category Switcher */}
            <Paper 
              sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: isCvr ? cvrTheme.background.card : 'info.light',
                ...(isCvr && { color: cvrTheme.text.primary }),
                ...(isMobile && {
                  position: 'sticky',
                  top: 64,
                  zIndex: 100,
                  borderRadius: 0,
                  mx: -2,
                  width: 'calc(100% + 32px)',
                })
              }}
              className="audit-progress"
            >
              {/* Category Switcher (only show if multiple categories) */}
              {categories.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ borderBottom: 1, borderColor: tabBorder, mb: 2 }}>
                    <Tabs
                      value={selectedCategory ? categories.indexOf(selectedCategory) + 1 : 0}
                      onChange={(e, newValue) => {
                        if (newValue === 0) {
                          setActiveStep(0);
                          return;
                        }
                        handleCategorySelect(categories[newValue - 1]);
                      }}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        minHeight: 40,
                        '& .MuiTabs-flexContainer': {
                          gap: 0.5
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: tabAccent,
                          height: 3
                        },
                        '& .MuiTab-root': {
                          color: tabTextSecondary,
                          textTransform: 'uppercase',
                          fontSize: isMobile ? '0.68rem' : '0.72rem',
                          fontWeight: 500,
                          minHeight: 40,
                          minWidth: 'auto',
                          px: 1.5,
                          py: 1,
                          '&.Mui-selected': {
                            color: tabTextPrimary,
                            fontWeight: 600
                          }
                        },
                        '& .MuiTabs-scrollButtons': {
                          color: tabTextSecondary
                        }
                      }}
                    >
                      {/* Details Tab (completed) */}
                      <Tab 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <CheckCircleIcon sx={{ fontSize: 16, color: tabSuccess }} />
                            <span>Details</span>
                          </Box>
                        }
                      />
                      {/* Category Tabs */}
                      {categories.map((cat, idx) => {
                        const catStatus = categoryCompletionStatus[cat] || { completed: 0, total: 0, isComplete: false };
                        const isActive = selectedCategory === cat;
                        return (
                          <Tab 
                            key={cat || `no-category-${idx}`}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {catStatus.isComplete ? (
                                  <CheckCircleIcon sx={{ fontSize: 14, color: tabSuccess }} />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      border: `1px solid ${tabTextSecondary}`,
                                      backgroundColor: isActive ? tabAccent : 'transparent'
                                    }}
                                  />
                                )}
                                <span>{cat.length > 18 ? cat.substring(0, 18) + '...' : cat}</span>
                              </Box>
                            }
                          />
                        );
                      })}
                    </Tabs>
                  </Box>
                  
                  {/* Overall Audit Summary - Only for non-CVR (CVR shows tabs instead) */}
                  {!isCvr && (() => {
                    const totalCompleted = Object.values(categoryCompletionStatus).reduce((sum, status) => sum + status.completed, 0);
                    const totalItems = Object.values(categoryCompletionStatus).reduce((sum, status) => sum + status.total, 0);
                    const completedCategories = Object.values(categoryCompletionStatus).filter(s => s.isComplete).length;
                    const overallPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
                    
                    return (
                      <Box sx={{ flex: 1, minWidth: isMobile ? '100%' : 300 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            Overall Progress
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.dark' }}>
                            {overallPercent}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={overallPercent}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.5)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {totalCompleted} / {totalItems} items • {completedCategories} / {categories.length} categories complete
                        </Typography>
                        {(() => {
                          // Calculate detailed breakdown
                          const requiredItems = items.filter(item => item.required);
                          const missingRequired = requiredItems.filter(item => !isItemComplete(item));
                          const itemsNeedingPhotos = items.filter(item => {
                            const inputType = getNormalizedInputType(item);
                            return item.required && inputType === 'image_upload' && !photos[item.id];
                          });
                          
                          if (missingRequired.length > 0 || itemsNeedingPhotos.length > 0) {
                            return (
                              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {missingRequired.length > 0 && (
                                  <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
                                    ⚠️ {missingRequired.length} required item{missingRequired.length !== 1 ? 's' : ''} incomplete
                                  </Typography>
                                )}
                                {itemsNeedingPhotos.length > 0 && (
                                  <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
                                    📷 {itemsNeedingPhotos.length} item{itemsNeedingPhotos.length !== 1 ? 's' : ''} need{itemsNeedingPhotos.length === 1 ? 's' : ''} photo{itemsNeedingPhotos.length !== 1 ? 's' : ''}
                                  </Typography>
                                )}
                              </Box>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    );
                  })()}
                </Box>
              )}
              
              {/* Current Category Progress */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 'fit-content', color: isCvr ? cvrTheme.text.primary : undefined }}>
                    {completedItems} / {itemsToDisplay.length}
                    {selectedCategory && !isCvr && ` (${selectedCategory})`}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(completedItems / itemsToDisplay.length) * 100} 
                    sx={{ 
                      flex: 1, 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: isCvr ? cvrTheme.input.border : 'rgba(255,255,255,0.5)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: isCvr ? cvrTheme.accent.purple : undefined
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 500, minWidth: 'fit-content' }}>
                    {Math.round((completedItems / itemsToDisplay.length) * 100)}%
                  </Typography>
                </Box>
                {(() => {
                  // Calculate detailed breakdown for current category
                  const requiredItems = itemsToDisplay.filter(item => item.required);
                  const missingRequired = requiredItems.filter(item => !isItemComplete(item));
                  const itemsNeedingPhotos = itemsToDisplay.filter(item => {
                    const inputType = getNormalizedInputType(item);
                    return item.required && inputType === 'image_upload' && !photos[item.id];
                  });
                  
                  if (missingRequired.length > 0 || itemsNeedingPhotos.length > 0) {
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                        {missingRequired.length > 0 && (
                          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
                            ⚠️ {missingRequired.length} required item{missingRequired.length !== 1 ? 's' : ''} incomplete
                          </Typography>
                        )}
                        {itemsNeedingPhotos.length > 0 && (
                          <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
                            📷 {itemsNeedingPhotos.length} item{itemsNeedingPhotos.length !== 1 ? 's' : ''} need{itemsNeedingPhotos.length === 1 ? 's' : ''} photo{itemsNeedingPhotos.length !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Box>
            </Paper>

            {/* Previous failures summary banner */}
            {previousAuditInfo && previousFailures.length > 0 && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2, 
                  '& .MuiAlert-icon': { color: 'warning.dark' }
                }}
                onClose={() => setShowFailuresAlert(false)}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    ⚠️ {previousFailures.length} item(s) failed in the last audit 
                    ({new Date(previousAuditInfo.date).toLocaleDateString()})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Previous score: {previousAuditInfo.score}% • Failed items are highlighted below
                    {previousFailures.filter(f => f.is_recurring).length > 0 && 
                      ` • ${previousFailures.filter(f => f.is_recurring).length} recurring issue(s)`
                    }
                  </Typography>
                </Box>
              </Alert>
            )}

            {(() => {
              const requiredItems = itemsToDisplay.filter(item => item.required);
              const missingRequired = requiredItems.filter(item => {
                if (item.options && item.options.length > 0) {
                  return !selectedOptions[item.id];
                }
                return !responses[item.id] || responses[item.id] === 'pending';
              });
              return missingRequired.length > 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  ℹ️ You have {missingRequired.length} required item(s) remaining. You can save your progress and resume later.
                </Alert>
              ) : null;
            })()}

            {/* Render items grouped by section (similar to mobile app) */}
            {groupedItems.sections.length > 0 ? (
              <>
                {groupedItems.sections.map((sectionData) => {
                  const sectionItems = sectionData.items;
                  const sectionCompleted = sectionItems.filter(item => isItemComplete(item)).length;
                  const sectionTotal = sectionItems.length;
                  const sectionPercent = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;
                  const isSectionExpanded = expandedSections[sectionData.name] !== false; // Default to true

                  return (
                    <Accordion
                      key={sectionData.name}
                      expanded={isSectionExpanded}
                      onChange={() => setExpandedSections(prev => ({ ...prev, [sectionData.name]: !isSectionExpanded }))}
                      sx={{
                        mb: 2,
                        border: isCvr ? 'none' : 1,
                        boxShadow: isCvr ? 'none' : undefined,
                        borderColor: sectionPercent === 100 ? 'success.main' : 'divider',
                        '&.Mui-expanded': !isCvr ? {
                          borderColor: sectionPercent === 100 ? 'success.main' : 'primary.main',
                          boxShadow: 2
                        } : undefined
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: isCvr ? cvrTheme.text.secondary : undefined }} />}
                        sx={{
                          bgcolor: isCvr ? cvrTheme.background.card : (sectionPercent === 100 ? 'success.light' : 'background.paper'),
                          borderRadius: isCvr ? 3 : 1,
                          border: isCvr ? `1px solid ${cvrTheme.input.border}` : 'none',
                          minHeight: isCvr ? 56 : undefined,
                          '& .MuiAccordionSummary-content': {
                            alignItems: 'center',
                            my: isCvr ? 0 : undefined
                          },
                          '&.Mui-expanded': !isCvr ? {
                            bgcolor: sectionPercent === 100 ? 'success.light' : 'primary.light',
                          } : undefined
                        }}
                      >
                        {isCvr ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: cvrTheme.text.primary }}>
                              {sectionData.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: cvrTheme.text.secondary }}>
                              {sectionCompleted}/{sectionTotal}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
                              {sectionData.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {sectionPercent === 100 && (
                                <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                              )}
                              <Chip
                                label={`${sectionCompleted}/${sectionTotal}`}
                                size="small"
                                color={sectionPercent === 100 ? 'success' : 'default'}
                                sx={{ height: 24, fontSize: '0.8rem', fontWeight: 600 }}
                              />
                            </Box>
                          </Box>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ bgcolor: isCvr ? 'transparent' : 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 0 }}>
                        <Box sx={{ p: isCvr ? 1.5 : 2 }}>
                          {/* Section Header Controls */}
                          {!isCvr && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ExpandMoreIcon />}
                                onClick={() => {
                                  setExpandedSections(prev => ({ ...prev, [sectionData.name]: false }));
                                }}
                              >
                                Collapse Section
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                  // TODO: Implement add new item to section
                                  console.log('Add new item to section:', sectionData.name);
                                }}
                              >
                                Add New Item
                              </Button>
                            </Box>
                          )}
                          
                          {/* Group Time/Sec pairs together */}
                          {(() => {
                            const groupedPairs = {};
                            const standaloneItems = [];
                            
                            sectionItems.forEach(item => {
                              const title = item.title || '';
                              // Check if this is a Time or Sec item
                              if (title.includes('(Time)')) {
                                const baseName = title.replace(' (Time)', '').trim();
                                if (!groupedPairs[baseName]) {
                                  groupedPairs[baseName] = { time: null, sec: null };
                                }
                                groupedPairs[baseName].time = item;
                              } else if (title.includes('(Sec)')) {
                                const baseName = title.replace(' (Sec)', '').trim();
                                if (!groupedPairs[baseName]) {
                                  groupedPairs[baseName] = { time: null, sec: null };
                                }
                                groupedPairs[baseName].sec = item;
                              } else {
                                standaloneItems.push(item);
                              }
                            });
                            
                            return (
                              <>
                                {/* Render Time/Sec pairs - grouped in single card */}
                                {Object.entries(groupedPairs).map(([baseName, pair], pairIndex) => (
                                  <Card 
                                    key={`pair-${baseName}-${pairIndex}`} 
                                    sx={{ 
                                      mb: 2, 
                                      p: 2, 
                                      bgcolor: isCvr ? cvrTheme.background.card : 'white', 
                                      borderRadius: 2, 
                                      border: '1px solid', 
                                      borderColor: isCvr ? cvrTheme.input.border : 'divider',
                                      boxShadow: 1
                                    }}
                                  >
                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                                      {baseName}
                                    </Typography>
                                    <Grid container spacing={2}>
                                      {pair.time && (
                                        <Grid item xs={12} sm={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <EventIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Date</Typography>
                                          </Box>
                                          {renderAuditItemField(pair.time, pairIndex * 2, false)}
                                        </Grid>
                                      )}
                                      {pair.sec && (
                                        <Grid item xs={12} sm={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <NumbersIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">01. Number</Typography>
                                          </Box>
                                          {renderAuditItemField(pair.sec, pairIndex * 2 + 1, false)}
                                        </Grid>
                                      )}
                                    </Grid>
                                  </Card>
                                ))}
                                
                                {/* Render standalone items (not Time/Sec pairs) */}
                                {standaloneItems.map((item, index) => {
                                  return renderAuditItem(item, Object.keys(groupedPairs).length * 2 + index);
                                })}
                              </>
                            );
                          })()}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {/* Render items without section */}
                {groupedItems.itemsWithoutSection.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    {groupedItems.itemsWithoutSection.map((item, index) => {
                      return renderAuditItem(item, index);
                    })}
                  </Box>
                )}
              </>
            ) : (
              /* Fallback: render items in flat list if no sections */
              itemsToDisplay.map((item, index) => {
                return renderAuditItem(item, index);
              })
            )}
          </Box>
        )}

        {/* Signature Modal */}
        <Dialog open={signatureModalOpen} onClose={() => setSignatureModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Draw Signature</DialogTitle>
          <DialogContent>
            <Box sx={{ border: '1px solid grey', borderRadius: 1, overflow: 'hidden' }}>
              <SignatureCanvas
                ref={signatureRef}
                penColor='black'
                canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
                backgroundColor='white'
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => signatureRef.current?.clear()} color="error">Clear</Button>
            <Button onClick={() => setSignatureModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (signatureRef.current?.isEmpty()) {
                  showError('Please provide a signature.');
                  return;
                }
                const dataUrl = signatureRef.current?.toDataURL('image/png');
                // Convert data URL to Blob for upload
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], `signature_${signatureItemId}.png`, { type: 'image/png' });
                await handlePhotoUpload(signatureItemId, file);
                setInputValues(prev => ({ ...prev, [signatureItemId]: 'Signed' })); // Mark as signed
                setResponses(prev => ({ ...prev, [signatureItemId]: 'completed' }));
                setSignatureModalOpen(false);
              }}
              variant="contained"
            >
              Save Signature
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default AuditForm;

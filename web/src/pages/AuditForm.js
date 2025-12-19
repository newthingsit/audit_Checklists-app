import React, { useEffect, useState, useCallback } from 'react';
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
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Autocomplete,
  useMediaQuery,
  useTheme,
  LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const AuditForm = () => {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState(searchParams.get('location_id') || '');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({}); // Track selected_option_id for each item
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
  const [showFailuresAlert, setShowFailuresAlert] = useState(false);
  
  // Time tracking state for Item Making Performance
  const [itemStartTimes, setItemStartTimes] = useState({});
  const [itemElapsedTimes, setItemElapsedTimes] = useState({});
  const [timeTrackingIntervals, setTimeTrackingIntervals] = useState({});
  
  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    fetchLocations();
    // Fetch scheduled audit data if coming from scheduled audits
    if (scheduledId) {
      fetchScheduledAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      // Check if current date matches scheduled date (scheduled audits can only be opened on the same day)
      if (schedule.scheduled_date) {
        const scheduledDate = new Date(schedule.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (scheduledDate.getTime() !== today.getTime()) {
          setIsBeforeScheduledDate(true);
          setError(`This audit is scheduled for ${scheduledDate.toLocaleDateString()}. Scheduled audits can only be opened on the scheduled date.`);
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

      // Populate responses from audit items
      const responsesData = {};
      const optionsData = {};
      const commentsData = {};
      const photosData = {};

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
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);

      // Start at checklist step since we already have the info
      setActiveStep(1);
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

  // Time tracking functions for Item Making Performance
  const startItemTimer = (itemId) => {
    if (itemStartTimes[itemId]) {
      return;
    }
    
    const startTime = new Date().toISOString();
    setItemStartTimes(prev => ({ ...prev, [itemId]: startTime }));
    
    const interval = setInterval(() => {
      setItemElapsedTimes(prev => {
        const start = itemStartTimes[itemId] || startTime;
        const elapsed = Math.floor((new Date() - new Date(start)) / 1000 / 60);
        return { ...prev, [itemId]: elapsed };
      });
    }, 10000);
    
    setTimeTrackingIntervals(prev => ({ ...prev, [itemId]: interval }));
  };

  const stopItemTimer = (itemId) => {
    if (timeTrackingIntervals[itemId]) {
      clearInterval(timeTrackingIntervals[itemId]);
      setTimeTrackingIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[itemId];
        return newIntervals;
      });
    }
    
    if (itemStartTimes[itemId]) {
      const startTime = new Date(itemStartTimes[itemId]);
      const endTime = new Date();
      const timeTakenMinutes = Math.round(((endTime - startTime) / 1000 / 60) * 100) / 100;
      
      setItemElapsedTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[itemId];
        return newTimes;
      });
      
      return {
        time_taken_minutes: timeTakenMinutes,
        started_at: itemStartTimes[itemId]
      };
    }
    return null;
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(timeTrackingIntervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [timeTrackingIntervals]);

  const handleResponseChange = (itemId, status) => {
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    
    // Start timer when user first interacts with item
    if (!itemStartTimes[itemId] && status !== 'pending') {
      startItemTimer(itemId);
    }
    
    // Stop timer when item is completed
    if (status === 'completed' && itemStartTimes[itemId]) {
      stopItemTimer(itemId);
    }
    
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    
    // Start timer when user first interacts with item
    if (!itemStartTimes[itemId]) {
      startItemTimer(itemId);
    }
    
    setSelectedOptions({ ...selectedOptions, [itemId]: optionId });
    // Also update status to 'completed' when an option is selected
    setResponses({ ...responses, [itemId]: 'completed' });
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
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    setComments({ ...comments, [itemId]: comment });
  };

  const handlePhotoUpload = async (itemId, file) => {
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
      // Photo upload notification removed as per requirement
    } catch (error) {
      console.error('Error uploading photo:', error);
      showError('Failed to upload photo');
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!locationId) {
        newErrors.locationId = 'Store selection is required';
      }
    } else if (step === 1) {
      const requiredItems = items.filter(item => item.required);
      const missingRequired = requiredItems.filter(item => {
        // For items with options, check if an option is selected
        if (item.options && item.options.length > 0) {
          return !selectedOptions[item.id];
        }
        // For items without options, check status
        return !responses[item.id] || responses[item.id] === 'pending';
      });
      if (missingRequired.length > 0) {
        newErrors.items = `Please complete all required items (${missingRequired.length} remaining)`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) {
      setTouched({ ...touched, [activeStep]: true });
      return;
    }
    setError('');
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

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

        if (scheduledId) {
          auditData.scheduled_audit_id = parseInt(scheduledId, 10);
        }
        
        const auditResponse = await axios.post('/api/audits', auditData);
        currentAuditId = auditResponse.data.id;
      }

      // Update all items in a single batch request (much faster!)
      const batchItems = items
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
            const timeData = stopItemTimer(item.id);
            if (timeData) {
              itemData.time_taken_minutes = timeData.time_taken_minutes;
              itemData.started_at = timeData.started_at;
            }
          }

          return itemData;
        });

      console.log('[AuditForm] Saving batch items:', { auditId: currentAuditId, itemCount: batchItems.length, sampleItem: batchItems[0] });
      
      if (batchItems.length === 0) {
        throw new Error('No valid items to save. Please ensure all checklist items have valid IDs.');
      }

      // Single batch API call instead of multiple individual calls
      await axios.put(`/api/audits/${currentAuditId}/items/batch`, { items: batchItems });

      showSuccess(isEditing ? 'Audit updated successfully!' : 'Audit saved successfully!');
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

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const steps = categories.length > 1 ? ['Store Information', 'Select Category', 'Audit Checklist'] : ['Store Information', 'Audit Checklist'];
  const completedItems = Object.values(responses).filter(r => r === 'completed').length;
  
  // Use filteredItems for display when on checklist step
  const itemsToDisplay = (activeStep === (categories.length > 1 ? 2 : 1) && selectedCategory) ? filteredItems : items;

  return (
    <Layout>
      <Container maxWidth="md">
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 600, 
            color: '#333', 
            mb: 3,
            fontSize: isMobile ? '1.25rem' : '2rem',
            lineHeight: 1.3
          }}
        >
          {isEditing ? 'Resume Audit' : 'New Audit'}: {template?.name}
        </Typography>

        <Stepper 
          activeStep={activeStep} 
          sx={{ mt: 3, mb: 4 }}
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
          <Paper sx={{ p: isMobile ? 2 : 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
              Store Information
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
                  label="Store *"
                  required
                  margin="normal"
                  error={touched[0] && !!errors.locationId}
                  helperText={touched[0] ? errors.locationId : (isLocationLocked ? 'Store is locked for this scheduled audit' : '')}
                  placeholder="Search and select a store..."
                  InputProps={{
                    ...params.InputProps,
                    readOnly: isLocationLocked
                  }}
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
            />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: isMobile ? 'stretch' : 'flex-end', 
              mt: 3 
            }}>
              <Button 
                onClick={handleNext} 
                variant="contained"
                disabled={isBeforeScheduledDate}
                fullWidth={isMobile}
                sx={{ 
                  minHeight: isMobile ? 48 : 36,
                  fontSize: isMobile ? '1rem' : '0.875rem'
                }}
              >
                {categories.length > 1 ? 'Next: Select Category' : 'Next: Start Audit'}
              </Button>
            </Box>
          </Paper>
        )}

        {activeStep === 1 && (
          <Box className={isMobile ? 'has-bottom-actions' : ''}>
            {/* Sticky Progress Bar for Mobile */}
            <Paper 
              sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: 'info.light',
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 'fit-content' }}>
                  {completedItems} / {items.length}
              </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(completedItems / items.length) * 100} 
                  sx={{ 
                    flex: 1, 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 500, minWidth: 'fit-content' }}>
                  {Math.round((completedItems / items.length) * 100)}%
                </Typography>
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
            {itemsToDisplay.map((item, index) => {
              const isPreviousFailure = failedItemIds.has(item.id);
              const failureInfo = previousFailures.find(f => f.item_id === item.id);
              
              return (
              <Card 
                key={item.id} 
                className={`audit-item-card ${isPreviousFailure ? 'previous-failure' : ''}`}
                sx={{ 
                  mb: isMobile ? 2 : 2,
                  border: isPreviousFailure ? '2px solid' : '1px solid',
                  borderColor: isPreviousFailure 
                    ? 'error.main' 
                    : (selectedOptions[item.id] ? 'primary.main' : 'divider'),
                  backgroundColor: isPreviousFailure ? '#FFF5F5' : 'background.paper',
                  transition: 'border-color 0.2s',
                }}
              >
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
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
                      <span style={{ fontWeight: 600 }}>{index + 1}.</span> {item.title}
                      {item.required && (
                        <Chip 
                          label="Required" 
                          size="small" 
                          color="error" 
                          sx={{ fontSize: '0.65rem', height: 20 }} 
                        />
                      )}
                      {/* Time tracking display */}
                      {(itemStartTimes[item.id] || itemElapsedTimes[item.id]) && (
                        <Chip 
                          label={`⏱️ ${itemElapsedTimes[item.id] || 0} min`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20, ml: 1 }}
                          color="info"
                          variant="outlined"
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
                  {/* Show options if available (Yes/No/N/A), otherwise show status radio buttons */}
                  {item.options && item.options.length > 0 ? (
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
                              // Touch-friendly active state
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
                  ) : (
                  <FormControl component="fieldset">
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
                  )}

                  <TextField
                    fullWidth
                    label="Add Comment"
                    placeholder="Add any notes or comments..."
                    value={comments[item.id] || ''}
                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    multiline
                    rows={2}
                    size="small"
                    sx={{ mb: 2, mt: 2 }}
                  />

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
                    />
                    <label htmlFor={`photo-upload-${item.id}`} style={{ width: isMobile ? '100%' : 'auto' }}>
                      <Tooltip title="Upload photo evidence">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<PhotoCameraIcon />}
                          size={isMobile ? "medium" : "small"}
                          disabled={uploading[item.id]}
                          className="photo-upload-btn"
                          sx={{
                            width: isMobile ? '100%' : 'auto',
                            minHeight: isMobile ? 48 : 36,
                          }}
                        >
                          {uploading[item.id] ? 'Uploading...' : photos[item.id] ? 'Change Photo' : 'Take Photo'}
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
                          onClick={() => setPhotos({ ...photos, [item.id]: null })}
                          color="error"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
              );
            })}

            {/* Mobile: Fixed bottom action bar, Desktop: Regular buttons */}
            {isMobile ? (
              <Box 
                className="mobile-bottom-actions"
                sx={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  p: 2,
                  boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  display: 'flex',
                  gap: 2,
                }}
              >
                <Button 
                  onClick={handleBack}
                  variant="outlined"
                  sx={{ flex: 1, minHeight: 48 }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={saving || auditStatus === 'completed'}
                  sx={{ flex: 2, minHeight: 48 }}
                >
                  {saving ? <CircularProgress size={24} /> : isEditing ? 'Update Audit' : 'Save Audit'}
                </Button>
              </Box>
            ) : (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={saving || auditStatus === 'completed'}
              >
                {saving ? <CircularProgress size={24} /> : isEditing ? 'Update Audit' : 'Save Audit'}
              </Button>
            </Box>
            )}
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default AuditForm;



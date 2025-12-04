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
  Autocomplete
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
      
      // Check if current date is before scheduled date
      if (schedule.scheduled_date) {
        const scheduledDate = new Date(schedule.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (today < scheduledDate) {
          setIsBeforeScheduledDate(true);
          setError(`This audit is scheduled for ${scheduledDate.toLocaleDateString()}. You cannot start it before the scheduled date.`);
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
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations').catch(() => ({ data: { locations: [] } }));
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleResponseChange = (itemId, status) => {
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
    }
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
    if (auditStatus === 'completed') {
      showError('Cannot modify items in a completed audit');
      return;
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
      showSuccess('Photo uploaded successfully!');
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

  const steps = ['Store Information', 'Audit Checklist'];
  const completedItems = Object.values(responses).filter(r => r === 'completed').length;

  return (
    <Layout>
      <Container maxWidth="md">
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#333', mb: 3 }}>
          {isEditing ? 'Resume Audit' : 'New Audit'}: {template?.name}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button 
                onClick={handleNext} 
                variant="contained"
                disabled={isBeforeScheduledDate}
              >
                Next
              </Button>
            </Box>
          </Paper>
        )}

        {activeStep === 1 && (
          <Box>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
              <Typography variant="body2">
                Progress: {completedItems} / {items.length} items completed
              </Typography>
            </Paper>

            {(() => {
              const requiredItems = items.filter(item => item.required);
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
            {items.map((item, index) => (
              <Card 
                key={item.id} 
                sx={{ 
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {index + 1}. {item.title}
                      {item.required && (
                        <Chip 
                          label="Required" 
                          size="small" 
                          color="error" 
                          sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} 
                        />
                      )}
                    </Typography>
                    {getStatusIcon(responses[item.id])}
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
                      <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>Select Option:</FormLabel>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {item.options.map((option) => (
                          <Button
                            key={option.id}
                            variant={selectedOptions[item.id] === option.id ? 'contained' : 'outlined'}
                            fullWidth
                            onClick={() => handleOptionChange(item.id, option.id)}
                            sx={{
                              py: 1.5,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              textTransform: 'none',
                              border: selectedOptions[item.id] === option.id ? '2px solid' : '1px solid',
                              borderColor: selectedOptions[item.id] === option.id ? 'primary.main' : 'divider',
                              backgroundColor: selectedOptions[item.id] === option.id ? 'primary.main' : 'transparent',
                              color: selectedOptions[item.id] === option.id ? 'white' : 'text.primary',
                              '&:hover': {
                                borderColor: 'primary.main',
                                backgroundColor: selectedOptions[item.id] === option.id ? 'primary.dark' : 'action.hover'
                              }
                            }}
                          >
                            <Typography variant="body1" sx={{ fontWeight: selectedOptions[item.id] === option.id ? 600 : 400 }}>
                              {option.option_text}
                            </Typography>
                            <Chip
                              label={`Score: ${option.mark}`}
                              size="small"
                              sx={{
                                ml: 2,
                                backgroundColor: selectedOptions[item.id] === option.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                                color: selectedOptions[item.id] === option.id ? 'white' : 'text.primary',
                                border: selectedOptions[item.id] === option.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid',
                                borderColor: selectedOptions[item.id] === option.id ? 'rgba(255,255,255,0.3)' : 'divider'
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

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id={`photo-upload-${item.id}`}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handlePhotoUpload(item.id, file);
                      }}
                    />
                    <label htmlFor={`photo-upload-${item.id}`}>
                      <Tooltip title="Upload photo evidence">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<PhotoCameraIcon />}
                          size="small"
                          disabled={uploading[item.id]}
                        >
                          {uploading[item.id] ? 'Uploading...' : photos[item.id] ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                      </Tooltip>
                    </label>
                    {photos[item.id] && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img 
                          src={photos[item.id].startsWith('http') ? photos[item.id] : photos[item.id]} 
                          alt="Uploaded"
                          style={{ width: 50, height: 50, borderRadius: 4, objectFit: 'cover' }}
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
            ))}

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
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default AuditForm;



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

  useEffect(() => {
    fetchTemplate();
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Update selectedLocation when locationId changes (e.g., from URL params)
  useEffect(() => {
    if (locationId && locations.length > 0) {
      const location = locations.find(l => l.id === parseInt(locationId));
      if (location) {
        setSelectedLocation(location);
      }
    }
  }, [locationId, locations]);

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
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
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
    setComments({ ...comments, [itemId]: comment });
  };

  const handlePhotoUpload = async (itemId, file) => {
    if (!file) return;

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
    if (!validateStep(1)) {
      setTouched({ ...touched, 1: true });
      setError(errors.items || 'Please complete all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Get selected store details
      const selectedStore = locations.find(l => l.id === parseInt(locationId));
      if (!selectedStore) {
        setError('Please select a store');
        return;
      }

      // Create audit
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

      const auditId = auditResponse.data.id;

      // Update all items
      const updatePromises = Object.entries(responses).map(([itemId, status]) => {
        const updateData = { status };
        // If an option was selected, include selected_option_id
        if (selectedOptions[itemId]) {
          updateData.selected_option_id = parseInt(selectedOptions[itemId]);
        }
        if (comments[itemId]) {
          updateData.comment = comments[itemId];
        }
        if (photos[itemId]) {
          updateData.photo_url = photos[itemId];
        }
        return axios.put(`/api/audits/${auditId}/items/${itemId}`, updateData);
      });

      await Promise.all(updatePromises);

      showSuccess('Audit saved successfully!');
      navigate(`/audit/${auditId}`);
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
          New Audit: {template?.name}
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
                setSelectedLocation(newValue);
                setLocationId(newValue ? newValue.id.toString() : '');
                if (newValue) {
                  setErrors({ ...errors, locationId: '' });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Store *"
                  required
                  margin="normal"
                  error={touched[0] && !!errors.locationId}
                  helperText={touched[0] && errors.locationId}
                  placeholder="Search and select a store..."
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
              <Button onClick={handleNext} variant="contained">
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

            {errors.items && touched[1] && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {errors.items}
              </Alert>
            )}
            {items.map((item, index) => (
              <Card 
                key={item.id} 
                sx={{ 
                  mb: 2,
                  border: item.required && (!responses[item.id] || responses[item.id] === 'pending') && touched[1]
                    ? '2px solid' 
                    : '1px solid',
                  borderColor: item.required && (!responses[item.id] || responses[item.id] === 'pending') && touched[1]
                    ? 'error.main'
                    : 'divider'
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
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : 'Save Audit'}
              </Button>
            </Box>
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default AuditForm;


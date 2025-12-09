import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';
import { useLocation } from '../context/LocationContext';
import { LocationCaptureButton, LocationDisplay, LocationVerification } from '../components/LocationCapture';

const AuditFormScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { templateId, auditId, scheduledAuditId, locationId: initialLocationId } = route.params || {};
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState(initialLocationId || '');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [responses, setResponses] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [comments, setComments] = useState({});
  const [photos, setPhotos] = useState({});
  const [uploading, setUploading] = useState({});
  const [locations, setLocations] = useState([]);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0: info, 1: checklist
  const [isEditing, setIsEditing] = useState(false);
  const [auditStatus, setAuditStatus] = useState(null); // Track audit status
  
  // GPS Location state
  const { getCurrentLocation, permissionGranted, settings: locationSettings } = useLocation();
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [showLocationVerification, setShowLocationVerification] = useState(false);

  // Previous failures state for highlighting recurring issues
  const [previousFailures, setPreviousFailures] = useState([]);
  const [failedItemIds, setFailedItemIds] = useState(new Set());
  const [previousAuditInfo, setPreviousAuditInfo] = useState(null);
  const [loadingPreviousFailures, setLoadingPreviousFailures] = useState(false);

  // Fetch previous audit failures when location and template are available
  useEffect(() => {
    if (templateId && locationId && parseInt(locationId) > 0 && items.length > 0) {
      fetchPreviousFailures();
    } else {
      // Reset previous failures when location changes
      setPreviousFailures([]);
      setFailedItemIds(new Set());
      setPreviousAuditInfo(null);
    }
  }, [templateId, locationId, items.length]);

  useEffect(() => {
    if (auditId) {
      // Editing existing audit
      setIsEditing(true);
      fetchAuditData();
    } else if (scheduledAuditId && templateId) {
      // Check if audit already exists for this scheduled audit
      checkExistingAudit();
    } else if (templateId) {
      // Creating new audit
      fetchTemplate();
    }
    fetchLocations();
  }, [templateId, auditId, scheduledAuditId]);

  // Preserve state when component is focused (e.g., when navigating back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh data when screen comes into focus to ensure state is current
      if (auditId) {
        fetchAuditData();
      } else if (scheduledAuditId && templateId) {
        checkExistingAudit();
      }
    });

    return unsubscribe;
  }, [navigation, auditId, scheduledAuditId, templateId]);

  // Pre-fill location when scheduled audit provides locationId or when resuming audit
  useEffect(() => {
    // Handle initialLocationId from route params
    if (initialLocationId && locations.length > 0 && !selectedLocation) {
      const location = locations.find(l => l.id === parseInt(initialLocationId));
      if (location) {
        setSelectedLocation(location);
        setLocationId(initialLocationId.toString());
      }
    }
    // Handle locationId set from audit data (when resuming)
    else if (locationId && locations.length > 0 && !selectedLocation) {
      const location = locations.find(l => l.id === parseInt(locationId));
      if (location) {
        setSelectedLocation(location);
      }
    }
  }, [initialLocationId, locationId, locations, selectedLocation]);

  const checkExistingAudit = async () => {
    try {
      setLoading(true);
      // Check if an audit already exists for this scheduled audit
      const response = await axios.get(`${API_BASE_URL}/audits/by-scheduled/${scheduledAuditId}`);
      if (response.data.audit) {
        // Audit exists, switch to edit mode
        const existingAuditId = response.data.audit.id;
        setIsEditing(true);
        // Update route params to include auditId
        navigation.setParams({ auditId: existingAuditId });
        // Fetch the existing audit data
        await fetchAuditDataById(existingAuditId);
      } else {
        // No existing audit, create new one
        fetchTemplate();
      }
    } catch (error) {
      // If audit not found (404), it's a new audit
      if (error.response?.status === 404) {
        fetchTemplate();
      } else {
        console.error('Error checking existing audit:', error);
        Alert.alert('Error', 'Failed to check for existing audit. Creating new audit.');
        fetchTemplate();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditDataById = async (id) => {
    try {
      setLoading(true);
      // Fetch audit details with increased timeout for large audits
      const auditResponse = await axios.get(`${API_BASE_URL}/audits/${id}`, {
        timeout: 60000, // 60 seconds timeout for large audits
      });
      const audit = auditResponse.data.audit;
      const auditItems = auditResponse.data.items || [];

      // Check if audit is completed
      setAuditStatus(audit.status);
      if (audit.status === 'completed') {
        Alert.alert(
          'Audit Completed',
          'This audit has been completed and cannot be modified.',
          [{ text: 'OK' }]
        );
        navigation.goBack();
        return;
      }

      // Set audit info
      const auditLocationId = audit.location_id?.toString() || '';
      setLocationId(auditLocationId);
      setNotes(audit.notes || '');
      
      // If locations are already loaded, set selectedLocation immediately
      if (auditLocationId && locations.length > 0) {
        const location = locations.find(l => l.id === parseInt(auditLocationId));
        if (location) {
          setSelectedLocation(location);
        }
      }

      // Fetch template to get all items
      const templateResponse = await axios.get(`${API_BASE_URL}/checklists/${audit.template_id}`);
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
            : `${API_BASE_URL.replace('/api', '')}${auditItem.photo_url}`;
          photosData[auditItem.item_id] = photoUrl;
        }
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);

      // Start at checklist step since we already have the info
      setCurrentStep(1);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      Alert.alert('Error', 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      // Increased timeout for large templates (174+ items)
      const response = await axios.get(`${API_BASE_URL}/checklists/${templateId}`, {
        timeout: 60000, // 60 seconds timeout for large templates
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.data.template) {
        setTemplate(response.data.template);
        setItems(response.data.items || []);
      } else {
        throw new Error('Invalid template response');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      let errorMessage = 'Failed to load template';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Template is too large. Please try again or contact support.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error loading template. Please try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Template not found.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditData = async () => {
    await fetchAuditDataById(auditId);
  };

  // Fetch previous audit failures for recurring failures indicator
  const fetchPreviousFailures = async () => {
    if (!templateId || !locationId) return;
    
    try {
      setLoadingPreviousFailures(true);
      const response = await axios.get(
        `${API_BASE_URL}/audits/previous-failures/${templateId}/${locationId}`
      );
      
      if (response.data && response.data.failedItems) {
        const failures = response.data.failedItems;
        setPreviousFailures(failures);
        setPreviousAuditInfo({
          date: response.data.lastAuditDate,
          auditId: response.data.lastAuditId
        });
        
        // Create a Set of failed item IDs for quick lookup
        const failedIds = new Set(failures.map(item => item.item_id));
        setFailedItemIds(failedIds);
        
        // Show alert if there are recurring failures
        if (failures.length > 0) {
          Alert.alert(
            '⚠️ Recurring Failures Detected',
            `${failures.length} item(s) failed in the last audit for this location. These items are highlighted in red to help you focus on recurring issues.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error fetching previous failures:', error);
      // Silently fail - this is not critical functionality
    } finally {
      setLoadingPreviousFailures(false);
    }
  };

  const fetchLocations = async () => {
    try {
      // If scheduled audit, pass scheduled_audit_id to override store assignments
      const params = scheduledAuditId ? { scheduled_audit_id: scheduledAuditId } : {};
      const response = await axios.get(`${API_BASE_URL}/locations`, { params }).catch(() => ({ data: { locations: [] } }));
      const locationsData = response.data.locations || [];
      setLocations(locationsData);
      
      // If locationId is set (e.g., from URL params), find and set selected location
      if (locationId && locationsData.length > 0) {
        const location = locationsData.find(l => l.id === parseInt(locationId));
        if (location) {
          setSelectedLocation(location);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Fetch previous audit failures to highlight recurring issues
  const fetchPreviousFailures = async (tmplId, locId) => {
    if (!tmplId || !locId) return;
    
    setLoadingPreviousFailures(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/audits/previous-failures`, {
        params: { template_id: tmplId, location_id: locId, months_back: 3 }
      });
      
      const data = response.data;
      setPreviousFailures(data.failedItems || []);
      setFailedItemIds(new Set((data.failedItems || []).map(f => f.item_id)));
      setPreviousAuditInfo(data.previousAudit);
      
      // Show alert if there are recurring failures
      if (data.recurringFailures && data.recurringFailures.length > 0) {
        Alert.alert(
          '⚠️ Recurring Issues Found',
          `${data.recurringFailures.length} item(s) have failed 3+ times in the last 6 months. These will be highlighted in red during the audit.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else if (data.failedItems && data.failedItems.length > 0) {
        const dateStr = data.previousAudit?.date 
          ? new Date(data.previousAudit.date).toLocaleDateString()
          : 'previously';
        Alert.alert(
          '📋 Previous Failures',
          `${data.failedItems.length} item(s) failed in the last audit${dateStr !== 'previously' ? ` on ${dateStr}` : ''}. These will be highlighted during the audit.`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error fetching previous failures:', error);
      // Don't show error to user, just continue without highlighting
    } finally {
      setLoadingPreviousFailures(false);
    }
  };

  // Fetch previous failures when template and location are selected
  useEffect(() => {
    const tmplId = template?.id || templateId;
    const locId = selectedLocation?.id || locationId;
    
    if (tmplId && locId && !isEditing) {
      fetchPreviousFailures(tmplId, locId);
    }
  }, [template?.id, templateId, selectedLocation?.id, locationId, isEditing]);

  const handleResponseChange = (itemId, status) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setSelectedOptions({ ...selectedOptions, [itemId]: optionId });
    setResponses({ ...responses, [itemId]: 'completed' });
  };

  const handleCommentChange = (itemId, comment) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setComments({ ...comments, [itemId]: comment });
  };

  // Photo upload with retry logic - Optimized for large audits (174+ items)
  const uploadPhotoWithRetry = async (formData, authToken, maxRetries = 5) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const uploadResponse = await fetch(`${API_BASE_URL}/photo`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': authToken } : {}),
          },
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          if (uploadResponse.status === 401) {
            throw { type: 'auth', message: 'Authentication required. Please login again.', noRetry: true };
          } else if (uploadResponse.status === 404) {
            throw { type: 'notfound', message: 'Upload endpoint not found.', noRetry: true };
          } else if (uploadResponse.status === 429) {
            // Rate limited - wait longer and retry with exponential backoff
            if (attempt < maxRetries) {
              const waitTime = Math.min(5000 * attempt, 30000); // Max 30 seconds wait
              console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw { type: 'ratelimit', message: 'Too many uploads. Please wait a moment and try again.' };
          } else {
            throw { type: 'server', message: errorData.error || `Server error: ${uploadResponse.status}` };
          }
        }

        return await uploadResponse.json();
      } catch (error) {
        lastError = error;
        
        // Don't retry on auth or not found errors
        if (error.noRetry) throw error;
        
        // Handle timeout errors
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
          if (attempt < maxRetries) {
            console.log(`Upload timeout. Retrying ${attempt + 1}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
          throw { type: 'timeout', message: 'Upload timed out. Please check your connection and try again.' };
        }
        
        // Network errors - retry with exponential backoff
        if (error.message?.includes('Network request failed') && attempt < maxRetries) {
          console.log(`Network error. Retrying ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        
        if (attempt === maxRetries) throw error;
      }
    }
    
    throw lastError;
  };

  const handlePhotoUpload = async (itemId) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Skip crop option for faster photo capture
        quality: 0.5, // Further reduced quality for faster upload (was 0.6)
        exif: false, // Skip EXIF data for faster processing
      });

      if (!result.canceled && result.assets[0]) {
        setUploading({ ...uploading, [itemId]: true });
        
        let imageUri = result.assets[0].uri;
        
        const formData = new FormData();
        formData.append('photo', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `photo_${itemId}_${Date.now()}.jpg`,
        });

        const authToken = axios.defaults.headers.common['Authorization'];
        
        // Use retry logic for upload
        const responseData = await uploadPhotoWithRetry(formData, authToken);

        const photoUrl = responseData.photo_url;
        const baseUrl = API_BASE_URL.replace('/api', '');
        const fullPhotoUrl = photoUrl.startsWith('http') 
          ? photoUrl 
          : `${baseUrl}${photoUrl}`;
        
        console.log('Photo uploaded successfully:', fullPhotoUrl);
        setPhotos({ ...photos, [itemId]: fullPhotoUrl });
        setUploading({ ...uploading, [itemId]: false });
        // Don't show alert - just update silently for better UX
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      let errorMessage = 'Failed to upload photo';
      
      if (error.type) {
        errorMessage = error.message;
      } else if (error.message) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Offer retry option
      Alert.alert(
        'Upload Failed', 
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handlePhotoUpload(itemId) }
        ]
      );
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!locationId || !selectedLocation) {
        Alert.alert('Error', 'Please select a store');
        return;
      }
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify a completed audit');
      return;
    }
    setSaving(true);
    try {
      let currentAuditId = auditId;

      // Get selected store details - if resuming audit, try to get location from audit data
      if (!selectedLocation && locationId && locations.length > 0) {
        const location = locations.find(l => l.id === parseInt(locationId));
        if (location) {
          setSelectedLocation(location);
        }
      }

      // Final check - if still no location, show error
      if (!selectedLocation || !locationId) {
        Alert.alert('Error', 'Please select a store');
        setSaving(false);
        return;
      }

      // Determine if we're editing an existing audit
      if (auditId) {
        // We have an explicit auditId, update existing audit
        currentAuditId = auditId;
        try {
          const updateData = {
            restaurant_name: selectedLocation.name,
            location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
            location_id: parseInt(locationId),
            notes
          };
          
          // Add GPS location data if captured
          if (capturedLocation) {
            updateData.gps_latitude = capturedLocation.latitude;
            updateData.gps_longitude = capturedLocation.longitude;
            updateData.gps_accuracy = capturedLocation.accuracy;
            updateData.gps_timestamp = capturedLocation.timestamp;
            updateData.location_verified = locationVerified;
          }
          
          await axios.put(`${API_BASE_URL}/audits/${auditId}`, updateData);
        } catch (updateError) {
          // If update fails, log but continue with item updates
          console.warn('Failed to update audit info, continuing with items:', updateError);
        }
      } else if (scheduledAuditId) {
        // Check if audit already exists for this scheduled audit
        try {
          const existingAuditResponse = await axios.get(`${API_BASE_URL}/audits/by-scheduled/${scheduledAuditId}`);
          if (existingAuditResponse.data.audit) {
            // Audit exists, update it
            currentAuditId = existingAuditResponse.data.audit.id;
            const updateData = {
              restaurant_name: selectedLocation.name,
              location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
              location_id: parseInt(locationId),
              notes
            };
            
            // Add GPS location data if captured
            if (capturedLocation) {
              updateData.gps_latitude = capturedLocation.latitude;
              updateData.gps_longitude = capturedLocation.longitude;
              updateData.gps_accuracy = capturedLocation.accuracy;
              updateData.gps_timestamp = capturedLocation.timestamp;
              updateData.location_verified = locationVerified;
            }
            
            await axios.put(`${API_BASE_URL}/audits/${currentAuditId}`, updateData);
          }
        } catch (error) {
          // If audit doesn't exist (404) or other error, we'll create a new one below
          console.log('No existing audit found for scheduled audit, will create new one');
        }
      }
      
      // Create new audit if we don't have an existing one
      if (!currentAuditId) {
        const auditData = {
          template_id: parseInt(templateId),
          restaurant_name: selectedLocation.name,
          location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
          location_id: parseInt(locationId),
          notes
        };
        
        // Link to scheduled audit if provided
        if (scheduledAuditId) {
          auditData.scheduled_audit_id = parseInt(scheduledAuditId);
        }
        
        // Add GPS location data if captured
        if (capturedLocation) {
          auditData.gps_latitude = capturedLocation.latitude;
          auditData.gps_longitude = capturedLocation.longitude;
          auditData.gps_accuracy = capturedLocation.accuracy;
          auditData.gps_timestamp = capturedLocation.timestamp;
          auditData.location_verified = locationVerified;
        }
        
        const auditResponse = await axios.post(`${API_BASE_URL}/audits`, auditData);
        currentAuditId = auditResponse.data.id;
      }

      // Update all audit items - handle errors gracefully
      const updatePromises = items.map(async (item) => {
        try {
          const updateData = {
            status: responses[item.id] || 'pending',
          };
          
          if (selectedOptions[item.id]) {
            updateData.selected_option_id = selectedOptions[item.id];
          }
          
          if (comments[item.id]) {
            updateData.comment = comments[item.id];
          }
          
          if (photos[item.id]) {
            // Extract just the path if it's a full URL
            const photoUrl = photos[item.id];
            updateData.photo_url = photoUrl.startsWith('http') 
              ? photoUrl.replace(/^https?:\/\/[^\/]+/, '') // Remove domain, keep path
              : photoUrl;
          }

          return await axios.put(`${API_BASE_URL}/audits/${currentAuditId}/items/${item.id}`, updateData);
        } catch (itemError) {
          // Log error but don't fail the entire save
          console.warn(`Failed to update item ${item.id}:`, itemError);
          return { error: itemError, itemId: item.id };
        }
      });

      const results = await Promise.all(updatePromises);
      
      // Check if there were any critical errors
      const errors = results.filter(r => r && r.error);
      if (errors.length > 0 && errors.length === results.length) {
        // All items failed - this is a critical error
        throw new Error(`Failed to save ${errors.length} items`);
      }
      // Some items may have failed, but continue if at least some succeeded

      Alert.alert('Success', isEditing ? 'Audit updated successfully' : 'Audit saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving audit:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      Alert.alert('Error', isEditing ? `Failed to update audit: ${errorMessage}` : `Failed to save audit: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="check-circle" size={24} color="#4caf50" />;
      case 'failed':
        return <Icon name="cancel" size={24} color="#f44336" />;
      case 'warning':
        return <Icon name="warning" size={24} color="#ff9800" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const completedItems = Object.values(responses).filter(r => r === 'completed').length;

  return (
    <View style={styles.container}>
      {currentStep === 0 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Store Information</Text>
          <Text style={styles.subtitle}>{template?.name}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Store *</Text>
            {/* Lock store selection if scheduled audit has pre-assigned location */}
            {scheduledAuditId && initialLocationId ? (
              <View style={[styles.input, styles.lockedInput]}>
                <Text style={styles.inputText}>
                  {selectedLocation
                    ? (selectedLocation.store_number
                        ? `Store ${selectedLocation.store_number} - ${selectedLocation.name}`
                        : selectedLocation.name)
                    : 'Loading store...'}
                </Text>
                <Icon name="lock" size={20} color="#999" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowStorePicker(true)}
              >
                <Text style={selectedLocation ? styles.inputText : styles.placeholderText}>
                  {selectedLocation
                    ? (selectedLocation.store_number
                        ? `Store ${selectedLocation.store_number} - ${selectedLocation.name}`
                        : selectedLocation.name)
                    : 'Select a store'}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>
            )}
            {scheduledAuditId && initialLocationId && (
              <Text style={styles.lockedHint}>
                📍 Store is locked for this scheduled audit
              </Text>
            )}
          </View>

          {/* GPS Location Capture */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📍 Your Location</Text>
            <LocationCaptureButton
              onCapture={(location) => {
                setCapturedLocation(location);
                // If store has coordinates, show verification option
                if (selectedLocation?.latitude && selectedLocation?.longitude) {
                  setShowLocationVerification(true);
                }
              }}
              captured={!!capturedLocation}
              location={capturedLocation}
              label="Capture Your Location"
              capturedLabel="Location Captured"
            />
            {capturedLocation && (
              <View style={styles.locationInfoRow}>
                <Icon name="check-circle" size={16} color={themeConfig.success.main} />
                <Text style={styles.locationInfoText}>
                  GPS coordinates recorded for this audit
                </Text>
              </View>
            )}
          </View>

          {/* Location Verification (if store has coordinates) */}
          {showLocationVerification && selectedLocation?.latitude && selectedLocation?.longitude && (
            <View style={styles.inputGroup}>
              <LocationVerification
                expectedLocation={{
                  latitude: parseFloat(selectedLocation.latitude),
                  longitude: parseFloat(selectedLocation.longitude),
                }}
                maxDistance={500}
                locationName={selectedLocation.name}
                onVerificationComplete={(result) => {
                  setLocationVerified(result.verified);
                  if (!result.verified) {
                    Alert.alert(
                      'Location Mismatch',
                      `You are ${result.distance}m from ${selectedLocation.name}. The maximum allowed distance is ${result.maxDistance}m.\n\nDo you want to continue anyway?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Continue', onPress: () => setLocationVerified(true) },
                      ]
                    );
                  }
                }}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter any notes"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next: Checklist</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Store Picker Modal */}
      <Modal
        visible={showStorePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStorePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <TouchableOpacity onPress={() => setShowStorePicker(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores..."
              value={storeSearchText}
              onChangeText={setStoreSearchText}
            />
            
            <FlatList
              data={locations.filter(loc => {
                if (!storeSearchText) return true;
                const search = storeSearchText.toLowerCase();
                return (
                  loc.name.toLowerCase().includes(search) ||
                  (loc.store_number && loc.store_number.toLowerCase().includes(search))
                );
              })}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeOption,
                    selectedLocation?.id === item.id && styles.storeOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedLocation(item);
                    setLocationId(item.id.toString());
                    setShowStorePicker(false);
                    setStoreSearchText('');
                  }}
                >
                  <Text style={styles.storeOptionText}>
                    {item.store_number ? `Store ${item.store_number} - ${item.name}` : item.name}
                  </Text>
                  {selectedLocation?.id === item.id && (
                    <Icon name="check" size={20} color="#1976d2" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {currentStep === 1 && (
        <View style={styles.container}>
          <View style={styles.progressBar}>
            <Text style={styles.progressText}>
              Progress: {completedItems} / {items.length} items
            </Text>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Previous failures summary banner */}
            {previousAuditInfo && previousFailures.length > 0 && (
              <View style={styles.previousFailuresBanner}>
                <Icon name="history" size={18} color={themeConfig.warning.dark} />
                <Text style={styles.previousFailuresBannerText}>
                  {previousFailures.length} item(s) failed in last audit ({new Date(previousAuditInfo.date).toLocaleDateString()})
                </Text>
              </View>
            )}
            
            {items.map((item, index) => {
              const isPreviousFailure = failedItemIds.has(item.id);
              const failureInfo = previousFailures.find(f => f.item_id === item.id);
              
              return (
              <View 
                key={item.id} 
                style={[
                  styles.itemCard,
                  isPreviousFailure && styles.itemCardPreviousFailure
                ]}
              >
                {/* Previous failure warning banner */}
                {isPreviousFailure && (
                  <View style={styles.previousFailureWarning}>
                    <Icon name="warning" size={18} color="#d32f2f" />
                    <Text style={styles.previousFailureWarningText}>
                      ⚠️ Failed in last audit for this location
                    </Text>
                  </View>
                )}
                
                {/* Previous failure comment if available */}
                {isPreviousFailure && failureInfo?.comment && (
                  <View style={styles.previousCommentBox}>
                    <Text style={styles.previousCommentLabel}>Previous comment:</Text>
                    <Text style={styles.previousCommentText}>"{failureInfo.comment}"</Text>
                  </View>
                )}
                
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {index + 1}. {item.title}
                    {item.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  {getStatusIcon(responses[item.id])}
                </View>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
                
                {item.options && item.options.length > 0 ? (
                  <View style={styles.optionsContainer}>
                    {item.options.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionButton,
                          selectedOptions[item.id] === option.id && styles.optionButtonActive,
                          auditStatus === 'completed' && styles.disabledButton
                        ]}
                        onPress={() => handleOptionChange(item.id, option.id)}
                        disabled={auditStatus === 'completed'}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedOptions[item.id] === option.id && styles.optionTextActive
                          ]}
                        >
                          {option.text || option.option_text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.statusButtons}>
                    {['pending', 'completed', 'failed', 'warning'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          responses[item.id] === status && styles.statusButtonActive,
                          auditStatus === 'completed' && styles.disabledButton
                        ]}
                        onPress={() => handleResponseChange(item.id, status)}
                        disabled={auditStatus === 'completed'}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            responses[item.id] === status && styles.statusButtonTextActive
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handlePhotoUpload(item.id)}
                    disabled={uploading[item.id]}
                  >
                    {uploading[item.id] ? (
                      <ActivityIndicator size="small" color={themeConfig.primary.main} />
                    ) : (
                      <Icon name="photo-camera" size={20} color={themeConfig.primary.main} />
                    )}
                    <Text style={styles.photoButtonText}>
                      {photos[item.id] ? 'Change Photo' : 'Take Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {photos[item.id] && (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: photos[item.id] }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        const newPhotos = { ...photos };
                        delete newPhotos[item.id];
                        setPhotos(newPhotos);
                      }}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Comment (optional)</Text>
                  <TextInput
                    style={styles.commentInput}
                    value={comments[item.id] || ''}
                    onChangeText={(text) => handleCommentChange(item.id, text)}
                    placeholder="Add a comment..."
                    placeholderTextColor={themeConfig.text.disabled}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
              );
            })}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setCurrentStep(0)}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, (saving || auditStatus === 'completed') && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={saving || auditStatus === 'completed'}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Audit</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#1976d2',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  progressBar: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  itemCardPreviousFailure: {
    borderColor: themeConfig.error.main,
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  previousFailuresBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.warning.bg,
    padding: 12,
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeConfig.warning.main,
  },
  previousFailuresBannerText: {
    marginLeft: 8,
    color: themeConfig.warning.dark,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  previousFailureWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 10,
    borderRadius: themeConfig.borderRadius.small,
    marginBottom: 12,
  },
  previousFailureWarningText: {
    marginLeft: 8,
    color: themeConfig.error.dark,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  recurringBadge: {
    backgroundColor: themeConfig.error.main,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recurringBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  previousCommentBox: {
    backgroundColor: '#FFF0E5',
    padding: 10,
    borderRadius: themeConfig.borderRadius.small,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: themeConfig.warning.main,
  },
  previousCommentLabel: {
    fontSize: 11,
    color: themeConfig.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  previousCommentText: {
    fontSize: 12,
    color: themeConfig.text.primary,
    fontStyle: 'italic',
  },
  required: {
    color: themeConfig.error.main,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  optionButtonActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  optionText: {
    fontSize: 14,
    color: themeConfig.text.primary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
  },
  actionsContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: themeConfig.primary.light + '20',
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.primary.light,
  },
  photoButtonText: {
    marginLeft: 8,
    color: themeConfig.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    position: 'relative',
    marginTop: 10,
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: themeConfig.borderRadius.medium,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: themeConfig.error.main,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContainer: {
    marginTop: 10,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    color: themeConfig.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  lockedInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  lockedHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    margin: 20,
    marginBottom: 10,
    fontSize: 16,
  },
  storeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storeOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  storeOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  // GPS Location styles
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  locationInfoText: {
    fontSize: 13,
    color: themeConfig.success.main,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default AuditFormScreen;


import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  const [currentStep, setCurrentStep] = useState(0); // 0: info, 1: category selection, 2: checklist
  const [isEditing, setIsEditing] = useState(false);
  const [auditStatus, setAuditStatus] = useState(null); // Track audit status
  const [selectedCategory, setSelectedCategory] = useState(null); // Selected category for filtering items
  const [categories, setCategories] = useState([]); // Available categories
  const [filteredItems, setFilteredItems] = useState([]); // Items filtered by selected category
  
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
  
  // Time tracking state for Item Making Performance
  const [itemStartTimes, setItemStartTimes] = useState({}); // Track when user starts working on each item
  const [itemElapsedTimes, setItemElapsedTimes] = useState({}); // Track elapsed time for display
  const [timeTrackingIntervals, setTimeTrackingIntervals] = useState({}); // Store interval IDs
  
  // Multi-time entries for Item Making Performance (4-5 times per item)
  const [multiTimeEntries, setMultiTimeEntries] = useState({}); // { itemId: [time1, time2, ...] }
  
  // Time input modal state
  const [showTimeInputModal, setShowTimeInputModal] = useState(false);
  const [timeInputItemId, setTimeInputItemId] = useState(null);
  const [timeInputSlotIndex, setTimeInputSlotIndex] = useState(null);
  const [timeInputValue, setTimeInputValue] = useState('');
  
  // Time preset modal state
  const [showTimePresetModal, setShowTimePresetModal] = useState(false);
  const [timePresetItemId, setTimePresetItemId] = useState(null);
  
  // Time presets - like Scoring Option presets
  const TIME_PRESETS = [
    { 
      name: 'Quick (1-5 min)', 
      description: 'Fast items under 5 minutes',
      values: [1, 2, 3, 4, 5] 
    },
    { 
      name: 'Standard (2-10 min)', 
      description: 'Standard preparation time',
      values: [2, 4, 6, 8, 10] 
    },
    { 
      name: 'Extended (5-15 min)', 
      description: 'Items requiring more time',
      values: [5, 8, 10, 12, 15] 
    },
    { 
      name: 'Long (10-30 min)', 
      description: 'Complex items',
      values: [10, 15, 20, 25, 30] 
    },
    { 
      name: 'Custom Entry', 
      description: 'Enter your own times',
      values: [] 
    },
  ];

  // Helper function to sort items: Standard items first, time-based items at the end
  const sortItemsWithTimeBasedLast = (itemsList) => {
    return [...itemsList].sort((a, b) => {
      const aIsTimeBased = a.is_time_based && (a.min_time_minutes || a.max_time_minutes || a.target_time_minutes);
      const bIsTimeBased = b.is_time_based && (b.min_time_minutes || b.max_time_minutes || b.target_time_minutes);
      if (aIsTimeBased && !bIsTimeBased) return 1; // Time-based goes after standard
      if (!aIsTimeBased && bIsTimeBased) return -1; // Standard goes before time-based
      return 0; // Keep original order for same type
    });
  };

  // Memoized filtered locations for store picker - must be called unconditionally (React hooks rule)
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (!storeSearchText) return true;
      const search = storeSearchText.toLowerCase();
      return (
        loc.name.toLowerCase().includes(search) ||
        (loc.store_number && loc.store_number.toLowerCase().includes(search))
      );
    });
  }, [locations, storeSearchText]);

  // Fetch previous audit failures when location and template are available
  // This works for both regular audits and scheduled audits (same location + same checklist)
  useEffect(() => {
    // For scheduled audits, locationId might come from initialLocationId
    const effectiveLocationId = locationId || initialLocationId;
    
    if (templateId && effectiveLocationId && parseInt(effectiveLocationId) > 0 && items.length > 0) {
      // Use the effective location ID for fetching previous failures
      fetchPreviousFailures(effectiveLocationId);
    } else {
      // Reset previous failures when location changes
      setPreviousFailures([]);
      setFailedItemIds(new Set());
      setPreviousAuditInfo(null);
    }
  }, [templateId, locationId, initialLocationId, items.length]);

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
    // Handle initialLocationId from route params (for scheduled audits)
    if (initialLocationId && locations.length > 0 && !selectedLocation) {
      const location = locations.find(l => l.id === parseInt(initialLocationId));
      if (location) {
        setSelectedLocation(location);
        setLocationId(initialLocationId.toString());
        // Previous failures will be fetched automatically by the other useEffect
      }
    }
    // Handle locationId set from audit data (when resuming)
    else if (locationId && locations.length > 0 && !selectedLocation) {
      const location = locations.find(l => l.id === parseInt(locationId));
      if (location) {
        setSelectedLocation(location);
        // Previous failures will be fetched automatically by the other useEffect
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
      
      // Extract unique categories from items
      const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(cat => cat && cat.trim()))];
      setCategories(uniqueCategories);
      
      // If only one category, auto-select it
      if (uniqueCategories.length === 1) {
        setSelectedCategory(uniqueCategories[0]);
        const filtered = allItems.filter(item => item.category === uniqueCategories[0]);
        setFilteredItems(sortItemsWithTimeBasedLast(filtered));
      } else if (uniqueCategories.length === 0) {
        // No categories, show all items
        setFilteredItems(sortItemsWithTimeBasedLast(allItems));
      } else {
        // Multiple categories - show all items initially (user can filter later)
        setFilteredItems(sortItemsWithTimeBasedLast(allItems));
      }

      // Populate responses from audit items
      const responsesData = {};
      const optionsData = {};
      const commentsData = {};
      const photosData = {};
      const timeEntriesData = {};

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
          // Construct full URL if needed - handle both full URLs and paths
          let photoUrl = auditItem.photo_url;
          if (!photoUrl.startsWith('http')) {
            const baseUrl = API_BASE_URL.replace('/api', '');
            if (photoUrl.startsWith('/')) {
              photoUrl = `${baseUrl}${photoUrl}`;
            } else {
              photoUrl = `${baseUrl}/${photoUrl}`;
            }
          }
          photosData[auditItem.item_id] = photoUrl;
        }
        // Load time entries from saved audit
        if (auditItem.time_entries) {
          try {
            const entries = typeof auditItem.time_entries === 'string' 
              ? JSON.parse(auditItem.time_entries) 
              : auditItem.time_entries;
            if (Array.isArray(entries) && entries.length > 0) {
              timeEntriesData[auditItem.item_id] = entries;
            }
          } catch (e) {
            console.log('Error parsing time_entries:', e);
          }
        }
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);
      setMultiTimeEntries(timeEntriesData);

      // Start at checklist step since we already have the info
      // If multiple categories exist, go to category selection, otherwise go to checklist
      if (uniqueCategories.length > 1) {
        setCurrentStep(1);
      } else {
        setCurrentStep(2);
      }
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
        const allItems = response.data.items || [];
        setItems(allItems);
        
        // Extract unique categories from items
        const uniqueCategories = [...new Set(allItems.map(item => item.category).filter(cat => cat && cat.trim()))];
        setCategories(uniqueCategories);
        
        // If only one category, auto-select it
        if (uniqueCategories.length === 1) {
          setSelectedCategory(uniqueCategories[0]);
          const filtered = allItems.filter(item => item.category === uniqueCategories[0]);
          setFilteredItems(sortItemsWithTimeBasedLast(filtered));
        } else if (uniqueCategories.length === 0) {
          // No categories, show all items
          setFilteredItems(sortItemsWithTimeBasedLast(allItems));
        }
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
  // Works for both regular audits and scheduled audits (same location + same checklist)
  const fetchPreviousFailures = async (effectiveLocationId = null) => {
    const locId = effectiveLocationId || locationId || initialLocationId;
    if (!templateId || !locId) return;
    
    try {
      setLoadingPreviousFailures(true);
      const response = await axios.get(
        `${API_BASE_URL}/audits/previous-failures/${templateId}/${locId}`
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

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleResponseChange = useCallback((itemId, status) => {
    // Start timer when user first interacts with item
    if (!itemStartTimes[itemId] && status !== 'pending') {
      startItemTimer(itemId);
    }
    
    // Stop timer and calculate time when item is completed
    if (status === 'completed' && itemStartTimes[itemId]) {
      stopItemTimer(itemId);
    }
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setResponses(prev => ({ ...prev, [itemId]: status }));
  }, [auditStatus]);

  const handleOptionChange = useCallback((itemId, optionId) => {
    // Start timer when user first interacts with item
    if (!itemStartTimes[itemId]) {
      startItemTimer(itemId);
    }
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setSelectedOptions(prev => ({ ...prev, [itemId]: optionId }));
    setResponses(prev => ({ ...prev, [itemId]: 'completed' }));
  }, [auditStatus]);

  const handleCommentChange = useCallback((itemId, comment) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setComments(prev => ({ ...prev, [itemId]: comment }));
  }, [auditStatus]);

  // Photo upload with retry logic - Optimized for large audits (174+ items)
  const uploadPhotoWithRetry = async (formData, authToken, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (reduced from 30s)
        
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

  // Optimized photo upload handler
  const handlePhotoUpload = useCallback(async (itemId) => {
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
        quality: 0.3, // Reduced quality for faster upload and smaller file size
        exif: false, // Skip EXIF data for faster processing
        base64: false, // Don't include base64 for faster processing
      });

      if (!result.canceled && result.assets[0]) {
        // Show immediate feedback - set uploading state first
        setUploading(prev => ({ ...prev, [itemId]: true }));
        
        let imageUri = result.assets[0].uri;
        
        // Optimistic update - show local image immediately while uploading
        setPhotos(prev => ({ ...prev, [itemId]: imageUri }));
        
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
        // Ensure photo URL is properly formatted
        let fullPhotoUrl;
        if (photoUrl.startsWith('http')) {
          fullPhotoUrl = photoUrl;
        } else if (photoUrl.startsWith('/')) {
          // Path starting with / - add base URL
          fullPhotoUrl = `${baseUrl}${photoUrl}`;
        } else {
          // Path without / - add both
          fullPhotoUrl = `${baseUrl}/${photoUrl}`;
        }
        
        console.log('Photo uploaded successfully:', fullPhotoUrl);
        // Update with server URL (replaces local URI)
        setPhotos(prev => ({ ...prev, [itemId]: fullPhotoUrl }));
        setUploading(prev => ({ ...prev, [itemId]: false }));
        
        // Photo upload notification removed as per requirement
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
      setUploading(prev => ({ ...prev, [itemId]: false }));
    }
  }, [auditStatus, photos, uploading]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    const filtered = items.filter(item => item.category === category);
    const sorted = sortItemsWithTimeBasedLast(filtered);
    setFilteredItems(sorted);
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!locationId || !selectedLocation) {
        Alert.alert('Error', 'Please select a store');
        return;
      }
      // If no categories or only one category, skip category selection
      if (categories.length <= 1) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      // Category selection step - proceed to checklist
      if (!selectedCategory) {
        Alert.alert('Error', 'Please select a category');
        return;
      }
      setCurrentStep(2);
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

      // Use batch update for faster saves - prepare all items
      const batchItems = filteredItems.map((item) => {
        const updateData = {
          itemId: item.id,
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
          // Ensure we save the path correctly - backend expects path starting with /
          if (photoUrl.startsWith('http')) {
            // Extract path from full URL
            try {
              const urlObj = new URL(photoUrl);
              updateData.photo_url = urlObj.pathname;
            } catch (e) {
              // If URL parsing fails, try to extract path manually
              const pathMatch = photoUrl.match(/\/uploads\/[^?]+/);
              updateData.photo_url = pathMatch ? pathMatch[0] : photoUrl.replace(/^https?:\/\/[^\/]+/, '');
            }
          } else if (photoUrl.startsWith('/')) {
            // Already a path starting with /, use as is
            updateData.photo_url = photoUrl;
          } else {
            // Path without /, add it
            updateData.photo_url = `/${photoUrl}`;
          }
        }
        
        // Add multi-time entries if available
        if (multiTimeEntries[item.id] && multiTimeEntries[item.id].length > 0) {
          updateData.time_entries = multiTimeEntries[item.id];
          updateData.average_time_minutes = getAverageTime(item.id);
        }
        
        // Add time tracking data if available (single timer)
        if (itemStartTimes[item.id]) {
          const timeData = stopItemTimer(item.id);
          if (timeData) {
            updateData.time_taken_minutes = timeData.time_taken_minutes;
            updateData.started_at = timeData.started_at;
          }
        }

        return updateData;
      });

      // Send batch update request
      try {
        await axios.put(`${API_BASE_URL}/audits/${currentAuditId}/items/batch`, { items: batchItems });
      } catch (batchError) {
        console.warn('Batch update failed, trying individual updates:', batchError);
        // Fallback to individual updates if batch fails
        const updatePromises = batchItems.map(async (updateData) => {
          try {
            return await axios.put(`${API_BASE_URL}/audits/${currentAuditId}/items/${updateData.itemId}`, updateData);
          } catch (itemError) {
            console.warn(`Failed to update item ${updateData.itemId}:`, itemError);
            return { error: itemError, itemId: updateData.itemId };
          }
        });
        
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r && r.error);
        if (errors.length > 0 && errors.length === results.length) {
          throw new Error(`Failed to save ${errors.length} items`);
        }
      }

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

  // Time tracking functions for Item Making Performance
  const startItemTimer = (itemId) => {
    // If timer already started, don't restart
    if (itemStartTimes[itemId]) {
      return;
    }
    
    const startTime = new Date().toISOString();
    setItemStartTimes(prev => ({ ...prev, [itemId]: startTime }));
    
    // Start interval to update elapsed time display
    const interval = setInterval(() => {
      setItemElapsedTimes(prev => {
        const start = itemStartTimes[itemId] || startTime;
        const elapsed = Math.floor((new Date() - new Date(start)) / 1000 / 60); // minutes
        return { ...prev, [itemId]: elapsed };
      });
    }, 10000); // Update every 10 seconds
    
    setTimeTrackingIntervals(prev => ({ ...prev, [itemId]: interval }));
  };

  const stopItemTimer = (itemId) => {
    // Clear interval
    if (timeTrackingIntervals[itemId]) {
      clearInterval(timeTrackingIntervals[itemId]);
      setTimeTrackingIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[itemId];
        return newIntervals;
      });
    }
    
    // Calculate final time
    if (itemStartTimes[itemId]) {
      const startTime = new Date(itemStartTimes[itemId]);
      const endTime = new Date();
      const timeTakenMinutes = Math.round(((endTime - startTime) / 1000 / 60) * 100) / 100; // Round to 2 decimals
      
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
  
  // Get average time from multi-time entries
  const getAverageTime = (itemId) => {
    const entries = (multiTimeEntries[itemId] || []).filter(e => e !== undefined && e > 0);
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / entries.length) * 100) / 100;
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(timeTrackingIntervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

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
                maxDistance={100}
                locationName={selectedLocation.name}
                onVerificationComplete={(result) => {
                  setLocationVerified(result.verified);
                  if (!result.verified) {
                    Alert.alert(
                      'Location Mismatch',
                      `You are ${result.distance}m from ${selectedLocation.name}. The maximum allowed distance is ${result.maxDistance}m.\n\nYou must be within 100 meters to start or continue an audit.`,
                      [
                        { text: 'OK', style: 'cancel' },
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
              data={filteredLocations}
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

      {/* Time Input Modal */}
      <Modal
        visible={showTimeInputModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTimeInputModal(false)}
      >
        <View style={styles.timeInputModalOverlay}>
          <View style={styles.timeInputModalContent}>
            <Text style={styles.timeInputModalTitle}>
              Entry #{timeInputSlotIndex !== null ? timeInputSlotIndex + 1 : ''}
            </Text>
            <Text style={styles.timeInputModalSubtitle}>Enter time in minutes</Text>
            
            <TextInput
              style={styles.timeInputModalField}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={timeInputValue}
              onChangeText={setTimeInputValue}
              autoFocus={true}
            />
            
            <View style={styles.timeInputModalButtons}>
              <TouchableOpacity
                style={[styles.timeInputModalButton, styles.timeInputModalButtonClear]}
                onPress={() => {
                  if (timeInputItemId !== null && timeInputSlotIndex !== null) {
                    setMultiTimeEntries(prev => {
                      const currentEntries = [...(prev[timeInputItemId] || [])];
                      currentEntries[timeInputSlotIndex] = undefined;
                      return { ...prev, [timeInputItemId]: currentEntries };
                    });
                  }
                  setShowTimeInputModal(false);
                  setTimeInputValue('');
                }}
              >
                <Text style={styles.timeInputModalButtonTextClear}>Clear</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.timeInputModalButton, styles.timeInputModalButtonCancel]}
                onPress={() => {
                  setShowTimeInputModal(false);
                  setTimeInputValue('');
                }}
              >
                <Text style={styles.timeInputModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.timeInputModalButton, styles.timeInputModalButtonSave]}
                onPress={() => {
                  const numValue = parseFloat(timeInputValue);
                  if (!isNaN(numValue) && numValue > 0 && timeInputItemId !== null && timeInputSlotIndex !== null) {
                    setMultiTimeEntries(prev => {
                      const currentEntries = [...(prev[timeInputItemId] || [])];
                      currentEntries[timeInputSlotIndex] = numValue;
                      return { ...prev, [timeInputItemId]: currentEntries };
                    });
                  }
                  setShowTimeInputModal(false);
                  setTimeInputValue('');
                }}
              >
                <Text style={styles.timeInputModalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Preset Modal - Like Scoring Options Preset Dropdown */}
      <Modal
        visible={showTimePresetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePresetModal(false)}
      >
        <View style={styles.timePresetModalOverlay}>
          <View style={styles.timePresetModalContent}>
            <View style={styles.timePresetModalHeader}>
              <Text style={styles.timePresetModalTitle}>Apply Preset</Text>
              <TouchableOpacity onPress={() => setShowTimePresetModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.timePresetList}>
              {TIME_PRESETS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.timePresetOption}
                  onPress={() => {
                    if (preset.values.length > 0 && timePresetItemId !== null) {
                      // Apply preset values to the item
                      setMultiTimeEntries(prev => ({
                        ...prev,
                        [timePresetItemId]: [...preset.values]
                      }));
                    }
                    setShowTimePresetModal(false);
                  }}
                >
                  <View style={styles.timePresetOptionContent}>
                    <Text style={styles.timePresetOptionName}>{preset.name}</Text>
                    <Text style={styles.timePresetOptionDescription}>{preset.description}</Text>
                    {preset.values.length > 0 && (
                      <View style={styles.timePresetValuesRow}>
                        {preset.values.map((val, i) => (
                          <View key={i} style={styles.timePresetValueChip}>
                            <Text style={styles.timePresetValueText}>{val}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <Icon name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {currentStep === 1 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.title}>Select Category</Text>
            <Text style={styles.subtitle}>{template?.name}</Text>
            <Text style={{ fontSize: 14, color: themeConfig.text.secondary, marginTop: 8 }}>
              Choose a category to start auditing items
            </Text>
          </View>
          
          {categories.map((category, index) => {
            const categoryItems = items.filter(item => item.category === category);
            return (
              <TouchableOpacity
                key={category || `no-category-${index}`}
                style={[
                  styles.categoryCard,
                  selectedCategory === category && styles.categoryCardSelected
                ]}
                onPress={() => handleCategorySelect(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryCardContent}>
                  <Text style={styles.categoryName}>{category || 'Uncategorized'}</Text>
                  <Text style={styles.categoryCount}>{categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}</Text>
                </View>
                {selectedCategory === category && (
                  <Icon name="check-circle" size={28} color={themeConfig.primary.main} />
                )}
                {!selectedCategory || selectedCategory !== category ? (
                  <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
                ) : null}
              </TouchableOpacity>
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
              style={styles.button}
              onPress={handleNext}
              disabled={!selectedCategory}
            >
              <Text style={styles.buttonText}>Next: Start Audit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {currentStep === 2 && (
        <View style={styles.container}>
          <View style={styles.progressBar}>
            <Text style={styles.progressText}>
              Progress: {completedItems} / {filteredItems.length} items
              {selectedCategory && ` (${selectedCategory})`}
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
            
            {filteredItems.map((item, index) => {
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {index + 1}. {item.title}
                      {item.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {/* Time tracking display */}
                    {(itemStartTimes[item.id] || itemElapsedTimes[item.id]) && (
                      <Text style={styles.timeTrackingText}>
                        ⏱️ {itemElapsedTimes[item.id] || 0} min
                      </Text>
                    )}
                  </View>
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

                {/* Multi-Time Entry Section - Only show for time-based items */}
                {item.is_time_based && (item.min_time_minutes || item.max_time_minutes || item.target_time_minutes) && (
                  <View style={styles.timeEntryContainer}>
                    <View style={styles.timeEntryHeader}>
                      <Text style={styles.timeEntryLabel}>⏱️ Time Entries (minutes)</Text>
                      
                      {/* Apply Preset Dropdown - Like Scoring Options */}
                      <TouchableOpacity
                        style={styles.timePresetButton}
                        onPress={() => {
                          setTimePresetItemId(item.id);
                          setShowTimePresetModal(true);
                        }}
                      >
                        <Text style={styles.timePresetButtonText}>Apply Preset</Text>
                        <Icon name="arrow-drop-down" size={20} color={themeConfig.primary.main} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* 5 Time entry slots - Exactly like Scoring Options structure */}
                    <View style={styles.timeEntriesColumn}>
                      {[...Array(5)].map((_, idx) => {
                        const entries = multiTimeEntries[item.id] || [];
                        const value = entries[idx];
                        const hasValue = value !== undefined && value !== null;
                        
                        return (
                          <View key={idx} style={styles.timeEntryRow}>
                            <Text style={styles.timeEntryRowLabel}>Entry {idx + 1}</Text>
                            <TextInput
                              style={[
                                styles.timeEntryInput,
                                hasValue && styles.timeEntryInputFilled
                              ]}
                              placeholder="Enter minutes"
                              placeholderTextColor="#999"
                              keyboardType="decimal-pad"
                              value={hasValue ? value.toString() : ''}
                              onChangeText={(text) => {
                                const numValue = parseFloat(text);
                                setMultiTimeEntries(prev => {
                                  const currentEntries = [...(prev[item.id] || [])];
                                  if (text === '' || isNaN(numValue)) {
                                    currentEntries[idx] = undefined;
                                  } else {
                                    currentEntries[idx] = numValue;
                                  }
                                  return { ...prev, [item.id]: currentEntries };
                                });
                              }}
                            />
                            <TouchableOpacity
                              style={styles.timeEntryDeleteButton}
                              onPress={() => {
                                setMultiTimeEntries(prev => {
                                  const currentEntries = [...(prev[item.id] || [])];
                                  currentEntries[idx] = undefined;
                                  return { ...prev, [item.id]: currentEntries };
                                });
                              }}
                            >
                              <Icon name="delete" size={20} color={themeConfig.error.main} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                    
                    {/* Average display */}
                    {(() => {
                      const entries = (multiTimeEntries[item.id] || []).filter(e => e !== undefined && e !== null && e > 0);
                      if (entries.length === 0) return null;
                      const avg = entries.reduce((a, b) => a + b, 0) / entries.length;
                      return (
                        <View style={styles.averageDisplay}>
                          <Text style={styles.averageLabel}>Average:</Text>
                          <Text style={styles.averageValue}>{avg.toFixed(1)} min</Text>
                          <Text style={styles.entriesCount}>({entries.length}/5 entries)</Text>
                        </View>
                      );
                    })()}
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
                onPress={() => {
                  if (categories.length > 1) {
                    setCurrentStep(1);
                  } else {
                    setCurrentStep(0);
                  }
                }}
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
  timeTrackingText: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
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
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: themeConfig.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardSelected: {
    borderColor: themeConfig.primary.main,
    backgroundColor: themeConfig.primary.light + '15',
    borderWidth: 3,
  },
  categoryCardContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
    marginBottom: 6,
  },
  categoryCount: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    fontWeight: '500',
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
  // Multi-time entry styles - Like Scoring Options layout
  timeEntryContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  timeEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  timeEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  timePresetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: themeConfig.primary.main,
    borderRadius: 6,
    backgroundColor: '#fff',
    gap: 4,
  },
  timePresetButtonText: {
    fontSize: 13,
    color: themeConfig.primary.main,
    fontWeight: '500',
  },
  timeEntriesColumn: {
    gap: 8,
    marginTop: 8,
  },
  timeEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeEntryRowLabel: {
    width: 70,
    fontSize: 14,
    color: themeConfig.text.secondary,
    fontWeight: '500',
  },
  timeEntryInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: themeConfig.text.primary,
  },
  timeEntryInputFilled: {
    borderColor: themeConfig.primary.main,
    backgroundColor: '#fff',
  },
  timeEntryDeleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  averageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeConfig.border.default,
  },
  averageLabel: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    fontWeight: '500',
  },
  averageValue: {
    fontSize: 16,
    color: themeConfig.primary.main,
    fontWeight: '700',
    marginLeft: 8,
  },
  entriesCount: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginLeft: 8,
  },
  // Time Preset Modal styles
  timePresetModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePresetModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  timePresetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timePresetModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  timePresetList: {
    paddingBottom: 20,
  },
  timePresetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timePresetOptionContent: {
    flex: 1,
  },
  timePresetOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 2,
  },
  timePresetOptionDescription: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 6,
  },
  timePresetValuesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  timePresetValueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: themeConfig.primary.light + '20',
    borderRadius: 12,
  },
  timePresetValueText: {
    fontSize: 12,
    color: themeConfig.primary.main,
    fontWeight: '600',
  },
  // Time Input Modal styles
  timeInputModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeInputModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  timeInputModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  timeInputModalSubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginBottom: 20,
  },
  timeInputModalField: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderColor: themeConfig.primary.main,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    color: themeConfig.text.primary,
    fontWeight: '600',
    marginBottom: 20,
  },
  timeInputModalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  timeInputModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeInputModalButtonClear: {
    backgroundColor: themeConfig.error.light + '30',
  },
  timeInputModalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  timeInputModalButtonSave: {
    backgroundColor: themeConfig.primary.main,
  },
  timeInputModalButtonTextClear: {
    color: themeConfig.error.main,
    fontWeight: '600',
    fontSize: 14,
  },
  timeInputModalButtonTextCancel: {
    color: themeConfig.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  timeInputModalButtonTextSave: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AuditFormScreen;


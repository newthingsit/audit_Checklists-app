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
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig, cvrTheme, isCvrTemplate } from '../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';
import { LocationCaptureButton, LocationDisplay, LocationVerification } from '../components/LocationCapture';
import { SignatureModal, SignatureDisplay } from '../components';

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
  const [multipleSelections, setMultipleSelections] = useState({}); // Track multiple selected options for multiple_answer type
  const [comments, setComments] = useState({});
  const [photos, setPhotos] = useState({});
  const [uploading, setUploading] = useState({});
  const [datePickerItemId, setDatePickerItemId] = useState(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [signatureItemId, setSignatureItemId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0: info, 1: category selection, 2: checklist
  const [attendees, setAttendees] = useState(''); // Name of Attendees
  const [pointsDiscussed, setPointsDiscussed] = useState(''); // Points Discussed
  const [infoPictures, setInfoPictures] = useState([]); // Multiple pictures for info step
  const [isEditing, setIsEditing] = useState(false);
  const [auditStatus, setAuditStatus] = useState(null); // Track audit status
  const [currentAuditId, setCurrentAuditId] = useState(auditId ? parseInt(auditId, 10) : null);
  const [selectedCategory, setSelectedCategory] = useState(null); // Selected category for filtering items
  const [selectedSection, setSelectedSection] = useState(null); // Selected section within a category
  const [categories, setCategories] = useState([]); // Available categories
  const [filteredItems, setFilteredItems] = useState([]); // Items filtered by selected category
  const [categoryCompletionStatus, setCategoryCompletionStatus] = useState({}); // Track which categories have items completed
  const [groupedCategories, setGroupedCategories] = useState([]); // Grouped categories with sub-categories/sections
  const [expandedGroups, setExpandedGroups] = useState({}); // Track which category groups are expanded
  
  // Time tracking state
  const [itemStartTimes, setItemStartTimes] = useState({}); // Track when each item was started
  const [itemElapsedTimes, setItemElapsedTimes] = useState({}); // Track elapsed time for each item in seconds
  
  // GPS Location state
  const { getCurrentLocation, permissionGranted, settings: locationSettings, calculateDistance } = useLocation();
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [showLocationVerification, setShowLocationVerification] = useState(false);

  // Previous failures state for highlighting recurring issues
  const [previousFailures, setPreviousFailures] = useState([]);
  const [failedItemIds, setFailedItemIds] = useState(new Set());
  const [previousAuditInfo, setPreviousAuditInfo] = useState(null);
  const [loadingPreviousFailures, setLoadingPreviousFailures] = useState(false);

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

  // Helper function to check if an item is time-related
  const isTimeRelatedItem = useCallback((item) => {
    if (!item) return false;
    const title = (item.title || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    
    // Check for time-related keywords in title (only specific time tracking items)
    // DO NOT filter out "Speed of Service" checklist - only filter time tracking items
    const timeKeywords = ['(time)', '(sec)', 'time tracking'];
    const hasTimeKeyword = timeKeywords.some(keyword => title.includes(keyword));
    
    // Check for time-related categories (only tracking categories, not SOS checklist)
    // Allow "Speed of Service" category - only filter "Speed of Service - Tracking"
    const timeCategories = ['speed of service - tracking', 'time tracking'];
    const hasTimeCategory = timeCategories.some(keyword => category.includes(keyword));
    
    return hasTimeKeyword || hasTimeCategory;
  }, []);

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
      setCurrentAuditId(audit.id);
      if (audit.status === 'completed') {
        // Show info that audit is in read-only mode but continue loading
        Alert.alert(
          'Audit Completed',
          'This audit has been completed. You can view the details but cannot modify any answers.',
          [{ text: 'View Details' }]
        );
        // Don't return - continue loading to allow viewing in read-only mode
      }

      // Set audit info
      const auditLocationId = audit.location_id?.toString() || '';
      setLocationId(auditLocationId);
      const auditNotes = audit.notes || '';
      setNotes(auditNotes);
      
      // Try to parse info fields from notes (if saved as JSON)
      try {
        const infoData = JSON.parse(auditNotes);
        if (infoData && typeof infoData === 'object' && !Array.isArray(infoData)) {
          if (infoData.attendees) setAttendees(infoData.attendees);
          if (infoData.pointsDiscussed) setPointsDiscussed(infoData.pointsDiscussed);
          if (infoData.pictures && Array.isArray(infoData.pictures)) {
            // Convert picture paths to full URLs for display
            const baseUrl = API_BASE_URL.replace('/api', '');
            const pictureUris = infoData.pictures.map(picPath => {
              const pathStr = String(picPath);
              
              // Handle local file paths (file://) - use as-is
              if (pathStr.startsWith('file://')) {
                return { uri: pathStr };
              }
              
              // Handle HTTP/HTTPS URLs
              if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
                return { uri: pathStr };
              }
              
              // Handle server paths (relative paths)
              if (pathStr.startsWith('/')) {
                return { uri: `${baseUrl}${pathStr}` };
              } else {
                return { uri: `${baseUrl}/${pathStr}` };
              }
            });
            setInfoPictures(pictureUris);
          }
        }
      } catch (e) {
        // Notes is not JSON, keep as is
      }
      
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
      
      // Filter out time-related items
      const filteredItems = allItems.filter(item => !isTimeRelatedItem(item));
      setItems(filteredItems);
      
        // Extract unique categories from filtered items (excluding only time-tracking categories)
        // Allow "Speed of Service" category - only filter "Speed of Service - Tracking"
        const uniqueCategories = [...new Set(filteredItems.map(item => item.category).filter(cat => {
          if (!cat || !cat.trim()) return false;
          const categoryLower = cat.toLowerCase();
          // Filter out only time-tracking categories, NOT "Speed of Service" checklist
          return !categoryLower.includes('speed of service - tracking') && 
                 !categoryLower.includes('time tracking');
        }))];
      setCategories(uniqueCategories);
      
      // Check which categories have been completed in this audit
      const categoryStatus = {};
      uniqueCategories.forEach(cat => {
        const categoryItems = filteredItems.filter(item => item.category === cat);
        const completedInCategory = categoryItems.filter(item => {
          const auditItem = auditItems.find(ai => ai.item_id === item.id);
          if (!auditItem) return false;
          // Check if item has a valid mark (not null, not undefined, not empty string)
          // Also check status field as a fallback
          const hasMark = auditItem.mark !== null && 
                         auditItem.mark !== undefined && 
                         String(auditItem.mark).trim() !== '';
          const hasStatus = auditItem.status && 
                           auditItem.status !== 'pending' && 
                           auditItem.status !== '';
          return hasMark || hasStatus;
        }).length;
        categoryStatus[cat] = {
          completed: completedInCategory,
          total: categoryItems.length,
          isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
        };
      });
      setCategoryCompletionStatus(categoryStatus);
      
      // If this audit has a category set, default to it but allow changing if multiple categories exist
      if (audit.audit_category && uniqueCategories.length > 1) {
        // If audit has a category but there are multiple categories, allow user to select
        // Default to the audit's category but don't lock it
        setSelectedCategory(audit.audit_category);
        const filtered = filteredItems.filter(item => item.category === audit.audit_category);
        setFilteredItems(filtered);
      } else if (audit.audit_category && uniqueCategories.length <= 1) {
        // Only one category, lock to it
        setSelectedCategory(audit.audit_category);
        const filtered = filteredItems.filter(item => item.category === audit.audit_category);
        setFilteredItems(filtered);
      } else {
        // If only one category, auto-select it
        if (uniqueCategories.length === 1) {
          setSelectedCategory(uniqueCategories[0]);
          const filtered = filteredItems.filter(item => item.category === uniqueCategories[0]);
          setFilteredItems(filtered);
        } else if (uniqueCategories.length === 0) {
          // No categories, show all filtered items
          setFilteredItems(filteredItems);
        } else {
          // Multiple categories - show all filtered items initially (user can filter later)
          setFilteredItems(filteredItems);
        }
      }

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
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);

      // Start at appropriate step
      // IMPORTANT: For in_progress audits with multiple categories, always show category selection
      // This allows users to switch between categories and continue completing the audit
      // Only go directly to checklist if:
      // 1. Single category (or no categories)
      // 2. Audit is completed (all categories done)
      if (uniqueCategories.length > 1 && audit.status !== 'completed') {
        // Multiple categories and audit is in_progress - show category selection to allow switching
        setCurrentStep(1);
      } else {
        // Single or no categories, or audit is completed - go directly to checklist
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
        
        // Filter out time-related items
        const filteredItems = allItems.filter(item => !isTimeRelatedItem(item));
        setItems(filteredItems);
        
        // Extract unique categories from filtered items (excluding only time-tracking categories)
        // Allow "Speed of Service" category - only filter "Speed of Service - Tracking"
        const uniqueCategories = [...new Set(filteredItems.map(item => item.category).filter(cat => {
          if (!cat || !cat.trim()) return false;
          const categoryLower = cat.toLowerCase();
          // Filter out only time-tracking categories, NOT "Speed of Service" checklist
          return !categoryLower.includes('speed of service - tracking') && 
                 !categoryLower.includes('time tracking');
        }))];
        setCategories(uniqueCategories);
        
        // If only one category, auto-select it
        if (uniqueCategories.length === 1) {
          setSelectedCategory(uniqueCategories[0]);
          const filtered = filteredItems.filter(item => item.category === uniqueCategories[0]);
          setFilteredItems(filtered);
        } else if (uniqueCategories.length === 0) {
          // No categories, show all filtered items
          setFilteredItems(filteredItems);
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

  // Re-evaluate conditional logic when responses change
  useEffect(() => {
    if (selectedCategory && filteredItems.length > 0) {
      // Re-filter items based on updated conditional logic
      const filtered = items.filter(item => {
        if (item.category !== selectedCategory) return false;
        if (selectedSection && item.section !== selectedSection) return false;
        return true;
      });
      const conditionallyFiltered = filterItemsByCondition(filtered, items, responses, selectedOptions, comments);
      setFilteredItems(conditionallyFiltered);
    }
  }, [responses, selectedOptions, comments, selectedCategory, selectedSection, items, filterItemsByCondition]);

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

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleResponseChange = useCallback((itemId, status) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    startTrackingTime(itemId);
    setResponses(prev => {
      const updated = { ...prev, [itemId]: status };
      // Recalculate category completion after state update
      // Find the category of this item
      const item = items.find(i => i.id === itemId);
      if (item && item.category) {
        setCategoryCompletionStatus(prevStatus => {
          const cat = item.category;
          const categoryItems = items.filter(i => i.category === cat);
          const completedInCategory = categoryItems.filter(i => {
            const response = i.id === itemId ? status : (updated[i.id] || prev[i.id]);
            return response && response !== 'pending' && response !== '';
          }).length;
          
          return {
            ...prevStatus,
            [cat]: {
              completed: completedInCategory,
              total: categoryItems.length,
              isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
            }
          };
        });
      }
      return updated;
    });
  }, [auditStatus, items]);

  const handleOptionChange = useCallback((itemId, optionId) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    startTrackingTime(itemId);
    setSelectedOptions(prev => ({ ...prev, [itemId]: optionId }));
    setResponses(prev => {
      const updated = { ...prev, [itemId]: 'completed' };
      // Recalculate category completion after state update
      // Find the category of this item
      const item = items.find(i => i.id === itemId);
      if (item && item.category) {
        setCategoryCompletionStatus(prevStatus => {
          const cat = item.category;
          const categoryItems = items.filter(i => i.category === cat);
          const completedInCategory = categoryItems.filter(i => {
            const response = i.id === itemId ? 'completed' : (updated[i.id] || prev[i.id]);
            return response && response !== 'pending' && response !== '';
          }).length;
          
          return {
            ...prevStatus,
            [cat]: {
              completed: completedInCategory,
              total: categoryItems.length,
              isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
            }
          };
        });
      }
      return updated;
    });
  }, [auditStatus, items]);

  const handleCommentChange = useCallback((itemId, comment) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    setComments(prev => ({ ...prev, [itemId]: comment }));
  }, [auditStatus]);

  const handleMultipleSelectionChange = useCallback((itemId, optionId, checked) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    startTrackingTime(itemId);
    setMultipleSelections(prev => {
      const currentSelections = prev[itemId] || [];
      let newSelections;
      if (checked) {
        newSelections = [...currentSelections, optionId];
      } else {
        newSelections = currentSelections.filter(id => id !== optionId);
      }
      const updated = { ...prev, [itemId]: newSelections };
      
      // Update response status
      setResponses(prev => ({
        ...prev,
        [itemId]: newSelections.length > 0 ? 'completed' : 'pending'
      }));
      
      return updated;
    });
  }, [auditStatus]);

  const getEffectiveItemFieldType = useCallback((item) => {
    const raw = item?.input_type || item?.inputType || 'auto';
    if (raw && raw !== 'auto') return raw;
    if (item?.options && Array.isArray(item.options) && item.options.length > 0) return 'option_select';
    return 'task';
  }, []);

  const isOptionFieldType = useCallback((fieldType) => {
    return fieldType === 'option_select' || 
           fieldType === 'select_from_data_source' ||
           fieldType === 'single_answer' ||
           fieldType === 'multiple_answer' ||
           fieldType === 'dropdown' ||
           fieldType === 'grid';
  }, []);

  const isAnswerFieldType = useCallback((fieldType) => {
    return (
      fieldType === 'open_ended' ||
      fieldType === 'description' ||
      fieldType === 'number' ||
      fieldType === 'date' ||
      fieldType === 'time' ||
      fieldType === 'scan_code' ||
      fieldType === 'signature' ||
      fieldType === 'short_answer' ||
      fieldType === 'long_answer'
    );
  }, []);

  const isItemComplete = useCallback((item) => {
    const fieldType = getEffectiveItemFieldType(item);
    if (isOptionFieldType(fieldType)) {
      return !!selectedOptions[item.id];
    }
    if (fieldType === 'image_upload') {
      return !!photos[item.id];
    }
    if (isAnswerFieldType(fieldType)) {
      const value = comments[item.id];
      return value !== undefined && value !== null && String(value).trim() !== '';
    }
    const status = responses[item.id];
    return status && status !== 'pending';
  }, [comments, photos, responses, selectedOptions, getEffectiveItemFieldType, isOptionFieldType, isAnswerFieldType]);

  // Helper: find "Time – Attempt 1"..5 and "Average (Auto)" for SOS auto-calculation
  const getSosAverageItems = useCallback((allItems) => {
    if (!allItems?.length) return null;
    const attemptIds = [];
    for (let i = 1; i <= 5; i++) {
      const it = allItems.find(x => new RegExp('^Time\\s*[–\-]\\s*Attempt\\s*' + i + '$', 'i').test((x.title || '').trim()));
      if (it) attemptIds.push(it.id); else return null;
    }
    const avgIt = allItems.find(x => /^Average\s*\(Auto\)$/i.test((x.title || '').trim()));
    if (!avgIt) return null;
    return { attemptIds, averageId: avgIt.id };
  }, []);

  const handleAnswerChange = useCallback((itemId, value) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
    startTrackingTime(itemId);
    setComments(prev => {
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
    setResponses(prev => ({ ...prev, [itemId]: value && String(value).trim() ? 'completed' : (prev[itemId] || 'pending') }));
  }, [auditStatus, getSosAverageItems, items]);

  // Photo upload with retry logic - Optimized for large audits (174+ items)
  const uploadPhotoWithRetry = async (formData, authToken, maxRetries = 3) => {
    let lastError = null;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:635',message:'uploadPhotoWithRetry entry',data:{hasAuthToken:!!authToken,authTokenLength:authToken?.length||0,maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:638',message:'Upload attempt start',data:{attempt,maxRetries,apiBaseUrl:API_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        let didTimeout = false;
        const timeoutMs = 30000; // 30 second timeout (uploads can be slow on mobile networks)
        const timeoutId = setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, timeoutMs);
        
        const uploadUrl = `${API_BASE_URL}/photo`;
        const requestHeaders = {
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': authToken } : {}),
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:644',message:'Before fetch request',data:{uploadUrl,hasHeaders:!!requestHeaders,hasAuth:!!requestHeaders.Authorization,formDataKeys:formData._parts?.map(p=>p[0])||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:653',message:'Fetch response received',data:{ok:uploadResponse.ok,status:uploadResponse.status,statusText:uploadResponse.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          if (uploadResponse.status === 401) {
            throw { type: 'auth', message: 'Authentication required. Please login again.', noRetry: true };
          } else if (uploadResponse.status === 404) {
            throw { type: 'notfound', message: 'Upload endpoint not found.', noRetry: true };
          } else if (uploadResponse.status === 429) {
            // Rate limited - wait longer and retry with exponential backoff
            if (attempt < maxRetries) {
              const retryAfterHeader = uploadResponse.headers?.get?.('retry-after');
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
              const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : null;
              const waitTime = retryAfterMs ?? Math.min(5000 * attempt, 30000); // Max 30 seconds wait
              console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw { type: 'ratelimit', message: 'Too many uploads. Please wait a moment and try again.' };
          } else {
            throw { type: 'server', message: errorData.error || `Server error: ${uploadResponse.status}` };
          }
        }

        const responseData = await uploadResponse.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:679',message:'Upload success',data:{hasPhotoUrl:!!responseData.photo_url,photoUrl:responseData.photo_url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return responseData;
      } catch (error) {
        lastError = error;
        
        // Metro-visible debug line (device cannot reach 127.0.0.1 ingest endpoint)
        console.log('[Upload][Debug]', {
          attempt,
          maxRetries,
          didTimeout,
          errorName: error?.name,
          errorMessage: error?.message,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:681',message:'Upload error caught',data:{errorName:error.name,errorMessage:error.message,errorType:error.type,isAbortError:error.name==='AbortError',isNetworkError:error.message?.includes('Network request failed'),attempt,maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // Don't retry on auth or not found errors
        if (error.noRetry) throw error;
        
        // Handle timeout errors
        if (didTimeout || error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
          if (attempt < maxRetries) {
            console.log(`Upload timeout. Retrying ${attempt + 1}/${maxRetries}...`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:688',message:'Timeout retry',data:{attempt,maxRetries,waitTime:2000*attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
            // #endregion
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
          throw { type: 'timeout', message: 'Upload timed out. Please check your connection and try again.' };
        }
        
        // Network errors - retry with exponential backoff
        if (error.message?.includes('Network request failed') && attempt < maxRetries) {
          console.log(`Network error. Retrying ${attempt + 1}/${maxRetries}...`);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:697',message:'Network error retry',data:{attempt,maxRetries,waitTime:2000*attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        
        if (attempt === maxRetries) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:703',message:'Max retries reached',data:{attempt,maxRetries,errorName:error.name,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          throw error;
        }
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:707',message:'All retries exhausted',data:{lastErrorName:lastError?.name,lastErrorMessage:lastError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    throw lastError;
  };

  // Optimized photo upload handler
  const handlePhotoUpload = useCallback(async (itemId) => {
    startTrackingTime(itemId);
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
          ...(error?.type === 'ratelimit'
            ? [{ text: 'OK', onPress: () => {} }]
            : [{ text: 'Retry', onPress: () => handlePhotoUpload(itemId) }])
        ]
      );
    } finally {
      setUploading(prev => ({ ...prev, [itemId]: false }));
    }
  }, [auditStatus, photos, uploading]);

  // Group categories by parent and sections (similar to web app)
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
      
      if (hasSections) {
        // Group by sections within the category
        Object.keys(itemsBySection).sort((a, b) => {
          // Custom sort: Trnx-* first, then Avg, then others alphabetically
          if (a.startsWith('Trnx-') && b.startsWith('Trnx-')) {
            return a.localeCompare(b);
          }
          if (a.startsWith('Trnx-')) return -1;
          if (b.startsWith('Trnx-')) return 1;
          if (a === 'Avg') return 1;
          if (b === 'Avg') return -1;
          return a.localeCompare(b);
        }).forEach(section => {
          const sectionItems = itemsBySection[section];
          const completedCount = sectionItems.filter(item => {
            const status = responses[item.id];
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
          const status = responses[item.id];
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

  // Update grouped categories when items or categories change
  useEffect(() => {
    if (items.length > 0 && categories.length > 0) {
      const grouped = groupCategories(categories, items);
      setGroupedCategories(grouped);
      
      // Initialize expanded state for new groups
      const initialExpanded = {};
      grouped.forEach(group => {
        initialExpanded[group.name] = false; // All collapsed by default
      });
      setExpandedGroups(initialExpanded);
    }
  }, [items, categories, groupCategories]);

  // Evaluate conditional logic for items
  const evaluateConditionalItem = useCallback((item, allItems, responses, selectedOptions, comments) => {
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
    const fieldType = getEffectiveItemFieldType(referencedItem);
    
    if (isOptionFieldType(fieldType)) {
      // For option select, get the selected option text
      const selectedOptionId = selectedOptions[referencedItem.id];
      if (selectedOptionId) {
        const option = referencedItem.options?.find(opt => opt.id === selectedOptionId);
        referencedValue = option?.option_text || option?.text || '';
      }
    } else if (isAnswerFieldType(fieldType)) {
      // For text/number inputs, use the comment/input value
      referencedValue = comments[referencedItem.id] || '';
    } else {
      // For status-based items, use the status
      const status = responses[referencedItem.id];
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
  }, [getEffectiveItemFieldType, isOptionFieldType, isAnswerFieldType]);

  // Filter items based on conditional logic
  const filterItemsByCondition = useCallback((itemsToFilter, allItems, responses, selectedOptions, comments) => {
    return itemsToFilter.filter(item => {
      return evaluateConditionalItem(item, allItems, responses, selectedOptions, comments);
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
    // Apply conditional logic filtering
    const conditionallyFiltered = filterItemsByCondition(filtered, items, responses, selectedOptions, comments);
    setFilteredItems(conditionallyFiltered);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate required fields
      if (!locationId || !selectedLocation) {
        Alert.alert('Error', 'Please select an outlet');
        return;
      }
      if (infoPictures.length === 0) {
        Alert.alert('Error', 'Please add at least one picture');
        return;
      }
      
      // Upload info pictures if they haven't been uploaded yet
      let uploadedPictureUrls = [];
      if (infoPictures.length > 0) {
        try {
          setSaving(true);
          const authToken = axios.defaults.headers.common['Authorization'];
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:830',message:'Info pictures upload start',data:{pictureCount:infoPictures.length,hasAuthToken:!!authToken,authTokenLength:authToken?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
          // #endregion
          
          for (let i = 0; i < infoPictures.length; i++) {
            const picture = infoPictures[i];
            // Handle both object format { uri: ... } and string format
            const pictureUri = typeof picture === 'string' ? picture : (picture?.uri || '');
            const uriString = String(pictureUri);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:836',message:'Processing picture',data:{index:i+1,total:infoPictures.length,pictureUri:uriString,isFileUri:uriString.startsWith('file://'),isHttpUri:uriString.startsWith('http')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
            // #endregion
            
            // Skip local file paths that haven't been uploaded yet - they need to be uploaded
            if (uriString.startsWith('file://')) {
              // Upload the local picture - use the original URI from picture object, not converted string
              const formData = new FormData();
              const fileName = `info_picture_${Date.now()}_${Math.random()}.jpg`;
              // Use the original URI (not the stringified version) to ensure proper file access
              const fileUri = typeof picture === 'string' ? picture : picture?.uri;
              formData.append('photo', {
                uri: fileUri,
                type: 'image/jpeg',
                name: fileName,
              });
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:842',message:'FormData created for upload',data:{fileName,fileUri,formDataParts:formData._parts?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
              // #endregion
              
              const responseData = await uploadPhotoWithRetry(formData, authToken);
              if (responseData?.photo_url) {
                uploadedPictureUrls.push(responseData.photo_url);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:850',message:'Picture upload success',data:{index:i+1,photoUrl:responseData.photo_url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
                // #endregion
              } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:850',message:'Picture upload missing photo_url',data:{index:i+1,responseData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N2'})}).catch(()=>{});
                // #endregion
              }
            } else if (uriString.startsWith('http://') || uriString.startsWith('https://')) {
              // Already a full URL - extract path from URL
              try {
                const urlObj = new URL(uriString);
                uploadedPictureUrls.push(urlObj.pathname);
              } catch (e) {
                // If URL parsing fails, try to extract path manually
                const pathMatch = uriString.match(/\/uploads\/[^?]+/);
                uploadedPictureUrls.push(pathMatch ? pathMatch[0] : uriString.replace(/^https?:\/\/[^\/]+/, ''));
              }
            } else {
              // Already a server path - use as-is
              uploadedPictureUrls.push(uriString.startsWith('/') ? uriString : `/${uriString}`);
            }
          }
          setSaving(false);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:867',message:'Info pictures upload complete',data:{uploadedCount:uploadedPictureUrls.length,totalCount:infoPictures.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
          // #endregion
        } catch (uploadError) {
          setSaving(false);
          console.error('Error uploading info pictures:', uploadError);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:868',message:'Info pictures upload error',data:{errorName:uploadError?.name,errorMessage:uploadError?.message,errorType:uploadError?.type,uploadedCount:uploadedPictureUrls.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})}).catch(()=>{});
          // #endregion
          
          Alert.alert('Error', 'Failed to upload pictures. Please try again.');
          return;
        }
      }
      
      // Store info fields in notes (will be saved to backend when submitting)
      const infoData = {
        pictures: uploadedPictureUrls,
      };
      setNotes(JSON.stringify(infoData));
      
      // Update infoPictures with uploaded URLs for display
      if (uploadedPictureUrls.length > 0) {
        const baseUrl = API_BASE_URL.replace('/api', '');
        const updatedPictures = uploadedPictureUrls.map(url => {
          if (url.startsWith('http')) {
            return { uri: url };
          } else if (url.startsWith('/')) {
            return { uri: `${baseUrl}${url}` };
          } else {
            return { uri: `${baseUrl}/${url}` };
          }
        });
        setInfoPictures(updatedPictures);
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

      // Geo-fencing validation: Check if captured location is within allowed distance
      if (capturedLocation && selectedLocation?.latitude && selectedLocation?.longitude) {
        const storeLat = parseFloat(selectedLocation.latitude);
        const storeLon = parseFloat(selectedLocation.longitude);
        const distance = calculateDistance(
          capturedLocation.latitude,
          capturedLocation.longitude,
          storeLat,
          storeLon
        );

        const MAX_ALLOWED_DISTANCE = 1000; // 1000 meters = 1 km (block submission)
        const WARNING_DISTANCE = 500; // 500 meters = warning threshold

        if (distance > MAX_ALLOWED_DISTANCE) {
          Alert.alert(
            'Location Too Far',
            `You are ${Math.round(distance)}m from ${selectedLocation.name}.\n\nAudits must be conducted within ${MAX_ALLOWED_DISTANCE}m of the store location. Please move closer to the store or capture your location again.`,
            [{ text: 'OK', style: 'cancel' }]
          );
          setSaving(false);
          return;
        } else if (distance > WARNING_DISTANCE && !locationVerified) {
          // Show warning but allow with confirmation
          const confirmed = await new Promise((resolve) => {
            Alert.alert(
              'Location Warning',
              `You are ${Math.round(distance)}m from ${selectedLocation.name}.\n\nYou are outside the recommended range (${WARNING_DISTANCE}m). Are you sure you want to continue?`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Continue Anyway', onPress: () => resolve(true) },
              ]
            );
          });
          
          if (!confirmed) {
            setSaving(false);
            return;
          }
        }
      }

      // Validate info step data if we're on step 0 or haven't saved it yet
      if (currentStep === 0 || !notes || !notes.includes('attendees')) {
        if (!attendees.trim()) {
          Alert.alert('Error', 'Please enter name of attendees');
          setSaving(false);
          return;
        }
        if (infoPictures.length === 0) {
          Alert.alert('Error', 'Please add at least one picture');
          setSaving(false);
          return;
        }
      }

      // Upload info pictures if they haven't been uploaded yet
      let uploadedPictureUrls = [];
      if (infoPictures.length > 0) {
        try {
          const authToken = axios.defaults.headers.common['Authorization'];
          for (const picture of infoPictures) {
            // Handle both object format { uri: ... } and string format
            const pictureUri = typeof picture === 'string' ? picture : (picture?.uri || '');
            const uriString = String(pictureUri);
            
            // Skip local file paths that haven't been uploaded yet - they need to be uploaded
            if (uriString.startsWith('file://')) {
              // Upload the local picture - use the original URI from picture object, not converted string
              const formData = new FormData();
              const fileUri = typeof picture === 'string' ? picture : picture?.uri;
              formData.append('photo', {
                uri: fileUri,
                type: 'image/jpeg',
                name: `info_picture_${Date.now()}_${Math.random()}.jpg`,
              });
              
              const responseData = await uploadPhotoWithRetry(formData, authToken);
              if (responseData?.photo_url) {
                uploadedPictureUrls.push(responseData.photo_url);
              }
            } else if (uriString.startsWith('http://') || uriString.startsWith('https://')) {
              // Already a full URL - extract path from URL
              try {
                const urlObj = new URL(uriString);
                uploadedPictureUrls.push(urlObj.pathname);
              } catch (e) {
                // If URL parsing fails, try to extract path manually
                const pathMatch = uriString.match(/\/uploads\/[^?]+/);
                uploadedPictureUrls.push(pathMatch ? pathMatch[0] : uriString.replace(/^https?:\/\/[^\/]+/, ''));
              }
            } else {
              // Already a server path - use as-is
              uploadedPictureUrls.push(uriString.startsWith('/') ? uriString : `/${uriString}`);
            }
          }
        } catch (uploadError) {
          console.error('Error uploading info pictures:', uploadError);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1d3e7330-642b-44b4-b4ce-0fa1401e36b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuditFormScreen.js:1063',message:'Info pictures upload error in handleSubmit',data:{errorName:uploadError?.name,errorMessage:uploadError?.message,errorType:uploadError?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P2'})}).catch(()=>{});
          // #endregion
          Alert.alert('Error', 'Failed to upload pictures. Please try again.');
          setSaving(false);
          return;
        }
      }

      // Prepare notes with latest info data
      const infoData = {
        pictures: uploadedPictureUrls,
      };
      const notesToSave = JSON.stringify(infoData);

      // Determine if we're editing an existing audit
      if (auditId) {
        // We have an explicit auditId, update existing audit
        currentAuditId = auditId;
        try {
          const updateData = {
            restaurant_name: selectedLocation.name,
            location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
            location_id: parseInt(locationId),
            notes: notesToSave
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
          // Update local notes state
          setNotes(notesToSave);
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
              notes: notesToSave
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
            // Update local notes state
            setNotes(notesToSave);
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
          notes: notesToSave
        };

        // Don't set audit_category when creating new audit - allow multiple categories in same audit
        // audit_category will be cleared when saving items from different categories
        
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
        setCurrentAuditId(currentAuditId);
        // Update local notes state
        setNotes(notesToSave);
      }

      // Validate required checklist items before saving
      const requiredItems = (filteredItems || []).filter(item => item?.required);
      const missingRequired = requiredItems.filter(item => !isItemComplete(item));
      if (missingRequired.length > 0) {
        // Check for missing photos specifically
        const missingPhotos = missingRequired.filter(item => {
          const fieldType = getEffectiveItemFieldType(item);
          return fieldType === 'image_upload' && !photos[item.id];
        });
        
        let errorMessage = `Please complete all required items (${missingRequired.length} remaining).`;
        if (missingPhotos.length > 0) {
          const photoItems = missingPhotos.slice(0, 3).map(item => `• ${item.title}`).join('\n');
          const moreText = missingPhotos.length > 3 ? `\n...and ${missingPhotos.length - 3} more` : '';
          errorMessage = `Missing required photos for:\n${photoItems}${moreText}\n\nPlease add photos before submitting.`;
        }
        
        Alert.alert(
          'Incomplete Checklist',
          errorMessage
        );
        setSaving(false);
        return;
      }

      // Use batch update for faster saves - prepare all items
      const batchItems = filteredItems.map((item) => {
        const fieldType = getEffectiveItemFieldType(item);
        const isOptionType = isOptionFieldType(fieldType);
        const isAnswerType = isAnswerFieldType(fieldType);
        const hasAnswer = !!(comments[item.id] && String(comments[item.id]).trim());
        const hasPhoto = !!photos[item.id];
        const statusFromState = responses[item.id] || 'pending';

        let effectiveStatus = statusFromState;
        if (isAnswerType) {
          effectiveStatus = hasAnswer ? 'completed' : 'pending';
        }
        if (fieldType === 'image_upload') {
          effectiveStatus = hasPhoto ? 'completed' : statusFromState;
        }

        const updateData = {
          itemId: item.id,
          status: effectiveStatus,
        };
        
        if (isOptionType && selectedOptions[item.id]) {
          updateData.selected_option_id = selectedOptions[item.id];
        }
        
        if (comments[item.id]) {
          updateData.comment = comments[item.id];
        }

        // Ensure non-option field types can still complete audits by writing a non-scoring mark.
        // Backend treats 'NA' as a valid completion mark and excludes it from score.
        if (isAnswerType && hasAnswer) {
          updateData.mark = 'NA';
        }
        if (fieldType === 'image_upload' && hasPhoto) {
          updateData.mark = 'NA';
        }
        if (fieldType === 'task') {
          // Map task status to a numeric mark so completion + scoring works even without options.
          const st = updateData.status;
          if (st === 'completed') updateData.mark = '100';
          if (st === 'failed') updateData.mark = '0';
          if (st === 'warning') updateData.mark = '50';
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

        // Add time tracking data if available
        if (itemStartTimes[item.id]) {
          const startTime = itemStartTimes[item.id];
          const elapsedSeconds = itemElapsedTimes[item.id] || Math.floor((Date.now() - startTime) / 1000);
          const timeTakenMinutes = elapsedSeconds > 0 ? (elapsedSeconds / 60).toFixed(2) : null;
          
          if (timeTakenMinutes) {
            updateData.time_taken_minutes = parseFloat(timeTakenMinutes);
            // Convert start time to ISO string for backend
            updateData.started_at = new Date(startTime).toISOString();
          }
        }

        return updateData;
      });

      // Send batch update request
      // Clear audit_category to allow multiple categories in the same audit
      // This allows users to complete different categories in the same audit session
      try {
        const batchUrl = `${API_BASE_URL}/audits/${currentAuditId}/items/batch`;
        const payload = { items: batchItems, audit_category: null };

        // Retry batch update on transient failures (especially 429/rate limit)
        let batchAttempt = 0;
        const maxBatchRetries = 3;
        while (true) {
          try {
            batchAttempt += 1;
            await axios.put(batchUrl, payload);
            break;
          } catch (e) {
            const status = e?.response?.status;
            const retryAfterHeader = e?.response?.headers?.['retry-after'];
            const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
            const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : null;
            const waitMs = retryAfterMs ?? Math.min(1000 * (2 ** (batchAttempt - 1)), 10000);

            if (batchAttempt < maxBatchRetries && (status === 429 || !status)) {
              console.warn(`Batch save failed (attempt ${batchAttempt}/${maxBatchRetries}). Waiting ${waitMs}ms then retry...`);
              await new Promise(resolve => setTimeout(resolve, waitMs));
              continue;
            }
            throw e;
          }
        }
      } catch (batchError) {
        console.warn('Batch update failed, trying individual updates:', batchError);
        
        // Check if it's a critical error that shouldn't be retried
        const batchStatus = batchError?.response?.status;
        const batchMessage = batchError?.response?.data?.error || batchError?.response?.data?.message || batchError?.message || 'Unknown error';
        
        // If it's a 400/404/403 error, don't retry - show error immediately
        if (batchStatus === 400 || batchStatus === 404 || batchStatus === 403) {
          throw new Error(`Failed to save audit items: ${batchMessage}`);
        }
        
        // Fallback to individual updates if batch fails
        // IMPORTANT: Do NOT fire all item updates in parallel (can trigger 429 and make all fail).
        const perItemUrl = (itemId) => `${API_BASE_URL}/audits/${currentAuditId}/items/${itemId}`;
        const errors = [];

        for (const updateData of batchItems) {
          const itemId = updateData.itemId;
          const maxItemRetries = 3;
          let attempt = 0;

          while (true) {
            try {
              attempt += 1;
              await axios.put(perItemUrl(itemId), updateData);
              break;
            } catch (itemError) {
              const status = itemError?.response?.status;
              const retryAfterHeader = itemError?.response?.headers?.['retry-after'];
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
              const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : null;
              const waitMs = retryAfterMs ?? Math.min(750 * attempt, 4000);

              console.warn(`Failed to update item ${itemId} (attempt ${attempt}/${maxItemRetries}):`, itemError?.message || itemError);

              // Don't retry on 400/404/403 errors
              if (status === 400 || status === 404 || status === 403) {
                errors.push({ itemId, error: itemError });
                break;
              }

              // Retry on 429 + network-ish errors
              if (attempt < maxItemRetries && (status === 429 || !status)) {
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
              }

              errors.push({ itemId, error: itemError });
              break;
            }
          }

          // Small spacing between requests to reduce burstiness
          await new Promise(resolve => setTimeout(resolve, 60));
        }

        if (errors.length > 0) {
          const failedCount = errors.length;
          const first = errors[0]?.error;
          const firstStatus = first?.response?.status;
          const firstMsg = first?.response?.data?.error || first?.response?.data?.message || first?.message || 'Unknown error';
          
          // If all items failed, throw error
          if (failedCount === batchItems.length) {
            throw new Error(`Failed to save all ${failedCount} items (first error${firstStatus ? ` ${firstStatus}` : ''}: ${firstMsg})`);
          } else {
            // Some items failed - log warning but continue
            console.warn(`Failed to save ${failedCount} out of ${batchItems.length} items. Continuing...`);
          }
        }
      }

      // Refresh audit data to get updated completion status
      // Use backend's completion status as source of truth (it checks ALL items across ALL categories)
      try {
        const auditResponse = await axios.get(`${API_BASE_URL}/audits/${currentAuditId}`);
        const updatedAudit = auditResponse.data.audit;
        const updatedAuditItems = auditResponse.data.items || [];
        
        // Update audit status from backend (this is the source of truth)
        const isAuditCompleted = updatedAudit.status === 'completed';
        if (updatedAudit.status) {
          setAuditStatus(updatedAudit.status);
        }
        
        // Recalculate category completion status based on ALL saved items (not just filtered)
        // Get ALL items from template to check completion properly
        const allTemplateItems = items; // items already contains all template items
        const updatedCategoryStatus = {};
        
        categories.forEach(cat => {
          // Get ALL items in this category from the template
          const categoryItems = allTemplateItems.filter(item => item.category === cat);
          const completedInCategory = categoryItems.filter(item => {
            const auditItem = updatedAuditItems.find(ai => ai.item_id === item.id);
            if (!auditItem) return false;
            // Check if item has a valid mark (not null, not empty, not undefined)
            // Also check status field as a fallback
            const markValue = auditItem.mark;
            const hasMark = markValue !== null && 
                           markValue !== undefined && 
                           String(markValue).trim() !== '';
            const hasStatus = auditItem.status && 
                             auditItem.status !== 'pending' && 
                             auditItem.status !== '';
            return hasMark || hasStatus;
          }).length;
          
          updatedCategoryStatus[cat] = {
            completed: completedInCategory,
            total: categoryItems.length,
            isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
          };
        });
        setCategoryCompletionStatus(updatedCategoryStatus);
        
        // IMPORTANT: Use backend's completion status as source of truth
        // If backend says completed, ALL categories are done (regardless of frontend calculation)
        if (isAuditCompleted) {
          // Audit is fully completed - trigger PDF download
          const pdfUrl = `${API_BASE_URL.replace('/api', '')}/api/reports/audit/${currentAuditId}/pdf`;
          
          // Audit is fully completed - all categories are done
          Alert.alert(
            'Success', 
            'All categories completed! Audit is now complete. PDF report will be available in audit details.',
            [
              { 
                text: 'View Audit', 
                onPress: () => navigation.navigate('AuditDetail', { id: currentAuditId })
              },
              {
                text: 'Done',
                style: 'cancel',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          // Audit is still in progress - show remaining categories
          const remainingCategories = categories.filter(cat => {
            const status = updatedCategoryStatus[cat] || { completed: 0, total: 0, isComplete: false };
            return !status.isComplete;
          });
          
          const message = remainingCategories.length > 0
            ? `Category saved successfully! ${remainingCategories.length} categor${remainingCategories.length === 1 ? 'y' : 'ies'} remaining.`
            : 'Category saved successfully!';
          
          Alert.alert(
            'Success', 
            message,
            [
              { 
                text: remainingCategories.length > 0 ? 'Continue' : 'Done', 
                style: remainingCategories.length > 0 ? 'cancel' : 'default',
                onPress: remainingCategories.length > 0 ? undefined : () => navigation.goBack()
              },
              ...(remainingCategories.length > 0 ? [{
                text: 'Done',
                onPress: () => navigation.goBack()
              }] : [])
            ]
          );
        }
      } catch (refreshError) {
        // If refresh fails, show basic success message
        console.warn('Failed to refresh audit data:', refreshError);
        Alert.alert(
          'Success', 
          'Audit saved successfully. You can continue with other categories.',
          [
            { 
              text: 'Continue', 
              style: 'cancel'
            },
            { 
              text: 'Done', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving audit:', error);
      let errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      // Provide more helpful error messages
      if (error.message?.includes('Failed to save')) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = `Invalid data: ${errorMessage}`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Audit or item not found. Please refresh and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert(
        'Error', 
        isEditing ? `Failed to update audit: ${errorMessage}` : `Failed to save audit: ${errorMessage}`,
        [
          { text: 'OK' },
          ...(error.response?.status === 401 ? [{
            text: 'Login',
            onPress: () => {
              // Navigate to login if session expired
              navigation.navigate('Login');
            }
          }] : [])
        ]
      );
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

  // Calculate completed items correctly - count items with valid marks/responses
  // Check both responses state and actual item marks
  const completedItems = filteredItems.filter(item => {
    const hasResponse = responses[item.id] && responses[item.id] !== 'pending' && responses[item.id] !== '';
    // Also check if item has a mark from loaded audit data
    const hasMark = item.mark !== null && item.mark !== undefined && String(item.mark).trim() !== '';

    return hasResponse || hasMark;
  }).length;

  const isCvr = isCvrTemplate(template?.name);
  const tabAccent = isCvr ? cvrTheme.accent.purple : themeConfig.primary.main;
  const tabTextPrimary = isCvr ? cvrTheme.text.primary : themeConfig.text.primary;
  const tabTextSecondary = isCvr ? cvrTheme.text.secondary : themeConfig.text.secondary;
  const tabSuccess = isCvr ? cvrTheme.accent.green : themeConfig.success.main;

  return (
    <View style={[styles.container, isCvr && { backgroundColor: cvrTheme.background.primary }]}>
      {/* Read-only banner for completed audits */}
      {auditStatus === 'completed' && (
        <View style={styles.completedBanner}>
          <Icon name="lock" size={18} color="#fff" />
          <Text style={styles.completedBannerText}>
            This audit is completed and cannot be modified
          </Text>
        </View>
      )}
      
      {currentStep === 0 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Outlet (Required) - CVR: dark input, Search placeholder */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isCvr && { color: cvrTheme.text.primary }]}>OUTLET (Required)</Text>
            {selectedLocation ? (
              <View style={[styles.selectedOutletTag, isCvr && { backgroundColor: cvrTheme.background.card }]}>
                <Text style={[styles.selectedOutletText, isCvr && { color: cvrTheme.text.primary }]}>
                  {selectedLocation.store_number
                    ? `${selectedLocation.name} (${selectedLocation.store_number})`
                    : selectedLocation.name}
                </Text>
                {!(scheduledAuditId && initialLocationId) && auditStatus !== 'completed' && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLocation(null);
                      setLocationId('');
                    }}
                    style={styles.removeTagButton}
                    disabled={auditStatus === 'completed'}
                  >
                    <Icon name="close" size={18} color={themeConfig.text.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.searchInputContainer, auditStatus === 'completed' && styles.disabledInput, isCvr && { backgroundColor: cvrTheme.input.bg, borderColor: cvrTheme.input.border }]}
                onPress={() => auditStatus !== 'completed' && setShowStorePicker(true)}
                disabled={auditStatus === 'completed'}
              >
                <Icon name="search" size={20} color={isCvr ? cvrTheme.text.placeholder : themeConfig.text.disabled} style={styles.searchIcon} />
                <Text style={[styles.searchPlaceholder, isCvr && { color: cvrTheme.text.placeholder }]}>Search</Text>
              </TouchableOpacity>
            )}
            {scheduledAuditId && initialLocationId && selectedLocation && (
              <Text style={styles.lockedHint}>
                📍 Store is locked for this scheduled audit
              </Text>
            )}
          </View>

          {/* Picture (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Picture (Optional)</Text>
            <View style={styles.pictureContainer}>
              {infoPictures.map((picture, index) => (
                <View key={index} style={styles.pictureThumbnail}>
                  <Image source={{ uri: picture.uri }} style={styles.thumbnailImage} />
                  {auditStatus !== 'completed' && (
                    <TouchableOpacity
                      style={styles.removePictureButton}
                      onPress={() => {
                        const newPictures = infoPictures.filter((_, i) => i !== index);
                        setInfoPictures(newPictures);
                      }}
                      disabled={auditStatus === 'completed'}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {infoPictures.length < 10 && auditStatus !== 'completed' && (
                <TouchableOpacity
                  style={styles.addPictureButton}
                  onPress={async () => {
                    if (auditStatus === 'completed') return;
                    try {
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert('Permission needed', 'Please grant camera roll permissions');
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: false,
                        quality: 0.3,
                        exif: false,
                        base64: false,
                      });
                      if (!result.canceled && result.assets[0]) {
                        setInfoPictures([...infoPictures, { uri: result.assets[0].uri }]);
                      }
                    } catch (error) {
                      console.error('Error picking image:', error);
                      Alert.alert('Error', 'Failed to pick image');
                    }
                  }}
                  disabled={auditStatus === 'completed'}
                >
                  <Icon name="add" size={32} color={themeConfig.primary.main} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* GPS Location Capture (Hidden but still functional) */}
          <View style={styles.inputGroup}>
            <LocationCaptureButton
              onCapture={(location) => {
                setCapturedLocation(location);
                // Auto-verify if store has coordinates
                if (selectedLocation?.latitude && selectedLocation?.longitude) {
                  setShowLocationVerification(true);
                  // Auto-verify location
                  const storeLat = parseFloat(selectedLocation.latitude);
                  const storeLon = parseFloat(selectedLocation.longitude);
                  const distance = calculateDistance(
                    location.latitude,
                    location.longitude,
                    storeLat,
                    storeLon
                  );
                  const verified = distance <= 500; // Verified if within 500m
                  setLocationVerified(verified);
                }
              }}
              captured={!!capturedLocation}
              location={capturedLocation}
              label="Capture Your Location"
              capturedLabel="Location Captured"
            />
          </View>

          {/* Location Verification (if store has coordinates) */}
          {showLocationVerification && selectedLocation?.latitude && selectedLocation?.longitude && (
            <View style={styles.inputGroup}>
              <LocationVerification
                expectedLocation={{
                  latitude: parseFloat(selectedLocation.latitude),
                  longitude: parseFloat(selectedLocation.longitude),
                }}
                maxDistance={500} // Warning threshold: 500m
                locationName={selectedLocation.name}
                onVerificationComplete={(result) => {
                  setLocationVerified(result.verified);
                  if (!result.verified) {
                    const distance = result.distance || 0;
                    if (distance > 1000) {
                      // Block if > 1000m
                      Alert.alert(
                        'Location Too Far',
                        `You are ${distance}m from ${selectedLocation.name}.\n\nAudits must be conducted within 1000 meters of the store location. Please move closer to the store to continue.`,
                        [{ text: 'OK', style: 'cancel' }]
                      );
                    } else if (distance > 500) {
                      // Warning if > 500m but < 1000m
                      Alert.alert(
                        'Location Warning',
                        `You are ${distance}m from ${selectedLocation.name}.\n\nYou are outside the recommended range (500m). Audits must be within 1000m to submit.`,
                        [{ text: 'OK', style: 'cancel' }]
                      );
                    }
                  }
                }}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {auditStatus !== 'completed' && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, isCvr && { borderColor: cvrTheme.accent.purple }]}
                onPress={async () => {
                  if (!selectedLocation) {
                    Alert.alert('Error', 'Please select an outlet');
                    return;
                  }
                  Alert.alert('Draft Saved', 'Your draft has been saved');
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary, isCvr && { color: cvrTheme.accent.purple }]}>Save Draft</Text>
              </TouchableOpacity>
            )}
            {auditStatus === 'completed' ? (
              <TouchableOpacity
                style={[styles.button, isCvr && { padding: 0, overflow: 'hidden' }]}
                onPress={() => {
                  if (categories.length <= 1) setCurrentStep(2);
                  else setCurrentStep(1);
                }}
              >
                {isCvr ? (
                  <LinearGradient colors={cvrTheme.button.next} style={{ paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 10 }}>
                    <Text style={styles.buttonText}>View Checklist</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.buttonText}>View Checklist</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, (!selectedLocation || infoPictures.length === 0) && styles.buttonDisabled, isCvr && { padding: 0, overflow: 'hidden' }]}
                onPress={handleNext}
                disabled={!selectedLocation || infoPictures.length === 0}
              >
                {isCvr ? (
                  <LinearGradient colors={cvrTheme.button.next} style={{ paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 10 }}>
                    <Text style={styles.buttonText}>Next</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
              <Text style={styles.modalTitle}>Select Outlet</Text>
              <TouchableOpacity onPress={() => setShowStorePicker(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={20} color={themeConfig.text.disabled} style={styles.searchIconInModal} />
            <TextInput
              style={styles.searchInput}
                placeholder="Search"
              value={storeSearchText}
              onChangeText={setStoreSearchText}
                placeholderTextColor={themeConfig.text.disabled}
            />
            </View>
            
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
                    {item.store_number ? `${item.name} (${item.store_number})` : item.name}
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.title, isCvr && { color: cvrTheme.text.primary }]}>Select Category</Text>
            <Text style={[styles.subtitle, isCvr && { color: cvrTheme.text.secondary }]}>{template?.name}</Text>
            <Text style={{ fontSize: 14, color: isCvr ? cvrTheme.text.secondary : themeConfig.text.secondary, marginTop: 8 }}>
              Choose a category to start auditing items
            </Text>
          </View>
          
          {groupedCategories.length > 0 ? (
            groupedCategories.map((group, groupIndex) => {
              const hasSubCategories = group.subCategories.length > 1 || (group.subCategories.length === 1 && group.subCategories[0].displayName !== group.name);
              const groupStatus = {
                completed: group.completedItems,
                total: group.totalItems,
                isComplete: group.completedItems === group.totalItems && group.totalItems > 0
              };
              const isExpanded = expandedGroups[group.name] || false;

              // If only one sub-category and it's the same as the group, render as simple card
              if (!hasSubCategories) {
                const subCat = group.subCategories[0];
                const status = categoryCompletionStatus[subCat.fullName] || { completed: subCat.completedCount, total: subCat.itemCount, isComplete: subCat.isComplete };
                return (
              <TouchableOpacity
                    key={group.name}
                    style={[
                      styles.categoryCard,
                      isCvr && { backgroundColor: cvrTheme.background.card, borderColor: cvrTheme.input.border },
                      selectedCategory === subCat.fullName && styles.categoryCardSelected,
                      selectedCategory === subCat.fullName && isCvr && { borderColor: cvrTheme.accent.purple },
                      status.isComplete && styles.categoryCardCompleted
                    ]}
                    onPress={() => handleCategorySelect(subCat.fullName, subCat.section || null)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryCardContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[styles.categoryName, isCvr && { color: cvrTheme.text.primary }]}>{group.name}</Text>
                            {status.isComplete && (
                              <Icon name="check-circle" size={20} color={isCvr ? cvrTheme.accent.green : "#4caf50"} style={{ marginLeft: 8 }} />
                            )}
                          </View>
                          <Text style={[styles.categoryCount, isCvr && { color: cvrTheme.text.secondary }]}>
                            {status.completed} / {status.total} items completed
                          </Text>
                          <View style={[styles.categoryCardProgressBar, isCvr && { backgroundColor: cvrTheme.input.border }]}>
                            <View 
                              style={[
                                styles.categoryCardProgressFill, 
                                { 
                                  width: `${status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}%`,
                                  backgroundColor: status.isComplete ? (isCvr ? cvrTheme.accent.green : themeConfig.success.main) : (isCvr ? cvrTheme.accent.purple : themeConfig.primary.main)
                                }
                              ]} 
                            />
            </View>
                          <Text style={[styles.categoryProgressPercent, isCvr && { color: cvrTheme.text.secondary }]}>
                            {status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}% complete
                          </Text>
          </View>
        </View>
            </View>
                    {selectedCategory === subCat.fullName && !status.isComplete && (
                      <Icon name="check-circle" size={28} color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} />
                    )}
                    {!selectedCategory || selectedCategory !== subCat.fullName ? (
                      <Icon name="chevron-right" size={24} color={isCvr ? cvrTheme.text.secondary : themeConfig.text.disabled} />
                    ) : null}
                  </TouchableOpacity>
                );
              }

              // Render as collapsible group for categories with multiple sub-categories
              return (
                <View key={group.name} style={[styles.categoryGroupContainer, isCvr && { borderColor: cvrTheme.input.border }]}>
                <TouchableOpacity
                    style={[
                      styles.categoryGroupHeader,
                      isCvr && { backgroundColor: cvrTheme.background.card },
                      groupStatus.isComplete && styles.categoryCardCompleted
                    ]}
                    onPress={() => setExpandedGroups(prev => ({ ...prev, [group.name]: !isExpanded }))}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Icon 
                        name={isExpanded ? "keyboard-arrow-down" : "keyboard-arrow-right"} 
                        size={24} 
                        color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} 
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.categoryName, isCvr && { color: cvrTheme.text.primary }]}>{group.name}</Text>
                          {groupStatus.isComplete && (
                            <Icon name="check-circle" size={20} color={isCvr ? cvrTheme.accent.green : "#4caf50"} style={{ marginLeft: 8 }} />
                    )}
                  </View>
                        <Text style={[styles.categoryCount, isCvr && { color: cvrTheme.text.secondary }]}>
                          {groupStatus.completed} / {groupStatus.total} items completed
                        </Text>
          </View>
        </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={[styles.categoryGroupContent, isCvr && { backgroundColor: cvrTheme.background.primary }]}>
                      {group.subCategories.map((subCat, subIndex) => {
                        const status = categoryCompletionStatus[subCat.fullName] || { completed: subCat.completedCount, total: subCat.itemCount, isComplete: subCat.isComplete };
                        const isSelected = selectedCategory === subCat.fullName && (subCat.section ? selectedSection === subCat.section : !selectedSection);
                        return (
                          <TouchableOpacity
                            key={subCat.fullName + (subCat.section || '')}
                            style={[
                              styles.categorySubCard,
                              isCvr && { backgroundColor: cvrTheme.background.card, borderColor: cvrTheme.input.border },
                              isSelected && styles.categoryCardSelected,
                              isSelected && isCvr && { borderColor: cvrTheme.accent.purple },
                              status.isComplete && styles.categoryCardCompleted
                            ]}
                            onPress={() => handleCategorySelect(subCat.fullName, subCat.section || null)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.categoryCardContent}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={[styles.categoryName, { fontSize: 15 }, isCvr && { color: cvrTheme.text.primary }]}>{subCat.displayName}</Text>
                                    {status.isComplete && (
                                      <Icon name="check-circle" size={18} color={isCvr ? cvrTheme.accent.green : "#4caf50"} style={{ marginLeft: 8 }} />
                                    )}
            </View>
                                  <Text style={[styles.categoryCount, { fontSize: 13 }, isCvr && { color: cvrTheme.text.secondary }]}>
                                    {status.completed} / {status.total} items
                                  </Text>
                                  <View style={[styles.categoryCardProgressBar, { height: 4 }, isCvr && { backgroundColor: cvrTheme.input.border }]}>
                                    <View 
                                      style={[
                                        styles.categoryCardProgressFill, 
                                        { 
                                          width: `${status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}%`,
                                          backgroundColor: status.isComplete ? (isCvr ? cvrTheme.accent.green : themeConfig.success.main) : (isCvr ? cvrTheme.accent.purple : themeConfig.primary.main)
                                        }
                                      ]} 
            />
          </View>
        </View>
          </View>
                            </View>
                            {isSelected && !status.isComplete && (
                              <Icon name="check-circle" size={24} color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            // Fallback to flat list if no grouped categories
            categories.map((category, index) => {
            const categoryItems = items.filter(item => item.category === category);
            const status = categoryCompletionStatus[category] || { completed: 0, total: categoryItems.length, isComplete: false };
            return (
              <TouchableOpacity
                key={category || `no-category-${index}`}
                style={[
                  styles.categoryCard,
                  isCvr && { backgroundColor: cvrTheme.background.card, borderColor: cvrTheme.input.border },
                  selectedCategory === category && styles.categoryCardSelected,
                  selectedCategory === category && isCvr && { borderColor: cvrTheme.accent.purple },
                  status.isComplete && styles.categoryCardCompleted
                ]}
                onPress={() => handleCategorySelect(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryCardContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[styles.categoryName, isCvr && { color: cvrTheme.text.primary }]}>{category || 'Uncategorized'}</Text>
                          {status.isComplete && (
                            <Icon name="check-circle" size={20} color={isCvr ? cvrTheme.accent.green : "#4caf50"} style={{ marginLeft: 8 }} />
                          )}
                        </View>
                      <Text style={[styles.categoryCount, isCvr && { color: cvrTheme.text.secondary }]}>
                          {status.completed} / {status.total} items completed
                      </Text>
                        <View style={[styles.categoryCardProgressBar, isCvr && { backgroundColor: cvrTheme.input.border }]}>
                          <View 
                            style={[
                              styles.categoryCardProgressFill, 
                              { 
                                width: `${status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}%`,
                                backgroundColor: status.isComplete ? (isCvr ? cvrTheme.accent.green : themeConfig.success.main) : (isCvr ? cvrTheme.accent.purple : themeConfig.primary.main)
                              }
                            ]} 
                          />
                    </View>
                        <Text style={[styles.categoryProgressPercent, isCvr && { color: cvrTheme.text.secondary }]}>
                          {status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0}% complete
                        </Text>
                      </View>
                  </View>
                </View>
                {selectedCategory === category && !status.isComplete && (
                  <Icon name="check-circle" size={28} color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} />
                )}
                {!selectedCategory || selectedCategory !== category ? (
                  <Icon name="chevron-right" size={24} color={isCvr ? cvrTheme.text.secondary : themeConfig.text.disabled} />
                ) : null}
              </TouchableOpacity>
            );
            })
          )}
          
          <View style={[styles.buttonRow, isCvr && { justifyContent: 'space-between' }]}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, isCvr && { borderColor: cvrTheme.accent.purple }]}
              onPress={() => setCurrentStep(0)}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary, isCvr && { color: cvrTheme.accent.purple }]}>Back</Text>
            </TouchableOpacity>
            {isCvr && auditStatus !== 'completed' && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: cvrTheme.accent.purple }]}
                onPress={() => {
                  Alert.alert('Draft Saved', 'Your draft has been saved');
                }}
                disabled={saving}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary, { color: cvrTheme.accent.purple }]}>Save Draft</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, !selectedCategory && styles.buttonDisabled, isCvr && { padding: 0, overflow: 'hidden' }]}
              onPress={() => {
                if (selectedCategory) {
                  setCurrentStep(2);
                }
              }}
              disabled={!selectedCategory}
            >
              {isCvr ? (
                <LinearGradient colors={cvrTheme.button.next} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8 }}>
                  <Text style={[styles.buttonText, { color: '#fff' }]}>{auditStatus === 'completed' ? 'View Category' : 'Next'}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.buttonText}>
                  {auditStatus === 'completed' ? 'View Category' : 'Next: Start Audit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {currentStep === 2 && (
        <View style={styles.container}>
          <View style={[styles.progressBar, isCvr && { backgroundColor: cvrTheme.background.elevated, borderBottomColor: cvrTheme.input.border }]}>
            {/* Horizontal Category Tabs (all templates) */}
            {categories.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                  {/* Details Tab (completed) */}
                  <TouchableOpacity
                    style={[
                      styles.cvrCategoryTab,
                      { backgroundColor: 'transparent', marginRight: 8 }
                    ]}
                    onPress={() => setCurrentStep(0)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="check-circle" size={16} color={tabSuccess} style={{ marginRight: 4 }} />
                      <Text style={[styles.cvrCategoryTabText, { color: tabTextSecondary }]}>Details</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Category Tabs */}
                  {categories.map((cat, idx) => {
                    const isActive = selectedCategory === cat;
                    const catStatus = categoryCompletionStatus[cat] || { completed: 0, total: 0, isComplete: false };
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.cvrCategoryTab,
                          isActive && styles.cvrCategoryTabActive
                        ]}
                        onPress={() => handleCategorySelect(cat)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {catStatus.isComplete ? (
                            <Icon name="check-circle" size={14} color={tabSuccess} style={{ marginRight: 4 }} />
                          ) : (
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                borderWidth: 1,
                                borderColor: tabTextSecondary,
                                backgroundColor: isActive ? tabAccent : 'transparent',
                                marginRight: 6
                              }}
                            />
                          )}
                          <Text 
                            style={[
                              styles.cvrCategoryTabText,
                              { color: tabTextSecondary },
                              isActive && { color: tabTextPrimary, fontWeight: '600' }
                            ]}
                            numberOfLines={1}
                          >
                            {cat.length > 15 ? cat.substring(0, 15) + '...' : cat}
                          </Text>
                        </View>
                        {isActive && <View style={[styles.cvrCategoryTabIndicator, { backgroundColor: tabAccent }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            {/* Current Category Progress */}
            <View style={styles.currentCategoryProgress}>
            <Text style={[styles.progressText, isCvr && { color: cvrTheme.text.primary }]}>
              Progress: {completedItems} / {filteredItems.length} items
              {selectedCategory && !isCvr && ` (${selectedCategory})`}
            </Text>
              {(() => {
                // Calculate detailed breakdown
                const requiredItems = filteredItems.filter(item => item.required);
                const missingRequired = requiredItems.filter(item => !isItemComplete(item));
                const itemsNeedingPhotos = filteredItems.filter(item => {
                  const fieldType = getEffectiveItemFieldType(item);
                  return item.required && fieldType === 'image_upload' && !photos[item.id];
                });
                
                const currentStatus = selectedCategory ? categoryCompletionStatus[selectedCategory] : null;
                if (currentStatus) {
                  const percent = currentStatus.total > 0 ? Math.round((currentStatus.completed / currentStatus.total) * 100) : 0;
                  return (
                    <View>
                      <View style={[styles.categoryProgressBar, isCvr && { backgroundColor: cvrTheme.input.border }]}>
                        <View 
                          style={[
                            styles.categoryProgressFill, 
                            { 
                              width: `${percent}%`,
                              backgroundColor: currentStatus.isComplete ? (isCvr ? cvrTheme.accent.green : themeConfig.success.main) : (isCvr ? cvrTheme.accent.purple : themeConfig.primary.main)
                            }
                          ]} 
                        />
                      </View>
                      {/* Detailed breakdown */}
                      {(missingRequired.length > 0 || itemsNeedingPhotos.length > 0) && (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {missingRequired.length > 0 && (
                            <Text style={[styles.progressText, { fontSize: 12, color: isCvr ? '#ff6b6b' : themeConfig.error.main }]}>
                              ⚠️ {missingRequired.length} required item{missingRequired.length !== 1 ? 's' : ''} incomplete
                            </Text>
                          )}
                          {itemsNeedingPhotos.length > 0 && (
                            <Text style={[styles.progressText, { fontSize: 12, color: isCvr ? '#ff6b6b' : themeConfig.error.main }]}>
                              📷 {itemsNeedingPhotos.length} item{itemsNeedingPhotos.length !== 1 ? 's' : ''} need{itemsNeedingPhotos.length === 1 ? 's' : ''} photo{itemsNeedingPhotos.length !== 1 ? 's' : ''}
                </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                }
                return null;
              })()}
            </View>
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
              const fieldType = getEffectiveItemFieldType(item);
              const optionType = isOptionFieldType(fieldType);
              const answerType = isAnswerFieldType(fieldType);
              const isMissingRequiredPhoto = item.required && fieldType === 'image_upload' && !photos[item.id];
              
              return (
              <View 
                key={item.id} 
                style={[
                  styles.itemCard,
                  isPreviousFailure && styles.itemCardPreviousFailure,
                  isMissingRequiredPhoto && { borderLeftWidth: 4, borderLeftColor: '#d32f2f' }
                ]}
              >
                {/* Missing required photo warning */}
                {isMissingRequiredPhoto && (
                  <View style={[styles.previousFailureWarning, { backgroundColor: '#FFF5F5', borderColor: '#d32f2f' }]}>
                    <Icon name="photo-camera" size={18} color="#d32f2f" />
                    <Text style={[styles.previousFailureWarningText, { color: '#d32f2f' }]}>
                      Photo Required - Please add a photo before submitting
                    </Text>
                  </View>
                )}
                
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
                    {/* Timer display */}
                    {itemStartTimes[item.id] && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Icon name="timer" size={14} color={themeConfig.text.secondary} />
                        <Text style={{ fontSize: 12, color: themeConfig.text.secondary, marginLeft: 4 }}>
                          {(() => {
                            const elapsed = itemElapsedTimes[item.id] || 0;
                            const minutes = Math.floor(elapsed / 60);
                            const seconds = elapsed % 60;
                            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {getStatusIcon(responses[item.id])}
                </View>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
                
                {fieldType === 'single_answer' && item.options && item.options.length > 0 ? (
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Text
                            style={[
                              styles.optionText,
                              selectedOptions[item.id] === option.id && styles.optionTextActive
                            ]}
                          >
                            {option.text || option.option_text}
                          </Text>
                          <Text style={[styles.optionText, { fontSize: 12, marginLeft: 8 }]}>
                            ({option.mark})
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : fieldType === 'multiple_answer' && item.options && item.options.length > 0 ? (
                  <View style={styles.optionsContainer}>
                    {item.options.map((option) => {
                      const selectedIds = multipleSelections[item.id] || [];
                      const isSelected = selectedIds.includes(option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.optionButton,
                            isSelected && styles.optionButtonActive,
                            auditStatus === 'completed' && styles.disabledButton
                          ]}
                          onPress={() => handleMultipleSelectionChange(item.id, option.id, !isSelected)}
                          disabled={auditStatus === 'completed'}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Text
                              style={[
                                styles.optionText,
                                isSelected && styles.optionTextActive
                              ]}
                            >
                              {option.text || option.option_text}
                            </Text>
                            <Text style={[styles.optionText, { fontSize: 12, marginLeft: 8 }]}>
                              ({option.mark})
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : fieldType === 'dropdown' && item.options && item.options.length > 0 ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Select Option</Text>
                    <TouchableOpacity
                      style={[styles.commentInput, { justifyContent: 'center' }]}
                      onPress={() => {
                        Alert.alert(
                          'Select Option',
                          '',
                          item.options.map(opt => ({
                            text: `${opt.text || opt.option_text} (${opt.mark})`,
                            onPress: () => handleOptionChange(item.id, opt.id)
                          })).concat([{ text: 'Cancel', style: 'cancel' }])
                        );
                      }}
                      disabled={auditStatus === 'completed'}
                    >
                      <Text style={{ color: (selectedOptions[item.id] ? themeConfig.text.primary : themeConfig.text.disabled) }}>
                        {(() => {
                          const selected = item.options.find(opt => opt.id === selectedOptions[item.id]);
                          return selected ? `${selected.text || selected.option_text} (${selected.mark})` : 'Select option...';
                        })()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : fieldType === 'short_answer' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Short Answer</Text>
                    <TextInput
                      style={styles.commentInput}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Enter your answer..."
                      placeholderTextColor={themeConfig.text.disabled}
                      editable={auditStatus !== 'completed'}
                    />
                  </View>
                ) : fieldType === 'long_answer' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Long Answer</Text>
                    <TextInput
                      style={[styles.commentInput, { minHeight: 100 }]}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Enter your detailed answer..."
                      placeholderTextColor={themeConfig.text.disabled}
                      multiline
                      numberOfLines={5}
                      editable={auditStatus !== 'completed'}
                    />
                  </View>
                ) : fieldType === 'time' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Time</Text>
                    <TouchableOpacity
                      style={[styles.commentInput, { justifyContent: 'center' }]}
                      onPress={() => {
                        const timeStr = comments[item.id] || '';
                        const [hours = 0, minutes = 0] = timeStr.split(':').map(Number);
                        const current = new Date();
                        current.setHours(hours, minutes);
                        setDatePickerValue(isNaN(current.getTime()) ? new Date() : current);
                        setDatePickerItemId(item.id);
                      }}
                      disabled={auditStatus === 'completed'}
                    >
                      <Text style={{ color: (comments[item.id] ? themeConfig.text.primary : themeConfig.text.disabled) }}>
                        {comments[item.id] || 'Select time...'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : fieldType === 'section' ? (
                  <View style={{ marginTop: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: themeConfig.primary.main }}>
                    <Text style={[styles.itemTitle, { fontSize: 18, color: themeConfig.primary.main, fontWeight: 'bold' }]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text style={[styles.itemDescription, { marginTop: 4 }]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                ) : fieldType === 'sub_section' ? (
                  <View style={{ marginTop: 12, marginBottom: 8, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: themeConfig.secondary?.main || themeConfig.primary.light }}>
                    <Text style={[styles.itemTitle, { fontSize: 16, color: themeConfig.secondary?.main || themeConfig.primary.main, fontWeight: '600' }]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text style={[styles.itemDescription, { marginTop: 4 }]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                ) : optionType && item.options && item.options.length > 0 ? (
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
                ) : fieldType === 'date' ? (
                  (() => {
                    const isTimeItem = /\(Time\)$/i.test(item?.title || '');
                    const dateStr = comments[item.id] || '';
                    let initial = new Date();
                    if (dateStr) {
                      const timeOnly = dateStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
                      if (timeOnly) {
                        initial = new Date();
                        initial.setHours(parseInt(timeOnly[1], 10), parseInt(timeOnly[2], 10), parseInt(timeOnly[3] || '0', 10), 0);
                      } else {
                        const toParse = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}/.test(dateStr) ? dateStr.replace(' ', 'T') : dateStr;
                        initial = new Date(toParse);
                      }
                    }
                    if (isNaN(initial.getTime())) initial = new Date();
                    return (
                      <View style={styles.commentContainer}>
                        <Text style={styles.commentLabel}>{isTimeItem ? 'Date & time' : 'Date'}</Text>
                        <TouchableOpacity
                          style={[styles.commentInput, { justifyContent: 'center' }]}
                          onPress={() => {
                            setDatePickerValue(initial);
                            setDatePickerItemId(item.id);
                          }}
                          disabled={auditStatus === 'completed'}
                        >
                          <Text style={{ color: (comments[item.id] ? themeConfig.text.primary : themeConfig.text.disabled) }}>
                            {comments[item.id] || (isTimeItem ? 'Select date & time...' : 'Select date...')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()
                ) : fieldType === 'signature' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Signature</Text>
                    <TouchableOpacity
                      style={[styles.photoButton, { marginTop: 8 }]}
                      onPress={() => setSignatureItemId(item.id)}
                      disabled={auditStatus === 'completed'}
                    >
                      <Icon name="gesture" size={20} color={themeConfig.primary.main} />
                      <Text style={styles.photoButtonText}>
                        {comments[item.id] ? 'Edit Signature' : 'Add Signature'}
                      </Text>
                    </TouchableOpacity>
                    {(() => {
                      let signatureObj = null;
                      try {
                        signatureObj = comments[item.id] ? JSON.parse(comments[item.id]) : null;
                      } catch (e) {
                        signatureObj = null;
                      }
                      return <SignatureDisplay signature={signatureObj} style={{ marginTop: 10 }} />;
                    })()}
                  </View>
                ) : fieldType === 'number' ? (
                  (() => {
                    const isAverageAuto = /^Average\s*\(Auto\)$/i.test((item.title || '').trim());
                    return (
                      <View style={styles.commentContainer}>
                        <Text style={styles.commentLabel}>{isAverageAuto ? 'Average (auto-calculated)' : 'Number'}</Text>
                        <TextInput
                          style={styles.commentInput}
                          value={comments[item.id] || ''}
                          onChangeText={isAverageAuto ? undefined : (text) => handleAnswerChange(item.id, text)}
                          placeholder={isAverageAuto ? '' : 'Enter number...'}
                          placeholderTextColor={themeConfig.text.disabled}
                          keyboardType="decimal-pad"
                          editable={auditStatus !== 'completed' && !isAverageAuto}
                        />
                        {isAverageAuto && (
                          <Text style={{ fontSize: 12, color: themeConfig.text.secondary, marginTop: 4 }}>
                            From Time Attempts 1–5
                          </Text>
                        )}
                      </View>
                    );
                  })()
                ) : fieldType === 'scan_code' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Scan Code</Text>
                    <TextInput
                      style={styles.commentInput}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Enter code..."
                      placeholderTextColor={themeConfig.text.disabled}
                      editable={auditStatus !== 'completed'}
                    />
                  </View>
                ) : fieldType === 'short_answer' ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Response</Text>
                    <TextInput
                      style={styles.commentInput}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Type Here"
                      placeholderTextColor={isCvr ? cvrTheme.text.placeholder : themeConfig.text.disabled}
                      editable={auditStatus !== 'completed'}
                    />
                  </View>
                ) : answerType ? (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>{fieldType === 'description' ? 'Description' : 'Answer'}</Text>
                    <TextInput
                      style={[styles.commentInput, { minHeight: 60 }]}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Enter your response..."
                      placeholderTextColor={themeConfig.text.disabled}
                      multiline
                      numberOfLines={3}
                      editable={auditStatus !== 'completed'}
                    />
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

                {/* Photo: for image_upload always; for CVR also on Yes/No/NA (option) items */}
                {(fieldType === 'image_upload' || (isCvr && isOptionFieldType(fieldType))) && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                      style={[styles.photoButton, auditStatus === 'completed' && styles.disabledButton]}
                    onPress={() => handlePhotoUpload(item.id)}
                      disabled={uploading[item.id] || auditStatus === 'completed'}
                  >
                    {uploading[item.id] ? (
                      <ActivityIndicator size="small" color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} />
                    ) : (
                      <Icon name="photo-camera" size={20} color={isCvr ? cvrTheme.accent.purple : themeConfig.primary.main} />
                    )}
                    <Text style={[styles.photoButtonText, isCvr && { color: cvrTheme.accent.purple }]}>
                      {photos[item.id] ? 'Change Photo' : 'Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
                )}

                {photos[item.id] && (fieldType === 'image_upload' || (isCvr && isOptionFieldType(fieldType))) && (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: photos[item.id] }} style={styles.photo} />
                    {auditStatus !== 'completed' && (
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        const newPhotos = { ...photos };
                        delete newPhotos[item.id];
                        setPhotos(newPhotos);
                      }}
                        disabled={auditStatus === 'completed'}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                    )}
                  </View>
                )}

                {!answerType && fieldType !== 'date' && fieldType !== 'signature' && fieldType !== 'number' && fieldType !== 'scan_code' && (
                  <View style={styles.commentContainer}>
                    <Text style={[styles.commentLabel, isCvr && { color: cvrTheme.accent.purple }]}>{isCvr ? 'Remarks' : 'Comment (optional)'}</Text>
                    <TextInput
                      style={[styles.commentInput, auditStatus === 'completed' && styles.disabledInput, isCvr && { backgroundColor: cvrTheme.input.bg, borderColor: cvrTheme.input.border }]}
                      value={comments[item.id] || ''}
                      onChangeText={(text) => handleCommentChange(item.id, text)}
                      placeholder={isCvr ? 'Add remarks...' : 'Add a comment...'}
                      placeholderTextColor={isCvr ? cvrTheme.text.placeholder : themeConfig.text.disabled}
                      multiline
                      numberOfLines={2}
                      editable={auditStatus !== 'completed'}
                    />
                  </View>
                )}
              </View>
              );
            })}

            {/* Date/Time Picker (Android inline / iOS modal) */}
            {datePickerItemId !== null && (() => {
              const item = filteredItems.find(i => i.id === datePickerItemId);
              const fieldType = item ? getEffectiveItemFieldType(item) : 'date';
              const isTimeMode = fieldType === 'time';
              const isDateTimeMode = fieldType === 'date' && /\(Time\)$/i.test(item?.title || '');
              const mode = isDateTimeMode ? 'datetime' : (isTimeMode ? 'time' : 'date');

              return (
                <DateTimePicker
                  value={datePickerValue}
                  mode={mode}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    // Android can dismiss without selecting
                    if (Platform.OS !== 'ios' && event?.type === 'dismissed') {
                      setDatePickerItemId(null);
                      return;
                    }

                    const d = selectedDate || datePickerValue;
                    if (isTimeMode) {
                      const hours = String(d.getHours()).padStart(2, '0');
                      const minutes = String(d.getMinutes()).padStart(2, '0');
                      handleAnswerChange(datePickerItemId, `${hours}:${minutes}`);
                    } else if (isDateTimeMode) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const hours = String(d.getHours()).padStart(2, '0');
                      const minutes = String(d.getMinutes()).padStart(2, '0');
                      handleAnswerChange(datePickerItemId, `${y}-${m}-${day} ${hours}:${minutes}`);
                    } else {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      handleAnswerChange(datePickerItemId, `${y}-${m}-${day}`);
                    }

                    if (Platform.OS !== 'ios') {
                      setDatePickerItemId(null);
                    } else {
                      setDatePickerValue(d);
                    }
                  }}
                />
              );
            })()}

            {/* Signature Modal */}
            <SignatureModal
              visible={signatureItemId !== null}
              title="Collect Signature"
              subtitle="Sign to confirm"
              onClose={() => setSignatureItemId(null)}
              onSave={(signatureData) => {
                if (signatureItemId === null) return;
                handleAnswerChange(signatureItemId, JSON.stringify(signatureData));
              }}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  // Allow navigating back to category selection for viewing different categories
                  if (categories.length > 1) {
                    setCurrentStep(1);
                  } else {
                    setCurrentStep(0);
                  }
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  {categories.length > 1 ? 'Change Category' : 'Back'}
                </Text>
              </TouchableOpacity>
              {auditStatus === 'completed' ? (
              <TouchableOpacity
                  style={[styles.button, isCvr && { padding: 0, overflow: 'hidden' }]}
                  onPress={() => navigation.goBack()}
                >
                  {isCvr ? (
                    <LinearGradient colors={cvrTheme.button.next} style={{ paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 10 }}>
                      <Text style={styles.buttonText}>Close</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.buttonText}>Close</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, saving && styles.buttonDisabled, isCvr && { padding: 0, overflow: 'hidden' }]}
                onPress={handleSubmit}
                  disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : isCvr ? (
                  <LinearGradient colors={cvrTheme.button.next} style={{ paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 10 }}>
                    <Text style={styles.buttonText}>Submit</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.buttonText}>Save Audit</Text>
                )}
              </TouchableOpacity>
              )}
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
  completedBanner: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    gap: 8,
  },
  completedBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  categorySwitcherContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#b3d9f2',
  },
  categorySwitcherLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.text.secondary,
    marginBottom: 8,
  },
  categorySwitcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: themeConfig.primary.main,
    marginBottom: 12,
  },
  categorySwitcherText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
    flex: 1,
  },
  // CVR Horizontal Category Tabs
  cvrCategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
    position: 'relative',
  },
  cvrCategoryTabActive: {
    // Active tab styling handled by indicator
  },
  cvrCategoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B0B0C8', // cvrTheme.text.secondary
    textTransform: 'uppercase',
  },
  cvrCategoryTabTextActive: {
    color: '#FFFFFF', // cvrTheme.text.primary
    fontWeight: '600',
  },
  cvrCategoryTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#8A72F6', // cvrTheme.accent.purple
    borderRadius: 2,
  },
  overallProgressContainer: {
    marginTop: 8,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  overallProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.text.secondary,
  },
  overallProgressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.info.dark,
  },
  overallProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: themeConfig.info.main,
    borderRadius: 3,
  },
  overallProgressText: {
    fontSize: 11,
    color: themeConfig.text.secondary,
  },
  currentCategoryProgress: {
    marginTop: 8,
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dynamicEntryButton: {
    backgroundColor: themeConfig.success.main,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dynamicEntryButtonDisabled: {
    opacity: 0.6,
  },
  dynamicEntryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dynamicEntryModalContent: {
    maxHeight: '90%',
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
  categoryCardCompleted: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
  },
  categoryGroupContainer: {
    marginBottom: 16,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 2,
    borderColor: themeConfig.border.default,
    overflow: 'hidden',
  },
  categoryGroupHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryGroupContent: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: themeConfig.border.default,
  },
  categorySubCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.small,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryCardContent: {
    flex: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginBottom: 6,
  },
  categoryCardProgressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryCardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryProgressPercent: {
    fontSize: 11,
    color: themeConfig.text.secondary,
    marginTop: 2,
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
    paddingLeft: 40,
    margin: 20,
    marginBottom: 10,
    fontSize: 16,
    flex: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingLeft: 12,
  },
  searchIconInModal: {
    marginRight: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: themeConfig.text.disabled,
  },
  selectedOutletTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.primary.light + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: themeConfig.primary.main,
    justifyContent: 'space-between',
  },
  selectedOutletText: {
    fontSize: 16,
    color: themeConfig.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  removeTagButton: {
    padding: 4,
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: themeConfig.text.primary,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  pictureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  pictureThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePictureButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPictureButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: themeConfig.primary.main,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeConfig.primary.light + '10',
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


import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { isPhotoFixTemplate } from '../config/photoFix';
import { themeConfig, cvrTheme, isCvrTemplate } from '../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../context/LocationContext';
import { useNetwork } from '../context/NetworkContext';
import { LocationCaptureButton, LocationDisplay, LocationVerification } from '../components/LocationCapture';
import { SignatureModal, SignatureDisplay } from '../components';

const AuditFormScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { templateId, auditId, scheduledAuditId, locationId: initialLocationId } = route.params || {};
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const isCvr = isCvrTemplate(template?.name);
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
  const [expandedSections, setExpandedSections] = useState({}); // Track which sections are expanded (e.g., Trnx-1)
  
  // GPS Location state
  const { getCurrentLocation, permissionGranted, settings: locationSettings, calculateDistance } = useLocation();
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [showLocationVerification, setShowLocationVerification] = useState(false);

  // Network state - real-time only
  const { isOnline } = useNetwork();
  const [savingDraft, setSavingDraft] = useState(false);
  
  // Track if this is the initial mount to prevent duplicate fetches
  const isInitialMount = React.useRef(true);
  const saveInFlightRef = useRef(false);
  const clientAuditUuidRef = useRef(null);
  const isInitialLoadInProgressRef = useRef(false); // Track if initial load is in progress
  const hasInitialLoadedRef = useRef(false); // Track if initial load has completed
  const lastLoadParamsRef = useRef(null); // Track last loaded params to prevent duplicates
  const autoSaveTimeoutRef = useRef(null);
  
  // Refs to track current values for focus effect (avoid dependency issues)
  const auditIdRef = useRef(auditId);
  const currentAuditIdRef = useRef(currentAuditId);
  const scheduledAuditIdRef = useRef(scheduledAuditId);
  const templateIdRef = useRef(templateId);
  
  // Track focus state and refresh timing to prevent excessive refreshes
  const wasFocusedRef = useRef(false);
  const lastRefreshAuditIdRef = useRef(null);
  const lastRefreshTimeRef = useRef(0);
  
  // Update refs when values change
  useEffect(() => {
    auditIdRef.current = auditId;
  }, [auditId]);
  useEffect(() => {
    currentAuditIdRef.current = currentAuditId;
  }, [currentAuditId]);
  useEffect(() => {
    scheduledAuditIdRef.current = scheduledAuditId;
  }, [scheduledAuditId]);
  useEffect(() => {
    templateIdRef.current = templateId;
  }, [templateId]);
  

  const draftStorageKey = useMemo(() => {
    const templateKey = templateId ? String(templateId) : 'unknown';
    const scheduleKey = scheduledAuditId ? String(scheduledAuditId) : 'none';
    const locationKey = locationId ? String(locationId) : 'none';
    return `audit_draft:${templateKey}:${scheduleKey}:${locationKey}`;
  }, [templateId, scheduledAuditId, locationId]);

  const clearDraftStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(draftStorageKey);
      await AsyncStorage.removeItem(draftStorageKey + '_meta');
    } catch (error) {
      console.warn('Failed to clear draft storage:', error);
    }
  }, [draftStorageKey]);

  const resetDraftIdentity = useCallback(async () => {
    await clearDraftStorage();
    clientAuditUuidRef.current = null;
    setCurrentAuditId(null);
  }, [clearDraftStorage]);

  useEffect(() => {
    let mounted = true;
    const loadDraftIdentity = async () => {
      try {
        const stored = await AsyncStorage.getItem(draftStorageKey);
        if (!stored || !mounted) return;
        const parsed = JSON.parse(stored);
        if (parsed?.auditId && !currentAuditId && !auditId) {
          setCurrentAuditId(parsed.auditId);
        }
        if (parsed?.clientAuditUuid) {
          clientAuditUuidRef.current = parsed.clientAuditUuid;
        }
      } catch (error) {
        console.warn('Failed to load draft identity:', error);
      }
    };
    loadDraftIdentity();
    return () => {
      mounted = false;
    };
  }, [draftStorageKey, currentAuditId, auditId]);

  // Previous failures state for highlighting recurring issues
  const [previousFailures, setPreviousFailures] = useState([]);
  const [failedItemIds, setFailedItemIds] = useState(new Set());
  const [previousAuditInfo, setPreviousAuditInfo] = useState(null);
  const [loadingPreviousFailures, setLoadingPreviousFailures] = useState(false);
  const recurringAlertShownRef = useRef(new Set());

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
    if (isCvr) return false;
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
  }, [isCvr]);

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
    const currentParams = `${templateId}-${auditId}-${scheduledAuditId}`;
    
    // Skip if we've already loaded with these exact parameters
    if (hasInitialLoadedRef.current && lastLoadParamsRef.current === currentParams) {
      console.log('[AuditForm] Skipping duplicate initial load - already loaded with same params');
      return;
    }
    
    // Skip if initial load is already in progress
    if (isInitialLoadInProgressRef.current) {
      console.log('[AuditForm] Skipping - initial load already in progress');
      return;
    }
    
    console.log('[AuditForm] Initial load - templateId:', templateId, 'auditId:', auditId, 'scheduledAuditId:', scheduledAuditId, 'locationId:', initialLocationId);
    isInitialLoadInProgressRef.current = true;
    hasInitialLoadedRef.current = true;
    lastLoadParamsRef.current = currentParams;
    
    if (auditId) {
      // Editing existing audit
      console.log('[AuditForm] Mode: Editing existing audit, auditId:', auditId);
      setIsEditing(true);
      // Use fetchAuditDataById directly to ensure correct ID is used
      fetchAuditDataById(parseInt(auditId, 10)).finally(() => {
        isInitialLoadInProgressRef.current = false;
      });
    } else if (scheduledAuditId && templateId) {
      // Check if audit already exists for this scheduled audit
      console.log('[AuditForm] Mode: Starting from scheduled audit');
      Promise.resolve(checkExistingAudit()).finally(() => {
        isInitialLoadInProgressRef.current = false;
      });
    } else if (templateId) {
      // Creating new audit
      console.log('[AuditForm] Mode: Creating new audit from template');
      Promise.resolve(fetchTemplate()).finally(() => {
        isInitialLoadInProgressRef.current = false;
      });
    } else {
      console.error('[AuditForm] ERROR: No templateId, auditId, or scheduledAuditId provided!');
      Alert.alert('Error', 'Missing required parameters. Please try again.');
      setLoading(false);
      isInitialLoadInProgressRef.current = false;
    }
    fetchLocations();
  }, [templateId, auditId, scheduledAuditId]);

  // Refresh data when screen comes into focus, but only if:
  // 1. We're viewing an existing audit (has auditId)
  // 2. We were previously unfocused (actually navigated away)
  // 3. It's been at least 3 seconds since last refresh
  // This prevents excessive refreshes while still refreshing when needed
  useFocusEffect(
    useCallback(() => {
      console.log('[AuditForm] Focus effect triggered, wasFocused:', wasFocusedRef.current, 'isInitialMount:', isInitialMount.current);
      
      // Skip initial mount - handled by useEffect above
      if (isInitialMount.current) {
        console.log('[AuditForm] Skipping initial mount in focus effect');
        isInitialMount.current = false;
        wasFocusedRef.current = true;
        if (auditIdRef.current || currentAuditIdRef.current) {
          lastRefreshAuditIdRef.current = auditIdRef.current || currentAuditIdRef.current;
          console.log('[AuditForm] Set lastRefreshAuditId to:', lastRefreshAuditIdRef.current);
        }
        return;
      }
      
      // Only refresh if we were previously unfocused (actually navigated away and back)
      // AND the initial load has already completed (to avoid duplicate fetches)
      // AND initial load is not in progress
      if (!wasFocusedRef.current && hasInitialLoadedRef.current && !isInitialLoadInProgressRef.current) {
        console.log('[AuditForm] Screen was unfocused, now focused - checking if refresh needed');
        wasFocusedRef.current = true;
        const currentAuditId = auditIdRef.current || currentAuditIdRef.current;
        
        // Only refresh existing audits, and only if it's a different audit or enough time has passed
        if (currentAuditId) {
          const now = Date.now();
          const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
          const MIN_REFRESH_INTERVAL = 3000; // 3 seconds
          
          console.log('[AuditForm] Focus refresh check - currentAuditId:', currentAuditId, 'lastRefreshAuditId:', lastRefreshAuditIdRef.current, 'timeSinceLastRefresh:', timeSinceLastRefresh);
          
          // Only refresh if it's a different audit or enough time has passed
          if (lastRefreshAuditIdRef.current !== currentAuditId || timeSinceLastRefresh >= MIN_REFRESH_INTERVAL) {
            console.log('[AuditForm] Screen refocused after navigation, refreshing audit:', currentAuditId);
            // Don't show loading spinner on refresh - keep existing data visible
            fetchAuditDataById(parseInt(currentAuditId, 10));
            lastRefreshAuditIdRef.current = currentAuditId;
            lastRefreshTimeRef.current = now;
          } else {
            console.log('[AuditForm] Skipping refresh - same audit and too soon since last refresh');
          }
        } else {
          console.log('[AuditForm] No currentAuditId, skipping refresh');
        }
      } else {
        if (!hasInitialLoadedRef.current) {
          console.log('[AuditForm] Initial load not complete yet, skipping focus refresh');
        } else {
          console.log('[AuditForm] Screen was already focused, skipping refresh (likely re-render)');
        }
      }
      
      // Mark as unfocused when screen loses focus
      return () => {
        console.log('[AuditForm] Screen losing focus, marking wasFocused as false');
        wasFocusedRef.current = false;
      };
    }, [])
  );

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

  const checkExistingAudit = async (scheduledId = scheduledAuditId) => {
    try {
      setLoading(true);
      console.log('[AuditForm] Checking for existing audit for scheduled audit:', scheduledId);
      // Check if an audit already exists for this scheduled audit
      const response = await axios.get(`${API_BASE_URL}/audits/by-scheduled/${scheduledId}`);
      if (response.data.audit) {
        // Audit exists, switch to edit mode
        const existingAuditId = response.data.audit.id;
        console.log('[AuditForm] Found existing audit:', existingAuditId);
        setIsEditing(true);
        // Update route params to include auditId
        navigation.setParams({ auditId: existingAuditId });
        // Fetch the existing audit data
        await fetchAuditDataById(existingAuditId);
      } else {
        // No existing audit, create new one
        console.log('[AuditForm] No existing audit, fetching template');
        await fetchTemplate();
      }
    } catch (error) {
      // If audit not found (404), it's a new audit
      if (error.response?.status === 404) {
        console.log('[AuditForm] No existing audit (404), fetching template');
        await fetchTemplate();
      } else {
        console.error('[AuditForm] Error checking existing audit:', error);
        Alert.alert('Error', 'Failed to check for existing audit. Creating new audit.');
        await fetchTemplate();
      }
    }
    // Note: setLoading(false) is handled inside fetchTemplate and fetchAuditDataById
  };

  const fetchAuditDataById = async (id) => {
    try {
      // Only show full loading spinner if we don't have data yet
      // If we have data, keep it visible and show subtle loading indicator
      const hasExistingData = template && items && items.length > 0;
      if (!hasExistingData) {
        setLoading(true);
      }
      console.log('[AuditForm] Fetching audit data for ID:', id, 'hasExistingData:', hasExistingData);
      
      // Check if online - require real-time connection
      if (!isOnline) {
        Alert.alert(
          'No Internet Connection',
          'Please connect to the internet to load audit data.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setLoading(false);
        return;
      }
      
      // OPTIMIZATION: Fetch audit and template in parallel if we have templateId from route params
      // This significantly speeds up loading time (can save 1-3 seconds)
      const templateIdToFetch = templateId || null;
      const startTime = Date.now();
      
      console.log('[AuditForm] Starting parallel fetch - audit and template (templateId from route:', templateIdToFetch, ', API URL:', API_BASE_URL, ')');
      
      // Fetch audit and template in parallel for faster loading
      const [auditResponse, templateResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/audits/${id}`, {
          timeout: 30000, // Increased to 30s for production (slower networks)
        }).catch(err => {
          // Log detailed error for debugging
          console.error('[AuditForm] Audit fetch error:', {
            message: err.message,
            code: err.code,
            status: err.response?.status,
            statusText: err.response?.statusText,
            url: `${API_BASE_URL}/audits/${id}`,
            isNetworkError: !err.response
          });
          throw err; // Re-throw to be caught by outer catch
        }),
        // If we have templateId from route, fetch template in parallel
        templateIdToFetch 
          ? axios.get(`${API_BASE_URL}/checklists/${templateIdToFetch}`, {
              timeout: 30000, // Increased timeout for production
            }).catch(err => {
              // If parallel template fetch fails, we'll fetch it after getting audit
              console.warn('[AuditForm] Parallel template fetch failed, will fetch after audit:', err.message);
              return null;
            })
          : Promise.resolve(null)
      ]);
      
      const fetchTime = Date.now() - startTime;
      console.log(`[AuditForm] Parallel fetch completed in ${fetchTime}ms`);
      
      console.log('[AuditForm] Audit response received, has audit:', !!auditResponse.data?.audit);
      
      if (!auditResponse.data || !auditResponse.data.audit) {
        throw new Error('Invalid audit response - no audit data');
      }
      
      const audit = auditResponse.data.audit;
      const auditItems = auditResponse.data.items || [];
      
      console.log('[AuditForm] Audit loaded:', audit.id, 'Status:', audit.status, 'Template ID:', audit.template_id);
      
      // Check if parallel-fetched template matches audit's template_id
      let templateData = null;
      if (templateResponse && templateResponse.data) {
        // Verify template matches (in case route templateId differs from audit template_id)
        if (templateResponse.data.template?.id === audit.template_id || templateIdToFetch === audit.template_id) {
          templateData = templateResponse.data;
          console.log('[AuditForm] Template loaded from parallel fetch:', templateData.template?.name);
        } else {
          console.warn('[AuditForm] Template ID mismatch - route:', templateIdToFetch, 'audit:', audit.template_id);
        }
      }

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
        // Completed audits should not be treated as resumable drafts
        clearDraftStorage();
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

      // Fetch template if not already loaded from parallel fetch
      if (!templateData) {
        console.log('[AuditForm] Fetching template:', audit.template_id, 'from API:', API_BASE_URL);
        try {
          const templateResponse = await axios.get(`${API_BASE_URL}/checklists/${audit.template_id}`, {
            timeout: 30000, // Increased to 30s for production (slower networks)
          });
          templateData = templateResponse.data;
        } catch (templateError) {
          console.error('[AuditForm] Template fetch failed:', {
            message: templateError.message,
            code: templateError.code,
            status: templateError.response?.status,
            url: `${API_BASE_URL}/checklists/${audit.template_id}`
          });
          throw new Error(`Failed to load template: ${templateError.message || 'Unknown error'}`);
        }
      }
      
      if (!templateData || !templateData.template) {
        console.error('[AuditForm] Invalid template data:', { hasTemplateData: !!templateData, hasTemplate: !!templateData?.template });
        throw new Error('Invalid template response - no template data');
      }
      
      console.log('[AuditForm] Template loaded:', templateData.template.name);
      // Set template and items immediately for faster UI rendering
      setTemplate(templateData.template);
      const allItems = templateData.items || [];
      const itemTypeById = {};
      allItems.forEach(item => {
        itemTypeById[item.id] = String(item.input_type || '').toLowerCase();
      });
      console.log('[AuditForm] Template has', allItems.length, 'items');
      
      if (allItems.length === 0) {
        console.warn('[AuditForm] Warning: Template has no items');
      }
      
      // OPTIMIZATION: Process items and categories in one pass for better performance
      // Filter out time-related items
      const filteredItems = allItems.filter(item => !isTimeRelatedItem(item));
      
      // Set items immediately for faster rendering
      setItems(filteredItems);
      
      // Extract unique categories and build category status in optimized way
      const categoryMap = new Map();
      const auditItemsMap = new Map(auditItems.map(ai => [ai.item_id, ai]));
      
      filteredItems.forEach(item => {
        const cat = item.category;
        if (!cat || !cat.trim()) return;
        
        const categoryLower = cat.toLowerCase();
        // Filter out only time-tracking categories
        if (categoryLower.includes('speed of service - tracking') || 
            categoryLower.includes('time tracking')) {
          return;
        }
        
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { items: [], completed: 0 });
        }
        
        const categoryData = categoryMap.get(cat);
        categoryData.items.push(item);
        
        // Check if item is completed
        const auditItem = auditItemsMap.get(item.id);
        if (auditItem) {
          const hasMark = auditItem.mark !== null && 
                         auditItem.mark !== undefined && 
                         String(auditItem.mark).trim() !== '';
          const hasStatus = auditItem.status && 
                           auditItem.status !== 'pending' && 
                           auditItem.status !== '';
          if (hasMark || hasStatus) {
            categoryData.completed++;
          }
        }
      });
      
      const uniqueCategories = Array.from(categoryMap.keys());
      setCategories(uniqueCategories);
      
      // Build category status object
      const categoryStatus = {};
      categoryMap.forEach((data, cat) => {
        categoryStatus[cat] = {
          completed: data.completed,
          total: data.items.length,
          isComplete: data.completed === data.items.length && data.items.length > 0
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

      // OPTIMIZATION: Populate responses from audit items in single loop
      const responsesData = {};
      const optionsData = {};
      const commentsData = {};
      const multipleSelectionsData = {};
      const photosData = {};
      const baseUrl = API_BASE_URL.replace('/api', '');

      // Use the already-created auditItemsMap for O(1) lookups
      auditItems.forEach(auditItem => {
        const itemId = auditItem.item_id;
        const itemType = itemTypeById[itemId];
        const isMultiSelect = isMultiSelectFieldType(itemType);
        if (auditItem.status) {
          responsesData[itemId] = auditItem.status;
        }
        if (auditItem.selected_option_id) {
          optionsData[itemId] = auditItem.selected_option_id;
        }
        if (auditItem.comment) {
          if (isMultiSelect) {
            const parsed = parseMultiSelectionComment(auditItem.comment);
            if (parsed) {
              commentsData[itemId] = parsed.text || '';
              multipleSelectionsData[itemId] = parsed.selections;
            } else {
              commentsData[itemId] = auditItem.comment;
            }
          } else {
            commentsData[itemId] = auditItem.comment;
          }
        }
        if (auditItem.photo_url) {
          // Construct full URL if needed - handle both full URLs and paths
          let photoUrl = auditItem.photo_url;
          if (!photoUrl.startsWith('http')) {
            if (photoUrl.startsWith('/')) {
              photoUrl = `${baseUrl}${photoUrl}`;
            } else {
              photoUrl = `${baseUrl}/${photoUrl}`;
            }
          }
          photosData[itemId] = photoUrl;
        }
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setMultipleSelections(multipleSelectionsData);
      setPhotos(photosData);

      // Start at appropriate step
      // Skip category selection and go directly to checklist when continuing audit
      // User can switch categories using the tabs at the top of the checklist
      setCurrentStep(2);
      
      const totalLoadTime = Date.now() - startTime;
      console.log(`[AuditForm] Audit data loaded successfully in ${totalLoadTime}ms. Step: 2`);
      
      // CRITICAL: Set loading to false to hide the spinner and show the form
      // Use function form to ensure React processes the state update correctly
      setLoading(prevLoading => {
        console.log('[AuditForm] Setting loading to false, prevLoading was:', prevLoading, 'template:', !!templateData?.template, 'items:', filteredItems.length);
        if (prevLoading) {
          return false;
        }
        return prevLoading;
      });
    } catch (error) {
      console.error('[AuditForm] Error fetching audit data:', error.message || error);
      console.error('[AuditForm] Error details:', {
        code: error.code,
        response: error.response?.status,
        responseData: error.response?.data
      });
      
      let errorMessage = 'Failed to load audit data.';
      if (error.response?.status === 404) {
        errorMessage = 'Audit not found. It may have been deleted.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this audit.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      // Ensure loading is set to false and state is cleared to trigger error UI
      setLoading(false);
      setTemplate(null);
      setItems([]);
      
      // Show alert but don't block - let the error UI handle retry
      Alert.alert(
        'Error Loading Audit',
        errorMessage,
        [
          { 
            text: 'Go Back', 
            onPress: () => navigation.goBack(),
            style: 'cancel'
          },
          { 
            text: 'Retry', 
            onPress: () => {
              setLoading(true);
              fetchAuditDataById(id);
            }
          }
        ]
      );
    }
  };

  const fetchTemplate = async () => {
    try {
      // Only show full loading spinner if we don't have data yet
      const hasExistingData = template && items && items.length > 0;
      if (!hasExistingData) {
        setLoading(true);
      }
      console.log('[AuditForm] Fetching template:', templateId, 'hasExistingData:', hasExistingData);
      
      // Check if online - require real-time connection
      if (!isOnline) {
        Alert.alert(
          'No Internet Connection',
          'Please connect to the internet to load template.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setLoading(false);
        return;
      }
      
      const startTime = Date.now();
      // Reduced timeout for faster failure detection
      const shouldBypassCache = isPhotoFixTemplate(templateId, template?.name);
      const response = await axios.get(`${API_BASE_URL}/checklists/${templateId}`, {
        timeout: 20000, // Reduced from 60s to 20s
        headers: {
          'Accept': 'application/json'
        },
        params: shouldBypassCache ? { cache_bust: Date.now() } : undefined,
        __skipCache: shouldBypassCache
      });
      
      const fetchTime = Date.now() - startTime;
      console.log(`[AuditForm] Template fetch completed in ${fetchTime}ms`);
      
      console.log('[AuditForm] Template response received, has template:', !!response.data?.template);
      
      if (response.data && response.data.template) {
        setTemplate(response.data.template);
        const allItems = response.data.items || [];
        console.log('[AuditForm] Template loaded:', response.data.template.name, 'with', allItems.length, 'items');
        
        // Filter out time-related items
        const filteredItemsData = allItems.filter(item => !isTimeRelatedItem(item));
        setItems(filteredItemsData);
        
        // Extract unique categories from filtered items (excluding only time-tracking categories)
        // Allow "Speed of Service" category - only filter "Speed of Service - Tracking"
        const uniqueCategories = [...new Set(filteredItemsData.map(item => item.category).filter(cat => {
          if (!cat || !cat.trim()) return false;
          const categoryLower = cat.toLowerCase();
          // Filter out only time-tracking categories, NOT "Speed of Service" checklist
          return !categoryLower.includes('speed of service - tracking') && 
                 !categoryLower.includes('time tracking');
        }))];
        setCategories(uniqueCategories);
        console.log('[AuditForm] Found', uniqueCategories.length, 'categories:', uniqueCategories.slice(0, 3).join(', '), uniqueCategories.length > 3 ? '...' : '');
        
        // If only one category, auto-select it
        if (uniqueCategories.length === 1) {
          setSelectedCategory(uniqueCategories[0]);
          const filtered = filteredItemsData.filter(item => item.category === uniqueCategories[0]);
          setFilteredItems(filtered);
          console.log('[AuditForm] Auto-selected single category:', uniqueCategories[0]);
        } else if (uniqueCategories.length === 0) {
          // No categories, show all filtered items
          setFilteredItems(filteredItemsData);
          console.log('[AuditForm] No categories, showing all items');
        }
      } else {
        console.error('[AuditForm] Invalid template response - no template data');
        throw new Error('Invalid template response');
      }
    } catch (error) {
      console.error('[AuditForm] Error fetching template:', error.message || error);
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

  const fetchAuditData = useCallback(async () => {
    if (!auditId) {
      console.error('[AuditForm] fetchAuditData called but auditId is missing');
      Alert.alert('Error', 'Audit ID is missing. Please try again.');
      setLoading(false);
      return;
    }
    console.log('[AuditForm] fetchAuditData called with auditId:', auditId);
    await fetchAuditDataById(parseInt(auditId, 10));
  }, [auditId, isOnline]);

  // Fetch previous audit failures for recurring failures indicator
  // Works for both regular audits and scheduled audits (same location + same checklist)
  const fetchPreviousFailures = async (effectiveLocationId = null) => {
    const locId = effectiveLocationId || locationId || initialLocationId;
    if (!templateId || !locId) return;
    
    try {
      setLoadingPreviousFailures(true);
      const response = await axios.get(
        `${API_BASE_URL}/audits/previous-failures`,
        {
          params: {
            template_id: templateId,
            location_id: locId,
            months_back: 6
          }
        }
      );
      
      if (response.data && Array.isArray(response.data.failedItems)) {
        const failures = response.data.failedItems;
        setPreviousFailures(failures);
        const previousAudit = response.data.previousAudit || null;
        setPreviousAuditInfo(previousAudit ? {
          date: previousAudit.date,
          auditId: previousAudit.id
        } : null);
        
        // Create a Set of failed item IDs for quick lookup
        const failedIds = new Set(failures.map(item => item.item_id));
        setFailedItemIds(failedIds);
        
        // Show alert only once per location+template to avoid repeated popups
        const alertKey = `${templateId}-${locId}`;
        if (failures.length > 0 && !recurringAlertShownRef.current.has(alertKey)) {
          recurringAlertShownRef.current.add(alertKey);
          Alert.alert(
            '⚠️ Recurring Failures Detected',
            `${failures.length} item(s) failed in the last audit for this location. These items are highlighted in red to help you focus on recurring issues.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        setPreviousFailures([]);
        setFailedItemIds(new Set());
        setPreviousAuditInfo(null);
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

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleResponseChange = useCallback((itemId, status) => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify items in a completed audit');
      return;
    }
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

  const isMultiSelectFieldType = useCallback((fieldType) => {
    return fieldType === 'multiple_answer' || fieldType === 'grid';
  }, []);

  const buildMultiSelectionComment = useCallback((text, selections) => {
    const payload = {
      text: typeof text === 'string' ? text : '',
      selections: Array.isArray(selections) ? selections : []
    };
    return JSON.stringify(payload);
  }, []);

  const parseMultiSelectionComment = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.selections)) {
        return {
          text: typeof parsed.text === 'string' ? parsed.text : '',
          selections: parsed.selections
        };
      }
    } catch (error) {
      return null;
    }
    return null;
  }, []);

  const getEffectiveItemFieldType = useCallback((item) => {
    const raw = (item?.input_type || item?.inputType || 'auto').toLowerCase();
    const title = (item?.title || '').toLowerCase();
    const category = (item?.category || '').toLowerCase();
    const hasOptions = item?.options && Array.isArray(item.options) && item.options.length > 0;

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
    return 'task';
  }, [isCvr]);

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
    const itemStatus = item?.status;
    const itemMark = item?.mark;
    const itemComment = item?.comment;
    const itemPhotoUrl = item?.photo_url;
    const itemSelectedOptionId = item?.selected_option_id;
    const hasItemMark = itemMark !== null && itemMark !== undefined && String(itemMark).trim() !== '';
    const hasItemStatus = itemStatus && itemStatus !== 'pending' && itemStatus !== '';
    const hasItemComment = itemComment !== null && itemComment !== undefined && String(itemComment).trim() !== '';
    const hasItemPhoto = !!itemPhotoUrl;
    if (fieldType === 'multiple_answer' || fieldType === 'grid') {
      return (multipleSelections[item.id] || []).length > 0 || hasItemMark || hasItemStatus || hasItemComment;
    }
    if (isOptionFieldType(fieldType)) {
      return !!selectedOptions[item.id] || !!itemSelectedOptionId || hasItemMark || hasItemStatus;
    }
    if (fieldType === 'image_upload') {
      return !!photos[item.id] || hasItemPhoto || hasItemMark || hasItemStatus;
    }
    if (isAnswerFieldType(fieldType)) {
      const value = comments[item.id];
      return (value !== undefined && value !== null && String(value).trim() !== '') || hasItemComment || hasItemStatus || hasItemMark;
    }
    const status = responses[item.id];
    return (status && status !== 'pending') || hasItemStatus || hasItemMark;
  }, [comments, photos, responses, selectedOptions, multipleSelections, getEffectiveItemFieldType, isOptionFieldType, isAnswerFieldType]);

  const queueSilentDraftSave = useCallback(() => {
    if (auditStatus === 'completed') return;
    if (currentStep !== 2) return;
    if (!selectedLocation) return;

    const hasAnyResponses =
      Object.keys(responses).length > 0 ||
      Object.keys(comments).length > 0 ||
      Object.keys(photos).length > 0 ||
      Object.keys(selectedOptions).length > 0 ||
      Object.keys(multipleSelections).length > 0;

    if (!hasAnyResponses) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!clientAuditUuidRef.current) {
          clientAuditUuidRef.current = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        }
        const draftData = {
          template_id: parseInt(templateId),
          template_name: template?.name || '',
          location_id: parseInt(locationId),
          restaurant_name: selectedLocation?.name || '',
          store_number: selectedLocation?.store_number || '',
          status: 'draft',
          client_audit_uuid: clientAuditUuidRef.current,
          responses,
          comments,
          photos,
          selectedOptions,
          multipleSelections,
          categoryCompletionStatus,
          selectedCategory,
          currentStep,
          attendees,
          pointsDiscussed,
          infoPictures,
          notes,
          capturedLocation,
          locationVerified,
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            section: item.section,
            input_type: item.input_type,
            is_required: item.is_required,
            options: item.options,
          })),
          savedAt: new Date().toISOString(),
          auditId: currentAuditId,
          scheduledAuditId,
          isAutoSave: true,
        };
        await AsyncStorage.setItem(draftStorageKey, JSON.stringify(draftData));
        console.log('[AutoSave] Draft saved silently (on response)');
      } catch (error) {
        console.warn('[AutoSave] Failed to auto-save draft (on response):', error);
      }
    }, 800);
  }, [auditStatus, currentStep, selectedLocation, responses, comments, photos, selectedOptions, multipleSelections, templateId, template, locationId, categoryCompletionStatus, selectedCategory, attendees, pointsDiscussed, infoPictures, notes, capturedLocation, locationVerified, items, currentAuditId, scheduledAuditId, draftStorageKey]);

  useEffect(() => {
    queueSilentDraftSave();
  }, [responses, comments, photos, selectedOptions, multipleSelections, currentStep, queueSilentDraftSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const getCategoryTabLabel = useCallback((category) => {
    if (!category) return '';
    const trimmed = String(category).trim();
    const parenMatch = trimmed.match(/^(.*)\(([^)]+)\)\s*$/);
    if (parenMatch) {
      const parent = parenMatch[1].trim().replace(/[-–]\s*$/, '');
      const sub = parenMatch[2].trim();
      if (!parent) return sub;
      const parentShort = parent.split(/[&/]/)[0].trim().split(/\s+/)[0] || parent;
      return `${parentShort}: ${sub}`;
    }
    const parts = trimmed.split(/\s[-–]\s/);
    if (parts.length > 1) {
      const parent = parts[0].trim();
      const sub = parts.slice(1).join(' - ').trim();
      if (!parent) return sub || trimmed;
      const parentShort = parent.split(/[&/]/)[0].trim().split(/\s+/)[0] || parent;
      return `${parentShort}: ${sub || parent}`;
    }
    return trimmed;
  }, []);

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
    const nextComments = { ...comments, [itemId]: value };
    const sos = getSosAverageItems(items);
    let averageUpdate = null;
    if (sos && sos.attemptIds.includes(itemId)) {
      const nums = sos.attemptIds
        .map(id => (id === itemId ? value : comments[id]))
        .map(s => parseFloat(String(s || '')))
        .filter(n => !isNaN(n));
      const avgValue = nums.length ? String((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : '';
      nextComments[sos.averageId] = avgValue;
      averageUpdate = { id: sos.averageId, value: avgValue };
    }
    setComments(nextComments);
    setResponses(prev => {
      const updated = { ...prev };
      const hasValue = value && String(value).trim();
      updated[itemId] = hasValue ? 'completed' : (prev[itemId] || 'pending');
      if (averageUpdate) {
        const hasAvg = averageUpdate.value && String(averageUpdate.value).trim();
        updated[averageUpdate.id] = hasAvg ? 'completed' : (updated[averageUpdate.id] || prev[averageUpdate.id] || 'pending');
      }
      const item = items.find(i => i.id === itemId) || (averageUpdate && items.find(i => i.id === averageUpdate.id));
      if (item && item.category) {
        setCategoryCompletionStatus(prevStatus => {
          const categoryItems = items.filter(i => i.category === item.category);
          const completedInCategory = categoryItems.filter(i => {
            const response = updated[i.id] || prev[i.id];
            return response && response !== 'pending' && response !== '';
          }).length;
          return {
            ...prevStatus,
            [item.category]: {
              completed: completedInCategory,
              total: categoryItems.length,
              isComplete: completedInCategory === categoryItems.length && categoryItems.length > 0
            }
          };
        });
      }
      return updated;
    });
  }, [auditStatus, comments, getSosAverageItems, items]);

  // Photo upload with retry logic - Optimized for large audits (174+ items)
  const uploadPhotoWithRetry = async (formData, authToken, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let didTimeout = false; // Declare outside try block to be accessible in catch
      try {
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
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
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: requestHeaders,
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
        
        // Don't retry on auth or not found errors
        if (error.noRetry) throw error;
        
        // Handle timeout errors
        if (didTimeout || error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
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
        
        if (attempt === maxRetries) {
          throw error;
        }
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
          const completedCount = sectionItems.filter(item => isItemComplete(item)).length;
          
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
        const completedCount = categoryItems.filter(item => isItemComplete(item)).length;
        
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
  }, [isItemComplete]);

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

  const getCategoryItems = useCallback((category, section = null) => {
    return items.filter(item => {
      if (item.category !== category) return false;
      if (section && item.section !== section) return false;
      return true;
    });
  }, [items]);

  const applyCategorySelection = useCallback((category, section = null, overrides = {}) => {
    const nextResponses = overrides.responses || responses;
    const nextSelectedOptions = overrides.selectedOptions || selectedOptions;
    const nextComments = overrides.comments || comments;
    setSelectedCategory(category);
    setSelectedSection(section);
    const categoryItems = getCategoryItems(category, section);
    const conditionallyFiltered = filterItemsByCondition(categoryItems, items, nextResponses, nextSelectedOptions, nextComments);
    setFilteredItems(conditionallyFiltered);
  }, [comments, filterItemsByCondition, getCategoryItems, items, responses, selectedOptions]);

  const handleCategorySelect = (category, section = null) => {
    applyCategorySelection(category, section);
  };

  // Group items by section for display (Trnx-1, Trnx-2, Avg, etc.)
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

    const sortedSections = Object.keys(sections).sort((a, b) => {
      if (a.startsWith('Trnx-') && b.startsWith('Trnx-')) {
        return parseInt(a.replace('Trnx-', ''), 10) - parseInt(b.replace('Trnx-', ''), 10);
      }
      if (a.startsWith('Trnx-')) return -1;
      if (b.startsWith('Trnx-')) return 1;
      if (a === 'Avg') return -1;
      if (b === 'Avg') return 1;
      return a.localeCompare(b);
    });

    return {
      sections: sortedSections.map(name => ({ name, items: sections[name] })),
      itemsWithoutSection
    };
  }, []);

  const groupedItems = useMemo(() => groupItemsBySection(filteredItems), [filteredItems, groupItemsBySection]);

  const itemIndexMap = useMemo(() => {
    const map = {};
    filteredItems.forEach((item, index) => {
      map[item.id] = index;
    });
    return map;
  }, [filteredItems]);

  useEffect(() => {
    if (groupedItems.sections.length > 0) {
      const initialExpanded = {};
      groupedItems.sections.forEach(section => {
        initialExpanded[section.name] = true;
      });
      setExpandedSections(prev => ({ ...initialExpanded, ...prev }));
    }
  }, [groupedItems.sections]);

  const sectionedItems = useMemo(() => {
    if (groupedItems.sections.length === 0) {
      return filteredItems.map(item => ({ type: 'item', item }));
    }

    const list = [];
    groupedItems.sections.forEach(section => {
      list.push({ type: 'section', section });
      if (expandedSections[section.name] !== false) {
        section.items.forEach(item => list.push({ type: 'item', item }));
      }
    });

    groupedItems.itemsWithoutSection.forEach(item => list.push({ type: 'item', item }));
    return list;
  }, [groupedItems, expandedSections, filteredItems]);

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate required fields - only outlet is required
      if (!locationId || !selectedLocation) {
        Alert.alert('Error', 'Please select an outlet');
        return;
      }
      
      // Check location/distance BEFORE allowing user to start the audit
      if (selectedLocation?.latitude && selectedLocation?.longitude) {
        try {
          // Get current location
          const currentLocationResult = await getCurrentLocation();
          
          if (currentLocationResult.success) {
            const storeLat = parseFloat(selectedLocation.latitude);
            const storeLon = parseFloat(selectedLocation.longitude);
            const distance = calculateDistance(
              currentLocationResult.location.latitude,
              currentLocationResult.location.longitude,
              storeLat,
              storeLon
            );
            
            // Save captured location for later use
            setCapturedLocation(currentLocationResult.location);
            
            const MAX_DISTANCE_TO_START = 100; // 100 meters - must be within to start audit
            const WARNING_DISTANCE = 50; // 50 meters warning threshold
            
            if (distance > MAX_DISTANCE_TO_START) {
              // Block user from starting audit if too far
              Alert.alert(
                'Location Too Far',
                `You are ${Math.round(distance)} meters from ${selectedLocation.name}.\n\nYou must be within ${MAX_DISTANCE_TO_START} meters of the store location to start the audit. Please move closer to the store.`,
                [{ text: 'OK', style: 'cancel' }]
              );
              setLocationVerified(false);
              return;
            } else if (distance > WARNING_DISTANCE) {
              // Show warning but allow to proceed
              const confirmed = await new Promise((resolve) => {
                Alert.alert(
                  'Location Warning',
                  `You are ${Math.round(distance)} meters from ${selectedLocation.name}.\n\nYou are outside the recommended range (${WARNING_DISTANCE}m) but within the allowed distance. Do you want to continue?`,
                  [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Continue', onPress: () => resolve(true) }
                  ]
                );
              });
              
              if (!confirmed) {
                return;
              }
              setLocationVerified(true);
              setShowLocationVerification(true);
            } else {
              // Within recommended range
              setLocationVerified(true);
              setShowLocationVerification(true);
            }
          } else {
            // Location not available - ask user if they want to continue without verification
            Alert.alert(
              'Location Not Available',
              'Unable to get your current location. Location verification is required to start the audit.\n\nPlease enable location services and try again.',
              [{ text: 'OK', style: 'cancel' }]
            );
            return;
          }
        } catch (error) {
          console.error('Error checking location:', error);
          // Show error but don't block
          Alert.alert(
            'Location Check Failed',
            'Unable to verify your location. Please ensure location services are enabled.',
            [{ text: 'OK', style: 'cancel' }]
          );
          return;
        }
      }
      
      // Check for existing in-progress audit for this template + location BEFORE starting
      // This prevents duplicate audits when user navigates back and starts again
      if (!auditId && !isEditing && templateId && locationId) {
        try {
          const statusesToCheck = ['in_progress', 'draft'];
          let existingAudit = null;

          for (const status of statusesToCheck) {
            const existingCheckResponse = await axios.get(`${API_BASE_URL}/audits`, {
              params: {
                template_id: parseInt(templateId),
                location_id: parseInt(locationId),
                status,
                limit: 1
              }
            });
            const existingAudits = existingCheckResponse.data.audits || [];
            if (existingAudits.length > 0) {
              existingAudit = existingAudits[0];
              break;
            }
          }
          
          if (existingAudit) {
            // Found existing in-progress audit - ask user what to do
            const shouldResume = await new Promise((resolve) => {
              Alert.alert(
                'Existing Audit Found',
                `You have an in-progress or draft audit for this store and checklist (started ${new Date(existingAudit.created_at).toLocaleDateString()}).\n\nWould you like to resume it?`,
                [
                  { text: 'Start New', style: 'destructive', onPress: () => resolve(false) },
                  { text: 'Resume', style: 'default', onPress: () => resolve(true) }
                ]
              );
            });
            
            if (shouldResume) {
              // Resume existing audit - navigate to it
              console.log(`[AuditForm] Resuming existing audit ${existingAudit.id}`);
              setCurrentAuditId(existingAudit.id);
              setIsEditing(true);
              // Fetch the existing audit data
              await fetchAuditDataById(existingAudit.id);
              return; // Don't proceed to step 2 - fetchAuditDataById will handle navigation
            }
            // If user chose "Start New", clear any stale draft identity before creating a new audit
            await resetDraftIdentity();
            setIsEditing(false);
          }
          // If no existing audit found on server but a local draft ID is present, clear it before starting fresh
          if (!existingAudit && currentAuditId) {
            await resetDraftIdentity();
          }
        } catch (checkError) {
          console.log('Could not check for existing audits:', checkError.message);
          // Continue anyway if check fails
        }
      }
      
      // Go directly to audit checklist (skip category selection)
      setCurrentStep(2);
    }
  };

  // Save draft locally and on server (works offline and online)
  const handleSaveDraft = useCallback(async () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select an outlet');
      return;
    }

    setSavingDraft(true);
    try {
      if (!clientAuditUuidRef.current) {
        clientAuditUuidRef.current = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      
      let activeAuditId = currentAuditId || auditId;
      
      // Try to save draft to server if online (this allows continuing drafts properly)
      if (isOnline) {
        try {
          // Prepare notes with info data
          const infoData = {
            pictures: infoPictures.map(pic => {
              const uriString = typeof pic === 'string' ? pic : (pic?.uri || '');
              if (uriString.startsWith('http')) {
                try {
                  const urlObj = new URL(uriString);
                  return urlObj.pathname;
                } catch (e) {
                  const pathMatch = uriString.match(/\/uploads\/[^?]+/);
                  return pathMatch ? pathMatch[0] : uriString.replace(/^https?:\/\/[^\/]+/, '');
                }
              }
              return uriString.startsWith('/') ? uriString : `/${uriString}`;
            }),
          };
          const notesToSave = JSON.stringify(infoData);
          
          if (activeAuditId) {
            // Update existing audit
            const updateData = {
              restaurant_name: store.name,
              location: store.store_number ? `Store ${store.store_number}` : store.name,
              location_id: parseInt(locationId),
              notes: notesToSave
            };
            
            if (capturedLocation) {
              updateData.gps_latitude = capturedLocation.latitude;
              updateData.gps_longitude = capturedLocation.longitude;
              updateData.gps_accuracy = capturedLocation.accuracy;
              updateData.gps_timestamp = capturedLocation.timestamp;
              updateData.location_verified = locationVerified;
            }
            
            await axios.put(`${API_BASE_URL}/audits/${activeAuditId}`, updateData);
          } else {
            // Create new audit on server for draft
            const auditData = {
              template_id: parseInt(templateId),
              restaurant_name: selectedLocation.name,
              location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
              location_id: parseInt(locationId),
              notes: notesToSave,
              client_audit_uuid: clientAuditUuidRef.current
            };
            
            if (scheduledAuditId) {
              auditData.scheduled_audit_id = parseInt(scheduledAuditId);
            }
            
            if (capturedLocation) {
              auditData.gps_latitude = capturedLocation.latitude;
              auditData.gps_longitude = capturedLocation.longitude;
              auditData.gps_accuracy = capturedLocation.accuracy;
              auditData.gps_timestamp = capturedLocation.timestamp;
              auditData.location_verified = locationVerified;
            }
            
            const auditResponse = await axios.post(`${API_BASE_URL}/audits`, auditData);
            activeAuditId = auditResponse.data.id;
            setCurrentAuditId(activeAuditId);
          }
        } catch (serverError) {
          // If server save fails, log but continue with local save
          console.warn('Failed to save draft to server, saving locally only:', serverError);
        }
      }
      
      // Build draft audit data
      const draftData = {
        template_id: parseInt(templateId),
        template_name: template?.name || '',
        location_id: parseInt(locationId),
        restaurant_name: selectedLocation?.name || '',
        store_number: selectedLocation?.store_number || '',
        status: 'draft',
        client_audit_uuid: clientAuditUuidRef.current,
        // Audit state
        responses: responses,
        comments: comments,
        photos: photos,
        selectedOptions: selectedOptions,
        multipleSelections: multipleSelections,
        categoryCompletionStatus: categoryCompletionStatus,
        selectedCategory: selectedCategory,
        currentStep: currentStep,
        // Info fields
        attendees: attendees,
        pointsDiscussed: pointsDiscussed,
        infoPictures: infoPictures,
        notes: notes,
        // GPS data
        capturedLocation: capturedLocation,
        locationVerified: locationVerified,
        // Items snapshot (for offline resume)
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          category: item.category,
          section: item.section,
          input_type: item.input_type,
          is_required: item.is_required,
          options: item.options,
        })),
        // Metadata
        savedAt: new Date().toISOString(),
        auditId: activeAuditId, // Use the audit ID from server if available
        scheduledAuditId: scheduledAuditId,
      };

      // Save draft locally (works offline)
      await AsyncStorage.setItem(draftStorageKey, JSON.stringify(draftData));
      await AsyncStorage.setItem(
        draftStorageKey + '_meta',
        JSON.stringify({
          auditId: activeAuditId || null,
          clientAuditUuid: clientAuditUuidRef.current
        })
      );

      Alert.alert(
        'Draft Saved',
        activeAuditId 
          ? 'Your progress has been saved. You can resume this audit anytime.'
          : 'Your progress has been saved locally. You can resume this audit anytime.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  }, [
    selectedLocation, templateId, template, locationId, responses, comments,
    photos, selectedOptions, multipleSelections, categoryCompletionStatus,
    selectedCategory, currentStep, attendees, pointsDiscussed, infoPictures,
    notes, capturedLocation, locationVerified, items, currentAuditId,
    scheduledAuditId, isOnline, draftStorageKey, auditId
  ]);

  // Auto-save draft every 60 seconds when in audit step and has unsaved changes
  useEffect(() => {
    // Only auto-save if: in checklist step, not completed, has a location selected, and has some responses
    const hasUnsavedWork = currentStep === 2 && 
                          auditStatus !== 'completed' && 
                          selectedLocation && 
                          Object.keys(responses).length > 0;
    
    if (!hasUnsavedWork) return;

    const autoSaveInterval = setInterval(async () => {
      // Silent auto-save (no alerts, no loading indicator for auto-save)
      try {
        if (!clientAuditUuidRef.current) {
          clientAuditUuidRef.current = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        }
        const draftData = {
          template_id: parseInt(templateId),
          template_name: template?.name || '',
          location_id: parseInt(locationId),
          restaurant_name: selectedLocation?.name || '',
          store_number: selectedLocation?.store_number || '',
          status: 'draft',
          client_audit_uuid: clientAuditUuidRef.current,
          responses,
          comments,
          photos,
          selectedOptions,
          multipleSelections,
          categoryCompletionStatus,
          selectedCategory,
          currentStep,
          attendees,
          pointsDiscussed,
          infoPictures,
          notes,
          capturedLocation,
          locationVerified,
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            section: item.section,
            input_type: item.input_type,
            is_required: item.is_required,
            options: item.options,
          })),
          savedAt: new Date().toISOString(),
          auditId: currentAuditId,
          scheduledAuditId,
          isAutoSave: true,
        };
        await AsyncStorage.setItem(draftStorageKey, JSON.stringify(draftData));
        console.log('[AutoSave] Draft saved silently');
      } catch (error) {
        console.warn('[AutoSave] Failed to auto-save draft:', error);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(autoSaveInterval);
  }, [
    currentStep, auditStatus, selectedLocation, responses, templateId, template,
    locationId, comments, photos, selectedOptions, multipleSelections,
    categoryCompletionStatus, selectedCategory, attendees, pointsDiscussed,
    infoPictures, notes, capturedLocation, locationVerified, items,
    currentAuditId, scheduledAuditId, draftStorageKey
  ]);

  const handleSubmit = async () => {
    if (auditStatus === 'completed') {
      Alert.alert('Error', 'Cannot modify a completed audit');
      return;
    }
    if (saveInFlightRef.current || saving) {
      return;
    }
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      let activeAuditId = currentAuditId || auditId;

      // Resolve store selection even when state is stale after resume
      let resolvedLocation = selectedLocation;
      if (!resolvedLocation && locationId && locations.length > 0) {
        const location = locations.find(l => l.id === parseInt(locationId));
        if (location) {
          resolvedLocation = location;
          setSelectedLocation(location);
        }
      }

      // Final check - if still no location, show error
      if (!resolvedLocation || !locationId) {
        Alert.alert('Error', 'Please select a store');
        setSaving(false);
        return;
      }

      const store = resolvedLocation;

      // Geo-fencing validation: Check if captured location is within allowed distance
      if (capturedLocation && store?.latitude && store?.longitude) {
        const storeLat = parseFloat(store.latitude);
        const storeLon = parseFloat(store.longitude);
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
            `You are ${Math.round(distance)}m from ${store.name}.\n\nAudits must be conducted within ${MAX_ALLOWED_DISTANCE}m of the store location. Please move closer to the store or capture your location again.`,
            [{ text: 'OK', style: 'cancel' }]
          );
          setSaving(false);
          return;
        } else if (distance > WARNING_DISTANCE && !locationVerified) {
          // Show warning but allow with confirmation
          const confirmed = await new Promise((resolve) => {
            Alert.alert(
              'Location Warning',
              `You are ${Math.round(distance)}m from ${store.name}.\n\nYou are outside the recommended range (${WARNING_DISTANCE}m). Are you sure you want to continue?`,
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

      // Info fields are optional in the current mobile UI; avoid blocking save/submit.

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
      if (activeAuditId) {
        // We have an auditId, update existing audit
        try {
          const updateData = {
            restaurant_name: store.name,
            location: store.store_number ? `Store ${store.store_number}` : store.name,
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
          
          await axios.put(`${API_BASE_URL}/audits/${activeAuditId}`, updateData);
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
            activeAuditId = existingAuditResponse.data.audit.id;
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
            
            await axios.put(`${API_BASE_URL}/audits/${activeAuditId}`, updateData);
            // Update local notes state
            setNotes(notesToSave);
          }
        } catch (error) {
          // If audit doesn't exist (404) or other error, we'll create a new one below
          console.log('No existing audit found for scheduled audit, will create new one');
        }
      }
      
      // Create new audit if we don't have an existing one
      if (!activeAuditId) {
        // IMPORTANT: Check for existing in-progress or draft audit for same template + location
        // This prevents creating duplicate audits when user goes back and starts again
        try {
          const statusesToCheck = ['in_progress', 'draft'];
          let existingAudit = null;

          for (const status of statusesToCheck) {
            const existingCheckResponse = await axios.get(`${API_BASE_URL}/audits`, {
              params: {
                template_id: parseInt(templateId),
                location_id: parseInt(locationId),
                status,
                limit: 1
              }
            });
            const existingAudits = existingCheckResponse.data.audits || [];
            if (existingAudits.length > 0) {
              existingAudit = existingAudits[0];
              break;
            }
          }
          
          if (existingAudit) {
            // Found existing in-progress audit - use it instead of creating new one
            console.log(`[AuditForm] Found existing in-progress audit ${existingAudit.id}, resuming instead of creating new`);
            activeAuditId = existingAudit.id;
            setCurrentAuditId(activeAuditId);
            
            // Update the existing audit with current data
            const updateData = {
              restaurant_name: store.name,
              location: store.store_number ? `Store ${store.store_number}` : store.name,
              location_id: parseInt(locationId),
              notes: notesToSave
            };
            
            if (capturedLocation) {
              updateData.gps_latitude = capturedLocation.latitude;
              updateData.gps_longitude = capturedLocation.longitude;
              updateData.gps_accuracy = capturedLocation.accuracy;
              updateData.gps_timestamp = capturedLocation.timestamp;
              updateData.location_verified = locationVerified;
            }
            
            await axios.put(`${API_BASE_URL}/audits/${activeAuditId}`, updateData);
            setNotes(notesToSave);
          }
        } catch (checkError) {
          // If check fails, continue with creating new audit
          console.log('Could not check for existing audits, will create new one:', checkError.message);
        }
      }
      
      // Only create new audit if we still don't have one after checking
      if (!activeAuditId) {
        if (!clientAuditUuidRef.current) {
          clientAuditUuidRef.current = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        }
        const auditData = {
          template_id: parseInt(templateId),
          restaurant_name: store.name,
          location: store.store_number ? `Store ${store.store_number}` : store.name,
          location_id: parseInt(locationId),
          notes: notesToSave,
          client_audit_uuid: clientAuditUuidRef.current
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
        activeAuditId = auditResponse.data.id;
        setCurrentAuditId(activeAuditId);
        await AsyncStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            auditId: activeAuditId,
            clientAuditUuid: clientAuditUuidRef.current
          })
        );
        // Update local notes state
        setNotes(notesToSave);
      }

      // Validate required checklist items before saving
      const requiredItems = (filteredItems || []).filter(item => item?.is_required);
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
      const categoryItems = selectedCategory
        ? getCategoryItems(selectedCategory, selectedSection)
        : items;
      const visibleItems = filterItemsByCondition(categoryItems, items, responses, selectedOptions, comments);
      const visibleItemIds = new Set(visibleItems.map(item => item.id));
      const hiddenItems = categoryItems.filter(item => !visibleItemIds.has(item.id));
      const hasLocalResponse = (item) => {
        const status = responses[item.id];
        const hasStatus = status && status !== 'pending' && status !== '';
        const hasOption = selectedOptions[item.id] !== undefined && selectedOptions[item.id] !== null;
        const hasMulti = (multipleSelections[item.id] || []).length > 0;
        const hasComment = comments[item.id] && String(comments[item.id]).trim() !== '';
        const hasPhoto = !!photos[item.id];
        return hasStatus || hasOption || hasMulti || hasComment || hasPhoto;
      };

      const batchItems = visibleItems.map((item) => {
        const fieldType = getEffectiveItemFieldType(item);
        const isOptionType = isOptionFieldType(fieldType);
        const isAnswerType = isAnswerFieldType(fieldType);
        const isMultiSelectType = isMultiSelectFieldType(fieldType);
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
        if (isMultiSelectType) {
          const selections = multipleSelections[item.id] || [];
          if (selections.length > 0) {
            effectiveStatus = 'completed';
          }
        }

        const updateData = {
          itemId: item.id,
          status: effectiveStatus,
        };
        
        if (isOptionType && selectedOptions[item.id]) {
          updateData.selected_option_id = selectedOptions[item.id];
          // Include mark from selected option so backend can compute completion/score correctly
          const selectedOpt = item.options?.find(opt => opt.id === selectedOptions[item.id]);
          if (selectedOpt && selectedOpt.mark !== undefined && selectedOpt.mark !== null) {
            updateData.mark = selectedOpt.mark;
          }
        }
        
        if (comments[item.id] && !isMultiSelectType) {
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

        if (isMultiSelectType) {
          const selections = multipleSelections[item.id] || [];
          const commentText = comments[item.id] || '';
          if (selections.length > 0 || commentText) {
            updateData.comment = buildMultiSelectionComment(commentText, selections);
          }
          if (selections.length > 0) {
            updateData.mark = 'NA';
          }
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

        return updateData;
      });

      const hiddenBatchItems = hiddenItems
        .filter(item => !hasLocalResponse(item))
        .map(item => ({
          itemId: item.id,
          status: 'completed',
          mark: 'NA'
        }));

      const allBatchItems = [...batchItems, ...hiddenBatchItems];

      // Send batch update request
      // Clear audit_category to allow multiple categories in the same audit
      // This allows users to complete different categories in the same audit session
      try {
        const batchUrl = `${API_BASE_URL}/audits/${activeAuditId}/items/batch`;
        const payload = { items: allBatchItems, audit_category: null };

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
        const perItemUrl = (itemId) => `${API_BASE_URL}/audits/${activeAuditId}/items/${itemId}`;
        const errors = [];

        for (const updateData of allBatchItems) {
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
          if (failedCount === allBatchItems.length) {
            throw new Error(`Failed to save all ${failedCount} items (first error${firstStatus ? ` ${firstStatus}` : ''}: ${firstMsg})`);
          } else {
            // Some items failed - log warning but continue
            console.warn(`Failed to save ${failedCount} out of ${allBatchItems.length} items. Continuing...`);
          }
        }
      }

      // NOTE: Do not update completion status purely from local batch data.
      // The backend is the source of truth for completion to avoid race conditions.
      
      // Refresh audit data to get updated completion status and sync form state
      // Use backend's completion status as source of truth (it checks ALL items across ALL categories)
      try {
        const auditResponse = await axios.get(`${API_BASE_URL}/audits/${activeAuditId}`);
        const updatedAudit = auditResponse.data.audit;
        const updatedAuditItems = auditResponse.data.items || [];
        
        // Update audit status from backend (this is the source of truth)
        const isAuditCompleted = updatedAudit.status === 'completed';
        if (isAuditCompleted) {
          clearDraftStorage();
        }
        console.log('[AuditForm] Save response - audit status:', updatedAudit.status, 'isAuditCompleted:', isAuditCompleted, 'completed_items:', updatedAudit.completed_items, 'total_items:', updatedAudit.total_items);
        
        // REAL-TIME STATUS UPDATE: Update status immediately from backend response using functional update
        if (updatedAudit.status) {
          setAuditStatus(prevStatus => {
            if (prevStatus !== updatedAudit.status) {
              console.log('[AuditForm] Updated auditStatus state from', prevStatus, 'to', updatedAudit.status, '(real-time update)');
              return updatedAudit.status;
            }
            return prevStatus;
          });
        }
        
        // STRICT COMPLETION CHECK:
        // Only consider complete when completed_items === total_items and no pending/NA mismatches exist.
        const totalItems = Number(updatedAudit.total_items) || items.length;
        const completedItems = Number(updatedAudit.completed_items) || 0;
        const hasPendingOrMismatch = updatedAuditItems.some(auditItem => {
          const status = auditItem.status;
          const markValue = auditItem.mark;
          const hasMark = markValue !== null && markValue !== undefined && String(markValue).trim() !== '';
          const hasStatus = status && status !== 'pending' && status !== '';
          const isNaMark = String(markValue || '').trim().toUpperCase() === 'NA';
          if (!hasMark && !hasStatus) return true;
          if (isNaMark && (!hasStatus || status === 'pending')) return true;
          return false;
        });
        const isStrictlyComplete = totalItems > 0 && completedItems === totalItems && !hasPendingOrMismatch;
        
        // If backend says completed, keep status. If strict check shows complete but backend hasn't updated yet,
        // trigger backend completion and refresh, but do NOT flip status locally until backend confirms.
        if ((isAuditCompleted || isStrictlyComplete) && items.length > 0) {
          if (!isAuditCompleted && isStrictlyComplete) {
            setTimeout(() => {
              axios.put(`${API_BASE_URL}/audits/${activeAuditId}/complete`)
                .then(() => {
                  console.log('[AuditForm] Backend confirmed completion');
                  setTimeout(() => {
                    fetchAuditDataById(activeAuditId).catch(() => {});
                  }, 300);
                })
                .catch(err => {
                  console.log('[AuditForm] Backend completion check:', err.message, 'status:', err.response?.status);
                  if (err.response?.status !== 404) {
                    setTimeout(() => {
                      fetchAuditDataById(activeAuditId).catch(() => {});
                    }, 1000);
                  }
                });
            }, 500);
          }
        }
        
        // CRITICAL: Update form state with saved responses to reflect what was saved
        // This ensures the form shows the saved data when user continues
        const updatedResponses = { ...responses };
        const updatedSelectedOptions = { ...selectedOptions };
        const updatedComments = { ...comments };
        const updatedMultipleSelections = { ...multipleSelections };
        const updatedPhotos = { ...photos };
        const baseUrl = API_BASE_URL.replace('/api', '');
        const itemTypeById = {};
        items.forEach(item => {
          itemTypeById[item.id] = String(item.input_type || '').toLowerCase();
        });
        
        updatedAuditItems.forEach(auditItem => {
          const itemId = auditItem.item_id;
          const itemType = itemTypeById[itemId];
          const isMultiSelect = isMultiSelectFieldType(itemType);
          // Update responses
          if (auditItem.status) {
            updatedResponses[itemId] = auditItem.status;
          }
          // Update selected options
          if (auditItem.selected_option_id) {
            updatedSelectedOptions[itemId] = auditItem.selected_option_id;
          }
          // Update comments
          if (auditItem.comment) {
            if (isMultiSelect) {
              const parsed = parseMultiSelectionComment(auditItem.comment);
              if (parsed) {
                updatedComments[itemId] = parsed.text || '';
                updatedMultipleSelections[itemId] = parsed.selections;
              } else {
                updatedComments[itemId] = auditItem.comment;
              }
            } else {
              updatedComments[itemId] = auditItem.comment;
            }
          }
          // Update photos
          if (auditItem.photo_url) {
            let photoUrl = auditItem.photo_url;
            if (!photoUrl.startsWith('http')) {
              if (photoUrl.startsWith('/')) {
                photoUrl = `${baseUrl}${photoUrl}`;
              } else {
                photoUrl = `${baseUrl}/${photoUrl}`;
              }
            }
            updatedPhotos[itemId] = photoUrl;
          }
        });
        
        // Update form state with refreshed data
        console.log('[AuditForm] Updating form state after save - responses:', Object.keys(updatedResponses).length, 'items updated');
        setResponses(updatedResponses);
        setSelectedOptions(updatedSelectedOptions);
        setComments(updatedComments);
        setMultipleSelections(updatedMultipleSelections);
        setPhotos(updatedPhotos);
        
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
        // REAL-TIME: Status is already updated above, now handle UI updates
        const currentStatus = updatedAudit.status || auditStatus;
        if (isAuditCompleted || currentStatus === 'completed') {
          // Audit is fully completed - trigger PDF download
          const pdfUrl = `${API_BASE_URL.replace('/api', '')}/api/reports/audit/${activeAuditId}/pdf`;
          
          // Status is already updated in real-time above, just refresh data for consistency
          console.log('[AuditForm] Audit completed, refreshing data to confirm status');
          // Refresh immediately to update UI
          setTimeout(() => {
            fetchAuditDataById(activeAuditId).then(() => {
              console.log('[AuditForm] Audit data refreshed after completion');
            }).catch(err => {
              console.error('[AuditForm] Error refreshing audit after completion:', err);
            });
          }, 300); // Shorter delay since status is already updated
          
          // Audit is fully completed - all categories are done
          Alert.alert(
            'Success', 
            'All categories completed! Audit is now complete. PDF report will be available in audit details.',
            [
              { 
                text: 'View Audit', 
                onPress: () => {
                  // Navigate to detail with refresh flag
                  navigation.navigate('AuditDetail', { id: activeAuditId, refresh: true });
                }
              },
              {
                text: 'Done',
                style: 'cancel',
                onPress: () => {
                  // Mark that we need to refresh audit detail on back
                  navigation.setParams({ refreshAuditDetail: true });
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          // Audit is still in progress - show remaining categories
          const remainingCategories = categories.filter(cat => {
            const status = updatedCategoryStatus[cat] || { completed: 0, total: 0, isComplete: false };
            return !status.isComplete;
          });
          
          // If all categories are complete but backend isn't updated yet, trigger completion and refresh.
          const allCategoriesComplete = categories.every(cat => {
            const status = updatedCategoryStatus[cat] || { completed: 0, total: 0, isComplete: false };
            return status.isComplete;
          });
          if (allCategoriesComplete && categories.length > 0 && !isAuditCompleted && isStrictlyComplete) {
            axios.put(`${API_BASE_URL}/audits/${activeAuditId}/complete`)
              .then(() => {
                console.log('[AuditForm] Backend confirmed completion');
                setTimeout(() => {
                  fetchAuditDataById(activeAuditId).catch(() => {});
                }, 300);
              })
              .catch(err => {
                console.log('[AuditForm] Backend completion check:', err.message);
                setTimeout(() => {
                  fetchAuditDataById(activeAuditId).then(() => {
                    console.log('[AuditForm] Refreshed after category completion check');
                  }).catch(() => {});
                }, 500);
              });
          }
          
          const message = remainingCategories.length > 0
            ? `Category saved successfully! ${remainingCategories.length} categor${remainingCategories.length === 1 ? 'y' : 'ies'} remaining.`
            : 'Category saved successfully!';
          
          Alert.alert(
            'Success', 
            message,
            [
              {
                text: 'Done',
                onPress: () => {
                  // Mark that we need to refresh audit detail on back
                  navigation.setParams({ refreshAuditDetail: true });
                  navigation.goBack();
                }
              }
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
              style: 'cancel',
              onPress: () => {
                // Dismiss alert and allow user to continue working on the audit
                // The form state is already updated, so user can continue
              }
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
      const isCompletedLock = /Cannot modify items in a completed audit/i.test(errorMessage);
      
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
      
      if (isCompletedLock) {
        setAuditStatus('completed');
        const latestAuditId = currentAuditId || auditId;
        if (latestAuditId) {
          fetchAuditDataById(latestAuditId).catch(() => {});
        }
        Alert.alert(
          'Audit Completed',
          'This audit is already completed and cannot be modified. Your latest data has been refreshed.'
        );
      } else {
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
      }
    } finally {
      setSaving(false);
      saveInFlightRef.current = false;
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

  // Only show loading spinner if we don't have any data yet
  // If we have data, keep it visible while refreshing (prevents blank screen flash)
  const hasData = template && items && items.length > 0;
  
  if (loading && !hasData) {
    console.log('[AuditForm] RENDER: Showing loading spinner (no data yet)');
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading audit...</Text>
      </View>
    );
  }
  
  // If loading but we have data, show data with a subtle loading indicator
  if (loading && hasData) {
    console.log('[AuditForm] RENDER: Refreshing - showing existing data with loading overlay');
    // Continue to render the form below, but we'll add a subtle loading indicator
  }
  
  console.log('[AuditForm] RENDER: Not loading - template:', !!template, 'items:', items?.length || 0, 'currentStep:', currentStep, 'hasData:', hasData);

  // Safety check: If we don't have template or items after loading, show error
  if (!loading && (!template || !items || items.length === 0)) {
    console.error('[AuditForm] RENDER: Missing data - loading:', loading, 'template:', !!template, 'items:', items?.length || 0, 'currentStep:', currentStep, 'auditId:', auditId, 'templateId:', templateId);
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color={themeConfig.error.main} />
        <Text style={styles.errorTitle}>Failed to Load Audit</Text>
        <Text style={styles.errorText}>
          {!template ? 'Template data is missing.' : 'Checklist items could not be loaded.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            if (auditId || currentAuditId) {
              const idToFetch = auditId || currentAuditId;
              console.log('[AuditForm] Retry: Fetching audit data for ID:', idToFetch);
              fetchAuditDataById(parseInt(idToFetch, 10));
            } else if (templateId) {
              console.log('[AuditForm] Retry: Fetching template for ID:', templateId);
              fetchTemplate();
            } else {
              console.error('[AuditForm] Retry: No auditId or templateId available');
              Alert.alert('Error', 'Unable to retry. Missing required parameters.');
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Additional safety: If currentStep is not 0, 1, or 2, reset to a valid step
  if (currentStep !== 0 && currentStep !== 1 && currentStep !== 2) {
    console.warn('[AuditForm] Invalid currentStep:', currentStep, '- resetting to step 0');
    // Use setTimeout to avoid state update during render
    setTimeout(() => {
      setCurrentStep(0);
    }, 0);
    // Return loading state while resetting
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Loading...</Text>
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

  const tabAccent = isCvr ? cvrTheme.accent.purple : themeConfig.primary.main;
  const tabTextPrimary = isCvr ? cvrTheme.text.primary : themeConfig.text.primary;
  const tabTextSecondary = isCvr ? cvrTheme.text.secondary : themeConfig.text.secondary;
  const tabSuccess = isCvr ? cvrTheme.accent.green : themeConfig.success.main;

  return (
    <View style={[styles.container, isCvr && { backgroundColor: cvrTheme.background.primary }]}>
      {/* Subtle loading overlay when refreshing with existing data */}
      {loading && hasData && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1976d2" />
        </View>
      )}
      
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

          {/* GPS Location Capture */}
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
                style={[styles.button, styles.buttonSecondary, savingDraft && styles.buttonDisabled, isCvr && { borderColor: cvrTheme.accent.purple }]}
                onPress={handleSaveDraft}
                disabled={savingDraft}
              >
                {savingDraft ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={isCvr ? cvrTheme.accent.purple : themeConfig.text.secondary} />
                    <Text style={[styles.buttonText, styles.buttonTextSecondary, { marginLeft: 8 }, isCvr && { color: cvrTheme.accent.purple }]}>
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, styles.buttonTextSecondary, isCvr && { color: cvrTheme.accent.purple }]}>Save Draft</Text>
                )}
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
                style={[styles.button, !selectedLocation && styles.buttonDisabled, isCvr && { padding: 0, overflow: 'hidden' }]}
                onPress={handleNext}
                disabled={!selectedLocation}
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
                    // Reset location verification when store changes
                    if (selectedLocation?.id !== item.id) {
                      setLocationVerified(false);
                      setCapturedLocation(null);
                      setShowLocationVerification(false);
                    }
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

      {/* Step 1: Category Selection (for audits with multiple categories) */}
      {currentStep === 1 && (
        <View style={styles.container}>
          <View style={[styles.progressBar, isCvr && { backgroundColor: cvrTheme.background.elevated, borderBottomColor: cvrTheme.input.border }]}>
            <Text style={[styles.sectionTitle, isCvr && { color: cvrTheme.text.primary }]}>
              Select Category
            </Text>
            <Text style={[styles.sectionSubtitle, isCvr && { color: cvrTheme.text.secondary }]}>
              Choose a category to continue the audit
            </Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {categories.length > 0 ? (
              categories.map((cat) => {
                const catStatus = categoryCompletionStatus[cat] || { completed: 0, total: 0, isComplete: false };
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                      isCvr && { backgroundColor: isSelected ? cvrTheme.accent.purple : cvrTheme.background.card }
                    ]}
                    onPress={() => {
                      handleCategorySelect(cat);
                      // Auto-advance to checklist when category is selected
                      setCurrentStep(2);
                    }}
                  >
                    <View style={styles.categoryCardContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={[
                          styles.categoryName,
                          isSelected && { color: isCvr ? '#fff' : themeConfig.primary.main },
                          isCvr && { color: isSelected ? '#fff' : cvrTheme.text.primary }
                        ]}>
                          {cat}
                        </Text>
                        {catStatus.isComplete && (
                          <Icon name="check-circle" size={20} color={isCvr ? cvrTheme.accent.green : themeConfig.success.main} />
                        )}
                      </View>
                      <Text style={[
                        styles.categoryCount,
                        isSelected && { color: isCvr ? 'rgba(255,255,255,0.8)' : themeConfig.text.secondary },
                        isCvr && { color: isSelected ? 'rgba(255,255,255,0.8)' : cvrTheme.text.secondary }
                      ]}>
                        {catStatus.completed} of {catStatus.total} items completed
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>No categories available</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Step 2: Audit Checklist (directly after Store Information, no category selection) */}
      {currentStep === 2 && (
        <View style={styles.container}>
          {/* Fixed Header with Category Tabs and Progress */}
          <View style={[styles.stickyHeader, isCvr && { backgroundColor: cvrTheme.background.elevated, borderBottomColor: cvrTheme.input.border }]}>
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
                            ellipsizeMode="middle"
                          >
                            {getCategoryTabLabel(cat)}
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
                if (!filteredItems.length) return null;

                // Calculate detailed breakdown - use local state for real-time display
                const requiredItems = filteredItems.filter(item => item.is_required);
                const missingRequired = requiredItems.filter(item => !isItemComplete(item));
                const itemsNeedingPhotos = filteredItems.filter(item => {
                  const fieldType = getEffectiveItemFieldType(item);
                  return item.is_required && fieldType === 'image_upload' && !photos[item.id];
                });
                
                // Calculate real-time completion for current category
                const currentCategoryCompleted = filteredItems.filter(item => {
                  const hasResponse = responses[item.id] && responses[item.id] !== 'pending' && responses[item.id] !== '';
                  const hasComment = comments[item.id] && String(comments[item.id]).trim();
                  const hasPhoto = !!photos[item.id];
                  const fieldType = getEffectiveItemFieldType(item);
                  const isAnswerType = isAnswerFieldType(fieldType);
                  const isImageType = fieldType === 'image_upload';
                  
                  if (isAnswerType) return hasComment;
                  if (isImageType) return hasPhoto;
                  return hasResponse;
                }).length;
                
                const percent = filteredItems.length > 0 ? Math.round((currentCategoryCompleted / filteredItems.length) * 100) : 0;
                const isComplete = currentCategoryCompleted === filteredItems.length && filteredItems.length > 0;
                
                return (
                  <View>
                    <View style={[styles.categoryProgressBar, isCvr && { backgroundColor: cvrTheme.input.border }]}>
                      <View 
                        style={[
                          styles.categoryProgressFill, 
                          { 
                            width: `${percent}%`,
                            backgroundColor: isComplete ? (isCvr ? cvrTheme.accent.green : themeConfig.success.main) : (isCvr ? cvrTheme.accent.purple : themeConfig.primary.main)
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
            
            {sectionedItems.map((entry, index) => {
              if (entry.type === 'section') {
                const sectionData = entry.section;
                const sectionItems = sectionData.items;
                const sectionCompleted = sectionItems.filter(item => isItemComplete(item)).length;
                const sectionTotal = sectionItems.length;
                const isSectionExpanded = expandedSections[sectionData.name] !== false;

                return (
                  <View key={`section-${sectionData.name}`} style={styles.sectionContainer}>
                    <TouchableOpacity
                      style={[
                        styles.sectionHeader,
                        isCvr && { backgroundColor: cvrTheme.background.card, borderColor: cvrTheme.input.border }
                      ]}
                      onPress={() => setExpandedSections(prev => ({ ...prev, [sectionData.name]: !isSectionExpanded }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sectionTitle, isCvr && { color: cvrTheme.text.primary }]}>
                        {sectionData.name}
                      </Text>
                      <View style={styles.sectionMeta}>
                        <Text style={[styles.sectionCount, isCvr && { color: cvrTheme.text.secondary }]}>
                          {sectionCompleted}/{sectionTotal}
                        </Text>
                        <Icon
                          name={isSectionExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={22}
                          color={isCvr ? cvrTheme.text.secondary : themeConfig.text.secondary}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }

              const item = entry.item || entry;
              const itemIndex = itemIndexMap[item.id] ?? index;
              const isPreviousFailure = failedItemIds.has(item.id) && !isItemComplete(item);
              const failureInfo = previousFailures.find(f => f.item_id === item.id);
              const fieldType = getEffectiveItemFieldType(item);
              const optionType = isOptionFieldType(fieldType);
              const answerType = isAnswerFieldType(fieldType);
              const isMissingRequiredPhoto = item.is_required && fieldType === 'image_upload' && !photos[item.id];
              
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
                      {itemIndex + 1}. {item.title}
                      {item.is_required && <Text style={styles.required}> *</Text>}
                    </Text>
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
              {categories.length <= 1 && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => setCurrentStep(0)}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={[styles.buttonText, { marginLeft: 8 }]}>Saving...</Text>
                  </View>
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
    padding: 20,
    backgroundColor: themeConfig.background.default,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: themeConfig.text.secondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: themeConfig.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: themeConfig.text.secondary,
    fontSize: 14,
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
  stickyHeader: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  sectionContainer: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: themeConfig.borderRadius.medium,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: themeConfig.text.secondary,
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


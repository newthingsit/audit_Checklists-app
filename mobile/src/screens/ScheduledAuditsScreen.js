import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  AppState
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { themeConfig, cvrTheme, isCvrTemplate } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';

// Auto-refresh interval in milliseconds (60 seconds to prevent rate limiting)
const AUTO_REFRESH_INTERVAL = 60000;

const getStatusValue = (status) => {
  if (!status) return 'pending';
  return status.toLowerCase();
};

const formatStatusLabel = (status) => {
  const value = getStatusValue(status);
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const ScheduledAuditsScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkedAudits, setLinkedAudits] = useState({}); // Map of scheduleId -> auditId
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [reschedulingSchedule, setReschedulingSchedule] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rescheduleCount, setRescheduleCount] = useState({ count: 0, limit: 2, remaining: 2 });
  const [toastMessage, setToastMessage] = useState(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  // Track if this is initial mount to prevent double fetching
  const isInitialMount = useRef(true);

  // Initial fetch - only on mount
  useEffect(() => {
    if (user) {
      fetchScheduledAudits();
      fetchRescheduleCount();
    }
  }, [user]);

  // Auto-refresh when screen is focused (but not on initial mount)
  useEffect(() => {
    if (isFocused && user) {
      // Skip immediate fetch on initial mount since the first useEffect handles it
      if (!isInitialMount.current) {
        // Fetch immediately when screen comes back into focus
        fetchScheduledAuditsSilent();
      }
      isInitialMount.current = false;
      
      // Set up auto-refresh interval
      intervalRef.current = setInterval(() => {
        fetchScheduledAuditsSilent();
      }, AUTO_REFRESH_INTERVAL);
    } else {
      // Clear interval when screen loses focus
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFocused, user]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isFocused && user) {
        fetchScheduledAuditsSilent();
      }
      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [isFocused, user]);

  // Silent fetch for auto-refresh (no loading spinners)
  const fetchScheduledAuditsSilent = async () => {
    try {
      // Use throttled request - remove cache-busting to allow caching
      const response = await axios.get(`${API_BASE_URL}/scheduled-audits`);
      let schedulesData = response.data.schedules || [];
      schedulesData = schedulesData.filter(schedule => {
        const status = getStatusValue(schedule.status);
        return status !== 'completed';
      });
      setSchedules(schedulesData);

      // Fetch linked audits for in_progress scheduled audits
      const inProgressSchedules = schedulesData.filter(s => getStatusValue(s.status) === 'in_progress');
      const auditsMap = {};
      
      if (inProgressSchedules.length > 0) {
        const auditPromises = inProgressSchedules.map(schedule =>
          axios.get(`${API_BASE_URL}/audits/by-scheduled/${schedule.id}`)
            .then(response => ({ 
              scheduleId: schedule.id, 
              auditId: response.data.audit.id,
              auditStatus: response.data.audit.status 
            }))
            .catch(() => ({ scheduleId: schedule.id, auditId: null, auditStatus: null }))
        );
        const auditResults = await Promise.all(auditPromises);
        auditResults.forEach(({ scheduleId, auditId, auditStatus }) => {
          if (auditId) {
            auditsMap[scheduleId] = { auditId, auditStatus };
          }
        });
      }
      
      // Always update linkedAudits to clear old entries and ensure consistency
      setLinkedAudits(auditsMap);
    } catch (error) {
      // Silent fail for background refresh
      console.error('[Mobile] Silent refresh error:', error.message);
    }
  };

  const fetchRescheduleCount = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scheduled-audits/reschedule-count`);
      const data = response.data;
      // Handle both web keys (rescheduleCount, remainingReschedules) and mobile keys (count, remaining)
      setRescheduleCount({
        count: data.count !== undefined ? data.count : (data.rescheduleCount || 0),
        limit: data.limit || 2,
        remaining: data.remaining !== undefined ? data.remaining : (data.remainingReschedules || 2)
      });
    } catch (error) {
      console.error('[Mobile] Error fetching reschedule count:', error);
      // Set default values on error instead of crashing
      setRescheduleCount({ count: 0, limit: 2, remaining: 2 });
    }
  };

  const canStartSchedule = (schedule) => {
    if (!schedule) return false;
    
    // Check permission to start scheduled audits - must come from role
    const hasStartPermission = hasPermission(userPermissions, 'start_scheduled_audits') || 
                               hasPermission(userPermissions, 'manage_scheduled_audits') || 
                               isAdmin(user);
    const isManager = hasPermission(userPermissions, 'manage_scheduled_audits') || isAdmin(user);
    
    if (!hasStartPermission) return false;
    
    // Allow starting if status is null (pending) or 'pending'
    const statusValue = getStatusValue(schedule.status);
    const isPending = !schedule.status || statusValue === 'pending';
    if (!isPending) return false;
    
    // Allow starting on scheduled date or any date (allows pre-poning)
    // Backend will handle the actual date validation
    // Frontend allows any date to enable pre-poning functionality
    
    // Managers/Admins can start regardless of assignment
    if (isManager) return true;

    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    if (schedule.assigned_to) {
      return isCreator || isAssignee;
    }
    return isCreator;
  };

  const handleStartAudit = (schedule) => {
    try {
      if (!canStartSchedule(schedule)) {
        Alert.alert('Cannot Start', 'You cannot start this scheduled audit.');
        return;
      }
      
      // Validate schedule has required fields
      if (!schedule || !schedule.id) {
        Alert.alert('Error', 'Invalid scheduled audit. Please try again.');
        console.error('[ScheduledAuditsScreen] Invalid schedule:', schedule);
        return;
      }
      
      // Validate templateId
      const templateId = parseInt(schedule.template_id, 10);
      if (!templateId || templateId <= 0) {
        Alert.alert('Error', 'Invalid template ID for this scheduled audit.');
        console.error('[ScheduledAuditsScreen] Invalid templateId:', {
          raw: schedule.template_id,
          parsed: templateId
        });
        return;
      }
      
      // Validate locationId if provided
      const locationId = schedule.location_id ? parseInt(schedule.location_id, 10) : null;
      if (schedule.location_id && (!locationId || locationId <= 0)) {
        Alert.alert('Error', 'Invalid location ID for this scheduled audit.');
        console.error('[ScheduledAuditsScreen] Invalid locationId:', {
          raw: schedule.location_id,
          parsed: locationId
        });
        return;
      }
      
      console.log('[ScheduledAuditsScreen] Starting scheduled audit:', {
        scheduleId: schedule.id,
        templateId,
        locationId,
        scheduleName: schedule.name
      });
      
      // Navigate directly to AuditForm in the same stack (DashboardStack)
      navigation.navigate('AuditForm', {
        templateId,
        scheduledAuditId: schedule.id,
        locationId: locationId || null,
      });
    } catch (error) {
      console.error('[ScheduledAuditsScreen] Error in handleStartAudit:', error);
      Alert.alert('Error', 'Failed to start audit. Please try again.');
    }
  };

  const handleContinueAudit = (schedule) => {
    try {
      const linkedAudit = linkedAudits[schedule.id];
      // Support both old format (just auditId number) and new format (object with auditId and auditStatus)
      const auditId = linkedAudit ? (typeof linkedAudit === 'object' ? linkedAudit.auditId : linkedAudit) : null;
      
      if (!auditId) {
        Alert.alert('Error', 'No audit found to continue.');
        console.error('[ScheduledAuditsScreen] No auditId found for scheduled audit:', schedule.id);
        return;
      }
      
      // Validate schedule has required fields
      if (!schedule || !schedule.id) {
        Alert.alert('Error', 'Invalid scheduled audit. Please try again.');
        console.error('[ScheduledAuditsScreen] Invalid schedule:', schedule);
        return;
      }
      
      // Validate templateId
      const templateId = parseInt(schedule.template_id, 10);
      if (!templateId || templateId <= 0) {
        Alert.alert('Error', 'Invalid template ID for this scheduled audit.');
        console.error('[ScheduledAuditsScreen] Invalid templateId:', {
          raw: schedule.template_id,
          parsed: templateId
        });
        return;
      }
      
      // Validate locationId if provided
      const locationId = schedule.location_id ? parseInt(schedule.location_id, 10) : null;
      if (schedule.location_id && (!locationId || locationId <= 0)) {
        Alert.alert('Error', 'Invalid location ID for this scheduled audit.');
        console.error('[ScheduledAuditsScreen] Invalid locationId:', {
          raw: schedule.location_id,
          parsed: locationId
        });
        return;
      }
      
      console.log('[ScheduledAuditsScreen] Continuing scheduled audit:', {
        auditId,
        scheduleId: schedule.id,
        templateId,
        locationId
      });
      
      // Navigate to AuditForm to continue editing (preserves state better than AuditDetail)
      navigation.navigate('AuditForm', {
        auditId: auditId,
        templateId,
        scheduledAuditId: schedule.id,
        locationId: locationId || null,
      });
    } catch (error) {
      console.error('[ScheduledAuditsScreen] Error in handleContinueAudit:', error);
      Alert.alert('Error', 'Failed to continue audit. Please try again.');
    }
  };

  const canContinueSchedule = (schedule) => {
    const statusValue = getStatusValue(schedule.status);
    const linkedAudit = linkedAudits[schedule.id];
    
    // Only show "Continue Audit" if:
    // 1. Scheduled audit status is 'in_progress'
    // 2. There's a linked audit (support both old format: number, and new format: object)
    // 3. The linked audit is NOT completed (safety check)
    if (statusValue !== 'in_progress') return false;
    
    if (!linkedAudit) return false;
    
    // Support both old format (just auditId number) and new format (object with auditId and auditStatus)
    const auditId = typeof linkedAudit === 'object' ? linkedAudit.auditId : linkedAudit;
    const auditStatus = typeof linkedAudit === 'object' ? linkedAudit.auditStatus : null;
    
    if (!auditId) return false;
    
    // If we have auditStatus, check it's not completed
    if (auditStatus && auditStatus === 'completed') return false;
    
    return true;
  };

  // Allow recovery when status is in_progress but no linked audit is found (API miss or desync)
  const canRecoverSchedule = (schedule) => {
    const statusValue = getStatusValue(schedule.status);
    if (statusValue !== 'in_progress') return false;

    const linkedAudit = linkedAudits[schedule.id];
    if (linkedAudit) return false;

    // Reuse start permissions for safety
    const hasStartPermission = hasPermission(userPermissions, 'start_scheduled_audits') || 
                               hasPermission(userPermissions, 'manage_scheduled_audits') || 
                               isAdmin(user);
    return hasStartPermission;
  };

  const handleRecoverAudit = (schedule) => {
    if (!canRecoverSchedule(schedule)) return;

    // Validate schedule data before showing dialog
    if (!schedule || !schedule.id || !schedule.template_id) {
      Alert.alert('Error', 'Invalid scheduled audit data. Please try again.');
      console.error('[ScheduledAuditsScreen] Invalid schedule in handleRecoverAudit:', schedule);
      return;
    }

    const templateId = parseInt(schedule.template_id, 10);
    if (!templateId || templateId <= 0) {
      Alert.alert('Error', 'Invalid template ID for this scheduled audit.');
      console.error('[ScheduledAuditsScreen] Invalid templateId in handleRecoverAudit:', {
        raw: schedule.template_id,
        parsed: templateId
      });
      return;
    }

    Alert.alert(
      'Resume Audit',
      'This scheduled audit is marked in progress but no linked audit was found. Do you want to reopen it now?'
      , [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reopen', onPress: () => {
          const locationId = schedule.location_id ? parseInt(schedule.location_id, 10) : null;
          console.log('[ScheduledAuditsScreen] Recovering audit:', {
            scheduleId: schedule.id,
            templateId,
            locationId
          });
          navigation.navigate('AuditForm', {
            templateId,
            scheduledAuditId: schedule.id,
            locationId: locationId || null,
          });
        } }
      ]
    );
  };

  const canReschedule = (schedule) => {
    if (!schedule) return false;
    
    // Check permission to reschedule
    const hasReschedulePermission = hasPermission(userPermissions, 'reschedule_scheduled_audits') || 
                                    hasPermission(userPermissions, 'manage_scheduled_audits') || 
                                    isAdmin(user);
    
    if (!hasReschedulePermission) return false;
    
    // User can reschedule if they are assigned to it or created it
    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    const statusValue = getStatusValue(schedule.status);
    const isPending = !schedule.status || statusValue === 'pending';
    // Can only reschedule pending audits
    return isPending && (isCreator || isAssignee || isAdmin(user));
  };

  const showToast = (message, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const handleOpenRescheduleModal = async (schedule) => {
    // Check reschedule count for this specific scheduled audit (checklist)
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/scheduled-audits/reschedule-count?scheduled_audit_id=${schedule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const countData = response.data;
      if (countData.count >= countData.limit) {
        showToast(`This checklist has already been rescheduled ${countData.count} times. Each checklist can be rescheduled up to ${countData.limit} times individually.`);
        return;
      }
    } catch (error) {
      console.error('Error checking reschedule count:', error);
      // Continue anyway - don't block user if check fails
    }
    
    setReschedulingSchedule(schedule);
    // Set the initial date for the picker - use scheduled_date or default to today
    // Allow both backdated and future dates
    let initialDate;
    if (schedule.scheduled_date) {
      initialDate = new Date(schedule.scheduled_date);
    } else {
      // Default to today's date if no scheduled date
      initialDate = new Date();
    }
    
    // Normalize the date to avoid timezone issues
    initialDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    
    setSelectedDate(initialDate);
    const year = initialDate.getFullYear();
    const month = String(initialDate.getMonth() + 1).padStart(2, '0');
    const day = String(initialDate.getDate()).padStart(2, '0');
    setNewRescheduleDate(`${year}-${month}-${day}`);
    setShowDatePicker(false); // Start with picker closed
    setRescheduleModalVisible(true);
  };

  const handleCloseRescheduleModal = () => {
    setRescheduleModalVisible(false);
    setReschedulingSchedule(null);
    setNewRescheduleDate('');
    setShowDatePicker(false);
  };

  const handleDateChange = (event, date) => {
    // Handle Android date picker
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      // On Android, event.type can be 'set' or 'dismissed'
      if (event.type === 'set' && date) {
        // Normalize the date to avoid timezone issues
        const normalizedDate = new Date(date);
        normalizedDate.setHours(12, 0, 0, 0);
        setSelectedDate(normalizedDate);
        const year = normalizedDate.getFullYear();
        const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
        const day = String(normalizedDate.getDate()).padStart(2, '0');
        setNewRescheduleDate(`${year}-${month}-${day}`);
      }
      // If dismissed, do nothing (keep current date)
      return;
    }
    
    // Handle iOS date picker - update in real-time as user scrolls
    if (Platform.OS === 'ios') {
      if (date) {
        // Normalize the date to avoid timezone issues
        const normalizedDate = new Date(date);
        normalizedDate.setHours(12, 0, 0, 0);
        setSelectedDate(normalizedDate);
        const year = normalizedDate.getFullYear();
        const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
        const day = String(normalizedDate.getDate()).padStart(2, '0');
        setNewRescheduleDate(`${year}-${month}-${day}`);
      }
    }
  };

  const handleDoneDatePicker = () => {
    // When Done is pressed on iOS, ensure the date is properly set
    if (selectedDate) {
      const normalizedDate = new Date(selectedDate);
      normalizedDate.setHours(12, 0, 0, 0);
      const year = normalizedDate.getFullYear();
      const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
      const day = String(normalizedDate.getDate()).padStart(2, '0');
      setNewRescheduleDate(`${year}-${month}-${day}`);
    }
    setShowDatePicker(false);
  };

  const handleReschedule = async () => {
    if (!reschedulingSchedule || !newRescheduleDate) {
      Alert.alert('Error', 'Please select a new date');
      return;
    }

    if (rescheduleCount.count >= rescheduleCount.limit) {
      showToast(`You have already rescheduled ${rescheduleCount.count} audits this month. The limit is ${rescheduleCount.limit} reschedules per month.`);
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newRescheduleDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    // Validate date is not in the past
    // Parse date in local timezone to match today comparison
    const [year, month, day] = newRescheduleDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Cannot reschedule to a past date');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/scheduled-audits/${reschedulingSchedule.id}/reschedule`,
        { new_date: newRescheduleDate }
      );
      Alert.alert('Success', response.data.message || 'Audit rescheduled successfully!');
      handleCloseRescheduleModal();
      fetchScheduledAudits();
      fetchRescheduleCount();
    } catch (error) {
      console.error('[Mobile] Error rescheduling audit:', error);
      
      // Extract error message from various possible response formats
      let errorMessage = 'Failed to reschedule audit';
      if (error.response?.data) {
        errorMessage = error.response.data.message || 
                      error.response.data.error || 
                      errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if it's a limit reached error - show as notification, not error
      const errorLower = errorMessage.toLowerCase();
      const isLimitError = error.response?.status === 400 && 
                          (errorLower.includes('limit') || 
                           errorLower.includes('rescheduled') ||
                           errorLower.includes('already rescheduled') ||
                           errorLower.includes('reschedule limit'));
      
      if (isLimitError) {
        // Show as info notification (blue toast)
        showToast(errorMessage);
      } else {
        // For other errors, show as alert
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const fetchScheduledAudits = async () => {
    try {
      console.log('[Mobile] Fetching scheduled audits from:', `${API_BASE_URL}/scheduled-audits`);
      console.log('[Mobile] Current user:', user?.email);
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`${API_BASE_URL}/scheduled-audits`, {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      console.log('[Mobile] Response status:', response.status);
      console.log('[Mobile] Response data:', JSON.stringify(response.data, null, 2));
      let schedulesData = response.data.schedules || [];
      
      // Filter out completed scheduled audits on frontend as backup
      // (Backend should also filter, but this ensures it works)
      schedulesData = schedulesData.filter(schedule => {
        const status = getStatusValue(schedule.status);
        return status !== 'completed';
      });
      
      console.log('[Mobile] Fetched scheduled audits (after filtering):', schedulesData.length);
      if (schedulesData.length > 0) {
        console.log('[Mobile] First schedule:', JSON.stringify(schedulesData[0], null, 2));
      }
      setSchedules(schedulesData);

      // Fetch linked audits for in_progress scheduled audits
      const inProgressSchedules = schedulesData.filter(s => getStatusValue(s.status) === 'in_progress');
      if (inProgressSchedules.length > 0) {
        const auditPromises = inProgressSchedules.map(schedule =>
          axios.get(`${API_BASE_URL}/audits/by-scheduled/${schedule.id}`)
            .then(response => ({ 
              scheduleId: schedule.id, 
              auditId: response.data.audit.id,
              auditStatus: response.data.audit.status 
            }))
            .catch(() => ({ scheduleId: schedule.id, auditId: null, auditStatus: null }))
        );
        const auditResults = await Promise.all(auditPromises);
        const auditsMap = {};
        auditResults.forEach(({ scheduleId, auditId, auditStatus }) => {
          if (auditId) {
            auditsMap[scheduleId] = { auditId, auditStatus };
          }
        });
        setLinkedAudits(auditsMap);
      }
    } catch (error) {
      console.error('[Mobile] Error fetching scheduled audits:', error);
      if (error.response) {
        console.error('[Mobile] Error response status:', error.response.status);
        console.error('[Mobile] Error response data:', error.response.data);
      } else if (error.request) {
        console.error('[Mobile] No response received:', error.request);
      } else {
        console.error('[Mobile] Error setting up request:', error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduledAudits();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    const value = getStatusValue(status);
    switch (value) {
      case 'completed':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'overdue':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const renderSchedule = ({ item }) => {
    const isCvr = isCvrTemplate(item.template_name);
    const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date) : null;
    const today = new Date();
    const isDueToday = scheduledDate && scheduledDate.getFullYear() === today.getFullYear() &&
      scheduledDate.getMonth() === today.getMonth() && scheduledDate.getDate() === today.getDate();
    return (
    <TouchableOpacity style={[styles.scheduleCard, isCvr && { backgroundColor: cvrTheme.background.card }]}>
      <View style={styles.scheduleHeader}>
        <View style={[styles.scheduleIconContainer, isCvr && { backgroundColor: cvrTheme.accent.purple + '30' }]}>
          <Icon name="event" size={24} color={isCvr ? cvrTheme.accent.purple : '#1976d2'} />
        </View>
        <View style={styles.scheduleInfo}>
          <Text style={[styles.scheduleTitle, isCvr && { color: cvrTheme.text.primary }]}>{item.template_name || 'Untitled Audit'}</Text>
          {item.location_name && (
            <View style={styles.locationRow}>
              <Icon name="location-on" size={16} color={isCvr ? cvrTheme.text.secondary : '#666'} />
              <Text style={[styles.locationText, isCvr && { color: cvrTheme.text.secondary }]}>{item.location_name}</Text>
              {item.store_number && (
                <Text style={[styles.storeNumber, isCvr && { color: cvrTheme.text.secondary }]}> (#{item.store_number})</Text>
              )}
            </View>
          )}
        </View>
        {isCvr && isDueToday && (canStartSchedule(item) || canContinueSchedule(item)) && (
          <View style={[styles.statusBadge, { backgroundColor: cvrTheme.accent.due }]}>
            <Text style={styles.statusText}>Due 11:59 PM</Text>
          </View>
        )}
        {(!isCvr || !isDueToday) && (item.status || item.status === null) && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(getStatusValue(item.status)) }]}>
            <Text style={styles.statusText}>{formatStatusLabel(item.status)}</Text>
          </View>
        )}
      </View>

      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <Icon name="person" size={16} color={isCvr ? cvrTheme.text.secondary : '#666'} />
          <Text style={[styles.detailText, isCvr && { color: cvrTheme.text.secondary }]}>
            {item.assigned_to_name || item.assigned_to_email || 'Unassigned'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="schedule" size={16} color={isCvr ? cvrTheme.text.secondary : '#666'} />
          <Text style={[styles.detailText, isCvr && { color: cvrTheme.text.secondary }]}>{formatDate(item.scheduled_date)}</Text>
        </View>
        {item.frequency && item.frequency !== 'once' && (
          <View style={styles.detailRow}>
            <Icon name="repeat" size={16} color={isCvr ? cvrTheme.text.secondary : '#666'} />
            <Text style={[styles.detailText, isCvr && { color: cvrTheme.text.secondary }]}>{item.frequency}</Text>
          </View>
        )}
      </View>

      {canContinueSchedule(item) && (
        <TouchableOpacity
          style={[styles.startButton, styles.continueButton]}
          onPress={() => handleContinueAudit(item)}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Continue Audit</Text>
        </TouchableOpacity>
      )}
      {canRecoverSchedule(item) && (
        <TouchableOpacity
          style={[styles.startButton, styles.continueButton]}
          onPress={() => handleRecoverAudit(item)}
        >
          <Icon name="replay" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Resume (Recover)</Text>
        </TouchableOpacity>
      )}
      {canReschedule(item) && (
        <TouchableOpacity
          style={styles.rescheduleButton}
          onPress={() => handleOpenRescheduleModal(item)}
        >
          <Icon name="event-available" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Reschedule</Text>
        </TouchableOpacity>
      )}
      {canStartSchedule(item) && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => handleStartAudit(item)}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start Audit</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  console.log('[Mobile] Rendering ScheduledAuditsScreen with', schedules.length, 'schedules');
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduled Audits</Text>
        <Text style={styles.headerSubtitle}>
          {schedules.length} {schedules.length === 1 ? 'audit' : 'audits'} scheduled
        </Text>
      </View>
      <FlatList
        data={schedules}
        renderItem={renderSchedule}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No scheduled audits</Text>
            <Text style={styles.emptySubtext}>
              Scheduled audits assigned to you will appear here
            </Text>
          </View>
        }
      />

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseRescheduleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Audit</Text>
              <TouchableOpacity onPress={handleCloseRescheduleModal}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {reschedulingSchedule && (
                <>
                  <View style={styles.scheduleInfoBox}>
                    <Text style={styles.scheduleInfoLabel}>Template:</Text>
                    <Text style={styles.scheduleInfoValue}>{reschedulingSchedule.template_name}</Text>
                  </View>
                  <View style={styles.scheduleInfoBox}>
                    <Text style={styles.scheduleInfoLabel}>Current Date:</Text>
                    <Text style={styles.scheduleInfoValue}>{formatDate(reschedulingSchedule.scheduled_date)}</Text>
                  </View>
                  {reschedulingSchedule.location_name && (
                    <View style={styles.scheduleInfoBox}>
                      <Text style={styles.scheduleInfoLabel}>Location:</Text>
                      <Text style={styles.scheduleInfoValue}>{reschedulingSchedule.location_name}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Scheduled Date *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      // For Android, show the picker immediately
                      setShowDatePicker(true);
                    } else {
                      // For iOS, toggle the picker
                      setShowDatePicker(!showDatePicker);
                    }
                  }}
                >
                  <View style={styles.dateInputContent}>
                    <Text style={[styles.dateInputText, !newRescheduleDate && styles.dateInputPlaceholder]}>
                      {newRescheduleDate || 'Select a date'}
                    </Text>
                    <Icon name="calendar-today" size={20} color="#1976d2" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.inputHint}>
                  Tap to select a date. Date must be today or later.
                </Text>
                {newRescheduleDate && newRescheduleDate.length === 10 && (() => {
                  const [year, month, day] = newRescheduleDate.split('-').map(Number);
                  const selectedDateObj = new Date(year, month - 1, day);
                  selectedDateObj.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (selectedDateObj < today) {
                    return (
                      <Text style={styles.errorText}>
                        ⚠️ Cannot reschedule to a past date
                      </Text>
                    );
                  }
                  return null;
                })()}
                
                {/* iOS Date Picker - shown inline */}
                {showDatePicker && Platform.OS === 'ios' && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity
                        onPress={handleDoneDatePicker}
                        style={styles.iosPickerButton}
                      >
                        <Text style={styles.iosPickerButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      style={styles.iosDatePicker}
                    />
                  </View>
                )}
                
                {/* Android Date Picker - shown as modal */}
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {rescheduleCount.count >= rescheduleCount.limit && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    You have reached the monthly reschedule limit of {rescheduleCount.limit}. 
                    You cannot reschedule more audits this month.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseRescheduleModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.rescheduleModalButton,
                  (!newRescheduleDate || rescheduleCount.count >= rescheduleCount.limit) && styles.disabledButton
                ]}
                onPress={handleReschedule}
                disabled={!newRescheduleDate || rescheduleCount.count >= rescheduleCount.limit}
              >
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Icon name="info" size={20} color="#fff" style={styles.toastIcon} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  rescheduleCountText: {
    fontSize: 12,
    color: '#1976d2',
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  storeNumber: {
    fontSize: 14,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  scheduleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: themeConfig.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...themeConfig.shadows.small,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: themeConfig.secondary.main,
  },
  rescheduleButton: {
    flexDirection: 'row',
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...themeConfig.shadows.small,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  scheduleInfoBox: {
    marginBottom: 15,
  },
  scheduleInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scheduleInfoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    minHeight: 48,
    justifyContent: 'center',
  },
  dateInputContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  dateInputPlaceholder: {
    color: '#999',
  },
  iosPickerContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  iosPickerButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  iosPickerButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  rescheduleModalButton: {
    backgroundColor: '#2196f3',
  },
  rescheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: '100%',
  },
  toastIcon: {
    marginRight: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ScheduledAuditsScreen;

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { themeConfig } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';

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
  const navigation = useNavigation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  useEffect(() => {
    if (user) {
      fetchScheduledAudits();
    }
  }, [user]);

  const canStartSchedule = (schedule) => {
    if (!schedule) return false;
    
    // Check permission to start scheduled audits - must come from role
    const hasStartPermission = hasPermission(userPermissions, 'start_scheduled_audits') || 
                               hasPermission(userPermissions, 'manage_scheduled_audits') || 
                               isAdmin(user);
    
    if (!hasStartPermission) return false;
    
    // Allow starting if status is null (pending) or 'pending'
    const statusValue = getStatusValue(schedule.status);
    const isPending = !schedule.status || statusValue === 'pending';
    if (!isPending) return false;
    const isCreator = schedule.created_by === user?.id;
    const isAssignee = schedule.assigned_to ? schedule.assigned_to === user?.id : false;
    if (schedule.assigned_to) {
      return isCreator || isAssignee;
    }
    return isCreator;
  };

  const handleStartAudit = (schedule) => {
    if (!canStartSchedule(schedule)) {
      Alert.alert('Cannot Start', 'You cannot start this scheduled audit.');
      return;
    }
    // Navigate to audit form with scheduled audit info
    // Navigate directly to AuditForm in the same stack (DashboardStack)
    navigation.navigate('AuditForm', {
      templateId: schedule.template_id,
      scheduledAuditId: schedule.id,
      locationId: schedule.location_id || null,
    });
  };

  const handleContinueAudit = (schedule) => {
    const auditId = linkedAudits[schedule.id];
    if (auditId) {
      // Navigate to History tab, then to AuditDetail screen
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('History', {
          screen: 'AuditDetail',
          params: { id: auditId }
        });
      } else {
        // Fallback: navigate directly if root navigation not available
        navigation.navigate('History', {
          screen: 'AuditDetail',
          params: { id: auditId }
        });
      }
    }
  };

  const canContinueSchedule = (schedule) => {
    return getStatusValue(schedule.status) === 'in_progress' && linkedAudits[schedule.id];
  };

  const fetchScheduledAudits = async () => {
    try {
      console.log('[Mobile] Fetching scheduled audits from:', `${API_BASE_URL}/scheduled-audits`);
      console.log('[Mobile] Current user:', user?.email);
      const response = await axios.get(`${API_BASE_URL}/scheduled-audits`);
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
            .then(response => ({ scheduleId: schedule.id, auditId: response.data.audit.id }))
            .catch(() => ({ scheduleId: schedule.id, auditId: null }))
        );
        const auditResults = await Promise.all(auditPromises);
        const auditsMap = {};
        auditResults.forEach(({ scheduleId, auditId }) => {
          if (auditId) {
            auditsMap[scheduleId] = auditId;
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
    console.log('[Mobile] Rendering schedule:', item.id, item.template_name);
    return (
    <TouchableOpacity style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleIconContainer}>
          <Icon name="event" size={24} color="#1976d2" />
        </View>
        <View style={styles.scheduleInfo}>
          <Text style={styles.scheduleTitle}>{item.template_name || 'Untitled Audit'}</Text>
          {item.location_name && (
            <View style={styles.locationRow}>
              <Icon name="location-on" size={16} color="#666" />
              <Text style={styles.locationText}>{item.location_name}</Text>
              {item.store_number && (
                <Text style={styles.storeNumber}> (#{item.store_number})</Text>
              )}
            </View>
          )}
        </View>
        {(item.status || item.status === null) && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(getStatusValue(item.status)) }]}>
            <Text style={styles.statusText}>{formatStatusLabel(item.status)}</Text>
          </View>
        )}
      </View>

      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <Icon name="person" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.assigned_to_name || item.assigned_to_email || 'Unassigned'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDate(item.scheduled_date)}</Text>
        </View>
        {item.frequency && item.frequency !== 'once' && (
          <View style={styles.detailRow}>
            <Icon name="repeat" size={16} color="#666" />
            <Text style={styles.detailText}>{item.frequency}</Text>
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
    backgroundColor: '#1976d2',
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
    backgroundColor: '#ff9800',
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


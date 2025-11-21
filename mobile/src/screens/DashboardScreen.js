import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';

const { width } = Dimensions.get('window');
const cardWidth = (width - 45) / 2; // 2 cards per row with padding

const DashboardScreen = () => {
  const [stats, setStats] = useState({ templates: 0, audits: 0, completed: 0, pendingActions: 0 });
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  // Permission checks - permissions come from role only
  const canCreateAudit = hasPermission(userPermissions, 'create_audits') || 
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);
  const canViewActions = hasPermission(userPermissions, 'view_actions') ||
                         hasPermission(userPermissions, 'manage_actions') ||
                         isAdmin(user);
  const canViewAudits = hasPermission(userPermissions, 'view_audits') ||
                        hasPermission(userPermissions, 'manage_audits') ||
                        hasPermission(userPermissions, 'view_own_audits') ||
                        isAdmin(user);
  const canViewTemplates = hasPermission(userPermissions, 'display_templates') ||
                           hasPermission(userPermissions, 'view_templates') ||
                           hasPermission(userPermissions, 'manage_templates') ||
                           isAdmin(user);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Only fetch data if user has permission
      const fetchPromises = [
        // Templates - only if user can view templates
        canViewTemplates
          ? axios.get(`${API_BASE_URL}/templates`).catch(() => ({ data: { templates: [] } }))
          : Promise.resolve({ data: { templates: [] } }),
        // Audits - only if user can view audits
        canViewAudits
          ? axios.get(`${API_BASE_URL}/audits`).catch(() => ({ data: { audits: [] } }))
          : Promise.resolve({ data: { audits: [] } }),
        // Actions - only if user can view actions
        canViewActions 
          ? axios.get(`${API_BASE_URL}/actions`).catch(() => ({ data: { actions: [] } }))
          : Promise.resolve({ data: { actions: [] } })
      ];

      const [templatesRes, auditsRes, actionsRes] = await Promise.all(fetchPromises);

      const audits = auditsRes.data.audits || [];
      const completed = audits.filter(a => a.status === 'completed').length;
      const pendingActions = (actionsRes.data.actions || []).filter(a => a.status === 'pending').length;

      setStats({
        templates: templatesRes.data.templates?.length || 0,
        audits: audits.length,
        completed,
        pendingActions
      });

      setRecentAudits(audits.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const completionRate = stats.audits > 0 ? Math.round((stats.completed / stats.audits) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>
        <Text style={styles.subtitle}>Restaurant Audit Dashboard</Text>
      </View>

      <View style={styles.statsContainer}>
        {canViewTemplates && (
          <View style={styles.statCardWrapper}>
            <LinearGradient
              colors={themeConfig.dashboardCards.card1}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
                  <Icon name="checklist" size={32} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{stats.templates}</Text>
                <Text style={styles.statLabel}>Templates</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {canViewAudits && (
          <>
            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card2}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Icon name="history" size={32} color="#fff" />
                  </View>
                  <Text style={styles.statNumber}>{stats.audits}</Text>
                  <Text style={styles.statLabel}>Total Audits</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card3}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Icon name="check-circle" size={32} color="#fff" />
                  </View>
                  <Text style={styles.statNumber}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card4}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Icon name="trending-up" size={32} color="#fff" />
                  </View>
                  <Text style={styles.statNumber}>{completionRate}%</Text>
                  <Text style={styles.statLabel}>Completion Rate</Text>
                </View>
              </LinearGradient>
            </View>
          </>
        )}
      </View>

      {canViewAudits && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Audits</Text>
              <Text style={styles.sectionSubtitle}>Your latest audit activities</Text>
            </View>
            <View style={styles.actionButtons}>
              {(hasPermission(userPermissions, 'view_scheduled_audits') || isAdmin(user)) && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ScheduledAudits')}
                  style={styles.scheduledButton}
                >
                  <Icon name="schedule" size={18} color={themeConfig.primary.main} />
                  <Text style={styles.scheduledButtonText}>Scheduled</Text>
                </TouchableOpacity>
              )}
              {canCreateAudit && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Checklists')}
                  style={styles.newButton}
                >
                  <Icon name="add" size={20} color="#fff" />
                  <Text style={styles.newButtonText}>New Audit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {recentAudits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No audits yet</Text>
              <Text style={styles.emptySubtext}>Create your first audit!</Text>
            </View>
          ) : (
            recentAudits.map((audit) => (
              <TouchableOpacity
                key={audit.id}
                style={styles.auditCard}
                onPress={() => navigation.navigate('History', { screen: 'AuditDetail', params: { id: audit.id } })}
              >
                <View style={styles.auditCardHeader}>
                  <Text style={styles.auditName}>{audit.restaurant_name}</Text>
                  <View style={[styles.statusBadge, audit.status === 'completed' && styles.statusCompleted]}>
                    <Text style={styles.statusText}>{audit.status}</Text>
                  </View>
                </View>
                <Text style={styles.auditLocation}>{audit.location || 'No location'}</Text>
                <Text style={styles.auditTemplate}>{audit.template_name}</Text>
                {audit.score !== null && (
                  <Text style={styles.auditScore}>Score: {audit.score}%</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.default,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: themeConfig.text.secondary,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: cardWidth,
    marginBottom: 15,
    ...themeConfig.shadows.medium,
  },
  statCard: {
    borderRadius: themeConfig.borderRadius.large,
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  statCardContent: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  scheduledButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: themeConfig.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  scheduledButtonText: {
    color: themeConfig.primary.main,
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  newButton: {
    flexDirection: 'row',
    backgroundColor: themeConfig.primary.main,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    ...themeConfig.shadows.small,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  auditCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  auditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  auditName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusCompleted: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  auditLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  auditTemplate: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  auditScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});

export default DashboardScreen;


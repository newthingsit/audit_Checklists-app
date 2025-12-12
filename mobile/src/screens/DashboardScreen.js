import React, { useEffect, useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useOffline } from '../context/OfflineContext';
import { API_BASE_URL } from '../config/api';
import { themeConfig, getScoreColor } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';
import { SyncStatusBadge, PendingSyncSummary, ConnectionStatusDot } from '../components/OfflineIndicator';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const DashboardScreen = () => {
  const [stats, setStats] = useState({ templates: 0, audits: 0, completed: 0, pendingActions: 0 });
  const [recentAudits, setRecentAudits] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { isOnline } = useNetwork();
  const { offlineStats, triggerSync, prefetchForOffline } = useOffline();
  const userPermissions = user?.permissions || [];

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
  const canViewAnalytics = hasPermission(userPermissions, 'view_analytics') || isAdmin(user);
  const canViewScheduleAdherence = hasPermission(userPermissions, 'view_schedule_adherence') || 
                                    hasPermission(userPermissions, 'view_analytics') || 
                                    isAdmin(user);

  // Refresh user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (refreshUser) {
        refreshUser();
      }
    }, [refreshUser])
  );

  // Fetch data when component mounts or when user/permissions change
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id, user?.role, JSON.stringify(user?.permissions), fetchData]);

  const fetchData = useCallback(async () => {
    // Recalculate permissions inside fetchData to ensure we have the latest values
    const currentPermissions = user?.permissions || [];
    const canViewTemplatesNow = hasPermission(currentPermissions, 'display_templates') ||
                               hasPermission(currentPermissions, 'view_templates') ||
                               hasPermission(currentPermissions, 'manage_templates') ||
                               isAdmin(user);
    const canViewAuditsNow = hasPermission(currentPermissions, 'view_audits') ||
                            hasPermission(currentPermissions, 'manage_audits') ||
                            hasPermission(currentPermissions, 'view_own_audits') ||
                            isAdmin(user);
    const canViewActionsNow = hasPermission(currentPermissions, 'view_actions') ||
                             hasPermission(currentPermissions, 'manage_actions') ||
                             isAdmin(user);
    const canViewAnalyticsNow = hasPermission(currentPermissions, 'view_analytics') || isAdmin(user);

    try {
      const fetchPromises = [
        canViewTemplatesNow
          ? axios.get(`${API_BASE_URL}/templates`, { params: { _t: Date.now() } }).catch(() => ({ data: { templates: [] } }))
          : Promise.resolve({ data: { templates: [] } }),
        canViewAuditsNow
          ? axios.get(`${API_BASE_URL}/audits`).catch(() => ({ data: { audits: [] } }))
          : Promise.resolve({ data: { audits: [] } }),
        canViewActionsNow 
          ? axios.get(`${API_BASE_URL}/actions`).catch(() => ({ data: { actions: [] } }))
          : Promise.resolve({ data: { actions: [] } }),
        canViewAnalyticsNow
          ? axios.get(`${API_BASE_URL}/analytics/dashboard`).catch(() => ({ data: null }))
          : Promise.resolve({ data: null })
      ];

      const [templatesRes, auditsRes, actionsRes, analyticsRes] = await Promise.all(fetchPromises);

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
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Fetch data when component mounts or when user/permissions change
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id, user?.role, JSON.stringify(user?.permissions), fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh user data first to get updated permissions
    if (refreshUser) {
      await refreshUser();
    }
    // Then fetch dashboard data
    await fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeConfig.primary.main} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const completionRate = stats.audits > 0 ? Math.round((stats.completed / stats.audits) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[themeConfig.primary.main]}
          tintColor={themeConfig.primary.main}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <ConnectionStatusDot size={8} />
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <SyncStatusBadge onPress={triggerSync} />
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card1}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {(user?.name || 'U').substring(0, 2).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {isOnline 
            ? "Here's an overview of your audit activities"
            : "You're offline - showing cached data"
          }
        </Text>
      </View>

      {/* Pending Sync Summary - shows when there's data to sync */}
      {offlineStats.hasPendingSync && (
        <View style={styles.syncSummaryContainer}>
          <PendingSyncSummary onSyncPress={triggerSync} />
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {canViewTemplates && (
          <TouchableOpacity 
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('Checklists')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={themeConfig.dashboardCards.card1}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconBg}>
                <Icon name="checklist" size={24} color="#fff" />
              </View>
              <Text style={styles.statNumber}>{stats.templates}</Text>
              <Text style={styles.statLabel}>Templates</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {canViewAudits && (
          <>
            <TouchableOpacity 
              style={styles.statCardWrapper}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={themeConfig.dashboardCards.card2}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconBg}>
                  <Icon name="history" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{stats.audits}</Text>
                <Text style={styles.statLabel}>Total Audits</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card3}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconBg}>
                  <Icon name="check-circle" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={themeConfig.dashboardCards.card4}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconBg}>
                  <Icon name="trending-up" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{completionRate}%</Text>
                <Text style={styles.statLabel}>Completion</Text>
              </LinearGradient>
            </View>
          </>
        )}

        {/* Schedule Adherence Card */}
        {canViewScheduleAdherence && analytics?.scheduleAdherence !== undefined && (
          <View style={styles.statCardWrapper}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statIconBg}>
                <Icon name="schedule" size={24} color="#fff" />
              </View>
              <Text style={styles.statNumber}>
                {analytics.scheduleAdherence.adherence || analytics.scheduleAdherence.percentage || 0}%
              </Text>
              <Text style={styles.statLabel}>Schedule Adherence</Text>
              {analytics.scheduleAdherence.total > 0 && (
                <Text style={styles.statSubtext}>
                  {analytics.scheduleAdherence.onTime || analytics.scheduleAdherence.completedOnTime || 0} / {analytics.scheduleAdherence.total || analytics.scheduleAdherence.totalScheduled || 0} on time
                </Text>
              )}
            </LinearGradient>
          </View>
        )}
      </View>

      {/* Recent Audits Section */}
      {canViewAudits && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Audits</Text>
              <Text style={styles.sectionSubtitle}>Your latest activities</Text>
            </View>
            <View style={styles.actionButtons}>
              {(hasPermission(userPermissions, 'view_scheduled_audits') || isAdmin(user)) && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ScheduledAudits')}
                  style={styles.outlineButton}
                  activeOpacity={0.7}
                >
                  <Icon name="schedule" size={16} color={themeConfig.primary.main} />
                  <Text style={styles.outlineButtonText}>Scheduled</Text>
                </TouchableOpacity>
              )}
              {canCreateAudit && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Checklists')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={themeConfig.dashboardCards.card1}
                    style={styles.primaryButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="add" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>New</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {recentAudits.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Icon name="assignment" size={40} color={themeConfig.text.disabled} />
              </View>
              <Text style={styles.emptyTitle}>No audits yet</Text>
              <Text style={styles.emptySubtitle}>Start your first audit to see it here</Text>
              {canCreateAudit && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Checklists')}
                  activeOpacity={0.7}
                  style={styles.emptyButton}
                >
                  <LinearGradient
                    colors={themeConfig.dashboardCards.card1}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="add" size={18} color="#fff" />
                    <Text style={styles.emptyButtonText}>Create First Audit</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            recentAudits.map((audit, index) => (
              <TouchableOpacity
                key={audit.id}
                style={[styles.auditCard, index === 0 && styles.auditCardFirst]}
                onPress={() => navigation.navigate('History', { screen: 'AuditDetail', params: { id: audit.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.auditCardLeft}>
                  <View style={[
                    styles.auditStatusDot,
                    { backgroundColor: audit.status === 'completed' ? themeConfig.success.main : themeConfig.warning.main }
                  ]} />
                  <View style={styles.auditInfo}>
                    <Text style={styles.auditName} numberOfLines={1}>
                      {audit.restaurant_name}
                    </Text>
                    <Text style={styles.auditTemplate} numberOfLines={1}>
                      {audit.template_name}
                    </Text>
                    <Text style={styles.auditDate}>
                      {new Date(audit.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.auditCardRight}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: audit.status === 'completed' ? themeConfig.success.bg : themeConfig.warning.bg }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: audit.status === 'completed' ? themeConfig.success.dark : themeConfig.warning.dark }
                    ]}>
                      {audit.status === 'completed' ? 'Done' : 'In Progress'}
                    </Text>
                  </View>
                  {audit.score !== null && (
                    <Text style={[styles.auditScore, { color: getScoreColor(audit.score) }]}>
                      {audit.score}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          {recentAudits.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All Audits</Text>
              <Icon name="arrow-forward" size={18} color={themeConfig.primary.main} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
  },
  loadingText: {
    marginTop: 12,
    color: themeConfig.text.secondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: themeConfig.background.paper,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: themeConfig.borderRadius.xl,
    borderBottomRightRadius: themeConfig.borderRadius.xl,
    ...themeConfig.shadows.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginBottom: 2,
  },
  syncSummaryContainer: {
    marginTop: -8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: themeConfig.text.primary,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    ...themeConfig.shadows.small,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: themeConfig.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: themeConfig.borderRadius.large,
    padding: 16,
    minHeight: 110,
    ...themeConfig.shadows.medium,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  statSubtext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontWeight: '400',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeConfig.text.primary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1.5,
    borderColor: themeConfig.primary.main,
    backgroundColor: themeConfig.background.paper,
  },
  outlineButtonText: {
    color: themeConfig.primary.main,
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: themeConfig.borderRadius.medium,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    padding: 32,
    alignItems: 'center',
    ...themeConfig.shadows.small,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeConfig.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  auditCard: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeConfig.border.light,
    ...themeConfig.shadows.small,
  },
  auditCardFirst: {
    borderColor: themeConfig.primary.light,
    borderWidth: 1.5,
  },
  auditCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  auditStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  auditInfo: {
    flex: 1,
  },
  auditName: {
    fontSize: 15,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 2,
  },
  auditTemplate: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 2,
  },
  auditDate: {
    fontSize: 12,
    color: themeConfig.text.muted,
  },
  auditCardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeConfig.borderRadius.small,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  auditScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  viewAllText: {
    color: themeConfig.primary.main,
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default DashboardScreen;

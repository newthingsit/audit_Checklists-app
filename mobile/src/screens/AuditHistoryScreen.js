import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  AppState
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig, getScoreColor } from '../config/theme';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { NoHistory, NoSearchResults } from '../components/EmptyState';
import { NetworkError, ServerError } from '../components/ErrorState';

// Auto-refresh interval in milliseconds (5 seconds for faster sync)
const AUTO_REFRESH_INTERVAL = 5000;

const AuditHistoryScreen = () => {
  const [audits, setAudits] = useState([]);
  const [filteredAudits, setFilteredAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Initial fetch
  useEffect(() => {
    fetchAudits();
    fetchTemplates();
  }, []);

  // Auto-refresh when screen is focused
  useEffect(() => {
    if (isFocused) {
      // Fetch immediately when screen comes into focus
      fetchAudits(true);
      
      // Set up auto-refresh interval
      intervalRef.current = setInterval(() => {
        fetchAudits(true);
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
  }, [isFocused]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isFocused) {
        fetchAudits(true);
      }
      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [isFocused]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, templateFilter, audits]);

  const fetchTemplates = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`${API_BASE_URL}/templates`, {
        params: { _t: Date.now() }
      });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const applyFilters = () => {
    let filtered = audits;

    if (searchTerm) {
      filtered = filtered.filter(audit =>
        audit.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(audit => audit.status === statusFilter);
    }

    if (templateFilter !== 'all') {
      filtered = filtered.filter(audit => audit.template_id === parseInt(templateFilter));
    }

    setFilteredAudits(filtered);
  };

  const fetchAudits = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setError(null);
      }
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`${API_BASE_URL}/audits`, {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const auditsData = response.data.audits || [];
      setAudits(auditsData);
      setFilteredAudits(auditsData);
      if (!silent) {
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching audits:', error);
      if (!silent) {
        // Set error state for both network and server errors
        if (!error.response || error.message === 'Network Error') {
          setError('network');
        } else {
          // Server error (4xx, 5xx) - set error state
          setError('server');
        }
        // Clear stale data on error so users don't see outdated info
        setAudits([]);
        setFilteredAudits([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAudits(false);
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return {
          bg: themeConfig.success.bg,
          color: themeConfig.success.dark,
          text: 'Completed'
        };
      case 'in_progress':
        return {
          bg: themeConfig.info.bg || themeConfig.primary.light + '20',
          color: themeConfig.info.dark || themeConfig.primary.dark,
          text: 'In Progress'
        };
      case 'pending':
        return {
          bg: themeConfig.warning.bg,
          color: themeConfig.warning.dark,
          text: 'Pending'
        };
      case 'failed':
        return {
          bg: themeConfig.error.bg,
          color: themeConfig.error.dark,
          text: 'Failed'
        };
      default:
        return {
          bg: themeConfig.background.default,
          color: themeConfig.text.secondary,
          text: status
        };
    }
  };

  const renderAudit = ({ item, index }) => {
    const statusStyles = getStatusStyles(item.status);
    
    return (
      <TouchableOpacity
        style={[styles.auditCard, index === 0 && styles.auditCardFirst]}
        onPress={() => navigation.navigate('AuditDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.auditCardLeft}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: item.status === 'completed' ? themeConfig.success.main : themeConfig.warning.main }
          ]} />
          <View style={styles.auditInfo}>
            <Text style={styles.auditName} numberOfLines={1}>{item.restaurant_name}</Text>
            <Text style={styles.auditLocation} numberOfLines={1}>
              {item.location || 'No location'}
            </Text>
            <View style={styles.auditMeta}>
              <Text style={styles.auditTemplate} numberOfLines={1}>
                {item.template_name}
              </Text>
              <Text style={styles.auditDot}>•</Text>
              <Text style={styles.auditDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              {item.gps_latitude && item.gps_longitude && (
                <>
                  <Text style={styles.auditDot}>•</Text>
                  <View style={styles.gpsIndicator}>
                    <Icon 
                      name={item.location_verified ? 'verified' : 'location-on'} 
                      size={12} 
                      color={item.location_verified ? themeConfig.success.main : themeConfig.primary.main} 
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        <View style={styles.auditCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyles.bg }]}>
            <Text style={[styles.statusText, { color: statusStyles.color }]}>
              {statusStyles.text}
            </Text>
          </View>
          {item.score !== null && (
            <Text style={[styles.auditScore, { color: getScoreColor(item.score) }]}>
              {item.score}%
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (templateFilter !== 'all' ? 1 : 0);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainerSkeleton}>
          <View style={styles.searchSkeletonBox} />
        </View>
        <ListSkeleton count={5} />
      </View>
    );
  }

  // Error state (network errors)
  if (error === 'network') {
    return (
      <View style={styles.container}>
        <NetworkError onRetry={() => fetchAudits(false)} />
      </View>
    );
  }

  // Error state (server errors)
  if (error === 'server') {
    return (
      <View style={styles.container}>
        <ServerError onRetry={() => fetchAudits(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={20} color={themeConfig.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search audits..."
            placeholderTextColor={themeConfig.text.disabled}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="close" size={18} color={themeConfig.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon 
            name="tune" 
            size={20} 
            color={activeFiltersCount > 0 ? '#fff' : themeConfig.primary.main} 
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Summary */}
      {filteredAudits.length > 0 && (
        <View style={styles.resultsSummary}>
          <Text style={styles.resultsCount}>
            {filteredAudits.length} audit{filteredAudits.length !== 1 ? 's' : ''} found
          </Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity 
              onPress={() => { setStatusFilter('all'); setTemplateFilter('all'); }}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Audit List */}
      <FlatList
        data={filteredAudits}
        renderItem={renderAudit}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[themeConfig.primary.main]}
            tintColor={themeConfig.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          searchTerm || activeFiltersCount > 0 ? (
            <NoSearchResults query={searchTerm} />
          ) : (
            <NoHistory />
          )
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Audits</Text>
              <TouchableOpacity 
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={themeConfig.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'completed', 'in_progress', 'pending', 'failed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.filterChipActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive
                      ]}
                    >
                      {status === 'all' ? 'All' : 
                       status === 'in_progress' ? 'In Progress' : 
                       status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Template</Text>
              <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      templateFilter === 'all' && styles.filterChipActive
                    ]}
                    onPress={() => setTemplateFilter('all')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        templateFilter === 'all' && styles.filterChipTextActive
                      ]}
                    >
                      All Templates
                    </Text>
                  </TouchableOpacity>
                  {templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.filterChip,
                        templateFilter === template.id.toString() && styles.filterChipActive
                      ]}
                      onPress={() => setTemplateFilter(template.id.toString())}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          templateFilter === template.id.toString() && styles.filterChipTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {template.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setStatusFilter('all');
                  setTemplateFilter('all');
                }}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={18} color={themeConfig.text.secondary} />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeConfig.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  searchContainerSkeleton: {
    padding: 16,
    backgroundColor: themeConfig.background.paper,
  },
  searchSkeletonBox: {
    height: 48,
    backgroundColor: themeConfig.border.default,
    borderRadius: themeConfig.borderRadius.medium,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: themeConfig.text.primary,
  },
  filterButton: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: themeConfig.borderRadius.medium,
    backgroundColor: themeConfig.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: themeConfig.primary.main,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: themeConfig.secondary.main,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Results Summary
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: themeConfig.background.default,
  },
  resultsCount: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    fontWeight: '500',
  },
  clearFilters: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    color: themeConfig.primary.main,
    fontWeight: '600',
  },
  
  // List
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  
  // Audit Card
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  auditLocation: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 4,
  },
  auditMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  auditTemplate: {
    fontSize: 12,
    color: themeConfig.text.muted,
    maxWidth: 100,
  },
  auditDot: {
    fontSize: 12,
    color: themeConfig.text.disabled,
    marginHorizontal: 6,
  },
  auditDate: {
    fontSize: 12,
    color: themeConfig.text.muted,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
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
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeConfig.background.paper,
    borderTopLeftRadius: themeConfig.borderRadius.xl,
    borderTopRightRadius: themeConfig.borderRadius.xl,
    padding: 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: themeConfig.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeConfig.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: themeConfig.borderRadius.round,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  filterChipActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  filterChipText: {
    fontSize: 13,
    color: themeConfig.text.primary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  templateList: {
    maxHeight: 180,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: themeConfig.borderRadius.medium,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  resetButtonText: {
    color: themeConfig.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  applyButton: {
    flex: 1,
    padding: 14,
    borderRadius: themeConfig.borderRadius.medium,
    backgroundColor: themeConfig.primary.main,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuditHistoryScreen;
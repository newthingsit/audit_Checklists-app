import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';

const AuditHistoryScreen = () => {
  const [audits, setAudits] = useState([]);
  const [filteredAudits, setFilteredAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchAudits();
    fetchTemplates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, templateFilter, audits]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/templates`);
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

  const fetchAudits = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/audits`);
      const auditsData = response.data.audits || [];
      setAudits(auditsData);
      setFilteredAudits(auditsData);
    } catch (error) {
      console.error('Error fetching audits:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        // If it's a 401 or 403, the user might not have permission
        if (error.response.status === 401 || error.response.status === 403) {
          // Don't show alert, just log - the user will see empty list
          console.warn('User may not have permission to view audits');
        }
      }
      // Set empty array on error so UI doesn't break
      setAudits([]);
      setFilteredAudits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAudits();
  };

  const renderAudit = ({ item }) => (
    <TouchableOpacity
      style={styles.auditCard}
      onPress={() => navigation.navigate('AuditDetail', { id: item.id })}
    >
      <View style={styles.auditHeader}>
        <View style={styles.auditInfo}>
          <Text style={styles.auditName}>{item.restaurant_name}</Text>
          <Text style={styles.auditLocation}>{item.location || 'No location'}</Text>
          <Text style={styles.auditTemplate}>{item.template_name}</Text>
        </View>
        <View style={styles.auditMeta}>
          <View style={[styles.statusBadge, item.status === 'completed' && styles.statusCompleted]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {item.score !== null && (
            <Text style={styles.auditScore}>{item.score}%</Text>
          )}
        </View>
      </View>
      <Text style={styles.auditDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return themeConfig.success.main;
      case 'failed':
        return themeConfig.error.main;
      case 'warning':
        return themeConfig.warning.main;
      default:
        return themeConfig.text.disabled;
    }
  };

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (templateFilter !== 'all' ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={themeConfig.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search audits..."
          placeholderTextColor={themeConfig.text.disabled}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon 
            name="filter-list" 
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

      <FlatList
        data={filteredAudits}
        renderItem={renderAudit}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? 'No audits found' : 'No audits yet'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color={themeConfig.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'completed', 'pending', 'failed', 'warning'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.filterChipActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Template</Text>
              <ScrollView style={styles.templateList}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    templateFilter === 'all' && styles.filterChipActive
                  ]}
                  onPress={() => setTemplateFilter('all')}
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
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        templateFilter === template.id.toString() && styles.filterChipTextActive
                      ]}
                    >
                      {template.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setStatusFilter('all');
                  setTemplateFilter('all');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  filterButton: {
    padding: 8,
    marginLeft: 10,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: themeConfig.primary.main,
    borderRadius: themeConfig.borderRadius.small,
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: themeConfig.error.main,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  listContent: {
    padding: 15,
    paddingTop: 0,
  },
  auditCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  auditInfo: {
    flex: 1,
  },
  auditName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  auditLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  auditTemplate: {
    fontSize: 14,
    color: '#999',
  },
  auditMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: themeConfig.warning.main,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 5,
  },
  statusCompleted: {
    backgroundColor: themeConfig.success.main,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  auditScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeConfig.primary.main,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  filterChipActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  filterChipText: {
    fontSize: 14,
    color: themeConfig.text.primary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  templateList: {
    maxHeight: 200,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: themeConfig.borderRadius.medium,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: themeConfig.primary.main,
  },
  modalButtonSecondary: {
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSecondary: {
    color: themeConfig.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  auditDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AuditHistoryScreen;


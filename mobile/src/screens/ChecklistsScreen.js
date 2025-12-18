import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useOffline } from '../context/OfflineContext';
import { hasPermission, isAdmin } from '../utils/permissions';
import { themeConfig } from '../config/theme';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { NoTemplates } from '../components/EmptyState';
import { OfflineModeCard, PendingSyncSummary } from '../components/OfflineIndicator';

const ChecklistsScreen = () => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { getCachedTemplates, prefetchForOffline, offlineStats } = useOffline();
  
  const userPermissions = user?.permissions || [];

  const canViewTemplates = hasPermission(userPermissions, 'display_templates') ||
                          hasPermission(userPermissions, 'view_templates') ||
                          hasPermission(userPermissions, 'manage_templates') ||
                          isAdmin(user);
  
  const canCreateAudit = hasPermission(userPermissions, 'create_audits') ||
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);

  // Fetch templates - tries online first, falls back to cache
  const fetchTemplates = useCallback(async (forceOnline = false) => {
    try {
      if (isOnline || forceOnline) {
        // Try to fetch from server with cache-busting parameter
        try {
          const response = await axios.get(`${API_BASE_URL}/templates`, {
            params: { _t: Date.now() }
          });
          const serverTemplates = response.data.templates || [];
          setTemplates(serverTemplates);
          setIsUsingCachedData(false);
          
          // Group templates by category
          const categoryMap = {};
          serverTemplates.forEach(template => {
            const templateCategories = template.categories || [];
            if (templateCategories.length === 0) {
              const cat = 'General';
              if (!categoryMap[cat]) {
                categoryMap[cat] = [];
              }
              categoryMap[cat].push(template);
            } else {
              templateCategories.forEach(cat => {
                if (!categoryMap[cat]) {
                  categoryMap[cat] = [];
                }
                categoryMap[cat].push(template);
              });
            }
          });
          
          const categoryList = Object.keys(categoryMap).map(cat => ({
            name: cat,
            templates: categoryMap[cat],
            count: categoryMap[cat].length
          })).sort((a, b) => a.name.localeCompare(b.name));
          
          setCategories(categoryList);
          
          // Prefetch for offline use in background
          prefetchForOffline();
          
          return;
        } catch (networkError) {
          console.log('Network error, falling back to cache:', networkError.message);
        }
      }
      
      // Offline or network error - use cached data
      const cached = await getCachedTemplates();
      if (cached.templates.length > 0) {
        setTemplates(cached.templates);
        setIsUsingCachedData(true);
        setLastSync(cached.cachedAt);
        
        // Group cached templates by category
        const categoryMap = {};
        cached.templates.forEach(template => {
          const templateCategories = template.categories || [];
          if (templateCategories.length === 0) {
            const cat = 'General';
            if (!categoryMap[cat]) {
              categoryMap[cat] = [];
            }
            categoryMap[cat].push(template);
          } else {
            templateCategories.forEach(cat => {
              if (!categoryMap[cat]) {
                categoryMap[cat] = [];
              }
              categoryMap[cat].push(template);
            });
          }
        });
        
        const categoryList = Object.keys(categoryMap).map(cat => ({
          name: cat,
          templates: categoryMap[cat],
          count: categoryMap[cat].length
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCategories(categoryList);
      } else {
        setTemplates([]);
        setCategories([]);
        setIsUsingCachedData(false);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline, getCachedTemplates, prefetchForOffline]);

  // Initial load
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline && isUsingCachedData) {
      fetchTemplates(true);
    }
  }, [isOnline]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        fetchTemplates();
      }
    }, [isOnline])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates(true);
  };

  const handleCategorySelect = (category) => {
    if (!canCreateAudit) {
      Alert.alert('Permission Denied', 'You do not have permission to create audits.');
      return;
    }
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleStartAudit = (template) => {
    if (!canCreateAudit) {
      Alert.alert('Permission Denied', 'You do not have permission to create audits.');
      return;
    }
    
    // Pass template data for offline support
    navigation.navigate('AuditForm', { 
      templateId: template.id,
      templateData: template, // Pass full template for offline use
      selectedCategory: selectedCategory?.name
    });
  };

  const renderCategory = ({ item, index }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategorySelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIconContainer}>
          <LinearGradient
            colors={themeConfig.dashboardCards.card2}
            style={styles.categoryIcon}
          >
            <Icon name="category" size={28} color="#fff" />
          </LinearGradient>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryCount}>
            {item.count} template{item.count !== 1 ? 's' : ''}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
      </View>
    </TouchableOpacity>
  );

  const renderTemplate = ({ item, index }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleStartAudit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateIconContainer}>
          <LinearGradient
            colors={themeConfig.dashboardCards.card1}
            style={styles.templateIcon}
          >
            <Icon name="checklist" size={24} color="#fff" />
          </LinearGradient>
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName} numberOfLines={2}>{item.name}</Text>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
      </View>
      
      {item.description && (
        <Text style={styles.templateDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.templateFooter}>
        <View style={styles.templateMeta}>
          <Icon name="list-alt" size={16} color={themeConfig.text.secondary} />
          <Text style={styles.itemCount}>{item.item_count || 0} items</Text>
        </View>
        {isUsingCachedData && (
          <View style={styles.cachedBadge}>
            <Icon name="cloud-off" size={12} color={themeConfig.warning.dark} />
            <Text style={styles.cachedText}>Cached</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton count={4} />
      </View>
    );
  }

  // No permission
  if (!canViewTemplates) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="lock" size={48} color={themeConfig.text.disabled} />
        <Text style={styles.permissionText}>
          You do not have permission to view templates
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Mode Card */}
      {!isOnline && <OfflineModeCard lastSync={lastSync} />}
      
      {/* Pending Sync Summary */}
      {offlineStats.hasPendingSync && <PendingSyncSummary />}

      {selectedCategory ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToCategories}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={themeConfig.primary.main} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedCategory.name}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedCategory.count} template{selectedCategory.count !== 1 ? 's' : ''}
            </Text>
          </View>
          <FlatList
            data={selectedCategory.templates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[themeConfig.primary.main]}
                tintColor={themeConfig.primary.main}
              />
            }
            ListEmptyComponent={
              <NoTemplates 
                onAction={isOnline ? onRefresh : undefined}
              />
            }
          />
        </>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[themeConfig.primary.main]}
              tintColor={themeConfig.primary.main}
            />
          }
          ListEmptyComponent={
            <NoTemplates 
              onAction={isOnline ? onRefresh : undefined}
            />
          }
          ListHeaderComponent={
            categories.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>
                  Select Category
                </Text>
                <Text style={styles.listHeaderSubtitle}>
                  Choose a category to start your audit
                </Text>
              </View>
            ) : null
          }
        />
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
    padding: 40,
    backgroundColor: themeConfig.background.default,
  },
  permissionText: {
    fontSize: 16,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeConfig.text.primary,
    letterSpacing: -0.3,
  },
  listHeaderSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
  header: {
    padding: 16,
    backgroundColor: themeConfig.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  backButton: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
  },
  categoryCard: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeConfig.border.light,
    ...themeConfig.shadows.small,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    marginRight: 14,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: themeConfig.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
    color: themeConfig.text.secondary,
  },
  templateCard: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeConfig.border.light,
    ...themeConfig.shadows.small,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIconContainer: {
    marginRight: 14,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: themeConfig.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: themeConfig.primary.main + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeConfig.borderRadius.round,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    color: themeConfig.primary.main,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  templateDescription: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginTop: 12,
    marginLeft: 62,
    lineHeight: 18,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeConfig.border.light,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginLeft: 6,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.warning.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: themeConfig.borderRadius.small,
  },
  cachedText: {
    fontSize: 11,
    color: themeConfig.warning.dark,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ChecklistsScreen;

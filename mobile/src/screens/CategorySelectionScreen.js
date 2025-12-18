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
import { hasPermission, isAdmin } from '../utils/permissions';
import { themeConfig } from '../config/theme';
import { ListSkeleton } from '../components/LoadingSkeleton';

const CategorySelectionScreen = () => {
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  
  const userPermissions = user?.permissions || [];

  const canCreateAudit = hasPermission(userPermissions, 'create_audits') ||
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);

  // Fetch templates and group by category
  const fetchTemplates = useCallback(async (forceOnline = false) => {
    try {
      if (isOnline || forceOnline) {
        const response = await axios.get(`${API_BASE_URL}/templates`, {
          params: { _t: Date.now() }
        });
        const serverTemplates = response.data.templates || [];
        setTemplates(serverTemplates);
        
        // Group templates by category
        const categoryMap = {};
        serverTemplates.forEach(template => {
          // Get unique categories from template items
          const templateCategories = template.categories || [];
          if (templateCategories.length === 0) {
            // If no categories, use 'General'
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
        
        // Convert to array and sort
        const categoryList = Object.keys(categoryMap).map(cat => ({
          name: cat,
          templates: categoryMap[cat],
          count: categoryMap[cat].length
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setCategories(categoryList);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchTemplates();
  }, []);

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

  const handleTemplateSelect = (template) => {
    navigation.navigate('AuditForm', {
      templateId: template.id,
      templateData: template,
      selectedCategory: selectedCategory?.name
    });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton count={4} />
      </View>
    );
  }

  // Show templates for selected category
  if (selectedCategory) {
    return (
      <View style={styles.container}>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.templateCard}
              onPress={() => handleTemplateSelect(item)}
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
                  {item.description && (
                    <Text style={styles.templateDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
              </View>
              <View style={styles.templateFooter}>
                <View style={styles.templateMeta}>
                  <Icon name="list-alt" size={16} color={themeConfig.text.secondary} />
                  <Text style={styles.itemCount}>{item.item_count || 0} items</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  // Show category selection
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Category</Text>
        <Text style={styles.headerSubtitle}>
          Choose a category to start your audit
        </Text>
      </View>

      <FlatList
        data={categories}
        renderItem={({ item }) => (
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
        )}
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
          <View style={styles.emptyContainer}>
            <Icon name="category" size={48} color={themeConfig.text.disabled} />
            <Text style={styles.emptyText}>No categories available</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
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
  listContent: {
    padding: 16,
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
  templateDescription: {
    fontSize: 13,
    color: themeConfig.text.secondary,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: themeConfig.text.secondary,
    marginTop: 16,
  },
});

export default CategorySelectionScreen;


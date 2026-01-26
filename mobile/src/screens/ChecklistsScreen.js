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
import { NoTemplates } from '../components/EmptyState';

const ChecklistsScreen = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  
  const userPermissions = user?.permissions || [];

  const canViewTemplates = hasPermission(userPermissions, 'display_templates') ||
                          hasPermission(userPermissions, 'view_templates') ||
                          hasPermission(userPermissions, 'manage_templates') ||
                          isAdmin(user);
  
  const canCreateAudit = hasPermission(userPermissions, 'create_audits') ||
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);

  // Fetch templates - real-time only, no offline fallback
  const fetchTemplates = useCallback(async () => {
    try {
      // Check if online - fail immediately if offline
      if (!isOnline) {
        Alert.alert(
          'No Internet Connection',
          'Please connect to the internet to load templates.',
          [{ text: 'OK' }]
        );
        setTemplates([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch from server in real-time
      const response = await axios.get(`${API_BASE_URL}/templates`, {
        params: { _t: Date.now(), dedupe: 'true' }
      });
      const serverTemplates = response.data.templates || [];
      setTemplates(serverTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load templates. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      setTemplates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline]);

  // Track if this is the initial mount to prevent double fetching
  const isInitialMount = React.useRef(true);

  // Initial load - only on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOnline]);

  // Refresh when screen comes into focus (but not on initial mount)
  useFocusEffect(
    useCallback(() => {
      // Skip the first focus (initial mount) since useEffect already handles it
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      // Only fetch if not currently loading and online
      if (!loading && isOnline) {
        fetchTemplates();
      }
    }, [isOnline, loading, fetchTemplates])
  );

  const onRefresh = () => {
    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Please connect to the internet to refresh templates.',
        [{ text: 'OK' }]
      );
      return;
    }
    setRefreshing(true);
    fetchTemplates();
  };

  const handleStartAudit = (template) => {
    if (!canCreateAudit) {
      Alert.alert('Permission Denied', 'You do not have permission to create audits.');
      return;
    }
    
    // Pass template data for offline support
    navigation.navigate('AuditForm', { 
      templateId: template.id,
      templateData: template // Pass full template for offline use
    });
  };

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
          {item.categories && item.categories.length > 0 && (
            <View style={styles.categoryBadgesContainer}>
              {item.categories.slice(0, 2).map((cat, idx) => (
                <View key={idx} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
              {item.categories.length > 2 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>+{item.categories.length - 2}</Text>
                </View>
              )}
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
      <FlatList
        data={templates}
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
            onAction={onRefresh}
          />
        }
        ListHeaderComponent={
          templates.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Checklist Templates
              </Text>
              <Text style={styles.listHeaderSubtitle}>
                Select a template to start a new audit
              </Text>
            </View>
          ) : null
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
    fontSize: 20,
    fontWeight: '700',
    color: themeConfig.text.primary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginTop: 2,
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
  categoryBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: themeConfig.primary.main + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: themeConfig.borderRadius.round,
  },
  categoryText: {
    fontSize: 10,
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
});

export default ChecklistsScreen;

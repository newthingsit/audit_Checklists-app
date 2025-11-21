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
import { hasPermission, isAdmin } from '../utils/permissions';

const ChecklistsScreen = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  // Permission check - can view templates
  const canViewTemplates = hasPermission(userPermissions, 'display_templates') ||
                          hasPermission(userPermissions, 'view_templates') ||
                          hasPermission(userPermissions, 'manage_templates') ||
                          isAdmin(user);
  
  // Permission check - can create audits
  const canCreateAudit = hasPermission(userPermissions, 'create_audits') ||
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/templates`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const handleStartAudit = (templateId) => {
    if (!canCreateAudit) {
      Alert.alert('Permission Denied', 'You do not have permission to create audits.');
      return;
    }
    navigation.navigate('AuditForm', { templateId });
  };

  const renderTemplate = ({ item }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleStartAudit(item.id)}
    >
      <View style={styles.templateHeader}>
        <Icon name="checklist" size={30} color="#1976d2" />
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color="#999" />
      </View>
      {item.description && (
        <Text style={styles.templateDescription}>{item.description}</Text>
      )}
      <View style={styles.templateFooter}>
        <Icon name="info" size={16} color="#666" />
        <Text style={styles.itemCount}>{item.item_count || 0} items</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!canViewTemplates) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={styles.emptyText}>You do not have permission to view templates</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates available</Text>
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
  listContent: {
    padding: 15,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateInfo: {
    flex: 1,
    marginLeft: 15,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  categoryBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
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

export default ChecklistsScreen;


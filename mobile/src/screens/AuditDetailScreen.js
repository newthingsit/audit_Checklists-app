import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AuditDetailScreen = () => {
  const route = useRoute();
  const { id } = route.params;
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudit();
  }, [id]);

  const fetchAudit = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/audits/${id}`);
      setAudit(response.data.audit);
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="check-circle" size={24} color="#4caf50" />;
      case 'failed':
        return <Icon name="cancel" size={24} color="#f44336" />;
      case 'warning':
        return <Icon name="warning" size={24} color="#ff9800" />;
      default:
        return <Icon name="pending" size={24} color="#999" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!audit) {
    return (
      <View style={styles.centerContainer}>
        <Text>Audit not found</Text>
      </View>
    );
  }

  const progress = audit.total_items > 0 
    ? (audit.completed_items / audit.total_items) * 100 
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{audit.restaurant_name}</Text>
        <Text style={styles.location}>{audit.location || 'No location'}</Text>
        <Text style={styles.template}>{audit.template_name}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <View style={[styles.statusBadge, audit.status === 'completed' && styles.statusCompleted]}>
            <Text style={styles.statusText}>{audit.status}</Text>
          </View>
        </View>
        {audit.score !== null && (
          <View style={styles.statBox}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{audit.score}%</Text>
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {audit.completed_items} / {audit.total_items} items completed
        </Text>
      </View>

      {audit.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text style={styles.notesText}>{audit.notes}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Checklist Items</Text>

      {items.map((item, index) => (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>
              {index + 1}. {item.title}
            </Text>
            {getStatusIcon(item.status)}
          </View>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          <View style={styles.itemMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.categoryText, { color: getStatusColor(item.status) }]}>
                {item.category}
              </Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusChipText}>{item.status}</Text>
            </View>
          </View>
          {item.comment && (
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Comment:</Text>
              <Text style={styles.commentText}>{item.comment}</Text>
            </View>
          )}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Created: {new Date(audit.created_at).toLocaleString()}
        </Text>
        {audit.completed_at && (
          <Text style={styles.footerText}>
            Completed: {new Date(audit.completed_at).toLocaleString()}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  template: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statBox: {
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusCompleted: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notesContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  commentContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});

export default AuditDetailScreen;


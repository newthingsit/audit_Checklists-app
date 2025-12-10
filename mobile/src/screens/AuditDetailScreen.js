import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';
import { LocationDisplay } from '../components/LocationCapture';

const AuditDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudit();
  }, [id]);

  // Preserve state when component is focused (e.g., when navigating back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh audit data when screen comes into focus
      fetchAudit();
    });

    return unsubscribe;
  }, [navigation, id]);

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
        return themeConfig.success.main;
      case 'failed':
        return themeConfig.error.main;
      case 'warning':
        return themeConfig.warning.main;
      case 'in_progress':
        return themeConfig.warning.main;
      default:
        return themeConfig.text.disabled;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed':
        return themeConfig.success.main;
      case 'failed':
        return themeConfig.error.main;
      case 'warning':
        return themeConfig.warning.main;
      case 'in_progress':
        return themeConfig.warning.main;
      default:
        return themeConfig.text.disabled;
    }
  };

  const getCriteriaColor = (criteria) => {
    switch (criteria?.toLowerCase()) {
      case 'critical':
        return themeConfig.error.main;
      case 'major':
        return themeConfig.warning.main;
      case 'minor':
        return themeConfig.info.main;
      default:
        return themeConfig.text.secondary;
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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{audit.restaurant_name}</Text>
        <Text style={styles.location}>{audit.location || 'No location'}</Text>
        <Text style={styles.template}>{audit.template_name}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(audit.status) }]}>
            <Text style={styles.statusText}>
              {audit.status === 'in_progress' ? 'In Progress' : audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
            </Text>
          </View>
          {audit.score !== null && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{audit.score}%</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {audit.completed_items || 0} / {audit.total_items || items.length} items completed
        </Text>
      </View>

      {audit.status === 'in_progress' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              // Navigate to AuditForm in the same stack
              navigation.navigate('AuditForm', { 
                auditId: audit.id, 
                templateId: audit.template_id 
              });
            }}
          >
            <Icon name="edit" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.continueButtonText}>Continue Audit</Text>
          </TouchableOpacity>
        </View>
      )}

      {audit.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text style={styles.notesText}>{audit.notes}</Text>
        </View>
      )}

      {/* GPS Location Display */}
      {audit.gps_latitude && audit.gps_longitude && (
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Icon name="location-on" size={20} color={themeConfig.primary.main} />
            <Text style={styles.locationTitle}>Audit Location</Text>
            {audit.location_verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={14} color={themeConfig.success.main} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <LocationDisplay
            location={{
              latitude: audit.gps_latitude,
              longitude: audit.gps_longitude,
              accuracy: audit.gps_accuracy,
              timestamp: audit.gps_timestamp,
            }}
            showOpenMaps={true}
            showAccuracy={true}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Checklist Items</Text>

      {items.map((item, index) => {
        // Parse criteria and max_score from description
        let criteria = null;
        let maxScore = null;
        let cleanDescription = item.description || '';
        
        if (item.description) {
          // Extract criteria: "Criteria: Critical | Max Score: 3"
          const criteriaMatch = item.description.match(/Criteria:\s*(\w+)/i);
          const scoreMatch = item.description.match(/Max Score:\s*(\d+)/i);
          
          if (criteriaMatch) {
            criteria = criteriaMatch[1];
          }
          if (scoreMatch) {
            maxScore = parseInt(scoreMatch[1]);
          }
          
          // Remove criteria and max score from description if they exist
          cleanDescription = item.description
            .replace(/Criteria:\s*\w+\s*\|\s*/i, '')
            .replace(/Max Score:\s*\d+/i, '')
            .trim();
        }

        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleContainer}>
                <Text style={styles.itemTitle}>
                  {index + 1}. {item.title}
                </Text>
              </View>
              <TouchableOpacity style={styles.moreButton}>
                <Icon name="more-vert" size={20} color={themeConfig.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {cleanDescription && (
              <Text style={styles.itemDescription}>{cleanDescription}</Text>
            )}

            <View style={styles.itemInfoRow}>
              {(criteria || maxScore !== null) && (
                <View style={styles.criteriaContainer}>
                  {criteria && (
                    <Text style={styles.criteriaText}>
                      Criteria: <Text style={[styles.criteriaValue, { color: getCriteriaColor(criteria) }]}>
                        {criteria}
                      </Text>
                    </Text>
                  )}
                  {maxScore !== null && (
                    <Text style={styles.maxScoreText}>
                      {criteria ? ' | ' : ''}Max Score: {maxScore}
                    </Text>
                  )}
                </View>
              )}
            </View>

          {item.category && (
            <View style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{item.category}</Text>
            </View>
          )}

          <View style={styles.itemFooter}>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status || 'pending') }]}>
              <Text style={styles.statusChipText}>
                {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'}
              </Text>
            </View>
          </View>

          {item.comment && (
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Comment:</Text>
              <Text style={styles.commentText}>{item.comment}</Text>
            </View>
          )}

          {item.photo_url && (
            <View style={styles.photoContainer}>
              <Image 
                source={{ 
                  uri: (() => {
                    let photoUrl = item.photo_url;
                    if (!photoUrl.startsWith('http')) {
                      const baseUrl = API_BASE_URL.replace('/api', '');
                      if (photoUrl.startsWith('/')) {
                        photoUrl = `${baseUrl}${photoUrl}`;
                      } else {
                        photoUrl = `${baseUrl}/${photoUrl}`;
                      }
                    }
                    return photoUrl;
                  })()
                }} 
                style={styles.itemPhoto}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Error loading image:', item.photo_url, error);
                }}
              />
            </View>
          )}
        </View>
        );
      })}

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
    backgroundColor: themeConfig.background.default,
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
    borderRadius: themeConfig.borderRadius.medium,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
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
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreContainer: {
    alignItems: 'flex-end',
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
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
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
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
    lineHeight: 22,
  },
  moreButton: {
    padding: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  itemInfoRow: {
    marginBottom: 8,
  },
  criteriaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 13,
    color: themeConfig.text.secondary,
  },
  criteriaValue: {
    fontWeight: '600',
  },
  maxScoreText: {
    fontSize: 13,
    color: themeConfig.text.secondary,
  },
  categoryRow: {
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    fontStyle: 'italic',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 80,
    alignItems: 'center',
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  photoContainer: {
    marginTop: 10,
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  itemPhoto: {
    width: '100%',
    height: 200,
    borderRadius: themeConfig.borderRadius.medium,
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
  actionContainer: {
    padding: 15,
    paddingTop: 0,
    marginBottom: 15,
  },
  continueButton: {
    backgroundColor: themeConfig.secondary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: themeConfig.borderRadius.medium,
    ...themeConfig.shadows.medium,
  },
  buttonIcon: {
    marginRight: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // GPS Location styles
  locationSection: {
    marginBottom: 15,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.success.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: themeConfig.success.dark,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default AuditDetailScreen;


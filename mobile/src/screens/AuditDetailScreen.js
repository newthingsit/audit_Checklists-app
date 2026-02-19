import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';
import { LocationDisplay } from '../components/LocationCapture';
import { SignatureDisplay } from '../components';
import { useLocation } from '../context/LocationContext';

const AuditDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { getCurrentLocation, calculateDistance } = useLocation();
  const { id } = route.params;
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [timeStats, setTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState(null);

  useEffect(() => {
    fetchAudit();
  }, [id]);

  // Preserve state when component is focused (e.g., when navigating back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Force refresh audit data when screen comes into focus
      // This ensures real-time progress updates when user navigates back
      console.log('[AuditDetail] Screen focused, refreshing audit data');
      fetchAudit();
    });

    return unsubscribe;
  }, [navigation, id]);

  // Also refresh when route params change (e.g., refreshAuditDetail flag)
  useEffect(() => {
    if (route.params?.refresh || route.params?.refreshAuditDetail) {
      console.log('[AuditDetail] Refresh requested via params, fetching latest data');
      fetchAudit();
      // Clear the refresh flag
      navigation.setParams({ refresh: false, refreshAuditDetail: false });
    }
  }, [route.params]);

  const fetchAudit = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/audits/${id}`);
      setAudit(response.data.audit);
      setItems(response.data.items || []);
      setTimeStats(response.data.timeStats || null);
      
      // Fetch action plan for completed audits
      if (response.data.audit.status === 'completed') {
        try {
          const actionPlanResponse = await axios.get(`${API_BASE_URL}/audits/${id}/action-plan`);
          setActionPlan(actionPlanResponse.data);
        } catch (apError) {
          console.log('Action plan not available:', apError.message);
        }
      }
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

  // PDF download/view functions removed - use web app for PDF reports

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

  const totalItems = audit.total_items && audit.total_items > 0 ? audit.total_items : items.length;
  const computedCompletedItems = items.filter(item => {
    const status = item.status;
    const hasStatus = status && status !== 'pending' && status !== '';
    const markValue = item.mark;
    const hasMark = markValue !== null &&
      markValue !== undefined &&
      String(markValue).trim() !== '';
    const hasOption = !!item.selected_option_id;
    const hasComment = item.comment && String(item.comment).trim() !== '';
    const hasPhoto = !!item.photo_url;
    return hasStatus || hasMark || hasOption || hasComment || hasPhoto;
  }).length;

  const completedItems = audit.status === 'completed'
    ? (totalItems || computedCompletedItems)
    : Math.max(audit.completed_items || 0, computedCompletedItems);

  const progress = totalItems > 0 
    ? Math.min(100, (completedItems / totalItems) * 100)
    : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      testID="report-view"
      accessibilityLabel="report-view"
    >
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{audit.restaurant_name}</Text>
        <Text style={styles.location}>{audit.location || 'No location'}</Text>
        <Text style={styles.template}>{audit.template_name}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(audit.status) }]}
            testID="audit-status"
            accessibilityLabel="audit-status"
          >
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
          {completedItems || 0} / {totalItems || items.length} items completed
        </Text>
      </View>

      {/* Time Statistics */}
      {timeStats && timeStats.itemsWithTime > 0 && (
        <View style={styles.timeStatsContainer}>
          <Text style={styles.timeStatsTitle}>⏱️ Item Making Performance</Text>
          <View style={styles.timeStatsRow}>
            <View style={styles.timeStatBox}>
              <Text style={styles.timeStatLabel}>Average Time</Text>
              <Text style={styles.timeStatValue}>{timeStats.averageTime} min</Text>
            </View>
            <View style={styles.timeStatBox}>
              <Text style={styles.timeStatLabel}>Total Time</Text>
              <Text style={styles.timeStatValue}>{timeStats.totalTime} min</Text>
            </View>
            <View style={styles.timeStatBox}>
              <Text style={styles.timeStatLabel}>Items Tracked</Text>
              <Text style={styles.timeStatValue}>{timeStats.itemsWithTime} / {timeStats.totalItems}</Text>
            </View>
          </View>
        </View>
      )}

      {audit.status === 'in_progress' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={async () => {
              // Check proximity BEFORE continuing audit - must be within 100m
              if (audit.location_id) {
                try {
                  // Get location details
                  const locationResponse = await axios.get(`${API_BASE_URL}/locations/${audit.location_id}`);
                  const location = locationResponse.data.location;
                  
                  if (location && location.latitude && location.longitude) {
                    // Get current location
                    const currentLocationResult = await getCurrentLocation();
                    
                    if (currentLocationResult.success) {
                      const distance = calculateDistance(
                        currentLocationResult.location.latitude,
                        currentLocationResult.location.longitude,
                        parseFloat(location.latitude),
                        parseFloat(location.longitude)
                      );
                      
                      const MAX_DISTANCE = 100; // 100 meters to start/continue audit
                      
                      if (distance > MAX_DISTANCE) {
                        Alert.alert(
                          'Location Too Far',
                          `You are ${Math.round(distance)} meters from ${location.name || 'the audit location'}.\n\nYou must be within ${MAX_DISTANCE} meters to continue the audit. Please move closer to the store location.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                    } else {
                      // Location not available - block user
                      Alert.alert(
                        'Location Required',
                        'Unable to get your current location. Location verification is required to continue the audit.\n\nPlease enable location services and try again.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                  }
                } catch (error) {
                  console.error('Error checking location:', error);
                  // Block if location check fails
                  Alert.alert(
                    'Location Check Failed',
                    'Unable to verify your location. Please ensure location services are enabled and try again.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
              }
              
              // Navigate to AuditForm in the same stack
              navigation.navigate('AuditForm', { 
                auditId: audit.id, 
                templateId: audit.template_id 
              });
            }}
            testID="continue-audit"
            accessibilityLabel="continue-audit"
          >
            <Icon name="edit" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.continueButtonText}>Continue Audit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PDF report buttons removed from mobile app - use web app for PDF */}

      {/* Action Plan - Top 3 Deviations */}
      {audit.status === 'completed' && actionPlan && actionPlan.action_items && actionPlan.action_items.length > 0 && (
        <View style={styles.actionPlanContainer}>
          <Text style={styles.actionPlanTitle}>⚠️ Action Plan – Top 3 Deviations</Text>
          {actionPlan.action_items.map((item, index) => (
            <View key={item.id} style={styles.actionPlanItem}>
              <View style={styles.actionPlanHeader}>
                <Text style={styles.actionPlanNumber}>#{index + 1}</Text>
                <View style={[
                  styles.severityBadge, 
                  { backgroundColor: item.severity === 'CRITICAL' ? '#f44336' : item.severity === 'MAJOR' ? '#ff9800' : '#2196f3' }
                ]}>
                  <Text style={styles.severityText}>{item.severity}</Text>
                </View>
                <View style={[
                  styles.statusBadgeSmall,
                  { backgroundColor: item.status === 'CLOSED' ? '#4caf50' : item.status === 'IN_PROGRESS' ? '#2196f3' : '#ff9800' }
                ]}>
                  <Text style={styles.statusTextSmall}>{item.status}</Text>
                </View>
              </View>
              
              {/* Category */}
              {item.category && (
                <Text style={styles.categoryLabel}>{item.category}</Text>
              )}
              
              <Text style={styles.deviationTitle}>{item.deviation}</Text>
              
              <View style={styles.actionPlanDetails}>
                <View style={styles.actionPlanRow}>
                  <Text style={styles.actionPlanLabel}>Corrective Action:</Text>
                  <Text style={styles.actionPlanValue}>{item.corrective_action || '—'}</Text>
                </View>
                <View style={styles.actionPlanRow}>
                  <Text style={styles.actionPlanLabel}>Responsible:</Text>
                  <Text style={styles.actionPlanValue}>{item.responsible_person || '—'}</Text>
                </View>
                <View style={styles.actionPlanRow}>
                  <Text style={styles.actionPlanLabel}>Target Date:</Text>
                  <Text style={styles.actionPlanValue}>
                    {item.target_date ? new Date(item.target_date).toLocaleDateString() : '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {audit.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Notes:</Text>
          {(() => {
            // Try to parse as JSON and format nicely
            try {
              const notesData = JSON.parse(audit.notes);
              if (notesData && typeof notesData === 'object' && !Array.isArray(notesData)) {
                // Format info data nicely
                return (
                  <View>
                    {notesData.attendees && (
                      <View style={styles.notesItem}>
                        <Text style={styles.notesLabel}>Attendees:</Text>
                        <Text style={styles.notesValue}>{notesData.attendees}</Text>
                      </View>
                    )}
                    {notesData.pointsDiscussed && (
                      <View style={styles.notesItem}>
                        <Text style={styles.notesLabel}>Points Discussed:</Text>
                        <Text style={styles.notesValue}>{notesData.pointsDiscussed}</Text>
                      </View>
                    )}
                    {notesData.pictures && Array.isArray(notesData.pictures) && notesData.pictures.length > 0 && (
                      <View style={styles.notesItem}>
                        <Text style={styles.notesLabel}>Pictures: {notesData.pictures.length}</Text>
                      </View>
                    )}
                  </View>
                );
              }
            } catch (e) {
              // Not JSON, display as plain text
            }
            return <Text style={styles.notesText}>{audit.notes}</Text>;
          })()}
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

        const itemKey = item?.item_id ?? item?.id ?? 'item';
        return (
          <View key={`${itemKey}-${index}`} style={styles.itemCard}>
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

          {item.comment && (() => {
            // Check if comment contains signature path data (from mobile signatures)
            let signatureObj = null;
            try {
              const parsed = JSON.parse(item.comment);
              if (parsed && Array.isArray(parsed.paths) && parsed.paths.length > 0) {
                signatureObj = parsed;
              }
            } catch (e) {
              // Not JSON, regular comment
            }
            if (signatureObj) {
              return (
                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Signature:</Text>
                  <SignatureDisplay signature={signatureObj} style={{ marginTop: 4 }} />
                </View>
              );
            }
            return (
              <View style={styles.commentContainer}>
                <Text style={styles.commentLabel}>Comment:</Text>
                <Text style={styles.commentText}>{item.comment}</Text>
              </View>
            );
          })()}

          {!item.comment && item.mark && !item.selected_option_id && (() => {
            const inputType = String(item.input_type || '').toLowerCase();
            const allowedTypes = ['number', 'date', 'open_ended', 'description', 'scan_code', 'signature'];
            if (!allowedTypes.includes(inputType)) return null;
            if (String(item.mark).toUpperCase() === 'NA') return null;
            return (
              <View style={styles.commentContainer}>
                <Text style={styles.commentLabel}>Response:</Text>
                <Text style={styles.commentText}>{String(item.mark)}</Text>
              </View>
            );
          })()}

          {item.photo_url && (
            <View style={styles.photoContainer}>
              <Image 
                source={{ 
                  uri: (() => {
                    let photoUrl = String(item.photo_url);
                    
                    // Handle local file paths (file://)
                    if (photoUrl.startsWith('file://')) {
                      return photoUrl; // Use local file path as-is for React Native Image
                    }
                    
                    // Handle HTTP/HTTPS URLs
                    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
                      return photoUrl;
                    }
                    
                    // Handle server paths (relative paths)
                    const baseUrl = API_BASE_URL.replace('/api', '');
                    if (photoUrl.startsWith('/')) {
                      return `${baseUrl}${photoUrl}`;
                    } else {
                      return `${baseUrl}/${photoUrl}`;
                    }
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
  timeStatsContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#90caf9',
    ...themeConfig.shadows.small,
  },
  timeStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  timeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeStatBox: {
    alignItems: 'center',
    minWidth: 100,
  },
  timeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
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
  notesItem: {
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesValue: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  // Action Plan styles
  actionPlanContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: themeConfig.borderRadius.large,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  actionPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e65100',
    marginBottom: 15,
  },
  actionPlanItem: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  actionPlanNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  deviationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  actionPlanDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  actionPlanRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  actionPlanLabel: {
    fontSize: 12,
    color: '#666',
    width: 110,
    fontWeight: '500',
  },
  actionPlanValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
});

export default AuditDetailScreen;

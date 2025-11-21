import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';

const AuditFormScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { templateId, auditId, scheduledAuditId, locationId: initialLocationId } = route.params || {};
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState(initialLocationId || '');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [responses, setResponses] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [comments, setComments] = useState({});
  const [photos, setPhotos] = useState({});
  const [uploading, setUploading] = useState({});
  const [locations, setLocations] = useState([]);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0: info, 1: checklist
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (auditId) {
      // Editing existing audit
      setIsEditing(true);
      fetchAuditData();
    } else if (scheduledAuditId && templateId) {
      // Check if audit already exists for this scheduled audit
      checkExistingAudit();
    } else if (templateId) {
      // Creating new audit
      fetchTemplate();
    }
    fetchLocations();
  }, [templateId, auditId, scheduledAuditId]);

  // Pre-fill location when scheduled audit provides locationId
  useEffect(() => {
    if (initialLocationId && locations.length > 0 && !selectedLocation) {
      const location = locations.find(l => l.id === parseInt(initialLocationId));
      if (location) {
        setSelectedLocation(location);
        setLocationId(initialLocationId.toString());
      }
    }
  }, [initialLocationId, locations, selectedLocation]);

  const checkExistingAudit = async () => {
    try {
      setLoading(true);
      // Check if an audit already exists for this scheduled audit
      const response = await axios.get(`${API_BASE_URL}/audits/by-scheduled/${scheduledAuditId}`);
      if (response.data.audit) {
        // Audit exists, switch to edit mode
        const existingAuditId = response.data.audit.id;
        setIsEditing(true);
        // Update route params to include auditId
        navigation.setParams({ auditId: existingAuditId });
        // Fetch the existing audit data
        await fetchAuditDataById(existingAuditId);
      } else {
        // No existing audit, create new one
        fetchTemplate();
      }
    } catch (error) {
      // If audit not found (404), it's a new audit
      if (error.response?.status === 404) {
        fetchTemplate();
      } else {
        console.error('Error checking existing audit:', error);
        Alert.alert('Error', 'Failed to check for existing audit. Creating new audit.');
        fetchTemplate();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditDataById = async (id) => {
    try {
      setLoading(true);
      // Fetch audit details
      const auditResponse = await axios.get(`${API_BASE_URL}/audits/${id}`);
      const audit = auditResponse.data.audit;
      const auditItems = auditResponse.data.items || [];

      // Set audit info
      setLocationId(audit.location_id || '');
      setNotes(audit.notes || '');
      
      // Find and set selected location
      if (audit.location_id && locations.length > 0) {
        const location = locations.find(l => l.id === audit.location_id);
        if (location) {
          setSelectedLocation(location);
        }
      }

      // Fetch template to get all items
      const templateResponse = await axios.get(`${API_BASE_URL}/checklists/${audit.template_id}`);
      setTemplate(templateResponse.data.template);
      const allItems = templateResponse.data.items || [];
      setItems(allItems);

      // Populate responses from audit items
      const responsesData = {};
      const optionsData = {};
      const commentsData = {};
      const photosData = {};

      auditItems.forEach(auditItem => {
        if (auditItem.status) {
          responsesData[auditItem.item_id] = auditItem.status;
        }
        if (auditItem.selected_option_id) {
          optionsData[auditItem.item_id] = auditItem.selected_option_id;
        }
        if (auditItem.comment) {
          commentsData[auditItem.item_id] = auditItem.comment;
        }
        if (auditItem.photo_url) {
          // Construct full URL if needed
          const photoUrl = auditItem.photo_url.startsWith('http') 
            ? auditItem.photo_url 
            : `${API_BASE_URL.replace('/api', '')}${auditItem.photo_url}`;
          photosData[auditItem.item_id] = photoUrl;
        }
      });

      setResponses(responsesData);
      setSelectedOptions(optionsData);
      setComments(commentsData);
      setPhotos(photosData);

      // Start at checklist step since we already have the info
      setCurrentStep(1);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      Alert.alert('Error', 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/checklists/${templateId}`);
      setTemplate(response.data.template);
      setItems(response.data.items || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditData = async () => {
    await fetchAuditDataById(auditId);
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/locations`).catch(() => ({ data: { locations: [] } }));
      const locationsData = response.data.locations || [];
      setLocations(locationsData);
      
      // If locationId is set (e.g., from URL params), find and set selected location
      if (locationId && locationsData.length > 0) {
        const location = locationsData.find(l => l.id === parseInt(locationId));
        if (location) {
          setSelectedLocation(location);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleResponseChange = (itemId, status) => {
    setResponses({ ...responses, [itemId]: status });
  };

  const handleOptionChange = (itemId, optionId) => {
    setSelectedOptions({ ...selectedOptions, [itemId]: optionId });
    setResponses({ ...responses, [itemId]: 'completed' });
  };

  const handleCommentChange = (itemId, comment) => {
    setComments({ ...comments, [itemId]: comment });
  };

  const handlePhotoUpload = async (itemId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading({ ...uploading, [itemId]: true });
        const formData = new FormData();
        formData.append('photo', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `photo_${itemId}_${Date.now()}.jpg`,
        });

        // Use /photo endpoint (not /upload) and ensure auth token is included
        // Note: Don't set Content-Type manually for FormData - axios will set it with boundary
        const uploadResponse = await axios.post(`${API_BASE_URL}/photo`, formData, {
          // Authorization header is automatically added by axios defaults from AuthContext
          // Content-Type will be set automatically by axios for FormData
        });

        // The backend returns photo_url like "/uploads/filename.jpg"
        // Construct full URL: http://IP:PORT/uploads/filename.jpg
        const photoUrl = uploadResponse.data.photo_url;
        const baseUrl = API_BASE_URL.replace('/api', ''); // Remove /api to get base URL
        const fullPhotoUrl = photoUrl.startsWith('http') 
          ? photoUrl 
          : `${baseUrl}${photoUrl}`;
        
        console.log('Photo uploaded successfully:', fullPhotoUrl);
        setPhotos({ ...photos, [itemId]: fullPhotoUrl });
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      let errorMessage = 'Failed to upload photo';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please login again.';
        } else if (error.response.status === 404) {
          errorMessage = 'Upload endpoint not found. Please check backend server.';
        } else {
          errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!locationId || !selectedLocation) {
        Alert.alert('Error', 'Please select a store');
        return;
      }
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let currentAuditId = auditId;

      // Get selected store details
      if (!selectedLocation || !locationId) {
        Alert.alert('Error', 'Please select a store');
        setSaving(false);
        return;
      }

      // Determine if we're editing an existing audit
      if (auditId) {
        // We have an explicit auditId, update existing audit
        currentAuditId = auditId;
        try {
          await axios.put(`${API_BASE_URL}/audits/${auditId}`, {
            restaurant_name: selectedLocation.name,
            location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
            location_id: parseInt(locationId),
            notes
          });
        } catch (updateError) {
          // If update fails, log but continue with item updates
          console.warn('Failed to update audit info, continuing with items:', updateError);
        }
      } else if (scheduledAuditId) {
        // Check if audit already exists for this scheduled audit
        try {
          const existingAuditResponse = await axios.get(`${API_BASE_URL}/audits/by-scheduled/${scheduledAuditId}`);
          if (existingAuditResponse.data.audit) {
            // Audit exists, update it
            currentAuditId = existingAuditResponse.data.audit.id;
            await axios.put(`${API_BASE_URL}/audits/${currentAuditId}`, {
              restaurant_name: selectedLocation.name,
              location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
              location_id: parseInt(locationId),
              notes
            });
          }
        } catch (error) {
          // If audit doesn't exist (404) or other error, we'll create a new one below
          console.log('No existing audit found for scheduled audit, will create new one');
        }
      }
      
      // Create new audit if we don't have an existing one
      if (!currentAuditId) {
        const auditData = {
          template_id: parseInt(templateId),
          restaurant_name: selectedLocation.name,
          location: selectedLocation.store_number ? `Store ${selectedLocation.store_number}` : selectedLocation.name,
          location_id: parseInt(locationId),
          notes
        };
        
        // Link to scheduled audit if provided
        if (scheduledAuditId) {
          auditData.scheduled_audit_id = parseInt(scheduledAuditId);
        }
        
        const auditResponse = await axios.post(`${API_BASE_URL}/audits`, auditData);
        currentAuditId = auditResponse.data.id;
      }

      // Update all audit items
      const updatePromises = items.map(async (item) => {
        const updateData = {
          status: responses[item.id] || 'pending',
        };
        
        if (selectedOptions[item.id]) {
          updateData.selected_option_id = selectedOptions[item.id];
        }
        
        if (comments[item.id]) {
          updateData.comment = comments[item.id];
        }
        
        if (photos[item.id]) {
          // Extract just the path if it's a full URL
          const photoUrl = photos[item.id];
          updateData.photo_url = photoUrl.startsWith('http') 
            ? photoUrl.replace(/^https?:\/\/[^\/]+/, '') // Remove domain, keep path
            : photoUrl;
        }

        return axios.put(`${API_BASE_URL}/audits/${currentAuditId}/items/${item.id}`, updateData);
      });

      await Promise.all(updatePromises);

      Alert.alert('Success', isEditing ? 'Audit updated successfully' : 'Audit saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving audit:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      Alert.alert('Error', isEditing ? `Failed to update audit: ${errorMessage}` : `Failed to save audit: ${errorMessage}`);
    } finally {
      setSaving(false);
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
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const completedItems = Object.values(responses).filter(r => r === 'completed').length;

  return (
    <View style={styles.container}>
      {currentStep === 0 && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Store Information</Text>
          <Text style={styles.subtitle}>{template?.name}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Store *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowStorePicker(true)}
            >
              <Text style={selectedLocation ? styles.inputText : styles.placeholderText}>
                {selectedLocation
                  ? (selectedLocation.store_number
                      ? `Store ${selectedLocation.store_number} - ${selectedLocation.name}`
                      : selectedLocation.name)
                  : 'Select a store'}
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter any notes"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next: Checklist</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Store Picker Modal */}
      <Modal
        visible={showStorePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStorePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <TouchableOpacity onPress={() => setShowStorePicker(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores..."
              value={storeSearchText}
              onChangeText={setStoreSearchText}
            />
            
            <FlatList
              data={locations.filter(loc => {
                if (!storeSearchText) return true;
                const search = storeSearchText.toLowerCase();
                return (
                  loc.name.toLowerCase().includes(search) ||
                  (loc.store_number && loc.store_number.toLowerCase().includes(search))
                );
              })}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeOption,
                    selectedLocation?.id === item.id && styles.storeOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedLocation(item);
                    setLocationId(item.id.toString());
                    setShowStorePicker(false);
                    setStoreSearchText('');
                  }}
                >
                  <Text style={styles.storeOptionText}>
                    {item.store_number ? `Store ${item.store_number} - ${item.name}` : item.name}
                  </Text>
                  {selectedLocation?.id === item.id && (
                    <Icon name="check" size={20} color="#1976d2" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {currentStep === 1 && (
        <View style={styles.container}>
          <View style={styles.progressBar}>
            <Text style={styles.progressText}>
              Progress: {completedItems} / {items.length} items
            </Text>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {index + 1}. {item.title}
                    {item.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  {getStatusIcon(responses[item.id])}
                </View>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
                
                {item.options && item.options.length > 0 ? (
                  <View style={styles.optionsContainer}>
                    {item.options.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionButton,
                          selectedOptions[item.id] === option.id && styles.optionButtonActive
                        ]}
                        onPress={() => handleOptionChange(item.id, option.id)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedOptions[item.id] === option.id && styles.optionTextActive
                          ]}
                        >
                          {option.text || option.option_text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.statusButtons}>
                    {['pending', 'completed', 'failed', 'warning'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          responses[item.id] === status && styles.statusButtonActive
                        ]}
                        onPress={() => handleResponseChange(item.id, status)}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            responses[item.id] === status && styles.statusButtonTextActive
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handlePhotoUpload(item.id)}
                    disabled={uploading[item.id]}
                  >
                    {uploading[item.id] ? (
                      <ActivityIndicator size="small" color={themeConfig.primary.main} />
                    ) : (
                      <Icon name="photo-camera" size={20} color={themeConfig.primary.main} />
                    )}
                    <Text style={styles.photoButtonText}>
                      {photos[item.id] ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {photos[item.id] && (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: photos[item.id] }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        const newPhotos = { ...photos };
                        delete newPhotos[item.id];
                        setPhotos(newPhotos);
                      }}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Comment (optional)</Text>
                  <TextInput
                    style={styles.commentInput}
                    value={comments[item.id] || ''}
                    onChangeText={(text) => handleCommentChange(item.id, text)}
                    placeholder="Add a comment..."
                    placeholderTextColor={themeConfig.text.disabled}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
            ))}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setCurrentStep(0)}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Audit</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#1976d2',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  progressBar: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
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
  required: {
    color: themeConfig.error.main,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  optionButtonActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  optionText: {
    fontSize: 14,
    color: themeConfig.text.primary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
  },
  actionsContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: themeConfig.primary.light + '20',
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.primary.light,
  },
  photoButtonText: {
    marginLeft: 8,
    color: themeConfig.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    position: 'relative',
    marginTop: 10,
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: themeConfig.borderRadius.medium,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: themeConfig.error.main,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContainer: {
    marginTop: 10,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    color: themeConfig.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
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
    marginBottom: 15,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
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
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    margin: 20,
    marginBottom: 10,
    fontSize: 16,
  },
  storeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storeOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  storeOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});

export default AuditFormScreen;


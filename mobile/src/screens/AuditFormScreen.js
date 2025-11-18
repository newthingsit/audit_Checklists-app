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
  Image
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
  const { templateId } = route.params;
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [location, setLocation] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [responses, setResponses] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [comments, setComments] = useState({});
  const [photos, setPhotos] = useState({});
  const [uploading, setUploading] = useState({});
  const [locations, setLocations] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // 0: info, 1: checklist

  useEffect(() => {
    fetchTemplate();
    fetchLocations();
  }, [templateId]);

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

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/locations`).catch(() => ({ data: { locations: [] } }));
      setLocations(response.data.locations || []);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

        const uploadResponse = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setPhotos({ ...photos, [itemId]: uploadResponse.data.photo_url || uploadResponse.data.url });
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!restaurantName.trim()) {
        Alert.alert('Error', 'Restaurant name is required');
        return;
      }
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const auditResponse = await axios.post(`${API_BASE_URL}/audits`, {
        template_id: parseInt(templateId),
        restaurant_name: restaurantName,
        location: locationId || location,
        location_id: locationId || null,
        notes
      });

      const auditId = auditResponse.data.id;

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
          updateData.photo_url = photos[item.id];
        }

        return axios.put(`${API_BASE_URL}/audits/${auditId}/items/${item.id}`, updateData);
      });

      await Promise.all(updatePromises);

      Alert.alert('Success', 'Audit saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving audit:', error);
      Alert.alert('Error', 'Failed to save audit');
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
          <Text style={styles.title}>Restaurant Information</Text>
          <Text style={styles.subtitle}>{template?.name}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Restaurant Name *</Text>
            <TextInput
              style={styles.input}
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder="Enter restaurant name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
            />
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
                          {option.text}
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
});

export default AuditFormScreen;


import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * PhotoUpload Component (Mobile)
 * Handles photo capture and gallery selection
 * Manages photo compression and storage
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onPhotoCapture - Callback when photo captured
 * @param {Array} props.existingPhotos - Currently attached photos
 * @param {number} props.maxPhotos - Maximum photos allowed
 * @returns {React.ReactElement}
 */
const PhotoUpload = ({
  onPhotoCapture,
  existingPhotos = [],
  maxPhotos = 5,
}) => {
  const [photos, setPhotos] = useState(existingPhotos);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  const requestPermissions = async () => {
    try {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      const library = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (camera.status !== 'granted' || library.status !== 'granted') {
        setPermissionError('Camera and library permissions required');
        return false;
      }
      return true;
    } catch (error) {
      setPermissionError('Failed to request permissions');
      return false;
    }
  };

  const compressPhoto = async (imageUri) => {
    try {
      const compressed = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return compressed;
    } catch (error) {
      console.error('Photo compression error:', error);
      return null;
    }
  };

  const handleCameraPress = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        const newPhotos = [...photos, photo];
        setPhotos(newPhotos);
        onPhotoCapture(newPhotos);
      }
    } catch (error) {
      Alert.alert('Camera Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLibraryPress = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        const newPhotos = [...photos, photo];
        setPhotos(newPhotos);
        onPhotoCapture(newPhotos);
      }
    } catch (error) {
      Alert.alert('Gallery Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotoCapture(newPhotos);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.count}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {permissionError && (
        <Text style={styles.errorText}>{permissionError}</Text>
      )}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
          {photos.map((photo, index) => (
            <View key={`${index}-${photo.uri}`} style={styles.photoWrapper}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photo}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {photos.length < maxPhotos && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cameraButton]}
            onPress={handleCameraPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
                <Text style={styles.buttonText}>Camera</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.galleryButton]}
            onPress={handleLibraryPress}
            disabled={loading}
          >
            <MaterialIcons name="image" size={18} color="#fff" />
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  count: {
    fontSize: 12,
    color: '#999',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
  },
  photoList: {
    marginBottom: 10,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    flex: 1,
  },
  cameraButton: {
    backgroundColor: themeConfig.colors.primary,
  },
  galleryButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default PhotoUpload;

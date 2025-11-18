import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeConfig } from '../config/theme';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/auth/profile`, { name, email });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials(user?.name)}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'admin' ? 'Administrator' : 
             user?.role === 'manager' ? 'Manager' : 'User'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={themeConfig.text.disabled}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            placeholderTextColor={themeConfig.text.disabled}
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleUpdateProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Update Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="notifications" size={24} color={themeConfig.primary.main} />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingSubtitle}>Manage notification preferences</Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="security" size={24} color={themeConfig.primary.main} />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Security</Text>
            <Text style={styles.settingSubtitle}>Change password and security settings</Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Icon name="info" size={24} color={themeConfig.primary.main} />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>About</Text>
            <Text style={styles.settingSubtitle}>App version and information</Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeConfig.text.disabled} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.default,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: themeConfig.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: themeConfig.text.secondary,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: themeConfig.primary.light + '20',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: themeConfig.primary.main,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: themeConfig.border.default,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    color: themeConfig.text.primary,
  },
  inputDisabled: {
    backgroundColor: themeConfig.background.default,
    color: themeConfig.text.disabled,
  },
  helperText: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 5,
  },
  button: {
    backgroundColor: themeConfig.primary.main,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...themeConfig.shadows.small,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: themeConfig.error.main,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  settingContent: {
    flex: 1,
    marginLeft: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
  },
});

export default ProfileScreen;


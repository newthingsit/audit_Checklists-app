import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useBiometric } from '../context/BiometricContext';
import { themeConfig } from '../config/theme';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigation = useNavigation();
  const { preferences } = useNotifications();
  const { 
    isAvailable, 
    isEnabled, 
    biometricType, 
    biometricIcon, 
    canUseBiometric, 
    featureEnabled,
    toggleBiometric, 
    isLoading: biometricLoading 
  } = useBiometric();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [focusedInput, setFocusedInput] = useState(null);

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Refresh user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (refreshUser) {
        refreshUser();
      }
    }, [refreshUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/auth/profile`, { name, email });
      // Refresh user data after profile update
      await refreshUser();
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

  const getRoleBadgeStyle = () => {
    if (user?.role === 'admin') {
      return { bg: themeConfig.error.bg, color: themeConfig.error.dark };
    }
    if (user?.role === 'manager') {
      return { bg: themeConfig.warning.bg, color: themeConfig.warning.dark };
    }
    return { bg: themeConfig.success.bg, color: themeConfig.success.dark };
  };

  const roleBadgeStyle = getRoleBadgeStyle();

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeConfig.primary.main}
          colors={[themeConfig.primary.main]}
        />
      }
    >
      {/* Header with gradient */}
      <LinearGradient
        colors={themeConfig.dashboardCards.card1}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitials(user?.name)}</Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeStyle.bg }]}>
            <Text style={[styles.roleText, { color: roleBadgeStyle.color }]}>
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'manager' ? 'Manager' : 'Team Member'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Profile Information Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="person" size={20} color={themeConfig.primary.main} />
          <Text style={styles.sectionTitle}>Profile Information</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[
            styles.inputWrapper,
            focusedInput === 'name' && styles.inputWrapperFocused
          ]}>
            <Icon 
              name="badge" 
              size={20} 
              color={focusedInput === 'name' ? themeConfig.primary.main : themeConfig.text.secondary} 
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={themeConfig.text.disabled}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrapper, styles.inputWrapperDisabled]}>
            <Icon name="email" size={20} color={themeConfig.text.disabled} />
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholderTextColor={themeConfig.text.disabled}
            />
            <Icon name="lock" size={16} color={themeConfig.text.disabled} />
          </View>
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleUpdateProfile}
          disabled={loading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={themeConfig.dashboardCards.card1}
            style={styles.saveButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="save" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="settings" size={20} color={themeConfig.primary.main} />
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingItem} 
          activeOpacity={0.7}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.info.bg }]}>
            <Icon name="notifications" size={20} color={themeConfig.info.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingSubtitle}>
              {preferences?.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        {/* Biometric Auth Setting */}
        {isAvailable && featureEnabled && (
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: themeConfig.primary.main + '15' }]}>
              <Icon name={biometricIcon} size={20} color={themeConfig.primary.main} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{biometricType || 'Biometric'} Login</Text>
              <Text style={styles.settingSubtitle}>
                {isEnabled ? 'Quick sign in enabled' : 'Enable for faster login'}
              </Text>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color={themeConfig.primary.main} />
            ) : (
              <Switch
                trackColor={{ 
                  false: themeConfig.border.default, 
                  true: themeConfig.primary.light 
                }}
                thumbColor={isEnabled ? themeConfig.primary.main : '#f4f3f4'}
                ios_backgroundColor={themeConfig.border.default}
                onValueChange={toggleBiometric}
                value={isEnabled}
                disabled={!canUseBiometric}
              />
            )}
          </View>
        )}

        <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.success.bg }]}>
            <Icon name="security" size={20} color={themeConfig.success.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Security</Text>
            <Text style={styles.settingSubtitle}>Password & authentication</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.warning.bg }]}>
            <Icon name="palette" size={20} color={themeConfig.warning.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Appearance</Text>
            <Text style={styles.settingSubtitle}>Theme & display options</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} activeOpacity={0.7}>
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.secondary.light + '30' }]}>
            <Icon name="info" size={20} color={themeConfig.secondary.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>About</Text>
            <Text style={styles.settingSubtitle}>Version 1.10.0</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={20} color={themeConfig.error.main} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Audit Pro v1.10.0</Text>
        <Text style={styles.footerCopyright}>© 2025 All rights reserved</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeConfig.background.default,
  },
  
  // Header
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: themeConfig.borderRadius.xl,
    borderBottomRightRadius: themeConfig.borderRadius.xl,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: themeConfig.success.main,
    borderWidth: 3,
    borderColor: themeConfig.primary.main,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: themeConfig.borderRadius.round,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Section
  section: {
    backgroundColor: themeConfig.background.paper,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: themeConfig.borderRadius.large,
    padding: 20,
    ...themeConfig.shadows.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginLeft: 10,
  },
  
  // Input
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: themeConfig.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: themeConfig.primary.main,
    backgroundColor: themeConfig.background.paper,
  },
  inputWrapperDisabled: {
    backgroundColor: themeConfig.background.default,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: themeConfig.text.primary,
    marginLeft: 12,
  },
  inputDisabled: {
    color: themeConfig.text.disabled,
  },
  helperText: {
    fontSize: 12,
    color: themeConfig.text.muted,
    marginTop: 6,
    marginLeft: 4,
  },
  
  // Save Button
  saveButton: {
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Settings
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  settingItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 14,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: themeConfig.text.secondary,
  },
  
  // Logout
  logoutSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: themeConfig.error.light,
    ...themeConfig.shadows.small,
  },
  logoutButtonText: {
    color: themeConfig.error.main,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: themeConfig.text.secondary,
    marginBottom: 4,
  },
  footerCopyright: {
    fontSize: 12,
    color: themeConfig.text.disabled,
  },
});

export default ProfileScreen;

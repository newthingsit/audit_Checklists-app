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
  RefreshControl,
  Modal,
  Linking
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
import Constants from 'expo-constants';

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
  
  // Modal states
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [appearanceModalVisible, setAppearanceModalVisible] = useState(false);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Get app version
  const appVersion = Constants.expoConfig?.version || '1.13.0';

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
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: logout
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      });
      Alert.alert('Success', 'Password changed successfully');
      setSecurityModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      Alert.alert('Error', errorMessage);
    } finally {
      setPasswordLoading(false);
    }
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
        {/* Logout button in top right */}
        <TouchableOpacity
          style={styles.headerLogoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        
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

        <TouchableOpacity 
          style={styles.settingItem} 
          activeOpacity={0.7}
          onPress={() => setSecurityModalVisible(true)}
        >
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.success.bg }]}>
            <Icon name="security" size={20} color={themeConfig.success.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Security</Text>
            <Text style={styles.settingSubtitle}>Password & authentication</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem} 
          activeOpacity={0.7}
          onPress={() => setAppearanceModalVisible(true)}
        >
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.warning.bg }]}>
            <Icon name="palette" size={20} color={themeConfig.warning.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Appearance</Text>
            <Text style={styles.settingSubtitle}>Theme & display options</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingItem, styles.settingItemLast]} 
          activeOpacity={0.7}
          onPress={() => setAboutModalVisible(true)}
        >
          <View style={[styles.settingIcon, { backgroundColor: themeConfig.secondary.light + '30' }]}>
            <Icon name="info" size={20} color={themeConfig.secondary.main} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>About</Text>
            <Text style={styles.settingSubtitle}>Version {appVersion}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={themeConfig.text.disabled} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Audit Pro v{appVersion}</Text>
        <Text style={styles.footerCopyright}>© 2025 All rights reserved</Text>
      </View>

      {/* Security Modal */}
      <Modal
        visible={securityModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity 
                onPress={() => {
                  setSecurityModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={themeConfig.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.passwordInputGroup}>
                <Text style={styles.passwordLabel}>Current Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <Icon name="lock" size={20} color={themeConfig.text.secondary} />
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={themeConfig.text.disabled}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Icon 
                      name={showCurrentPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={themeConfig.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.passwordInputGroup}>
                <Text style={styles.passwordLabel}>New Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <Icon name="lock-outline" size={20} color={themeConfig.text.secondary} />
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor={themeConfig.text.disabled}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Icon 
                      name={showNewPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={themeConfig.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.passwordInputGroup}>
                <Text style={styles.passwordLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <Icon name="lock-outline" size={20} color={themeConfig.text.secondary} />
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={themeConfig.text.disabled}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon 
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={themeConfig.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.changePasswordButton, passwordLoading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
                activeOpacity={0.7}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.changePasswordButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appearance Modal */}
      <Modal
        visible={appearanceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAppearanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appearance</Text>
              <TouchableOpacity 
                onPress={() => setAppearanceModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={themeConfig.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.appearanceOption}>
                <View style={styles.appearanceOptionLeft}>
                  <Icon name="light-mode" size={24} color={themeConfig.warning.main} />
                  <Text style={styles.appearanceOptionText}>Light Mode</Text>
                </View>
                <Icon name="check-circle" size={24} color={themeConfig.success.main} />
              </View>
              
              <View style={styles.appearanceOption}>
                <View style={styles.appearanceOptionLeft}>
                  <Icon name="dark-mode" size={24} color={themeConfig.text.secondary} />
                  <Text style={styles.appearanceOptionText}>Dark Mode</Text>
                </View>
                <Text style={styles.comingSoonBadge}>Coming Soon</Text>
              </View>
              
              <View style={[styles.appearanceOption, styles.appearanceOptionLast]}>
                <View style={styles.appearanceOptionLeft}>
                  <Icon name="settings-suggest" size={24} color={themeConfig.primary.main} />
                  <Text style={styles.appearanceOptionText}>System Default</Text>
                </View>
                <Text style={styles.comingSoonBadge}>Coming Soon</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={aboutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Audit Pro</Text>
              <TouchableOpacity 
                onPress={() => setAboutModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={themeConfig.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutBody}>
              <View style={styles.aboutLogoContainer}>
                <LinearGradient
                  colors={themeConfig.dashboardCards.card1}
                  style={styles.aboutLogo}
                >
                  <Icon name="verified" size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.aboutAppName}>Audit Pro</Text>
                <Text style={styles.aboutVersion}>Version {appVersion}</Text>
              </View>

              <View style={styles.aboutInfo}>
                <View style={styles.aboutInfoRow}>
                  <Text style={styles.aboutInfoLabel}>Build</Text>
                  <Text style={styles.aboutInfoValue}>Production</Text>
                </View>
                <View style={styles.aboutInfoRow}>
                  <Text style={styles.aboutInfoLabel}>SDK Version</Text>
                  <Text style={styles.aboutInfoValue}>{Constants.expoConfig?.sdkVersion || '54.0.0'}</Text>
                </View>
                <View style={[styles.aboutInfoRow, styles.aboutInfoRowLast]}>
                  <Text style={styles.aboutInfoLabel}>Platform</Text>
                  <Text style={styles.aboutInfoValue}>{Constants.platform?.ios ? 'iOS' : 'Android'}</Text>
                </View>
              </View>

              <Text style={styles.aboutDescription}>
                Audit Pro is a comprehensive audit management solution designed to streamline your quality assurance processes.
              </Text>

              <TouchableOpacity 
                style={styles.aboutLink}
                onPress={() => Linking.openURL('https://www.litebitefoods.com')}
              >
                <Icon name="language" size={20} color={themeConfig.primary.main} />
                <Text style={styles.aboutLinkText}>Visit Website</Text>
              </TouchableOpacity>

              <Text style={styles.aboutCopyright}>© 2025 LiteBite Foods. All rights reserved.</Text>
            </View>
          </View>
        </View>
      </Modal>
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
    position: 'relative',
  },
  headerLogoutButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeConfig.background.paper,
    borderTopLeftRadius: themeConfig.borderRadius.xl,
    borderTopRightRadius: themeConfig.borderRadius.xl,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: themeConfig.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeConfig.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingBottom: 20,
  },
  
  // Password change styles
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: themeConfig.text.secondary,
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: themeConfig.text.primary,
    marginLeft: 12,
    marginRight: 8,
  },
  changePasswordButton: {
    backgroundColor: themeConfig.primary.main,
    borderRadius: themeConfig.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  
  // Appearance styles
  appearanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  appearanceOptionLast: {
    borderBottomWidth: 0,
  },
  appearanceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appearanceOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: themeConfig.text.primary,
    marginLeft: 12,
  },
  comingSoonBadge: {
    fontSize: 11,
    color: themeConfig.text.muted,
    backgroundColor: themeConfig.background.default,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: themeConfig.borderRadius.small,
    fontWeight: '500',
  },
  
  // About styles
  aboutBody: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  aboutLogoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 14,
    color: themeConfig.text.secondary,
  },
  aboutInfo: {
    width: '100%',
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    marginBottom: 20,
  },
  aboutInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.light,
  },
  aboutInfoRowLast: {
    borderBottomWidth: 0,
  },
  aboutInfoLabel: {
    fontSize: 14,
    color: themeConfig.text.secondary,
  },
  aboutInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  aboutDescription: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: themeConfig.primary.main + '15',
    borderRadius: themeConfig.borderRadius.medium,
    marginBottom: 16,
  },
  aboutLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeConfig.primary.main,
    marginLeft: 8,
  },
  aboutCopyright: {
    fontSize: 12,
    color: themeConfig.text.disabled,
    textAlign: 'center',
  },
});

export default ProfileScreen;

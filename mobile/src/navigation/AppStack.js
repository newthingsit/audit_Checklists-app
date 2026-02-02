import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';
import { themeConfig } from '../config/theme';
import DashboardScreen from '../screens/DashboardScreen';
import ChecklistsScreen from '../screens/ChecklistsScreen';
import AuditHistoryScreen from '../screens/AuditHistoryScreen';
import AuditFormScreen from '../screens/AuditFormScreen';
import AuditDetailScreen from '../screens/AuditDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ScheduledAuditsScreen from '../screens/ScheduledAuditsScreen';
import TasksScreen from '../screens/TasksScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const safeTheme = themeConfig || {
  primary: { main: '#B91C1C', light: '#DC2626', dark: '#7F1D1D' },
  text: { primary: '#0C0A09', secondary: '#44403C', disabled: '#A8A29E' },
  background: { paper: '#ffffff', default: '#F8FAFC' },
  border: { light: '#F5F5F4' },
  success: { main: '#047857' },
};

// Shared stack header options
const stackScreenOptions = {
  headerStyle: {
    backgroundColor: safeTheme.background.paper,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: safeTheme.border.light,
  },
  headerTintColor: safeTheme.text.primary,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 17,
    color: safeTheme.text.primary,
  },
  headerBackTitleVisible: false,
  cardStyle: {
    backgroundColor: safeTheme.background.default,
  },
};

const ChecklistsStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen 
        name="ChecklistsList" 
        component={ChecklistsScreen}
        options={{ title: 'Checklist Templates' }}
      />
      <Stack.Screen 
        name="AuditForm" 
        component={AuditFormScreen}
        options={{ title: 'New Audit' }}
      />
    </Stack.Navigator>
  );
};

const HistoryStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen 
        name="HistoryList" 
        component={AuditHistoryScreen}
        options={{ title: 'Audit History' }}
      />
      <Stack.Screen 
        name="AuditDetail" 
        component={AuditDetailScreen}
        options={{ title: 'Audit Details' }}
      />
      <Stack.Screen 
        name="AuditForm" 
        component={AuditFormScreen}
        options={{ title: 'Continue Audit' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
};

const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ScheduledAudits" 
        component={ScheduledAuditsScreen}
        options={{ title: 'Scheduled Audits' }}
      />
      <Stack.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{ title: 'Tasks & Workflows' }}
      />
      <Stack.Screen 
        name="AuditForm" 
        component={AuditFormScreen}
        options={{ title: 'New Audit' }}
      />
    </Stack.Navigator>
  );
};

// Custom Tab Bar Icon with active indicator
const TabIcon = ({ focused, iconName }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Icon 
        name={iconName} 
        size={24} 
        color={focused ? themeConfig.primary.main : themeConfig.text.disabled} 
      />
      {focused && <View style={styles.tabActiveIndicator} />}
    </View>
  );
};

const AppStack = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  const canViewTemplates = hasPermission(userPermissions, 'display_templates') ||
                          hasPermission(userPermissions, 'view_templates') ||
                          hasPermission(userPermissions, 'manage_templates') ||
                          isAdmin(user);
  const canViewTasks = hasPermission(userPermissions, 'view_tasks') ||
                       hasPermission(userPermissions, 'manage_tasks') ||
                       isAdmin(user);
  const canViewAudits = hasPermission(userPermissions, 'view_audits') ||
                        hasPermission(userPermissions, 'manage_audits') ||
                        hasPermission(userPermissions, 'view_own_audits') ||
                        isAdmin(user);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Checklists') {
            iconName = 'checklist';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <TabIcon focused={focused} iconName={iconName} />;
        },
        tabBarActiveTintColor: themeConfig.primary.main,
        tabBarInactiveTintColor: themeConfig.text.disabled,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: styles.tabBar,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      {canViewTemplates && (
        <Tab.Screen name="Checklists" component={ChecklistsStack} />
      )}
      {canViewAudits && (
        <Tab.Screen name="History" component={HistoryStack} />
      )}
      {canViewTasks && (
        <Tab.Screen name="Tasks" component={TasksScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: themeConfig.background.paper,
    borderTopWidth: 1,
    borderTopColor: themeConfig.border.light,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    height: Platform.OS === 'ios' ? 88 : 65,
    ...themeConfig.shadows.small,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeConfig.primary.main,
  },
});

export default AppStack;

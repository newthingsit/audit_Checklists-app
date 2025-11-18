import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import ChecklistsScreen from '../screens/ChecklistsScreen';
import AuditHistoryScreen from '../screens/AuditHistoryScreen';
import AuditFormScreen from '../screens/AuditFormScreen';
import AuditDetailScreen from '../screens/AuditDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ChecklistsStack = () => {
  return (
    <Stack.Navigator>
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
    <Stack.Navigator>
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
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Checklists') {
            iconName = 'checklist';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Checklists" component={ChecklistsStack} />
      <Tab.Screen name="History" component={HistoryStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default AppStack;


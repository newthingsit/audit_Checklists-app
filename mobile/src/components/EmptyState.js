import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

// Common empty state configurations
const emptyStateConfigs = {
  audits: {
    icon: 'assignment',
    title: 'No Audits Yet',
    description: 'Start your first audit to see it here',
  },
  templates: {
    icon: 'checklist',
    title: 'No Templates Available',
    description: 'Templates will appear here once created',
  },
  tasks: {
    icon: 'task-alt',
    title: 'No Tasks Found',
    description: 'You have no pending tasks at the moment',
  },
  scheduled: {
    icon: 'schedule',
    title: 'No Scheduled Audits',
    description: 'Schedule an audit to see it here',
  },
  search: {
    icon: 'search-off',
    title: 'No Results Found',
    description: 'Try adjusting your search or filters',
  },
  history: {
    icon: 'history',
    title: 'No History',
    description: 'Completed audits will appear here',
  },
  default: {
    icon: 'inbox',
    title: 'Nothing Here',
    description: 'No data available at the moment',
  },
};

const EmptyState = ({
  type = 'default',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  showAction = true,
}) => {
  const config = emptyStateConfigs[type] || emptyStateConfigs.default;
  const finalIcon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={finalIcon} size={48} color={themeConfig.text.disabled} />
      </View>
      <Text style={styles.title}>{finalTitle}</Text>
      <Text style={styles.description}>{finalDescription}</Text>
      
      {showAction && actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.actionButton} activeOpacity={0.7}>
          <LinearGradient
            colors={themeConfig.dashboardCards.card1}
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="add" size={18} color="#fff" />
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Specific Empty State Components
export const NoAudits = ({ onAction }) => (
  <EmptyState 
    type="audits" 
    actionLabel="Create First Audit" 
    onAction={onAction}
  />
);

export const NoTemplates = ({ onAction }) => (
  <EmptyState 
    type="templates" 
    actionLabel="Browse Templates" 
    onAction={onAction}
  />
);

export const NoTasks = () => (
  <EmptyState type="tasks" showAction={false} />
);

export const NoScheduledAudits = ({ onAction }) => (
  <EmptyState 
    type="scheduled" 
    actionLabel="Schedule Audit" 
    onAction={onAction}
  />
);

export const NoSearchResults = ({ query }) => (
  <EmptyState 
    type="search" 
    description={query ? `No results for "${query}"` : 'Try a different search term'}
    showAction={false}
  />
);

export const NoHistory = () => (
  <EmptyState type="history" showAction={false} />
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    marginHorizontal: 16,
    marginVertical: 20,
    ...themeConfig.shadows.small,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: themeConfig.background.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EmptyState;


import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { themeConfig } from '../config/theme';
import { useAuth } from '../context/AuthContext';

const TasksScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, priorityFilter, typeFilter, tabValue, tasks]);

  const applyFilters = () => {
    let filtered = tasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.type === typeFilter);
    }

    // Tab filtering
    if (tabValue === 1) {
      // Ready to start (dependencies completed)
      filtered = filtered.filter(task => {
        if (task.status !== 'pending') return false;
        if (!task.dependencies || task.dependencies.length === 0) return true;
        return task.dependencies.every(dep => dep.depends_on_status === 'completed');
      });
    } else if (tabValue === 2) {
      // With reminders
      filtered = filtered.filter(task => {
        if (!task.reminder_date) return false;
        const reminderDate = new Date(task.reminder_date);
        const now = new Date();
        return reminderDate <= now && task.status !== 'completed';
      });
    } else if (tabValue === 3) {
      // Overdue
      filtered = filtered.filter(task => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return dueDate < now;
      });
    }

    setFilteredTasks(filtered);
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      const tasksData = response.data.tasks || [];
      setTasks(tasksData);
      setFilteredTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return themeConfig.success.main;
      case 'in_progress':
        return themeConfig.primary.main;
      case 'pending':
        return themeConfig.warning.main;
      default:
        return themeConfig.text.disabled;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return themeConfig.error.main;
      case 'medium':
        return themeConfig.warning.main;
      case 'low':
        return themeConfig.success.main;
      default:
        return themeConfig.text.disabled;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.taskDetails}>
        {item.assigned_to_name && (
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color="#666" />
            <Text style={styles.detailText}>{item.assigned_to_name}</Text>
          </View>
        )}
        {item.location_name && (
          <View style={styles.detailRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.detailText}>{item.location_name}</Text>
          </View>
        )}
        {item.due_date && (
          <View style={styles.detailRow}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.detailText}>Due: {formatDate(item.due_date)}</Text>
          </View>
        )}
        {item.reminder_date && (
          <View style={styles.detailRow}>
            <Icon name="notifications" size={16} color="#666" />
            <Text style={styles.detailText}>Reminder: {formatDate(item.reminder_date)}</Text>
          </View>
        )}
      </View>

      <View style={styles.taskTags}>
        <View style={[styles.tag, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.tagText}>{item.priority}</Text>
        </View>
        {item.type && (
          <View style={[styles.tag, { backgroundColor: themeConfig.primary.light }]}>
            <Text style={styles.tagText}>{item.type}</Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => handleStatusChange(item.id, 'in_progress')}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const tabs = [
    { label: 'All Tasks', count: tasks.length },
    { 
      label: 'Ready to Start', 
      count: tasks.filter(t => {
        if (t.status !== 'pending') return false;
        if (!t.dependencies || t.dependencies.length === 0) return true;
        return t.dependencies.every(dep => dep.depends_on_status === 'completed');
      }).length 
    },
    { 
      label: 'Reminders', 
      count: tasks.filter(t => {
        if (!t.reminder_date) return false;
        const reminderDate = new Date(t.reminder_date);
        const now = new Date();
        return reminderDate <= now && t.status !== 'completed';
      }).length 
    },
    { 
      label: 'Overdue', 
      count: tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const dueDate = new Date(t.due_date);
        const now = new Date();
        return dueDate < now;
      }).length 
    }
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeConfig.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks & Workflows</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tab, tabValue === index && styles.tabActive]}
            onPress={() => setTabValue(index)}
          >
            <Text style={[styles.tabText, tabValue === index && styles.tabTextActive]}>
              {tab.label.toUpperCase()} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView style={styles.filterScroll}>
                {['all', 'pending', 'in_progress', 'completed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.filterChipActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive
                      ]}
                    >
                      {status === 'all' ? 'All' : status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Priority:</Text>
              <ScrollView style={styles.filterScroll}>
                {['all', 'low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterChip,
                      priorityFilter === priority && styles.filterChipActive
                    ]}
                    onPress={() => setPriorityFilter(priority)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        priorityFilter === priority && styles.filterChipTextActive
                      ]}
                    >
                      {priority === 'all' ? 'All' : priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Type:</Text>
              <ScrollView style={styles.filterScroll}>
                {['all', 'general', 'action_followup', 'audit'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      typeFilter === type && styles.filterChipActive
                    ]}
                    onPress={() => setTypeFilter(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        typeFilter === type && styles.filterChipTextActive
                      ]}
                    >
                      {type === 'all' ? 'All' : type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={64} color={themeConfig.text.disabled} />
            <Text style={styles.emptyText}>No tasks found</Text>
          </View>
        }
      />
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
    backgroundColor: themeConfig.background.default,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.default,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeConfig.text.primary,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.default,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: themeConfig.primary.main,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: themeConfig.text.secondary,
  },
  tabTextActive: {
    color: themeConfig.primary.main,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeConfig.border.default,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterItem: {
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.text.secondary,
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: themeConfig.background.default,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: themeConfig.primary.main,
    borderColor: themeConfig.primary.main,
  },
  filterChipText: {
    fontSize: 12,
    color: themeConfig.text.primary,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeConfig.text.primary,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  taskDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginLeft: 8,
  },
  taskTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeConfig.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: themeConfig.borderRadius.medium,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: themeConfig.text.secondary,
    marginTop: 16,
  },
});

export default TasksScreen;


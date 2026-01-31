import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * CategorySelector Component (Mobile)
 * Displays available categories for audit selection
 * Auto-selects first incomplete category if available
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array<string>} props.categories - Available categories
 * @param {string} props.selectedCategory - Currently selected category
 * @param {Function} props.onSelectCategory - Callback when category selected
 * @param {Object} props.categoryStatus - Completion status per category
 * @param {boolean} props.loading - Loading state
 * @returns {React.ReactElement}
 */
const CategorySelector = ({
  categories = [],
  selectedCategory,
  onSelectCategory,
  categoryStatus = {},
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeConfig.colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No categories available</Text>
      </View>
    );
  }

  const getStatusIcon = (category) => {
    const status = categoryStatus[category];
    if (!status) return null;
    
    if (status.isComplete) {
      return <MaterialIcons name="check-circle" size={20} color="#4caf50" />;
    }
    
    const percentage = (status.completed / status.total) * 100;
    if (percentage > 0) {
      return <MaterialIcons name="radio-button-checked" size={20} color="#ff9800" />;
    }
    
    return <MaterialIcons name="radio-button-unchecked" size={20} color="#ccc" />;
  };

  const renderCategoryItem = ({ item: category }) => {
    const status = categoryStatus[category];
    const isSelected = selectedCategory === category;

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemSelected,
          status?.isComplete && styles.categoryItemComplete,
        ]}
        onPress={() => onSelectCategory(category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected,
              ]}
            >
              {category}
            </Text>
            {getStatusIcon(category)}
          </View>
          
          {status && (
            <Text style={styles.categoryProgress}>
              {status.completed} of {status.total} items
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => `${item}`}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  categoryItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: themeConfig.colors.primary,
  },
  categoryItemComplete: {
    backgroundColor: '#f1f8f4',
  },
  categoryContent: {
    gap: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  categoryNameSelected: {
    color: themeConfig.colors.primary,
    fontWeight: '600',
  },
  categoryProgress: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});

export default CategorySelector;

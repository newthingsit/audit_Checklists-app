import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * StepIndicator Component (Mobile)
 * Shows progress through form steps with visual indicators
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.currentStep - Current step index (0-2)
 * @param {Array<string>} props.stepLabels - Labels for each step
 * @param {Object} props.stepStatus - Completion status per step
 * @param {Function} props.onStepPress - Handle step navigation
 * @returns {React.ReactElement}
 */
const StepIndicator = ({
  currentStep = 0,
  stepLabels = ['Info', 'Categories', 'Checklist'],
  stepStatus = {},
  onStepPress,
}) => {
  const renderStepDot = (index) => {
    const isActive = currentStep === index;
    const isCompleted = stepStatus[index]?.isComplete;

    return (
      <View key={index} style={styles.stepWrapper}>
        <View
          style={[
            styles.stepDot,
            isActive && styles.stepDotActive,
            isCompleted && styles.stepDotCompleted,
          ]}
        >
          {isCompleted ? (
            <MaterialIcons
              name="check"
              size={16}
              color="#fff"
            />
          ) : (
            <Text style={styles.stepNumber}>{index + 1}</Text>
          )}
        </View>
        <Text
          style={[
            styles.stepLabel,
            isActive && styles.stepLabelActive,
          ]}
        >
          {stepLabels[index]}
        </Text>
      </View>
    );
  };

  const renderConnector = (index) => {
    if (index >= stepLabels.length - 1) return null;

    const isCompleted = stepStatus[index]?.isComplete;

    return (
      <View
        key={`connector-${index}`}
        style={[
          styles.connector,
          isCompleted && styles.connectorCompleted,
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stepLabels.map((_, index) => (
          <View key={index}>
            {renderStepDot(index)}
            {renderConnector(index)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  scrollContent: {
    alignItems: 'center',
  },
  stepWrapper: {
    alignItems: 'center',
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDotActive: {
    backgroundColor: themeConfig.colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stepDotCompleted: {
    backgroundColor: '#4caf50',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: themeConfig.colors.primary,
    fontWeight: '600',
  },
  connector: {
    width: 30,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    alignSelf: 'center',
  },
  connectorCompleted: {
    backgroundColor: '#4caf50',
  },
});

export default StepIndicator;

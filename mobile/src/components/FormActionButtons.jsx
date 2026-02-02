import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * FormActionButtons Component (Mobile)
 * Handles form navigation: Previous, Skip, Continue/Submit buttons
 * Manages state transitions between steps
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.currentStep - Current step (0-2)
 * @param {boolean} props.isLastStep - Whether on final step
 * @param {boolean} props.isFormValid - Whether form is valid
 * @param {Function} props.onPrevious - Handle previous button
 * @param {Function} props.onSkip - Handle skip button
 * @param {Function} props.onContinue - Handle continue button
 * @param {Function} props.onSubmit - Handle submit button
 * @param {boolean} props.loading - Loading state
 * @returns {React.ReactElement}
 */
const FormActionButtons = ({
  currentStep,
  isLastStep,
  isFormValid,
  onPrevious,
  onSkip,
  onContinue,
  onSubmit,
  loading = false,
}) => {
  const handleSubmit = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Invalid Form', 'Please complete all required fields');
      return;
    }
    onSubmit();
  }, [isFormValid, onSubmit]);

  const handleContinue = useCallback(() => {
    if (!isFormValid && currentStep === 2) {
      Alert.alert('Incomplete Audit', 'Please complete all categories');
      return;
    }
    onContinue();
  }, [isFormValid, currentStep, onContinue]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onPrevious}
            disabled={loading}
          >
            <MaterialIcons name="arrow-back" size={20} color="#666" />
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentStep < 2 && (
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={onSkip}
            disabled={loading}
          >
            <Text style={styles.outlineButtonText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!isFormValid || loading) && styles.buttonDisabled,
          ]}
          onPress={isLastStep ? handleSubmit : handleContinue}
          disabled={loading || (!isFormValid && currentStep === 2)}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isLastStep ? 'Submit' : 'Continue'}
              </Text>
              {!isLastStep && (
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: themeConfig.primary.main,
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeConfig.primary.main,
  },
  outlineButtonText: {
    color: themeConfig.primary.main,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default FormActionButtons;

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * DynamicItemEntry Component
 * Allows auditors to add custom items during an audit with multiple time tracking
 * Perfect for "Preparation Time Audits" where product names and times are entered manually
 */
const DynamicItemEntry = ({ onAddItem, category = '' }) => {
  const [itemName, setItemName] = useState('');
  const [timeEntries, setTimeEntries] = useState(['', '', '', '', '']);
  const [isRunningTimer, setIsRunningTimer] = useState(false);
  const [currentTimerIndex, setCurrentTimerIndex] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Start timer for a specific attempt
  const startTimer = (index) => {
    setIsRunningTimer(true);
    setCurrentTimerIndex(index);
    setTimerStartTime(Date.now());
    setElapsedTime(0);

    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - timerStartTime);
    }, 100);

    // Store interval ID for cleanup
    this._timerInterval = interval;
  };

  // Stop timer and record time
  const stopTimer = () => {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
    }

    const totalSeconds = Math.round((Date.now() - timerStartTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeValue = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update the time entry for current index
    const newEntries = [...timeEntries];
    newEntries[currentTimerIndex] = timeValue;
    setTimeEntries(newEntries);

    setIsRunningTimer(false);
    setCurrentTimerIndex(null);
    setTimerStartTime(null);
    setElapsedTime(0);
  };

  // Manual time entry
  const handleTimeChange = (index, value) => {
    const newEntries = [...timeEntries];
    newEntries[index] = value;
    setTimeEntries(newEntries);
  };

  // Convert time string (MM:SS) to minutes (decimal)
  const convertToMinutes = (timeStr) => {
    if (!timeStr || timeStr.trim() === '') return null;
    
    // If it's already a number, return as is
    if (!isNaN(timeStr)) {
      return parseFloat(timeStr);
    }

    // Parse MM:SS format
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseInt(parts[1], 10) || 0;
      return Math.round((minutes + seconds / 60) * 100) / 100;
    }

    return null;
  };

  // Calculate average time
  const calculateAverage = () => {
    const validTimes = timeEntries
      .map(convertToMinutes)
      .filter(t => t !== null && t > 0);
    
    if (validTimes.length === 0) return 0;
    
    const sum = validTimes.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / validTimes.length) * 100) / 100;
  };

  // Calculate score based on average time (simple scoring: faster is better)
  const calculateScore = (avgTime) => {
    if (avgTime === 0) return 0;
    
    // Simple scoring logic: 
    // - Under 2 minutes: 100 points
    // - 2-3 minutes: 90 points
    // - 3-4 minutes: 80 points
    // - 4-5 minutes: 70 points
    // - Over 5 minutes: decreases proportionally
    if (avgTime <= 2) return 100;
    if (avgTime <= 3) return 90;
    if (avgTime <= 4) return 80;
    if (avgTime <= 5) return 70;
    return Math.max(0, Math.round(100 - (avgTime - 2) * 10));
  };

  // Handle submit
  const handleSubmit = () => {
    if (!itemName.trim()) {
      Alert.alert('Required', 'Please enter an item name');
      return;
    }

    const validTimes = timeEntries
      .map(convertToMinutes)
      .filter(t => t !== null && t > 0);

    if (validTimes.length < 4) {
      Alert.alert(
        'Insufficient Data',
        'Please record at least 4 time entries for accurate scoring',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Anyway', 
            onPress: () => submitItem(validTimes)
          }
        ]
      );
      return;
    }

    submitItem(validTimes);
  };

  const submitItem = (validTimes) => {
    const avgTime = calculateAverage();
    const score = calculateScore(avgTime);

    const item = {
      title: itemName.trim(),
      category: category || 'Preparation Time',
      is_time_based: true,
      time_entries: validTimes,
      average_time_minutes: avgTime,
      score: score
    };

    onAddItem(item);

    // Reset form
    setItemName('');
    setTimeEntries(['', '', '', '', '']);
  };

  // Format elapsed time for display
  const formatElapsedTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const avgTime = calculateAverage();
  const score = calculateScore(avgTime);
  const validEntriesCount = timeEntries.filter(t => t && t.trim() !== '').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="add-circle" size={24} color={themeConfig.primary.main} />
        <Text style={styles.headerText}>Add Item Manually</Text>
      </View>

      {/* Item Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Item / Product Name *</Text>
        <TextInput
          style={styles.input}
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g., Classic Virgin Mojito"
          placeholderTextColor="#999"
        />
      </View>

      {/* Time Entries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⏱️ Time Tracking</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{validEntriesCount}/5 recorded</Text>
          </View>
        </View>

        <View style={styles.instructionBox}>
          <Icon name="info" size={16} color={themeConfig.info.main} />
          <Text style={styles.instructionText}>
            Record 4-5 preparation times. Use timer or enter manually (MM:SS or decimal minutes).
          </Text>
        </View>

        {timeEntries.map((time, index) => (
          <View key={index} style={styles.timeEntry}>
            <View style={styles.timeNumber}>
              <Text style={styles.timeNumberText}>#{index + 1}</Text>
            </View>

            <TextInput
              style={[styles.timeInput, time && styles.timeInputFilled]}
              value={time}
              onChangeText={(value) => handleTimeChange(index, value)}
              placeholder="0:00 or 1.5"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!isRunningTimer || currentTimerIndex !== index}
            />

            {isRunningTimer && currentTimerIndex === index ? (
              <View style={styles.timerDisplay}>
                <Text style={styles.timerText}>{formatElapsedTime(elapsedTime)}</Text>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopTimer}
                >
                  <Icon name="stop" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.startButton, isRunningTimer && styles.startButtonDisabled]}
                onPress={() => startTimer(index)}
                disabled={isRunningTimer}
              >
                <Icon name="play-arrow" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Results */}
      {validEntriesCount >= 4 && (
        <View style={styles.resultsBox}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Average Time:</Text>
            <Text style={styles.resultValue}>{avgTime.toFixed(2)} min</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Calculated Score:</Text>
            <Text style={[styles.resultValue, styles.scoreValue]}>{score} / 100</Text>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, !itemName.trim() && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!itemName.trim()}
      >
        <Icon name="check" size={20} color="#fff" />
        <Text style={styles.submitButtonText}>Add Item to Audit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    backgroundColor: themeConfig.primary.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 13,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
  },
  timeEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeInputFilled: {
    borderColor: themeConfig.success.main,
    backgroundColor: '#f1f8f4',
  },
  startButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeConfig.success.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeConfig.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeConfig.error.main,
    marginRight: 10,
    fontFamily: 'monospace',
  },
  resultsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: themeConfig.success.main,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreValue: {
    color: themeConfig.success.main,
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: themeConfig.primary.main,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DynamicItemEntry;


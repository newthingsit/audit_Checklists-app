import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Svg, { Path, G } from 'react-native-svg';
import { themeConfig } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - 48;
const CANVAS_HEIGHT = 200;

export const buildSignatureData = (paths) => ({
  paths,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  timestamp: new Date().toISOString(),
});

// Signature Pad Component
const SignaturePad = ({ onSave, onClear, onChange, style }) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  // Use refs to track current state for onChange callbacks (avoid stale closures)
  const pathsRef = useRef([]);
  const currentPathRef = useRef('');

  // Update refs when state changes
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setIsSigning(true);
        const newPath = `M${locationX},${locationY}`;
        setCurrentPath(newPath);
        currentPathRef.current = newPath;
        // Notify onChange immediately when drawing starts so button enables
        if (onChange) {
          const allPaths = pathsRef.current.length > 0 ? [...pathsRef.current, newPath] : [newPath];
          onChange(buildSignatureData(allPaths));
        }
      },
      
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const previous = currentPathRef.current;
        const updated = previous ? `${previous} L${locationX},${locationY}` : `M${locationX},${locationY}`;
        currentPathRef.current = updated;
        setCurrentPath(updated);
        // Notify onChange during drawing so button stays enabled in real-time
        if (onChange) {
          const allPaths = pathsRef.current.length > 0 ? [...pathsRef.current, updated] : [updated];
          onChange(buildSignatureData(allPaths));
        }
      },
      
      onPanResponderRelease: () => {
        setIsSigning(false);
        const pathToSave = currentPathRef.current;
        if (pathToSave) {
          const updatedPaths = [...pathsRef.current, pathToSave];
          pathsRef.current = updatedPaths;
          setPaths(updatedPaths);
          if (onChange) onChange(buildSignatureData(updatedPaths));
          setCurrentPath('');
          currentPathRef.current = '';
        } else {
          // If no currentPath but we have paths, still notify
          if (pathsRef.current.length > 0 && onChange) {
            onChange(buildSignatureData(pathsRef.current));
          } else if (onChange) {
            // No signature at all
            onChange(null);
          }
        }
      },
    })
  ).current;

  const clear = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    pathsRef.current = [];
    currentPathRef.current = '';
    if (onClear) onClear();
    if (onChange) onChange(null);
  }, [onClear, onChange]);

  const save = useCallback(() => {
    if (paths.length === 0 && !currentPath) {
      return null;
    }
    
    // Return SVG path data
    const allPaths = [...paths];
    if (currentPath) allPaths.push(currentPath);
    
    const signatureData = buildSignatureData(allPaths);
    
    if (onSave) onSave(signatureData);
    if (onChange) onChange(signatureData);
    return signatureData;
  }, [paths, currentPath, onSave, onChange]);

  const isEmpty = paths.length === 0 && !currentPath;

  return (
    <View style={[styles.signaturePad, style]}>
      <View style={styles.canvasContainer}>
        <View 
          style={styles.canvas}
          testID="signature-canvas"
          accessibilityLabel="signature-canvas"
          {...panResponder.panHandlers}
        >
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <G>
              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={path}
                  stroke={themeConfig.text.primary}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={themeConfig.text.primary}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </G>
          </Svg>
          
          {isEmpty && (
            <View style={styles.placeholder}>
              <Icon name="gesture" size={32} color={themeConfig.text.disabled} />
              <Text style={styles.placeholderText}>Sign here</Text>
            </View>
          )}
        </View>
        
        {/* Signature line */}
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Signature</Text>
      </View>
      
      <View style={styles.padActions}>
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clear}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={18} color={themeConfig.text.secondary} />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Full Signature Modal
export const SignatureModal = ({ 
  visible, 
  onClose, 
  onSave,
  title = 'Add Your Signature',
  subtitle = 'Sign to confirm audit completion',
}) => {
  const signatureRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setSignatureData(null);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSave = () => {
    if (signatureData && signatureData.paths && signatureData.paths.length > 0) {
      onSave(signatureData);
      onClose();
    }
  };

  const handleClear = () => {
    setSignatureData(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[styles.modalContent, { opacity: fadeAnim }]}
        >
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={themeConfig.text.secondary} />
            </TouchableOpacity>
          </View>

          <SignaturePad 
            ref={signatureRef}
            onSave={setSignatureData}
            onClear={handleClear}
            onChange={setSignatureData}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!signatureData || !signatureData.paths || signatureData.paths.length === 0) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!signatureData || !signatureData.paths || signatureData.paths.length === 0}
              activeOpacity={0.7}
              testID="signature-save"
              accessibilityLabel="signature-save"
            >
              <LinearGradient
                colors={(signatureData && signatureData.paths && signatureData.paths.length > 0)
                  ? themeConfig.dashboardCards.card1 
                  : [themeConfig.text.disabled, themeConfig.text.disabled]
                }
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Confirm Signature</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Signature Display Component (for viewing saved signatures)
export const SignatureDisplay = ({ signature, style }) => {
  if (!signature || !signature.paths || signature.paths.length === 0) {
    return (
      <View style={[styles.signatureDisplay, styles.emptySignature, style]}>
        <Icon name="gesture" size={24} color={themeConfig.text.disabled} />
        <Text style={styles.noSignatureText}>No signature</Text>
      </View>
    );
  }

  return (
    <View style={[styles.signatureDisplay, style]}>
      <Svg 
        width={signature.width || CANVAS_WIDTH} 
        height={signature.height || CANVAS_HEIGHT}
        viewBox={`0 0 ${signature.width || CANVAS_WIDTH} ${signature.height || CANVAS_HEIGHT}`}
      >
        <G>
          {signature.paths.map((path, index) => (
            <Path
              key={index}
              d={path}
              stroke={themeConfig.text.primary}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </G>
      </Svg>
      {signature.timestamp && (
        <Text style={styles.signatureTimestamp}>
          Signed: {new Date(signature.timestamp).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

// Signature Button (triggers modal)
export const SignatureButton = ({ 
  onPress, 
  signed = false, 
  label = 'Add Signature',
  signedLabel = 'Signature Added',
}) => {
  return (
    <TouchableOpacity
      style={[styles.signatureButton, signed && styles.signatureButtonSigned]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.signatureButtonContent}>
        <View style={[
          styles.signatureButtonIcon,
          signed && styles.signatureButtonIconSigned
        ]}>
          <Icon 
            name={signed ? 'check' : 'gesture'} 
            size={24} 
            color={signed ? themeConfig.success.main : themeConfig.primary.main} 
          />
        </View>
        <View style={styles.signatureButtonText}>
          <Text style={[
            styles.signatureButtonLabel,
            signed && styles.signatureButtonLabelSigned
          ]}>
            {signed ? signedLabel : label}
          </Text>
          <Text style={styles.signatureButtonHint}>
            {signed ? 'Tap to view or re-sign' : 'Required for completion'}
          </Text>
        </View>
      </View>
      <Icon 
        name="chevron-right" 
        size={24} 
        color={themeConfig.text.disabled} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Signature Pad
  signaturePad: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.large,
    padding: 16,
  },
  canvasContainer: {
    position: 'relative',
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: themeConfig.text.disabled,
    fontSize: 14,
    marginTop: 8,
  },
  signatureLine: {
    height: 1,
    backgroundColor: themeConfig.text.disabled,
    marginTop: -40,
    marginHorizontal: 20,
  },
  signatureLabel: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  padActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: themeConfig.text.secondary,
    fontSize: 14,
    marginLeft: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: themeConfig.background.paper,
    borderTopLeftRadius: themeConfig.borderRadius.xl,
    borderTopRightRadius: themeConfig.borderRadius.xl,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: themeConfig.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeConfig.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: themeConfig.text.secondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: themeConfig.borderRadius.medium,
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: themeConfig.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: themeConfig.borderRadius.medium,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Signature Display
  signatureDisplay: {
    backgroundColor: themeConfig.background.default,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 12,
    alignItems: 'center',
  },
  emptySignature: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noSignatureText: {
    color: themeConfig.text.disabled,
    fontSize: 14,
    marginLeft: 8,
  },
  signatureTimestamp: {
    fontSize: 11,
    color: themeConfig.text.secondary,
    marginTop: 8,
  },

  // Signature Button
  signatureButton: {
    backgroundColor: themeConfig.background.paper,
    borderRadius: themeConfig.borderRadius.medium,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeConfig.border.default,
    ...themeConfig.shadows.small,
  },
  signatureButtonSigned: {
    borderColor: themeConfig.success.light,
    backgroundColor: themeConfig.success.bg,
  },
  signatureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signatureButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: themeConfig.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  signatureButtonIconSigned: {
    backgroundColor: themeConfig.success.bg,
  },
  signatureButtonText: {
    flex: 1,
  },
  signatureButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: themeConfig.text.primary,
  },
  signatureButtonLabelSigned: {
    color: themeConfig.success.dark,
  },
  signatureButtonHint: {
    fontSize: 12,
    color: themeConfig.text.secondary,
    marginTop: 2,
  },
});

export default SignaturePad;


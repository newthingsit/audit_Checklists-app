import React, { useState } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { MaterialIcons } from '@expo/vector-icons';
import { themeConfig } from '../config/theme';

/**
 * SignatureCapture Component (Mobile)
 * Modal for capturing electronic signature
 * Handles signature drawing, saving, and clearing
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onSignatureCapture - Callback with signature data
 * @param {Function} props.onClose - Close modal callback
 * @returns {React.ReactElement}
 */
const SignatureCapture = ({
  visible = false,
  onSignatureCapture,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const signatureRef = React.useRef(null);

  const handleSignatureSave = async (signature) => {
    try {
      setLoading(true);
      
      onSignatureCapture({
        signature,
        timestamp: new Date().toISOString(),
      });
      
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature?.();
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Signature</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Signature Canvas */}
        <View style={styles.canvasContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignatureSave}
            onEmpty={() => {}}
            descriptionText="Sign below"
            clearText="Clear"
            confirmText="Save"
            webStyle={`
              .m-signature-pad--footer { display: none; margin: 0px; }
              .m-signature-pad { margin: 0px; border: none; }
            `}
            penColor={themeConfig.primary.main}
          />
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
            disabled={loading}
          >
            <MaterialIcons name="delete" size={18} color="#d32f2f" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => signatureRef.current?.readSignature?.()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  canvasContainer: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  clearButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: themeConfig.primary.main,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default SignatureCapture;

// =========================================================================
// VISION Remote — Security Confirmation Modal
// =========================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useVisionStore } from '../store/visionStore';

export const ConfirmationModal: React.FC = () => {
  const pending = useVisionStore((s) => s.pendingConfirmation);
  const respond = useVisionStore((s) => s.respondConfirmation);

  if (!pending) return null;

  const handleAllow = () => {
    respond(pending.actionId, 'ALLOW');
  };

  const handleDeny = () => {
    respond(pending.actionId, 'DENY');
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View>
              <Text style={styles.title}>AUTHORIZATION REQUIRED</Text>
              <Text style={styles.subtitle}>Action requires your explicit permission</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TOOL / ACTION</Text>
              <Text style={styles.fieldValue}>{pending.toolName}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>REASON</Text>
              <Text style={styles.reasonText}>{pending.reason}</Text>
            </View>

            {pending.args && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>ARGUMENTS</Text>
                <ScrollView style={styles.argsScroll} nestedScrollEnabled={true}>
                  <Text style={styles.argsCode}>
                    {typeof pending.args === 'object' ? JSON.stringify(pending.args, null, 2) : String(pending.args)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.denyButton} onPress={handleDeny} activeOpacity={0.8}>
              <Text style={styles.denyButtonText}>CANCEL / DENY</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.allowButton} onPress={handleAllow} activeOpacity={0.8}>
              <Text style={styles.allowButtonText}>AUTHORIZE & RUN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  warningIcon: {
    fontSize: 28,
  },
  title: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    gap: 12,
    marginBottom: 18,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldValue: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  reasonText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
  },
  argsScroll: {
    maxHeight: 100,
    backgroundColor: '#05070B',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  argsCode: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  denyButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  allowButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonText: {
    color: '#022C22',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

// =========================================================================
// VISION Remote — Header Component
// =========================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useVisionStore } from '../store/visionStore';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const connectionStatus = useVisionStore((s) => s.connectionStatus);
  const systemName = useVisionStore((s) => s.systemName);
  const host = useVisionStore((s) => s.host);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981'; // Green
      case 'connecting':
      case 'reconnecting': return '#F59E0B'; // Amber
      default: return '#EF4444'; // Red
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return 'ONLINE';
      case 'connecting': return 'CONNECTING';
      case 'reconnecting': return 'RECONNECTING';
      default: return 'OFFLINE';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>VISION</Text>
        <Text style={styles.badge}>REMOTE</Text>
      </View>

      <TouchableOpacity style={styles.right} onPress={onOpenSettings} activeOpacity={0.7}>
        <View style={styles.statusBox}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusLabel()}</Text>
        </View>
        <Text style={styles.hostText}>{systemName} ({host})</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#070A0F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#00F0FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  badge: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hostText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
});

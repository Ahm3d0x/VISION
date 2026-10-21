// =========================================================================
// VISION Remote — Home Dashboard Screen
// =========================================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useVisionStore } from '../store/visionStore';

interface HomeScreenProps {
  onNavigateTab: (tab: 'chat' | 'tasks' | 'vision') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const telemetry = useVisionStore((s) => s.telemetry);
  const activeTask = useVisionStore((s) => s.activeTask);
  const sendCommand = useVisionStore((s) => s.sendCommand);
  const systemState = useVisionStore((s) => s.systemState);

  const quickActions = [
    { label: 'افتح VS Code', cmd: 'VISION افتح VS Code' },
    { label: 'شغل المتصفح', cmd: 'VISION افتح المتصفح' },
    { label: 'حلل الشاشة', cmd: 'VISION بص على الشاشة وقولي إيه المفتوح' },
    { label: 'فحص الهاردوير', cmd: 'VISION اعرض حالة النظام وكارت الشاشة' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Greeting Banner */}
      <View style={styles.greeting}>
        <Text style={styles.greetingSub}>PERSONAL AI OS • DESKTOP CONTROL</Text>
        <Text style={styles.greetingTitle}>Welcome Back, Ahmed</Text>
      </View>

      {/* Active Task Live Monitor Card */}
      {activeTask && activeTask.status === 'RUNNING' && (
        <TouchableOpacity
          style={styles.taskCard}
          onPress={() => onNavigateTab('tasks')}
          activeOpacity={0.8}
        >
          <View style={styles.taskCardHeader}>
            <View style={styles.taskBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.taskBadgeText}>ACTIVE AGENT TASK</Text>
            </View>
            <Text style={styles.taskPercent}>{activeTask.progressPercent}%</Text>
          </View>

          <Text style={styles.taskPrompt} numberOfLines={2}>
            {activeTask.prompt}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(5, activeTask.progressPercent))}%` },
              ]}
            />
          </View>

          <Text style={styles.taskActivity} numberOfLines={1}>
            ● {activeTask.currentActivity || 'Executing...'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Hardware Telemetry Grid (RTX 3060, CPU, RAM) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>HARDWARE & SYSTEM TELEMETRY</Text>
      </View>

      <View style={styles.telemetryGrid}>
        {/* CPU */}
        <View style={styles.telemetryCard}>
          <Text style={styles.cardIcon}>⚡</Text>
          <Text style={styles.cardValue}>{telemetry?.cpuUsage ?? 0}%</Text>
          <Text style={styles.cardLabel}>CPU LOAD</Text>
          <Text style={styles.cardSub}>Intel Core i7-14700F</Text>
        </View>

        {/* GPU */}
        <View style={styles.telemetryCard}>
          <Text style={styles.cardIcon}>🎮</Text>
          <Text style={styles.cardValue}>{telemetry?.gpuUsage ?? 0}%</Text>
          <Text style={styles.cardLabel}>GPU LOAD</Text>
          <Text style={styles.cardSub}>{telemetry?.gpuName || 'RTX 3060 12GB'}</Text>
        </View>

        {/* RAM */}
        <View style={styles.telemetryCard}>
          <Text style={styles.cardIcon}>💾</Text>
          <Text style={styles.cardValue}>
            {Math.round((telemetry?.memoryUsageMb ?? 0) / 1024)} GB
          </Text>
          <Text style={styles.cardLabel}>MEMORY IN USE</Text>
          <Text style={styles.cardSub}>
            Total: {Math.round((telemetry?.totalMemoryMb ?? 0) / 1024)} GB
          </Text>
        </View>

        {/* Status */}
        <View style={styles.telemetryCard}>
          <Text style={styles.cardIcon}>🛡️</Text>
          <Text style={[styles.cardValue, { color: '#10B981' }]}>{systemState}</Text>
          <Text style={styles.cardLabel}>AGENT ENGINE</Text>
          <Text style={styles.cardSub}>Ready for Action</Text>
        </View>
      </View>

      {/* Quick Digital Actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      </View>

      <View style={styles.quickGrid}>
        {quickActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionButton}
            onPress={() => {
              sendCommand(action.cmd);
              onNavigateTab('chat');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{action.label}</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Primary Voice Mic Action Banner */}
      <View style={styles.micSection}>
        <TouchableOpacity
          style={styles.micButton}
          onPress={() => onNavigateTab('chat')}
          activeOpacity={0.8}
        >
          <Text style={styles.micIcon}>🎙️</Text>
          <Text style={styles.micText}>TAP TO TALK WITH VISION</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  greeting: {
    marginTop: 8,
    marginBottom: 4,
  },
  greetingSub: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  greetingTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  taskCard: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F0FF',
  },
  taskBadgeText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  taskPercent: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  taskPrompt: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00F0FF',
  },
  taskActivity: {
    color: '#94A3B8',
    fontSize: 12,
  },
  sectionHeader: {
    marginTop: 6,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  telemetryCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0C101A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 2,
  },
  cardIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardValue: {
    color: '#00F0FF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  cardSub: {
    color: '#475569',
    fontSize: 10,
  },
  quickGrid: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0C101A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  actionText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  actionArrow: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '700',
  },
  micSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  micButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  micIcon: {
    fontSize: 22,
  },
  micText: {
    color: '#070A0F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

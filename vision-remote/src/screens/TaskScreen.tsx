// =========================================================================
// VISION Remote — Live Agent Task Monitor & Emergency STOP Screen
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

export const TaskScreen: React.FC = () => {
  const activeTask = useVisionStore((s) => s.activeTask);
  const cancelActiveTask = useVisionStore((s) => s.cancelActiveTask);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return '#00F0FF';
      case 'COMPLETED': return '#10B981';
      case 'FAILED': return '#EF4444';
      case 'CANCELLED': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠️';
      default: return '●';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#00F0FF';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {!activeTask ? (
        <View style={styles.idleBox}>
          <Text style={styles.idleIcon}>⚙️</Text>
          <Text style={styles.idleTitle}>No Active Agent Task</Text>
          <Text style={styles.idleHint}>
            When you ask VISION to perform multi-step work or digital tasks, live progress and execution steps will appear here.
          </Text>
        </View>
      ) : (
        <>
          {/* Task Header Card */}
          <View style={styles.taskCard}>
            <View style={styles.cardHeader}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(activeTask.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(activeTask.status) }]}>
                  {activeTask.status}
                </Text>
              </View>
              <Text style={styles.taskIdText}>{activeTask.id}</Text>
            </View>

            <Text style={styles.promptTitle}>{activeTask.prompt}</Text>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>COMPLETION PROGRESS</Text>
                <Text style={styles.progressValue}>{activeTask.progressPercent}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, Math.max(5, activeTask.progressPercent))}%`,
                      backgroundColor: getStatusColor(activeTask.status),
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.currentActivity}>
              Activity: {activeTask.currentActivity || 'In progress'}
            </Text>
          </View>

          {/* Emergency STOP Button (Only active when task is running) */}
          {activeTask.status === 'RUNNING' && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={cancelActiveTask}
              activeOpacity={0.8}
            >
              <Text style={styles.stopButtonText}>🛑 EMERGENCY STOP TASK</Text>
            </TouchableOpacity>
          )}

          {/* Execution Steps Checklist */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsCardTitle}>EXECUTION STEPS & TOOLS</Text>

            {activeTask.steps.length === 0 ? (
              <Text style={styles.noStepsText}>Planning execution steps...</Text>
            ) : (
              activeTask.steps.map((step, idx) => (
                <View key={step.stepId || idx} style={styles.stepItem}>
                  <Text
                    style={[
                      styles.stepIcon,
                      { color: getStepStatusColor(step.status) },
                    ]}
                  >
                    {getStepStatusIcon(step.status)}
                  </Text>

                  <View style={styles.stepContent}>
                    <Text style={styles.stepMessage}>{step.message}</Text>
                    {step.toolName && (
                      <Text style={styles.stepTool}>Tool: {step.toolName}</Text>
                    )}
                  </View>

                  <Text style={styles.stepTime}>{step.timestamp}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
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
  idleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
    paddingHorizontal: 30,
    gap: 10,
  },
  idleIcon: {
    fontSize: 48,
  },
  idleTitle: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  idleHint: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  taskCard: {
    backgroundColor: '#0C101A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    padding: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  taskIdText: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  promptTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  progressSection: {
    gap: 6,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressValue: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  currentActivity: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  stopButton: {
    height: 52,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stepsCard: {
    backgroundColor: '#0C101A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  stepsCardTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
  },
  noStepsText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  stepIcon: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepMessage: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  stepTool: {
    color: '#00F0FF',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  stepTime: {
    color: '#475569',
    fontSize: 10,
  },
});

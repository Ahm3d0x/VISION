// =========================================================================
// VISION Remote — Bottom Navigation Bar
// =========================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type TabType = 'home' | 'chat' | 'tasks' | 'vision' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasActiveTask?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  hasActiveTask = false,
}) => {
  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: 'home', label: 'Home', icon: '⚡' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'tasks', label: 'Tasks', icon: '⚙️' },
    { key: 'vision', label: 'Vision', icon: '👁️' },
    { key: 'settings', label: 'Pairing', icon: '🔗' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        const showTaskDot = t.key === 'tasks' && hasActiveTask;

        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onSelectTab(t.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{t.icon}</Text>
              {showTaskDot && <View style={styles.taskBadge} />}
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: '#090D14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#00F0FF',
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  taskBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#00F0FF',
    fontWeight: '700',
  },
});

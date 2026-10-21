// =========================================================================
// VISION Remote — Application Root (React Native)
// =========================================================================

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useVisionStore } from './src/store/visionStore';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { ConfirmationModal } from './src/components/ConfirmationModal';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { TaskScreen } from './src/screens/TaskScreen';
import { VisionScreen } from './src/screens/VisionScreen';
import { PairingScreen } from './src/screens/PairingScreen';

export default function App() {
  const init = useVisionStore((s) => s.init);
  const authToken = useVisionStore((s) => s.authToken);
  const activeTask = useVisionStore((s) => s.activeTask);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    init().finally(() => {
      setIsInitialized(true);
    });
  }, []);

  const hasActiveTask = activeTask?.status === 'RUNNING';

  const renderActiveScreen = () => {
    // If not paired yet, show pairing screen
    if (!authToken || activeTab === 'settings') {
      return (
        <PairingScreen
          onPairedSuccess={() => {
            setActiveTab('home');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'chat':
        return <ChatScreen />;
      case 'tasks':
        return <TaskScreen />;
      case 'vision':
        return <VisionScreen />;
      default:
        return <HomeScreen onNavigateTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header Bar */}
        <Header onOpenSettings={() => setActiveTab('settings')} />

        {/* Primary Screen View */}
        <View style={styles.content}>
          {renderActiveScreen()}
        </View>

        {/* Bottom Navigation (Visible when paired) */}
        {authToken && (
          <BottomNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            hasActiveTask={hasActiveTask}
          />
        )}

        {/* Global Security Confirmation Modal */}
        <ConfirmationModal />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A0F',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
  },
  content: {
    flex: 1,
  },
});

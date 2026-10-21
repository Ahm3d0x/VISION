// =========================================================================
// VISION Remote — Pairing & Network Discovery Screen
// =========================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVisionStore } from '../store/visionStore';
import { discoveryService } from '../services/discovery';
import { DiscoveredSystem } from '../types/protocol';

interface PairingScreenProps {
  onPairedSuccess: () => void;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({ onPairedSuccess }) => {
  const host = useVisionStore((s) => s.host);
  const setHost = useVisionStore((s) => s.setHost);
  const pair = useVisionStore((s) => s.pair);
  const connectionStatus = useVisionStore((s) => s.connectionStatus);

  const [inputHost, setInputHost] = useState(host);
  const [pin, setPin] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discovered, setDiscovered] = useState<DiscoveredSystem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setErrorMessage(null);

    const systems = await discoveryService.scanLocalNetwork(
      (found) => {
        setDiscovered((prev) => {
          if (prev.some((s) => s.ip === found.ip)) return prev;
          return [...prev, found];
        });
        setInputHost(found.ip);
        setHost(found.ip, found.port);
      },
      (percent) => setScanProgress(percent)
    );

    setIsScanning(false);
    if (systems.length > 0) {
      setInputHost(systems[0].ip);
      setHost(systems[0].ip, systems[0].port);
    }
  };

  const handleConnect = async () => {
    if (!pin || pin.length !== 6) {
      setErrorMessage('Please enter the 6-digit code shown on VISION Desktop.');
      return;
    }

    setIsPairing(true);
    setErrorMessage(null);
    setHost(inputHost.trim());

    const result = await pair(pin.trim());
    setIsPairing(false);

    if (result.success) {
      onPairedSuccess();
    } else {
      setErrorMessage(result.error || 'Failed to connect. Ensure code is correct and unexpired.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>VISION REMOTE</Text>
          <Text style={styles.brandSubtitle}>Personal AI Operating System • Remote Interface</Text>
        </View>

        {/* Discovery & Host Configuration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>1. DESKTOP CONNECTION</Text>
            <TouchableOpacity onPress={handleScan} disabled={isScanning} activeOpacity={0.7}>
              <Text style={styles.scanButtonText}>
                {isScanning ? `Scanning ${scanProgress}%...` : '🔄 Scan Wi-Fi'}
              </Text>
            </TouchableOpacity>
          </View>

          {discovered.length > 0 && (
            <View style={styles.discoveredBox}>
              <Text style={styles.discoveredLabel}>DETECTED SYSTEMS ON LAN:</Text>
              {discovered.map((sys) => (
                <TouchableOpacity
                  key={sys.ip}
                  style={[styles.discoveredItem, inputHost === sys.ip && styles.discoveredSelected]}
                  onPress={() => {
                    setInputHost(sys.ip);
                    setHost(sys.ip, sys.port);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.discoveredIcon}>💻</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.discoveredName}>{sys.systemName} ({sys.hostname})</Text>
                    <Text style={styles.discoveredIp}>http://{sys.ip}:{sys.port}</Text>
                  </View>
                  <Text style={styles.discoveredStatus}>ONLINE</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PC IP ADDRESS</Text>
            <TextInput
              style={styles.textInput}
              value={inputHost}
              onChangeText={setInputHost}
              placeholder="e.g. 192.168.1.9"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* 6-Digit PIN Pairing Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. ENTER PAIRING CODE</Text>
          <Text style={styles.pinHint}>
            Check the 6-digit code shown on your computer screen in VISION.
          </Text>

          <View style={styles.pinContainer}>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor="#334155"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.connectButton, isPairing && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isPairing}
            activeOpacity={0.8}
          >
            {isPairing ? (
              <ActivityIndicator color="#070A0F" />
            ) : (
              <Text style={styles.connectButtonText}>PAIR & CONNECT TO VISION</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
  },
  scroll: {
    padding: 20,
    paddingTop: 40,
    gap: 20,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    color: '#00F0FF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0C101A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  scanButtonText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  discoveredBox: {
    gap: 8,
  },
  discoveredLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  discoveredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  discoveredSelected: {
    borderColor: '#00F0FF',
    backgroundColor: '#0E2238',
  },
  discoveredIcon: {
    fontSize: 20,
  },
  discoveredName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  discoveredIp: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  discoveredStatus: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textInput: {
    height: 48,
    backgroundColor: '#05070B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'monospace',
  },
  pinHint: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  pinInput: {
    width: '100%',
    height: 64,
    backgroundColor: '#05070B',
    borderWidth: 2,
    borderColor: '#00F0FF',
    borderRadius: 12,
    textAlign: 'center',
    color: '#00F0FF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 12,
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
  },
  connectButton: {
    height: 52,
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#070A0F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

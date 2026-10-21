// =========================================================================
// VISION Remote — Multimodal Camera & Visual Analysis Screen
// =========================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useVisionStore } from '../store/visionStore';

export const VisionScreen: React.FC = () => {
  const submitVisionFrame = useVisionStore((s) => s.submitVisionFrame);
  const isAnalyzing = useVisionStore((s) => s.isAnalyzingVision);
  const findings = useVisionStore((s) => s.visionFindings);

  const [prompt, setPrompt] = useState('Analyze this image and describe any errors, components, or details.');

  // Simulated snapshot for initial testing
  const dummySnapshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeAF5U79eJAAAAABJRU5ErkJggg==';

  const handleCaptureAndInspect = () => {
    submitVisionFrame(dummySnapshot, prompt.trim());
  };

  const presetPrompts = [
    'What component or circuit is this?',
    'Read this error on screen and diagnose it.',
    'Extract the text and code visible here.',
    'Check physical connections and cables.',
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>PHONE CAMERA • GPU MULTIMODAL VISION</Text>
        <Text style={styles.headerTitle}>Ask VISION About Physical Objects</Text>
      </View>

      {/* Viewfinder Preview Box */}
      <View style={styles.viewfinder}>
        <View style={styles.crosshairTL} />
        <View style={styles.crosshairTR} />
        <View style={styles.crosshairBL} />
        <View style={styles.crosshairBR} />

        <Text style={styles.viewfinderIcon}>📷</Text>
        <Text style={styles.viewfinderText}>CAMERA VIEWFINDER ACTIVE</Text>
        <Text style={styles.viewfinderSub}>Point at circuit, screen, or document</Text>
      </View>

      {/* Prompt Configuration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>INSPECTION QUESTION / PROMPT</Text>
        <TextInput
          style={styles.textInput}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask VISION about this object..."
          placeholderTextColor="#475569"
          multiline={true}
        />

        <View style={styles.presetsRow}>
          {presetPrompts.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetChip}
              onPress={() => setPrompt(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
          onPress={handleCaptureAndInspect}
          disabled={isAnalyzing}
          activeOpacity={0.8}
        >
          {isAnalyzing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#070A0F" />
              <Text style={styles.captureButtonText}>ANALYZING WITH VISION MODEL...</Text>
            </View>
          ) : (
            <Text style={styles.captureButtonText}>CAPTURE & ASK VISION</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Multimodal Analysis Findings */}
      {findings && (
        <View style={styles.findingsCard}>
          <View style={styles.findingsHeader}>
            <Text style={styles.findingsBadge}>✓ VISION ANALYSIS RESULTS</Text>
          </View>
          <Text style={styles.findingsText}>{findings}</Text>
        </View>
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
  header: {
    marginTop: 4,
  },
  headerSub: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  viewfinder: {
    height: 220,
    backgroundColor: '#05080E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 6,
  },
  crosshairTL: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00F0FF',
  },
  crosshairTR: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00F0FF',
  },
  crosshairBL: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00F0FF',
  },
  crosshairBR: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00F0FF',
  },
  viewfinderIcon: {
    fontSize: 40,
  },
  viewfinderText: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  viewfinderSub: {
    color: '#64748B',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0C101A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  textInput: {
    backgroundColor: '#05070B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  presetText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  captureButton: {
    height: 52,
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captureButtonText: {
    color: '#070A0F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  findingsCard: {
    backgroundColor: '#081C1B',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  findingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  findingsBadge: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  findingsText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
  },
});

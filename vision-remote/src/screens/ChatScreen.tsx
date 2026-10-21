// =========================================================================
// VISION Remote — Chat & Voice Communication Screen
// =========================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVisionStore } from '../store/visionStore';

export const ChatScreen: React.FC = () => {
  const messages = useVisionStore((s) => s.messages);
  const sendCommand = useVisionStore((s) => s.sendCommand);
  const activeTask = useVisionStore((s) => s.activeTask);

  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, activeTask?.steps]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendCommand(input.trim());
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>VISION Agent Online</Text>
            <Text style={styles.emptyHint}>
              Ask VISION to open apps, inspect screens, run projects, or execute terminal commands.
            </Text>
          </View>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View
                key={m.id}
                style={[styles.msgWrapper, isUser ? styles.userWrapper : styles.visionWrapper]}
              >
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.visionBubble]}>
                  <Text style={[styles.msgText, isUser ? styles.userText : styles.visionText]}>
                    {m.text}
                  </Text>

                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <View style={styles.toolsRow}>
                      {m.toolsUsed.map((t, idx) => (
                        <View key={idx} style={styles.toolTag}>
                          <Text style={styles.toolTagText}>⚡ {t}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.timeText}>{m.timestamp}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* Live Active Execution Card in Chat */}
        {activeTask && activeTask.status === 'RUNNING' && (
          <View style={styles.liveActivityCard}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTitle}>AGENT IS EXECUTING ON PC...</Text>
            </View>
            <Text style={styles.liveActivityText}>
              ● {activeTask.currentActivity || 'Processing tool commands...'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Write command or message..."
          placeholderTextColor="#475569"
          multiline={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyHint: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  msgWrapper: {
    width: '100%',
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  visionWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  userBubble: {
    backgroundColor: '#0E2238',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderBottomRightRadius: 2,
  },
  visionBubble: {
    backgroundColor: '#0E131F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  visionText: {
    color: '#E2E8F0',
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  toolTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolTagText: {
    color: '#00F0FF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  timeText: {
    color: '#475569',
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  liveActivityCard: {
    backgroundColor: '#0C1220',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 6,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  liveTitle: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveActivityText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#090D14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#05070B',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    width: 46,
    height: 46,
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#070A0F',
    fontSize: 16,
    fontWeight: '900',
  },
});

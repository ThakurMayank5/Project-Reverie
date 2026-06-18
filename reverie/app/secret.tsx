import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { isConfigured, loadAndInitKeys, getUsername } from '@/services/settings';
import { initDB, getMessages, type LocalMessage } from '@/services/database';
import { KeyManager, decryptMessage } from '@/services/crypto';
import { sendMessage, subscribeToMessages } from '@/services/chat-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisplayMessage {
  id: number;
  firestoreId: string;
  sender: string;
  text: string;
  timestamp: number;
  isMine: boolean;
  status: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Message Bubble Component
// ---------------------------------------------------------------------------

function MessageBubble({ message, theme }: { message: DisplayMessage; theme: ReturnType<typeof useTheme> }) {
  const time = new Date(message.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.bubbleRow,
        message.isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.isMine
            ? [styles.bubbleMine, { backgroundColor: theme.accent }]
            : [styles.bubbleTheirs, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: message.isMine ? '#FFFFFF' : theme.text },
          ]}
        >
          {message.text}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text
            style={[
              styles.timeText,
              { color: message.isMine ? 'rgba(255,255,255,0.65)' : theme.textSecondary },
            ]}
          >
            {timeStr}
          </Text>
          {message.isMine && (
            <Text
              style={[
                styles.statusIcon,
                {
                  color:
                    message.status === 'sending'
                      ? 'rgba(255,255,255,0.5)'
                      : message.status === 'failed'
                        ? '#FF6B6B'
                        : 'rgba(255,255,255,0.65)',
                },
              ]}
            >
              {message.status === 'sending'
                ? '◌'
                : message.status === 'failed'
                  ? '!'
                  : '✓'}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Chat Screen
// ---------------------------------------------------------------------------

export default function SecretChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [sending, setSending] = useState(false);

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    (async () => {
      try {
        // 1. Check if settings are configured
        const configured = await isConfigured();
        if (!configured) {
          router.replace('/settings');
          return;
        }

        // 2. Init DB
        await initDB();

        // 3. Derive and cache keys (one-time)
        if (!KeyManager.isInitialized()) {
          await loadAndInitKeys();
        }

        // 4. Get username
        const username = await getUsername();
        if (!username) {
          router.replace('/settings');
          return;
        }
        if (mounted) setCurrentUser(username);

        // 5. Load existing local messages
        const localMessages = await getMessages();
        if (mounted) {
          setMessages(decryptMessages(localMessages, username));
          setReady(true);
        }

        // 6. Start Firestore listener
        unsubscribe = subscribeToMessages(
          username,
          (updatedMessages) => {
            if (mounted) {
              setMessages(decryptMessages(updatedMessages, username));
            }
          },
          (error) => {
            console.warn('[Chat] Firestore error:', error.message);
          }
        );
      } catch (err) {
        console.error('[Chat] Init error:', err);
        if (mounted) {
          router.replace('/settings');
        }
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Decrypt local messages for display
  // ---------------------------------------------------------------------------

  function decryptMessages(
    localMsgs: LocalMessage[],
    username: string
  ): DisplayMessage[] {
    if (!KeyManager.isInitialized()) return [];
    const internalKey = KeyManager.getInternalKey();

    return localMsgs.map((msg) => {
      let text = '[Decryption failed]';
      try {
        text = decryptMessage(msg.encryptedContent, internalKey);
      } catch {
        // Keep fallback text
      }
      return {
        id: msg.id,
        firestoreId: msg.firestoreId,
        sender: msg.sender,
        text,
        timestamp: msg.timestamp,
        isMine: msg.sender === username,
        status: msg.status,
        type: msg.type,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Send handler
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !currentUser || sending) return;

    setInputText('');
    Keyboard.dismiss();
    setSending(true);

    try {
      await sendMessage(trimmed, currentUser);
      // The Firestore listener will update the message list
    } catch (err) {
      console.warn('[Chat] Send error:', err);
    } finally {
      setSending(false);
    }
  }, [inputText, currentUser, sending]);

  // ---------------------------------------------------------------------------
  // Auto-scroll on new messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Deriving keys...
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={12}
          >
            <Text style={[styles.headerArrow, { color: theme.accent }]}>←</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Reverie
            </Text>
            <View style={[styles.headerDot, { backgroundColor: theme.success }]} />
          </View>

          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={12}
          >
            <Text style={[styles.headerGear, { color: theme.accent }]}>⚙</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <MessageBubble message={item} theme={theme} />
            )}
            contentContainerStyle={styles.listContent}
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.accent }]}>✦</Text>
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                  No messages yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Your secret conversation starts here
                </Text>
              </View>
            }
          />

          {/* Input Bar */}
          <View
            style={[
              styles.inputBar,
              { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={2000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              submitBehavior="submit"
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: theme.accent,
                  opacity: !inputText.trim() || sending || pressed ? 0.5 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendIcon}>↑</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerArrow: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerGear: {
    fontSize: 22,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Messages list
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '400',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});

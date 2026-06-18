import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import {
  getInternalPassphrase,
  setInternalPassphrase,
  getMessagePassphrase,
  setMessagePassphrase,
  getUsername,
  setUsername,
  loadAndInitKeys,
} from '@/services/settings';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [username, setUsernameState] = useState('');
  const [internalPass, setInternalPass] = useState('');
  const [messagePass, setMessagePass] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing values on mount
  useEffect(() => {
    (async () => {
      try {
        const [u, ip, mp] = await Promise.all([
          getUsername(),
          getInternalPassphrase(),
          getMessagePassphrase(),
        ]);
        if (u) setUsernameState(u);
        if (ip) setInternalPass(ip);
        if (mp) setMessagePass(mp);
      } catch (err) {
        console.warn('[Settings] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedUsername = username.trim();
    const trimmedInternal = internalPass.trim();
    const trimmedMessage = messagePass.trim();

    if (!trimmedUsername) {
      Alert.alert('Missing', 'Please enter a username.');
      return;
    }
    if (!trimmedInternal) {
      Alert.alert('Missing', 'Please enter an internal passphrase.');
      return;
    }
    if (!trimmedMessage) {
      Alert.alert('Missing', 'Please enter a message passphrase.');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      await Promise.all([
        setUsername(trimmedUsername),
        setInternalPassphrase(trimmedInternal),
        setMessagePassphrase(trimmedMessage),
      ]);

      // Re-derive and cache keys with the new passphrases
      await loadAndInitKeys();

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
      console.error('[Settings] Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [username, internalPass, messagePass]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={12}
          >
            <Text style={[styles.headerButtonText, { color: theme.accent }]}>
              ←
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Settings
          </Text>
          <View style={styles.headerButton} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Username */}
            <Animated.View
              entering={FadeInDown.springify().damping(15).delay(100)}
              style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Text style={[styles.sectionLabel, { color: theme.accent }]}>
                Username
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Your identifier for sending and receiving messages
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={username}
                onChangeText={setUsernameState}
                placeholder="Enter username"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Internal Passphrase */}
            <Animated.View
              entering={FadeInDown.springify().damping(15).delay(200)}
              style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Text style={[styles.sectionLabel, { color: theme.accent }]}>
                Internal Passphrase
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Encrypts messages stored locally on this device
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={internalPass}
                onChangeText={setInternalPass}
                placeholder="Enter internal passphrase"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Message Passphrase */}
            <Animated.View
              entering={FadeInDown.springify().damping(15).delay(300)}
              style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Text style={[styles.sectionLabel, { color: theme.accent }]}>
                Message Passphrase
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Encrypts messages sent over the network (both users must share this)
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                value={messagePass}
                onChangeText={setMessagePass}
                placeholder="Enter message passphrase"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Save Button */}
            <Animated.View entering={FadeInDown.springify().damping(15).delay(400)}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: saved ? theme.success : theme.accent,
                    opacity: pressed || saving ? 0.7 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {saved ? '✓  Saved' : 'Save Settings'}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    marginTop: Spacing.one,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

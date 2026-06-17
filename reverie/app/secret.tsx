import { useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

function FloatingOrb({ delay, size, x, y }: { delay: number; size: number; x: number; y: number }) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.secretGlow,
        },
        animStyle,
      ]}
    />
  );
}

export default function SecretScreen() {
  const theme = useTheme();
  const router = useRouter();

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Floating orbs for atmosphere */}
      <FloatingOrb delay={0} size={80} x={30} y={120} />
      <FloatingOrb delay={500} size={60} x={280} y={200} />
      <FloatingOrb delay={1000} size={40} x={100} y={400} />
      <FloatingOrb delay={1500} size={70} x={250} y={500} />
      <FloatingOrb delay={800} size={50} x={50} y={600} />

      <SafeAreaView style={styles.safeArea}>
        {/* Secret emblem */}
        <Animated.View
          entering={FadeInUp.springify().damping(12).delay(200)}
          style={styles.emblemContainer}
        >
          <Animated.View
            style={[
              styles.emblem,
              pulseStyle,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.accent,
                shadowColor: theme.secretGlow,
              },
            ]}
          >
            <Text style={[styles.emblemText, { color: theme.accent }]}>
              ✦
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          entering={FadeInUp.springify().damping(12).delay(400)}
          style={styles.textContainer}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            You found it.
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Welcome to the secret realm of Reverie
          </Text>
        </Animated.View>

        {/* Secret message card */}
        <Animated.View
          entering={FadeInDown.springify().damping(12).delay(700)}
          style={[
            styles.secretCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.secretQuote, { color: theme.text }]}>
            {"\"Not all who wander are lost — some are simply dreaming with their eyes open.\""}
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.accent },
            ]}
          />
          <Text
            style={[styles.secretHint, { color: theme.textSecondary }]}
          >
            This is your hidden space. More secrets will be revealed in time...
          </Text>
        </Animated.View>

        {/* Back button */}
        <Animated.View entering={FadeInDown.springify().damping(12).delay(1000)}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.backButtonText}>
              Return to Reality
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  emblemContainer: {
    marginBottom: Spacing.three,
  },
  emblem: {
    width: 100,
    height: 100,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  emblemText: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  secretCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    width: '100%',
    gap: Spacing.three,
    alignItems: 'center',
  },
  secretQuote: {
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  secretHint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: Spacing.three,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

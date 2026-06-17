import { useRef, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const TAP_THRESHOLD = 8;
const TAP_RESET_MS = 2000;

type ReverieLogoProps = {
  onSecretActivated: () => void;
};

export function ReverieLogo({ onSecretActivated }: ReverieLogoProps) {
  const theme = useTheme();
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  // Animated values
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current > TAP_RESET_MS) {
      tapCount.current = 0;
    }
    lastTapTime.current = now;
    tapCount.current += 1;

    // Bounce animation on each tap
    scale.value = withSequence(
      withSpring(0.92, { damping: 8, stiffness: 400 }),
      withSpring(1.05, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // Increasing glow as taps approach threshold
    const progress = tapCount.current / TAP_THRESHOLD;
    glowOpacity.value = withTiming(progress * 0.8, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });

    if (tapCount.current >= TAP_THRESHOLD) {
      tapCount.current = 0;

      // Big flash animation before navigating
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
      scale.value = withSequence(
        withSpring(1.2, { damping: 4, stiffness: 500 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );

      // Delay navigation slightly for the flash effect
      setTimeout(() => {
        onSecretActivated();
      }, 300);
    }
  }, [onSecretActivated, scale, glowOpacity]);

  return (
    <Pressable onPress={handleTap}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Glow effect behind the logo */}
        <Animated.View
          style={[
            styles.glow,
            glowStyle,
            { backgroundColor: theme.accent, shadowColor: theme.accent },
          ]}
        />

        {/* Logo circle */}
        <View
          style={[
            styles.logoCircle,
            {
              backgroundColor: theme.accent,
              borderColor: theme.accentLight,
            },
          ]}
        >
          <Animated.Text style={styles.logoText}>R</Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  glow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
});

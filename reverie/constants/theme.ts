/**
 * Reverie App Theme
 * Premium dark-first color palette with violet/indigo tones
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    background: '#F8F7FF',
    backgroundElement: '#EEEDF7',
    backgroundSelected: '#DDD9F0',
    card: '#FFFFFF',
    accent: '#7C3AED',
    accentLight: '#A78BFA',
    accentSoft: '#EDE9FE',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    success: '#10B981',
    successSoft: '#D1FAE5',
    border: '#E5E7EB',
    shadow: 'rgba(124, 58, 237, 0.08)',
    todoBackground: '#FFFFFF',
    todoBorder: '#F3F0FF',
    completedText: '#9CA3AF',
    secretGlow: '#7C3AED',
    tint: '#7C3AED',
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#7C3AED',
  },
  dark: {
    text: '#F1F0FF',
    textSecondary: '#9CA3AF',
    background: '#0A0A1A',
    backgroundElement: '#16162A',
    backgroundSelected: '#1E1E3A',
    card: '#12122A',
    accent: '#A78BFA',
    accentLight: '#C4B5FD',
    accentSoft: '#1E1B4B',
    danger: '#F87171',
    dangerSoft: '#331111',
    success: '#34D399',
    successSoft: '#0D3326',
    border: '#2D2D4A',
    shadow: 'rgba(167, 139, 250, 0.12)',
    todoBackground: '#16162A',
    todoBorder: '#2D2D4A',
    completedText: '#4B5563',
    secretGlow: '#A78BFA',
    tint: '#A78BFA',
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#A78BFA',
  },
} as const;

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string;
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

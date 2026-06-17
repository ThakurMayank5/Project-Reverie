/**
 * Returns the full theme object for the current color scheme.
 */

import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#112031',
    background: '#f6f1e8',
    backgroundElement: 'rgba(255,255,255,0.62)',
    backgroundSelected: 'rgba(15,118,110,0.16)',
    textSecondary: '#576574',
  },
  dark: {
    text: '#f5f1ea',
    background: '#07111d',
    backgroundElement: 'rgba(255,255,255,0.08)',
    backgroundSelected: 'rgba(15,118,110,0.22)',
    textSecondary: '#b6c0cb',
  },
} as const;

export const Brand = {
  primary: '#0f766e',
  secondary: '#b08968',
  accent: '#3c87f7',
  warning: '#f7a83c',
  darkGradient: ['#07111d', '#0b1824', '#102131'] as const,
  lightGradient: ['#f6f1e8', '#efe7db', '#e7f0ee'] as const,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

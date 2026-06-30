import '@/global.css';

import { Platform } from 'react-native';

export type ThemePalette = {
  mode: 'light' | 'dark';
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  divider: string;
  pageBackgroundColor: string;
  pageGradient: readonly [string, string, string];
  pageGlowPrimary: string;
  pageGlowSecondary: string;
  cardBorder: string;
  headerSurface: string;
  heroSurface: string;
  tabSurface: string;
};

export const ThemePresets = {
  light: {
    label: 'Light',
    palette: {
      mode: 'light',
      text: '#172029',
      background: '#f5f3ee',
      backgroundElement: 'rgba(255, 255, 255, 0.72)',
      backgroundSelected: 'rgba(15, 118, 110, 0.16)',
      textSecondary: '#4c5965',
      primary: '#0f766e',
      primaryLight: '#39a99b',
      primaryDark: '#0b4f4a',
      secondary: '#b08968',
      secondaryLight: '#d0a784',
      secondaryDark: '#7a5d45',
      divider: 'rgba(12, 28, 38, 0.14)',
      pageBackgroundColor: '#f5f3ee',
      pageGradient: ['#f8f5ef', '#f5f3ee', '#efe9de'],
      pageGlowPrimary: 'rgba(15, 118, 110, 0.16)',
      pageGlowSecondary: 'rgba(176, 137, 104, 0.16)',
      cardBorder: 'rgba(12, 28, 38, 0.1)',
      headerSurface: 'rgba(255,255,255,0.7)',
      heroSurface: 'rgba(255,255,255,0.66)',
      tabSurface: 'rgba(255,255,255,0.9)',
    } satisfies ThemePalette,
  },
  dark: {
    label: 'Dark',
    palette: {
      mode: 'dark',
      text: '#e9ecef',
      background: '#070d14',
      backgroundElement: 'rgba(14, 24, 35, 0.82)',
      backgroundSelected: 'rgba(65, 179, 164, 0.22)',
      textSecondary: '#a8b4bf',
      primary: '#41b3a4',
      primaryLight: '#6dcfc3',
      primaryDark: '#2f8379',
      secondary: '#c9a27f',
      secondaryLight: '#e0c1a7',
      secondaryDark: '#8f6e52',
      divider: 'rgba(210, 222, 233, 0.16)',
      pageBackgroundColor: '#070d14',
      pageGradient: ['#060b12', '#070d14', '#0b141d'],
      pageGlowPrimary: 'rgba(65, 179, 164, 0.16)',
      pageGlowSecondary: 'rgba(201, 162, 127, 0.14)',
      cardBorder: 'rgba(210, 222, 233, 0.12)',
      headerSurface: 'rgba(4, 10, 16, 0.82)',
      heroSurface: 'rgba(14,24,35,0.76)',
      tabSurface: 'rgba(8, 15, 23, 0.94)',
    } satisfies ThemePalette,
  },
  ocean: {
    label: 'Ocean',
    palette: {
      mode: 'dark',
      text: '#e7f7ff',
      background: '#041522',
      backgroundElement: 'rgba(10, 30, 45, 0.84)',
      backgroundSelected: 'rgba(51, 181, 229, 0.22)',
      textSecondary: '#9ec2d6',
      primary: '#33b5e5',
      primaryLight: '#79d4f4',
      primaryDark: '#0b78a5',
      secondary: '#90caf9',
      secondaryLight: '#b8e2ff',
      secondaryDark: '#4f9bcb',
      divider: 'rgba(130, 190, 220, 0.2)',
      pageBackgroundColor: '#041522',
      pageGradient: ['#02111c', '#041522', '#082032'],
      pageGlowPrimary: 'rgba(59, 210, 255, 0.2)',
      pageGlowSecondary: 'rgba(144, 202, 249, 0.16)',
      cardBorder: 'rgba(130, 190, 220, 0.16)',
      headerSurface: 'rgba(4, 24, 36, 0.82)',
      heroSurface: 'rgba(10, 30, 45, 0.76)',
      tabSurface: 'rgba(4, 24, 36, 0.94)',
    } satisfies ThemePalette,
  },
  forest: {
    label: 'Forest',
    palette: {
      mode: 'light',
      text: '#1d2a21',
      background: '#eef4ec',
      backgroundElement: 'rgba(255, 255, 255, 0.76)',
      backgroundSelected: 'rgba(47, 107, 79, 0.16)',
      textSecondary: '#536456',
      primary: '#2f6b4f',
      primaryLight: '#5f8f73',
      primaryDark: '#1e4d37',
      secondary: '#b7894f',
      secondaryLight: '#d5aa75',
      secondaryDark: '#8a6639',
      divider: 'rgba(38, 67, 50, 0.16)',
      pageBackgroundColor: '#eef4ec',
      pageGradient: ['#f4f8f1', '#eef4ec', '#e8f0e1'],
      pageGlowPrimary: 'rgba(47, 107, 79, 0.16)',
      pageGlowSecondary: 'rgba(183, 137, 79, 0.16)',
      cardBorder: 'rgba(38, 67, 50, 0.12)',
      headerSurface: 'rgba(255,255,255,0.74)',
      heroSurface: 'rgba(255,255,255,0.68)',
      tabSurface: 'rgba(255,255,255,0.92)',
    } satisfies ThemePalette,
  },
  sunset: {
    label: 'Sunset',
    palette: {
      mode: 'light',
      text: '#3c2714',
      background: '#fff2dd',
      backgroundElement: 'rgba(255,255,255,0.76)',
      backgroundSelected: 'rgba(231, 111, 36, 0.16)',
      textSecondary: '#6d5642',
      primary: '#e76f24',
      primaryLight: '#f29a62',
      primaryDark: '#b84d14',
      secondary: '#0f8b8d',
      secondaryLight: '#45aeb0',
      secondaryDark: '#0b6264',
      divider: 'rgba(184, 77, 20, 0.2)',
      pageBackgroundColor: '#fff2dd',
      pageGradient: ['#fff7e9', '#ffedd2', '#ffe4c3'],
      pageGlowPrimary: 'rgba(242, 154, 98, 0.24)',
      pageGlowSecondary: 'rgba(15, 139, 141, 0.18)',
      cardBorder: 'rgba(184, 77, 20, 0.12)',
      headerSurface: 'rgba(255,255,255,0.76)',
      heroSurface: 'rgba(255,255,255,0.7)',
      tabSurface: 'rgba(255,255,255,0.92)',
    } satisfies ThemePalette,
  },
  'cherry-blossom': {
    label: 'Cherry Blossom',
    palette: {
      mode: 'light',
      text: '#3b2230',
      background: '#fff5f8',
      backgroundElement: 'rgba(255,255,255,0.76)',
      backgroundSelected: 'rgba(192, 77, 122, 0.16)',
      textSecondary: '#6e5060',
      primary: '#c04d7a',
      primaryLight: '#df8bb0',
      primaryDark: '#98345c',
      secondary: '#5f88b3',
      secondaryLight: '#8eb0d2',
      secondaryDark: '#406488',
      divider: 'rgba(192, 77, 122, 0.18)',
      pageBackgroundColor: '#fff5f8',
      pageGradient: ['#fff9fb', '#fff4f7', '#fdf0f6'],
      pageGlowPrimary: 'rgba(223, 139, 176, 0.24)',
      pageGlowSecondary: 'rgba(95, 136, 179, 0.18)',
      cardBorder: 'rgba(192, 77, 122, 0.12)',
      headerSurface: 'rgba(255,255,255,0.78)',
      heroSurface: 'rgba(255,255,255,0.72)',
      tabSurface: 'rgba(255,255,255,0.92)',
    } satisfies ThemePalette,
  },
  'midnight-neon': {
    label: 'Midnight Neon',
    palette: {
      mode: 'dark',
      text: '#eff6ff',
      background: '#050816',
      backgroundElement: 'rgba(12, 18, 38, 0.82)',
      backgroundSelected: 'rgba(95, 242, 255, 0.18)',
      textSecondary: '#97a6d8',
      primary: '#5ff2ff',
      primaryLight: '#9cf7ff',
      primaryDark: '#1ba9d6',
      secondary: '#ff4fd8',
      secondaryLight: '#ff91e8',
      secondaryDark: '#c928a6',
      divider: 'rgba(126, 149, 255, 0.18)',
      pageBackgroundColor: '#050816',
      pageGradient: ['#040611', '#050816', '#0b1030'],
      pageGlowPrimary: 'rgba(95, 242, 255, 0.22)',
      pageGlowSecondary: 'rgba(255, 79, 216, 0.18)',
      cardBorder: 'rgba(116, 137, 255, 0.18)',
      headerSurface: 'rgba(5, 10, 24, 0.84)',
      heroSurface: 'rgba(11, 16, 48, 0.76)',
      tabSurface: 'rgba(7, 11, 27, 0.94)',
    } satisfies ThemePalette,
  },
} as const;

export type ThemePresetKey = keyof typeof ThemePresets;
export const DEFAULT_THEME_PRESET: ThemePresetKey = 'light';

export const Colors = Object.fromEntries(
  Object.entries(ThemePresets).map(([key, value]) => [key, value.palette])
) as Record<ThemePresetKey, ThemePalette>;

export type ThemeColor = keyof ThemePalette;

export const Brand = {
  primary: '#0f766e',
  secondary: '#b08968',
  accent: '#3c87f7',
  warning: '#f7a83c',
} as const;

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

export const BottomTabInset = Platform.select({ ios: 50, android: 72, web: 74 }) ?? 0;
export const MaxContentWidth = 860;

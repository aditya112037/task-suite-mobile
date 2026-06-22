import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { Colors, DEFAULT_THEME_PRESET, ThemePresetKey, ThemePresets, type ThemePalette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const STORAGE_KEY = "task-suite-theme-preset";

type ThemeContextValue = {
  activeThemeKey: ThemePresetKey;
  activeTheme: ThemePalette;
  availableThemes: { key: ThemePresetKey; label: string }[];
  setThemePreset: (key: ThemePresetKey) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [themeKey, setThemeKey] = useState<ThemePresetKey | null>(null);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!active) return;

      if (stored && stored in ThemePresets) {
        setThemeKey(stored as ThemePresetKey);
        return;
      }

      setThemeKey(colorScheme === "dark" ? "dark" : DEFAULT_THEME_PRESET);
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [colorScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const activeThemeKey = themeKey || (colorScheme === "dark" ? "dark" : DEFAULT_THEME_PRESET);

    return {
      activeThemeKey,
      activeTheme: Colors[activeThemeKey],
      availableThemes: Object.entries(ThemePresets).map(([key, config]) => ({
        key: key as ThemePresetKey,
        label: config.label,
      })),
      setThemePreset: async (nextKey) => {
        setThemeKey(nextKey);
        await AsyncStorage.setItem(STORAGE_KEY, nextKey);
      },
    };
  }, [colorScheme, themeKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreset() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreset must be used within ThemeProvider");
  }

  return context;
}

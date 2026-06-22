import { useThemePreset } from "@/services/theme-context";

export function useTheme() {
  const { activeTheme } = useThemePreset();
  return activeTheme;
}

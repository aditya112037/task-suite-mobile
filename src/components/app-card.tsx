import { GlassView } from "expo-glass-effect";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AppCardVariant = "hero" | "panel" | "soft";

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: AppCardVariant;
  borderColor?: string;
};

export function AppCard({ children, style, variant = "panel", borderColor }: AppCardProps) {
  const theme = useTheme();

  const variantStyle =
    variant === "hero"
      ? {
          backgroundColor: theme.heroSurface,
          borderRadius: 28,
          padding: Spacing.four,
        }
      : variant === "soft"
        ? {
            backgroundColor: theme.backgroundElement,
            borderRadius: 20,
            padding: Spacing.three,
          }
        : {
            backgroundColor: theme.backgroundElement,
            borderRadius: 22,
            padding: Spacing.three,
          };

  return (
    <GlassView
      style={[
        styles.base,
        variantStyle,
        {
          borderColor: borderColor || theme.cardBorder,
        },
        style,
      ]}>
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    gap: Spacing.two,
  },
});

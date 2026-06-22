import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabInset, Brand, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScreenShellProps = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  topInset?: boolean;
  includeTabInset?: boolean;
};

export function ScreenShell({
  children,
  refreshing = false,
  onRefresh,
  topInset = true,
  includeTabInset = true,
}: ScreenShellProps) {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const gradientColors = theme.background === "#07111d" ? Brand.darkGradient : Brand.lightGradient;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[...gradientColors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, styles.glowLeft, { backgroundColor: "rgba(15, 118, 110, 0.18)" }]} />
      <View style={[styles.glow, styles.glowRight, { backgroundColor: "rgba(176, 137, 104, 0.16)" }]} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} /> : undefined
        }>
        <View
          style={[
            styles.container,
            {
              paddingTop: topInset ? safeAreaInsets.top + Spacing.four : Spacing.four,
              paddingBottom: safeAreaInsets.bottom + Spacing.five + (includeTabInset ? BottomTabInset : 0),
            },
          ]}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  glowLeft: {
    top: -48,
    left: -84,
  },
  glowRight: {
    top: 120,
    right: -120,
  },
});

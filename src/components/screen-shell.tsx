import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScreenShellProps = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  topInset?: boolean;
  includeTabInset?: boolean;
  fitToScreen?: boolean;
};

export function ScreenShell({
  children,
  refreshing = false,
  onRefresh,
  topInset = true,
  includeTabInset = true,
  fitToScreen = false,
}: ScreenShellProps) {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 390 || height < 780;
  const isShort = height < 720;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;
  const topPadding = topInset
    ? safeAreaInsets.top + (isCompact ? Spacing.three : Spacing.four)
    : isCompact
      ? Spacing.two
      : Spacing.four;
  const bottomPadding =
    safeAreaInsets.bottom + (isShort ? Spacing.three : Spacing.five) + (includeTabInset ? BottomTabInset : 0);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[...theme.pageGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, isCompact ? styles.glowCompact : null, styles.glowLeft, { backgroundColor: theme.pageGlowPrimary }]} />
      <View style={[styles.glow, isCompact ? styles.glowCompact : null, styles.glowRight, { backgroundColor: theme.pageGlowSecondary }]} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, fitToScreen && styles.contentContainerFit]}
        scrollEnabled={!fitToScreen}
        refreshControl={
          onRefresh && !fitToScreen ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} /> : undefined
        }>
        <View
          style={[
            styles.container,
            fitToScreen && styles.containerFit,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              paddingHorizontal: horizontalPadding,
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
  contentContainerFit: {
    flex: 1,
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  containerFit: {
    flex: 1,
    justifyContent: "space-evenly",
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  glowCompact: {
    width: 220,
    height: 220,
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassView } from "expo-glass-effect";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { useThemePreset } from "@/services/theme-context";

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { activeThemeKey, availableThemes, setThemePreset } = useThemePreset();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completionRate = useMemo(() => {
    if (!profile?.progress.personalTotalTasks) return 0;
    return Math.round((profile.progress.personalCompletedTasks / profile.progress.personalTotalTasks) * 100);
  }, [profile]);

  const loadProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const nextProfile = await getProfile();
      setProfile(nextProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadProfile(), 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadProfile(true)}>
      <View style={styles.container}>
        <ThemedText type="hero">{profile?.name || "Profile"}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{profile?.email || ""}</ThemedText>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load profile</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
          </GlassView>
        ) : null}

        {profile ? (
          <>
            <GlassView style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <ThemedText type="cardTitle">Progress</ThemedText>
                <ThemedText type="body" themeColor="primary">{completionRate}%</ThemedText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                <View style={[styles.progressFill, { width: `${Math.max(6, completionRate)}%`, backgroundColor: theme.primary }]} />
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {profile.progress.personalCompletedTasks} / {profile.progress.personalTotalTasks} tasks
              </ThemedText>
            </GlassView>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                <ThemedText type="cardTitle">{profile.progress.personalTotalTasks}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">Tasks</ThemedText>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                <ThemedText type="cardTitle">{profile.progress.personalCompletedTasks}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">Done</ThemedText>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                <ThemedText type="cardTitle">{profile.identity.teams.length}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">Teams</ThemedText>
              </View>
            </View>

            {profile.identity.teams.length > 0 ? (
              <View>
                <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>TEAMS</ThemedText>
                {profile.identity.teams.map((teamEntry) => (
                  <GlassView key={teamEntry.id} style={styles.teamCard}>
                    <View style={styles.teamRow}>
                      <View style={[styles.teamDot, { backgroundColor: teamEntry.color || theme.primary }]} />
                      <ThemedText type="body" style={{ flex: 1 }}>{teamEntry.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">{teamEntry.role}</ThemedText>
                    </View>
                  </GlassView>
                ))}
              </View>
            ) : null}

            <View>
              <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>THEME</ThemedText>
              <View style={styles.themeRow}>
                {availableThemes.map((themeOption) => {
                  const isSelected = themeOption.key === activeThemeKey;
                  return (
                    <Pressable
                      key={themeOption.key}
                      onPress={() => setThemePreset(themeOption.key)}
                      style={[styles.themeChip, {
                        backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                        borderColor: isSelected ? theme.primary : theme.divider,
                        borderWidth: 1,
                      }]}>
                      <ThemedText type="captionBold" style={{ color: isSelected ? theme.primary : theme.textSecondary }}>
                        {themeOption.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable onPress={async () => { await signOut(); router.replace("/"); }}
              style={[styles.signOut, { backgroundColor: Brand.primary }]}>
              <ThemedText type="captionBold" style={{ color: "#fff" }}>Sign Out</ThemedText>
            </Pressable>
          </>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
    alignItems: "center",
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  progressCard: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  metricGrid: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    gap: 2,
    alignItems: "center",
  },
  sectionLabel: {
    marginBottom: Spacing.two,
    letterSpacing: 1,
  },
  teamCard: {
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.two,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  teamDot: {
    width: 10,
    height: 32,
    borderRadius: 999,
  },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  themeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  signOut: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
});

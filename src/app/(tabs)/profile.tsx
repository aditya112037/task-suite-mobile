import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet } from "react-native";

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
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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
    const timer = setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadProfile]);

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadProfile(true)}>
      <ThemedView style={styles.container}>
        <GlassView style={styles.heroCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ACCOUNT
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            {profile?.name || "Your profile"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {profile?.email || "Syncing your identity, role footprint, and execution metrics."}
          </ThemedText>
        </GlassView>

        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="smallBold">Couldn&apos;t load profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        {profile ? (
          <>
            <GlassView style={styles.progressCard}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Execution snapshot
              </ThemedText>
              <ThemedText>
                You have finished {profile.progress.personalCompletedTasks} of {profile.progress.personalTotalTasks} personal tasks and completed {profile.progress.completedSubtasks} checkpoints overall.
              </ThemedText>
              <ThemedView style={styles.progressTrack}>
                <ThemedView style={[styles.progressFill, { width: `${Math.max(10, completionRate)}%`, backgroundColor: theme.primary }]} />
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary">
                Personal completion rate: {completionRate}%
              </ThemedText>
            </GlassView>

            <ThemedView style={styles.metricGrid}>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Personal tasks
                </ThemedText>
                <ThemedText type="subtitle">{profile.progress.personalTotalTasks}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Finished
                </ThemedText>
                <ThemedText type="subtitle">{profile.progress.personalCompletedTasks}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Team role
                </ThemedText>
                <ThemedText type="subtitle">{profile.identity.primaryRole}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Checkpoints
                </ThemedText>
                <ThemedText type="subtitle">{profile.progress.completedSubtasks}</ThemedText>
              </GlassView>
            </ThemedView>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              Team Footprint
            </ThemedText>
            <ThemedView style={styles.sectionStack}>
              {profile.identity.teams.map((teamEntry) => (
                <GlassView key={teamEntry.id} style={styles.teamCard}>
                  <ThemedView style={styles.teamRow}>
                    <ThemedView style={[styles.teamColor, { backgroundColor: teamEntry.color || theme.primary }]} />
                    <ThemedView style={styles.teamCopy}>
                      <ThemedText>{teamEntry.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {teamEntry.role}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </GlassView>
              ))}
            </ThemedView>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              App Theme
            </ThemedText>
            <ThemedView style={styles.themeGrid}>
              {availableThemes.map((themeOption) => {
                const isSelected = themeOption.key === activeThemeKey;

                return (
                  <Pressable
                    key={themeOption.key}
                    onPress={() => setThemePreset(themeOption.key)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                        borderColor: isSelected ? theme.primary : theme.divider,
                      },
                    ]}>
                    <ThemedText type="smallBold">{themeOption.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isSelected ? "Active on this device" : "Tap to switch"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>

            {Platform.OS === "web" ? (
              <GlassView style={styles.webCard}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Web install
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  If your browser supports app install, Task Suite will show an install banner so this workspace can behave more like a focused mobile PWA.
                </ThemedText>
              </GlassView>
            ) : null}

            <Pressable
              onPress={async () => {
                await signOut();
                Alert.alert("Signed out", "Your device session has been cleared.");
              }}
              style={[styles.signOutButton, { backgroundColor: Brand.primary }]}>
              <ThemedText type="smallBold" style={styles.signOutText}>
                Sign Out
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </ThemedView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: 28,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
  },
  progressCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.two,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  metricCard: {
    minWidth: "47%",
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionStack: {
    gap: Spacing.two,
  },
  themeGrid: {
    gap: Spacing.two,
  },
  themeCard: {
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  teamCard: {
    padding: Spacing.three,
    borderRadius: 20,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  teamColor: {
    width: 14,
    height: 42,
    borderRadius: 999,
  },
  teamCopy: {
    flex: 1,
    gap: 4,
  },
  webCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
  },
  signOutButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  signOutText: {
    color: "#f5f1ea",
  },
});

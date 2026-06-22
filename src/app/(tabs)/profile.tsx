import { useCallback, useEffect, useState } from "react";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile, type ProfileSummary } from "@/services/profile";

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              {profile.identity.teams.map((team) => (
                <GlassView key={team.id} style={styles.teamCard}>
                  <ThemedText>{team.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {team.role}
                  </ThemedText>
                </GlassView>
              ))}
            </ThemedView>

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
  teamCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: 4,
  },
  signOutButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
  },
  signOutText: {
    color: "#f5f1ea",
  },
});

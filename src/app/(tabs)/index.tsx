import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";

import { AppCard } from "@/components/app-card";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { getTasks, type PersonalTask } from "@/services/tasks";
import { getMyTeamTasks, type TeamTask } from "@/services/team-tasks";
import { getTeams, type TeamSummary } from "@/services/teams";

function formatShortDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isDueSoon(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  return diffMs >= 0 && diffMs <= 1000 * 60 * 60 * 24 * 3;
}

export default function OverviewDashboard() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedTasks = useMemo(() => {
    if (!profile) return [];
    return teamTasks.filter((task) => task.assigneeIds.includes(profile.id));
  }, [profile, teamTasks]);

  const focusTasks = useMemo(
    () => personalTasks.filter((task) => task.status !== "completed").slice(0, 3),
    [personalTasks]
  );

  const dueSoonCount = useMemo(
    () => personalTasks.filter((task) => task.status !== "completed" && isDueSoon(task.dueDate)).length,
    [personalTasks]
  );

  const loadHome = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextProfile = await getProfile();
        const [nextPersonalTasks, nextTeamTasks, nextTeams] = await Promise.all([
          getTasks(),
          getMyTeamTasks(),
          getTeams(nextProfile.id),
        ]);

        setProfile(nextProfile);
        setPersonalTasks(nextPersonalTasks);
        setTeamTasks(nextTeamTasks);
        setTeams(nextTeams);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load your workspace";
        setError(message);

        if (message.toLowerCase().includes("session") || message.toLowerCase().includes("authorized")) {
          await signOut();
          Alert.alert("Session expired", "Please sign in again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [signOut]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHome();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadHome]);

  function routeToTeam(teamId: string, section?: string, mode?: string) {
    router.push({
      pathname: "/team/[teamId]",
      params: {
        teamId,
        ...(section ? { section } : {}),
        ...(mode ? { mode } : {}),
      },
    });
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadHome(true)}>
      <ThemedView style={styles.container}>
        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <AppCard variant="soft" style={styles.errorCard}>
            <ThemedText type="smallBold">Workspace sync failed</ThemedText>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
            <Pressable onPress={() => loadHome()} style={styles.inlineButton}>
              <ThemedText type="smallBold">Retry</ThemedText>
            </Pressable>
          </AppCard>
        ) : null}

        {profile ? (
          <ThemedView style={styles.metricGrid}>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Completion rate
              </ThemedText>
              <ThemedText type="subtitle">{Math.round(profile.progress.completionRate)}%</ThemedText>
            </AppCard>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Assigned work
              </ThemedText>
              <ThemedText type="subtitle">{profile.progress.assignedTasks}</ThemedText>
            </AppCard>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Teams
              </ThemedText>
              <ThemedText type="subtitle">{teams.length}</ThemedText>
            </AppCard>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Due soon
              </ThemedText>
              <ThemedText type="subtitle">{dueSoonCount}</ThemedText>
            </AppCard>
          </ThemedView>
        ) : null}

        {profile?.progress.reminder ? (
          <AppCard style={styles.reminderCard}>
            <SymbolView tintColor={Brand.warning} name={{ ios: "exclamationmark.triangle.fill", android: "warning" }} size={18} />
            <ThemedView style={styles.reminderCopy}>
              <ThemedText type="smallBold">Needs attention</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {profile.progress.reminder}
              </ThemedText>
            </ThemedView>
          </AppCard>
        ) : null}

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          Assigned Work
        </ThemedText>
        <ThemedView style={styles.sectionStack}>
          {assignedTasks.length ? (
            assignedTasks.slice(0, 3).map((task) => (
              <Pressable key={task.id} onPress={() => routeToTeam(task.teamId, "tasks")}>
                <AppCard style={styles.taskCard}>
                  <ThemedView style={styles.taskRow}>
                    <ThemedView style={styles.taskCopy}>
                      <ThemedText>{task.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {task.teamName} - {task.status.replace("-", " ")}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText type="smallBold">{task.progressPercentage}%</ThemedText>
                  </ThemedView>
                </AppCard>
              </Pressable>
            ))
          ) : (
            <AppCard variant="soft" style={styles.emptyCard}>
              <ThemedText>No team assignments right now.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Once teammates assign work, it will appear here.
              </ThemedText>
            </AppCard>
          )}
        </ThemedView>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          Personal Focus
        </ThemedText>
        <ThemedView style={styles.sectionStack}>
          {focusTasks.length ? (
            focusTasks.map((task) => (
              <AppCard key={task.id} style={styles.taskCard}>
                <ThemedView style={styles.taskRow}>
                  <ThemedView style={styles.taskCopy}>
                    <ThemedText>{task.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {task.priority} priority - due {formatShortDate(task.dueDate)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText type="smallBold">{task.progressPercentage}%</ThemedText>
                </ThemedView>
              </AppCard>
            ))
          ) : (
            <AppCard variant="soft" style={styles.emptyCard}>
              <ThemedText>No open personal tasks.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Add one from the My Tasks tab and it will show up here.
              </ThemedText>
            </AppCard>
          )}
        </ThemedView>
      </ThemedView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.two,
  },
  inlineButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
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
  reminderCard: {
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 22,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(247, 168, 60, 0.18)",
  },
  reminderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionLabel: {
    marginTop: Spacing.one,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionStack: {
    gap: Spacing.two,
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: 20,
  },
  taskRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "center",
  },
  taskCopy: {
    flex: 1,
    gap: 4,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 20,
    gap: Spacing.one,
  },
});

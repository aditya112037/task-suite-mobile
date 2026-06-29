import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet } from "react-native";

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

export default function OverviewScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
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

  const attentionQueue = profile?.progress.needsAttentionTasks.slice(0, 3) ?? [];
  const completedAssignedRate = profile?.progress.assignedTasks
    ? Math.round((profile.progress.completedAssignedTasks / profile.progress.assignedTasks) * 100)
    : 0;

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextProfile = await getProfile();
        const [nextPersonalTasks, nextTeamTasks] = await Promise.all([getTasks(), getMyTeamTasks()]);

        setProfile(nextProfile);
        setPersonalTasks(nextPersonalTasks);
        setTeamTasks(nextTeamTasks);
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
      void loadOverview();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadOverview]);

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadOverview(true)}>
      <ThemedView style={styles.container}>
        <AppCard variant="hero" style={styles.heroCard}>
          <ThemedView style={styles.heroCopy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TASK SUITE
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              {profile ? `Keep ${profile.progress.activeTasks} active threads moving.` : "Your mobile command deck."}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {profile
                ? `${profile.name}, here is the fastest read on your personal work and team assignments.`
                : "Loading your personal tasks, assigned work, and team nudges."}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.heroActions}>
            <Pressable onPress={() => router.push("/remote-work")} style={[styles.heroButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.heroButtonText}>
                Open My Tasks
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push("/teams")} style={styles.secondaryHeroButton}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Jump to Teams
              </ThemedText>
            </Pressable>
          </ThemedView>
        </AppCard>

        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <AppCard variant="soft" style={styles.errorCard}>
            <ThemedText type="smallBold">Workspace sync failed</ThemedText>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
            <Pressable onPress={() => loadOverview()} style={styles.inlineButton}>
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
                On-time rate
              </ThemedText>
              <ThemedText type="subtitle">{Math.round(profile.progress.onTimeRate)}%</ThemedText>
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
              <ThemedText type="subtitle">{profile.identity.teams.length}</ThemedText>
            </AppCard>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Due soon
              </ThemedText>
              <ThemedText type="subtitle">{dueSoonCount}</ThemedText>
            </AppCard>
            <AppCard style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Assigned done
              </ThemedText>
              <ThemedText type="subtitle">{completedAssignedRate}%</ThemedText>
            </AppCard>
          </ThemedView>
        ) : null}

        {profile ? (
          <AppCard variant="soft" style={styles.snapshotCard}>
            <ThemedView style={styles.snapshotRow}>
              <ThemedView style={styles.snapshotItem}>
                <ThemedText type="smallBold">Today&apos;s pace</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {profile.progress.activeTasks} active, {profile.progress.completedSubtasks}/{profile.progress.totalSubtasks} checklist items closed.
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.snapshotDivider} />
              <ThemedView style={styles.snapshotItem}>
                <ThemedText type="smallBold">Workspace status</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {assignedTasks.length} assigned from teams and {focusTasks.length} personal tasks still open.
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </AppCard>
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

        {attentionQueue.length ? (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              Attention Queue
            </ThemedText>
            <ThemedView style={styles.sectionStack}>
              {attentionQueue.map((item) => (
                <Pressable
                  key={`${item.teamId || "personal"}-${item.taskId || item.title}`}
                  onPress={() => {
                    if (item.teamId) {
                      router.push({ pathname: "/team/[teamId]", params: { teamId: item.teamId } });
                    } else {
                      router.push("/remote-work");
                    }
                  }}>
                  <AppCard variant="soft" style={styles.attentionCard}>
                    <ThemedView style={styles.taskRow}>
                      <ThemedView style={styles.taskCopy}>
                        <ThemedText>{item.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.stalledSubtasks} stalled items - quiet for {item.maxDaysStalled} day{item.maxDaysStalled === 1 ? "" : "s"}
                        </ThemedText>
                      </ThemedView>
                      <ThemedText type="smallBold">{item.teamId ? "Team" : "Mine"}</ThemedText>
                    </ThemedView>
                  </AppCard>
                </Pressable>
              ))}
            </ThemedView>
          </>
        ) : null}

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          Assigned Work
        </ThemedText>
        <ThemedView style={styles.sectionStack}>
          {assignedTasks.length ? (
            assignedTasks.slice(0, 3).map((task) => (
              <Pressable
                key={task.id}
                onPress={() =>
                  task.teamId
                    ? router.push({ pathname: "/team/[teamId]", params: { teamId: task.teamId } })
                    : null
                }>
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

        {profile?.progress.badges.length ? (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              Momentum
            </ThemedText>
            <ThemedView style={styles.badgeWrap}>
              {profile.progress.badges.map((badge) => (
                <AppCard key={badge.id} variant="soft" style={styles.badgeCard}>
                  <ThemedText type="smallBold">{badge.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {badge.description}
                  </ThemedText>
                </AppCard>
              ))}
            </ThemedView>
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
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroCopy: {
    gap: Spacing.two,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  heroButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  heroButtonText: {
    color: "#f5f1ea",
  },
  secondaryHeroButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  metricCard: {
    minWidth: Platform.OS === "web" ? 180 : "47%",
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  snapshotCard: {
    borderRadius: 24,
  },
  snapshotRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: Spacing.three,
    backgroundColor: "transparent",
  },
  snapshotItem: {
    flex: 1,
    gap: 4,
    backgroundColor: "transparent",
  },
  snapshotDivider: {
    width: Platform.OS === "web" ? 1 : "100%",
    height: Platform.OS === "web" ? "auto" : 1,
    backgroundColor: "rgba(255,255,255,0.08)",
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
  sectionLabel: {
    marginTop: Spacing.one,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionStack: {
    gap: Spacing.two,
  },
  attentionCard: {
    borderRadius: 20,
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
  badgeWrap: {
    gap: Spacing.two,
  },
  badgeCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: 4,
  },
});

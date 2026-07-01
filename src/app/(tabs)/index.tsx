import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppCard } from "@/components/app-card";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { getTasks, createTask, type PersonalTask } from "@/services/tasks";
import { getMyTeamTasks, type TeamTask } from "@/services/team-tasks";
import { getTeams, type TeamSummary } from "@/services/teams";

function formatShortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isOverdue(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeIntentScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [quickCapture, setQuickCapture] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overdue = useMemo(
    () => personalTasks.filter((t) => t.status !== "completed" && isOverdue(t.dueDate)),
    [personalTasks]
  );

  const dueToday = useMemo(
    () => personalTasks.filter((t) => t.status !== "completed" && isToday(t.dueDate)),
    [personalTasks]
  );

  const activeTasks = useMemo(
    () => personalTasks.filter((t) => t.status === "in-progress"),
    [personalTasks]
  );

  const assignedTasks = useMemo(() => {
    if (!profile) return [];
    return teamTasks.filter((task) => task.assigneeIds.includes(profile.id));
  }, [profile, teamTasks]);

  const loadHome = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

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
    const timer = setTimeout(() => void loadHome(), 0);
    return () => clearTimeout(timer);
  }, [loadHome]);

  async function handleQuickCapture() {
    const trimmed = quickCapture.trim();
    if (!trimmed) return;
    setCapturing(true);
    try {
      const created = await createTask({ title: trimmed, workspace: "work" });
      setPersonalTasks((prev) => [created, ...prev]);
      setQuickCapture("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not create task");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadHome(true)}>
      <View style={styles.greeting}>
        <ThemedText type="body" themeColor="textSecondary">
          {getGreeting()},
        </ThemedText>
        <ThemedText type="hero">
          {profile?.name.split(" ")[0] || "there"}
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.textSecondary} />
        </View>
      ) : null}

      {error ? (
        <AppCard variant="soft">
          <ThemedText type="cardTitle">Couldn&apos;t sync</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
          <Pressable onPress={() => loadHome()}>
            <ThemedText type="captionBold" themeColor="primary">Retry</ThemedText>
          </Pressable>
        </AppCard>
      ) : null}

      <View style={styles.actionRow}>
        {overdue.length > 0 ? (
          <View style={[styles.actionCard, { backgroundColor: "rgba(217, 75, 75, 0.12)" }]}>
            <ThemedText type="cardTitle" style={{ color: "#d94b4b" }}>{overdue.length} overdue</ThemedText>
            <ThemedText type="caption" style={{ color: "#d94b4b" }}>
              {overdue[0]?.title?.slice(0, 30)}{overdue[0]?.title?.length > 30 ? "..." : ""}
            </ThemedText>
          </View>
        ) : null}
        {dueToday.length > 0 ? (
          <View style={[styles.actionCard, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="cardTitle" themeColor="primary">{dueToday.length} due today</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {dueToday[0]?.title?.slice(0, 30)}{dueToday[0]?.title?.length > 30 ? "..." : ""}
            </ThemedText>
          </View>
        ) : null}
        {assignedTasks.length > 0 ? (
          <View style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{assignedTasks.length} assigned</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {assignedTasks[0]?.teamName} - {assignedTasks[0]?.title?.slice(0, 20)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.quickCaptureRow}>
        <TextInput
          value={quickCapture}
          onChangeText={setQuickCapture}
          placeholder="Add a task..."
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={handleQuickCapture}
          style={[styles.quickInput, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}
        />
        <Pressable
          onPress={handleQuickCapture}
          disabled={capturing || !quickCapture.trim()}
          style={[styles.quickButton, { backgroundColor: theme.primary, opacity: capturing || !quickCapture.trim() ? 0.5 : 1 }]}>
          {capturing ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText type="captionBold" style={styles.buttonText}>Add</ThemedText>}
        </Pressable>
      </View>

      {activeTasks.length > 0 ? (
        <View>
          <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>IN PROGRESS</ThemedText>
          <View style={styles.taskStack}>
            {activeTasks.slice(0, 3).map((task) => (
              <Pressable key={task.id} onPress={() => router.push("/remote-work")}>
                <AppCard>
                  <View style={styles.taskRow}>
                    <ThemedText type="body" style={{ flex: 1 }}>{task.title}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">{task.progressPercentage}%</ThemedText>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                    <View style={[styles.progressFill, { width: `${task.progressPercentage}%`, backgroundColor: theme.primary }]} />
                  </View>
                </AppCard>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>QUICK ACCESS</ThemedText>
        <View style={styles.quickGrid}>
          <Pressable onPress={() => router.push("/remote-work")} style={[styles.quickItem, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{personalTasks.filter((t) => t.status !== "completed").length}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Open tasks</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push("/teams")} style={[styles.quickItem, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{teams.length}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Teams</ThemedText>
          </Pressable>
          <Pressable onPress={() => {
            const pct = profile?.progress.personalTotalTasks
              ? Math.round((profile.progress.personalCompletedTasks / profile.progress.personalTotalTasks) * 100)
              : 0;
            Alert.alert("Progress", `${pct}% complete overall`);
          }} style={[styles.quickItem, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">
              {profile?.progress.personalTotalTasks
                ? Math.round((profile.progress.personalCompletedTasks / profile.progress.personalTotalTasks) * 100)
                : 0}%
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Progress</ThemedText>
          </Pressable>
        </View>
      </View>

      {personalTasks.length === 0 && !loading ? (
        <AppCard variant="soft">
          <ThemedText type="body" themeColor="textSecondary">No tasks yet. Use the quick capture above to add your first one.</ThemedText>
        </AppCard>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  greeting: {
    gap: 2,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  actionCard: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    gap: 2,
    minWidth: "47%",
    flex: 1,
  },
  quickCaptureRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  quickInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  quickButton: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
  },
  sectionLabel: {
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
    letterSpacing: 1,
  },
  taskStack: {
    gap: Spacing.two,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  quickGrid: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  quickItem: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    gap: 2,
    alignItems: "center",
  },
});

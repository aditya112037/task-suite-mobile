import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { createTask, deleteTask, getTasks, updateTask, type PersonalTask } from "@/services/tasks";

const FILTERS = ["all", "todo", "in-progress", "completed"] as const;
type FilterKey = (typeof FILTERS)[number];

function formatDueLabel(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getTaskUrgency(task: PersonalTask) {
  if (!task.dueDate || task.status === "completed") return null;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;
  const diffMs = dueDate.getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 1000 * 60 * 60 * 24 * 2) return "soon";
  return null;
}

export default function MyTasksScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const visibleTasks = useMemo(() => {
    const filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
    return [...filtered].sort((left, right) => {
      const urgencyOrder = { overdue: 0, soon: 1 };
      const lu = getTaskUrgency(left);
      const ru = getTaskUrgency(right);
      const lg = lu ? urgencyOrder[lu] : 2;
      const rg = ru ? urgencyOrder[ru] : 2;
      if (lg !== rg) return lg - rg;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filter, tasks]);

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter((t) => getTaskUrgency(t) === "overdue").length,
    }),
    [tasks]
  );

  const loadTasks = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const nextTasks = await getTasks();
        setTasks(nextTasks);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tasks";
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
    const timer = setTimeout(() => void loadTasks(), 0);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  async function handleCreateTask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    try {
      const createdTask = await createTask({ title: trimmedTitle, workspace: "work" });
      setTasks((currentTasks) => [createdTask, ...currentTasks]);
      setTitle("");
      setError(null);
    } catch (err) {
      Alert.alert("Could not create task", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleProgress(task: PersonalTask, mode: "start" | "complete") {
    try {
      const updatedTask = await updateTask(task.id, {
        status: mode === "complete" ? "completed" : "in-progress",
      });
      setTasks((currentTasks) => currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry)));
    } catch (err) {
      Alert.alert("Could not update task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(task: PersonalTask) {
    try {
      await deleteTask(task.id);
      setTasks((currentTasks) => currentTasks.filter((entry) => entry.id !== task.id));
    } catch (err) {
      Alert.alert("Could not delete task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadTasks(true)}>
      <View style={styles.container}>
        <ThemedText type="hero">Today&apos;s Tasks</ThemedText>

        <View style={styles.quickRow}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Quick capture..."
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleCreateTask}
            style={[styles.quickInput, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            onPress={handleCreateTask}
            disabled={saving || !title.trim()}
            style={[styles.addButton, { backgroundColor: theme.primary, opacity: saving || !title.trim() ? 0.5 : 1 }]}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText type="captionBold" style={styles.btnText}>Add</ThemedText>}
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            {taskStats.todo + taskStats.inProgress} open
            {taskStats.overdue > 0 ? `, ${taskStats.overdue} overdue` : ""}
          </ThemedText>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterPill, { backgroundColor: filter === item ? theme.backgroundSelected : theme.backgroundElement }]}>
              <ThemedText type="captionBold" themeColor={filter === item ? "text" : "textSecondary"}>
                {item === "in-progress" ? "In progress" : item === "todo" ? "To do" : item === "all" ? "All" : "Done"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load tasks</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
          </GlassView>
        ) : null}

        <View style={styles.taskList}>
          {visibleTasks.length ? (
            visibleTasks.map((task) => {
              const urgency = getTaskUrgency(task);
              const urgencyColor = urgency === "overdue" ? "#d94b4b" : urgency === "soon" ? Brand.warning : theme.textSecondary;

              return (
                <GlassView key={task.id} style={styles.taskCard}>
                  <View style={styles.taskTop}>
                    <ThemedText type="body" style={{ flex: 1 }}>{task.title}</ThemedText>
                    <Pressable onPress={() => handleDelete(task)}>
                      <ThemedText type="caption" themeColor="textSecondary">×</ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.taskMeta}>
                    <ThemedText type="caption" style={{ color: urgencyColor }}>
                      {urgency === "overdue" ? "Overdue" : urgency === "soon" ? "Due soon" : ""}
                      {task.dueDate ? ` ${formatDueLabel(task.dueDate)}` : ""}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">{task.priority}</ThemedText>
                  </View>

                  <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                    <View style={[styles.progressFill, { width: `${Math.max(4, task.progressPercentage)}%`, backgroundColor: theme.primary }]} />
                  </View>

                  <View style={styles.actionsRow}>
                    {task.status === "todo" ? (
                      <Pressable onPress={() => handleProgress(task, "start")} style={styles.actionChip}>
                        <ThemedText type="captionBold">Start</ThemedText>
                      </Pressable>
                    ) : null}
                    {task.status !== "completed" ? (
                      <Pressable onPress={() => handleProgress(task, "complete")} style={[styles.actionChip, { backgroundColor: theme.primary }]}>
                        <ThemedText type="captionBold" style={{ color: "#fff" }}>Complete</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </GlassView>
              );
            })
          ) : (
            <GlassView style={styles.emptyCard}>
              <ThemedText type="body" themeColor="textSecondary">
                {tasks.length ? "Nothing in this filter." : "No tasks yet. Capture one above."}
              </ThemedText>
            </GlassView>
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  quickRow: {
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
  addButton: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
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
  taskList: {
    gap: Spacing.two,
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.one,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  taskMeta: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.one,
    paddingTop: 2,
  },
  actionChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.one,
  },
});

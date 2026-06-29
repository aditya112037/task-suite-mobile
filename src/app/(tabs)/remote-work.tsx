import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput } from "react-native";

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
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getTaskUrgency(task: PersonalTask) {
  if (!task.dueDate || task.status === "completed") return "steady";

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return "steady";

  const diffMs = dueDate.getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 1000 * 60 * 60 * 24 * 2) return "soon";
  return "steady";
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
      const urgencyOrder = { overdue: 0, soon: 1, steady: 2 };
      const urgencyGap = urgencyOrder[getTaskUrgency(left)] - urgencyOrder[getTaskUrgency(right)];
      if (urgencyGap !== 0) return urgencyGap;

      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filter, tasks]);

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in-progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: tasks.filter((task) => getTaskUrgency(task) === "overdue").length,
    }),
    [tasks]
  );

  const loadTasks = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

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
    const timer = setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTasks]);

  async function handleCreateTask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Title needed", "Name the task before creating it.");
      return;
    }

    setSaving(true);

    try {
      const createdTask = await createTask({
        title: trimmedTitle,
        workspace: "work",
      });
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
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            My Tasks
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Personal tasks synced directly with your Task Suite backend.
          </ThemedText>
        </ThemedView>

        <GlassView style={styles.heroCard}>
          <ThemedView style={styles.heroCopy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TODAY&apos;S PLAN
            </ThemedText>
            <ThemedText>
              {taskStats.inProgress} moving now, {taskStats.todo} ready to start, and {taskStats.overdue} overdue.
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.heroMetrics}>
            <GlassView style={styles.heroMetricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Open
              </ThemedText>
              <ThemedText type="subtitle">{taskStats.todo + taskStats.inProgress}</ThemedText>
            </GlassView>
            <GlassView style={styles.heroMetricCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Done
              </ThemedText>
              <ThemedText type="subtitle">{taskStats.completed}</ThemedText>
            </GlassView>
          </ThemedView>
        </GlassView>

        <GlassView style={styles.composerCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Quick Capture
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to move today?"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />
          <Pressable
            onPress={handleCreateTask}
            disabled={saving}
            style={({ pressed }) => [styles.createButton, { backgroundColor: theme.primary, opacity: pressed || saving ? 0.82 : 1 }]}>
            {saving ? <ActivityIndicator color="#f5f1ea" /> : <ThemedText type="smallBold" style={styles.primaryText}>Create Task</ThemedText>}
          </Pressable>
        </GlassView>

        <ThemedView style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={({ pressed }) => [
                styles.filterPill,
                {
                  opacity: pressed ? 0.85 : 1,
                  backgroundColor: filter === item ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={filter === item ? "text" : "textSecondary"}>
                {item === "in-progress" ? "In progress" : item === "todo" ? "To do" : item === "all" ? "All" : "Completed"}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="smallBold">Couldn&apos;t load tasks</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        <ThemedView style={styles.taskList}>
          {visibleTasks.length ? (
            visibleTasks.map((task) => {
              const urgency = getTaskUrgency(task);
              const urgencyColor = urgency === "overdue" ? "#d94b4b" : urgency === "soon" ? Brand.warning : theme.textSecondary;

              return (
                <GlassView key={task.id} style={styles.taskCard}>
                  <ThemedView style={styles.taskTopRow}>
                    <ThemedView style={styles.taskMeta}>
                      <ThemedText>{task.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {task.priority} priority - {task.status.replace("-", " ")}
                      </ThemedText>
                    </ThemedView>
                    <SymbolView
                      tintColor={task.status === "completed" ? "#34c759" : theme.textSecondary}
                      name={{
                        ios: task.status === "completed" ? "checkmark.circle.fill" : "circle.dashed",
                        android: task.status === "completed" ? "check_circle" : "pending",
                      }}
                      size={22}
                    />
                  </ThemedView>

                  <ThemedView style={styles.progressTrack}>
                    <ThemedView style={[styles.progressFill, { width: `${Math.max(8, task.progressPercentage)}%`, backgroundColor: theme.primary }]} />
                  </ThemedView>

                  <ThemedView style={styles.taskMetaRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDueLabel(task.dueDate)} - {task.workspace} - {task.completedSubtasks}/{task.totalSubtasks} checklist items
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: urgencyColor }}>
                      {urgency === "overdue" ? "Overdue" : urgency === "soon" ? "Due soon" : `${task.progressPercentage}%`}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.actionsRow}>
                    {task.status === "todo" ? (
                      <Pressable onPress={() => handleProgress(task, "start")} style={styles.actionButton}>
                        <ThemedText type="smallBold">Start</ThemedText>
                      </Pressable>
                    ) : null}
                    {task.status !== "completed" ? (
                      <Pressable onPress={() => handleProgress(task, "complete")} style={[styles.actionButton, styles.primaryActionButton]}>
                        <ThemedText type="smallBold" style={styles.primaryText}>
                          Complete
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => handleDelete(task)} style={styles.actionButton}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Delete
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                </GlassView>
              );
            })
          ) : (
            <GlassView style={styles.emptyCard}>
              <ThemedText>{tasks.length ? "Nothing in this filter." : "No personal tasks yet."}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {tasks.length
                  ? "Switch the filter or create another task."
                  : "Capture your first task above and it will sync immediately."}
              </ThemedText>
            </GlassView>
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
  header: {
    gap: Spacing.one,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroCard: {
    padding: Spacing.three,
    borderRadius: 24,
    gap: Spacing.three,
  },
  heroCopy: {
    gap: 6,
    backgroundColor: "transparent",
  },
  heroMetrics: {
    flexDirection: "row",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  heroMetricCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 20,
    gap: 4,
  },
  composerCard: {
    padding: Spacing.four,
    borderRadius: 24,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  createButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryText: {
    color: "#f5f1ea",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.two,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  taskMeta: {
    flex: 1,
    gap: 4,
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
  taskMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryActionButton: {
    backgroundColor: Brand.primary,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 22,
    gap: Spacing.one,
  },
});

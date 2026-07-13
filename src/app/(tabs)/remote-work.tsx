import { useCallback, useEffect, useMemo, useState } from "react";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { ScreenShell } from "@/components/screen-shell";
import { SwipeTaskRow } from "@/components/swipe-task-row";
import { ThemedText } from "@/components/themed-text";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { createTask, deleteTask, getTasks, updateTask, type PersonalTask } from "@/services/tasks";

const FILTERS = ["all", "todo", "in-progress", "completed"] as const;
type FilterKey = (typeof FILTERS)[number];

function getTaskUrgency(task: PersonalTask) {
  if (!task.dueDate || task.status === "completed") return null;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;
  const diffMs = dueDate.getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 1000 * 60 * 60 * 24 * 2) return "soon";
  return null;
}

function getTomorrowIso(base?: string | null) {
  const date = base ? new Date(base) : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(9, 0, 0, 0);
    return fallback.toISOString();
  }
  date.setDate(date.getDate() + 1);
  return date.toISOString();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectionMode = selectedIds.length > 0;

  const visibleTasks = useMemo(() => {
    const filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
    return [...filtered].sort((left, right) => {
      const urgencyOrder = { overdue: 0, soon: 1 };
      const leftUrgency = getTaskUrgency(left);
      const rightUrgency = getTaskUrgency(right);
      const leftRank = leftUrgency ? urgencyOrder[leftUrgency] : 2;
      const rightRank = rightUrgency ? urgencyOrder[rightUrgency] : 2;
      if (leftRank !== rightRank) return leftRank - rightRank;
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

  const focusTask = useMemo(
    () => tasks.find((task) => task.status === "in-progress") || tasks.find((task) => task.status === "todo") || null,
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

  function toggleSelected(taskId: string) {
    setSelectedIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]
    );
  }

  async function handleProgress(task: PersonalTask, status: "in-progress" | "completed") {
    try {
      const updatedTask = await updateTask(task.id, { status });
      setTasks((currentTasks) =>
        currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry))
      );
    } catch (err) {
      Alert.alert("Could not update task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(task: PersonalTask) {
    try {
      await deleteTask(task.id);
      setTasks((currentTasks) => currentTasks.filter((entry) => entry.id !== task.id));
      setSelectedIds((current) => current.filter((id) => id !== task.id));
    } catch (err) {
      Alert.alert("Could not delete task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSnooze(task: PersonalTask) {
    try {
      const updatedTask = await updateTask(task.id, { dueDate: getTomorrowIso(task.dueDate) });
      setTasks((currentTasks) =>
        currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry))
      );
    } catch (err) {
      Alert.alert("Could not snooze task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleBulkAction(action: "complete" | "delete" | "snooze") {
    const selectedTasks = tasks.filter((task) => selectedIds.includes(task.id));
    if (!selectedTasks.length) return;

    try {
      if (action === "delete") {
        await Promise.all(selectedTasks.map((task) => deleteTask(task.id)));
        setTasks((current) => current.filter((task) => !selectedIds.includes(task.id)));
      }

      if (action === "complete") {
        const updated = await Promise.all(
          selectedTasks.map((task) => updateTask(task.id, { status: "completed" }))
        );
        setTasks((current) =>
          current.map((task) => updated.find((entry) => entry.id === task.id) || task)
        );
      }

      if (action === "snooze") {
        const updated = await Promise.all(
          selectedTasks.map((task) => updateTask(task.id, { dueDate: getTomorrowIso(task.dueDate) }))
        );
        setTasks((current) =>
          current.map((task) => updated.find((entry) => entry.id === task.id) || task)
        );
      }

      setSelectedIds([]);
    } catch (err) {
      Alert.alert("Could not update selection", err instanceof Error ? err.message : "Unknown error");
    }
  }

  function openTask(task: PersonalTask) {
    Alert.alert(task.title, "Choose the next move.", [
      task.status === "todo"
        ? { text: "Start", onPress: () => void handleProgress(task, "in-progress") }
        : { text: "Snooze", onPress: () => void handleSnooze(task) },
      task.status !== "completed"
        ? { text: "Complete", onPress: () => void handleProgress(task, "completed") }
        : { text: "Close" },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadTasks(true)}>
      <Animated.View layout={LinearTransition.springify().damping(18).stiffness(175)} style={styles.container}>
        <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="hero">Tasks</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                Swipe to clear, long press to stack actions, stay in flow.
              </ThemedText>
            </View>

            <GlassView style={styles.heroStat}>
              <ThemedText type="cardTitle">{taskStats.todo + taskStats.inProgress}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                open now
              </ThemedText>
            </GlassView>
          </View>

          <View
            style={[
              styles.captureShell,
              {
                backgroundColor: theme.heroSurface,
                borderColor: theme.cardBorder,
              },
            ]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Quick capture a task..."
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleCreateTask}
              style={[styles.quickInput, { color: theme.text }]}
            />
            <Pressable
              onPress={handleCreateTask}
              disabled={saving || !title.trim()}
              style={[
                styles.addButton,
                {
                  backgroundColor: theme.primary,
                  opacity: saving || !title.trim() ? 0.5 : 1,
                },
              ]}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <SymbolView name={{ ios: "plus", android: "add" }} size={18} tintColor="#fff" />
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(260)} style={styles.statGrid}>
          <StatPill label="Overdue" value={taskStats.overdue} accent="#d94b4b" />
          <StatPill label="Doing" value={taskStats.inProgress} accent={theme.primary} />
          <StatPill label="Done" value={taskStats.completed} accent={Brand.secondary} />
        </Animated.View>

        {focusTask ? (
          <Animated.View entering={FadeInDown.delay(80).duration(260)}>
            <GlassView style={styles.focusCard}>
              <View style={styles.focusHeader}>
                <View style={styles.focusTitleRow}>
                  <SymbolView name={{ ios: "bolt.fill", android: "flash_on" }} size={18} tintColor={theme.primary} />
                  <ThemedText type="cardTitle">Focus mode</ThemedText>
                </View>
                <ThemedText type="captionBold">
                  {focusTask.progressPercentage}%
                </ThemedText>
              </View>
              <ThemedText type="body">{focusTask.title}</ThemedText>
              <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(8, focusTask.progressPercentage)}%`, backgroundColor: theme.primary },
                  ]}
                />
              </View>
            </GlassView>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(120).duration(260)} style={styles.filterRow}>
          {FILTERS.map((item) => {
            const selected = filter === item;
            const label =
              item === "in-progress" ? "In progress" : item === "todo" ? "To do" : item === "all" ? "All" : "Done";
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selected ? theme.primary : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.cardBorder,
                  },
                ]}>
                <ThemedText
                  type="captionBold"
                  style={{ color: selected ? "#fff" : theme.textSecondary }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </Animated.View>

        {selectionMode ? (
          <Animated.View entering={FadeInDown.duration(180)} style={styles.bulkBar}>
            <ThemedText type="captionBold">{selectedIds.length} selected</ThemedText>
            <View style={styles.bulkActions}>
              <BulkChip label="Complete" onPress={() => void handleBulkAction("complete")} />
              <BulkChip label="Snooze" onPress={() => void handleBulkAction("snooze")} />
              <BulkChip label="Delete" onPress={() => void handleBulkAction("delete")} />
              <BulkChip label="Clear" onPress={() => setSelectedIds([])} />
            </View>
          </Animated.View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load tasks</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        <View style={styles.hintRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            Swipe right complete - swipe left snooze/delete - long press multi-select
          </ThemedText>
        </View>

        <Animated.View layout={LinearTransition.springify().damping(18).stiffness(180)} style={styles.taskList}>
          {visibleTasks.length ? (
            visibleTasks.map((task, index) => (
              <Animated.View
                key={task.id}
                entering={FadeInDown.delay(index * 40).duration(220)}>
                <SwipeTaskRow
                  task={task}
                  selected={selectedIds.includes(task.id)}
                  selectionMode={selectionMode}
                  onPress={() => openTask(task)}
                  onToggleSelect={() => toggleSelected(task.id)}
                  onComplete={() => void handleProgress(task, "completed")}
                  onDelete={() => void handleDelete(task)}
                  onSnooze={() => void handleSnooze(task)}
                />
              </Animated.View>
            ))
          ) : (
            <GlassView style={styles.emptyCard}>
              <ThemedText type="body" themeColor="textSecondary">
                {tasks.length ? "Nothing in this filter." : "No tasks yet. Capture one above."}
              </ThemedText>
            </GlassView>
          )}
        </Animated.View>
      </Animated.View>
    </ScreenShell>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.cardBorder,
        },
      ]}>
      <ThemedText type="cardTitle" style={{ color: accent }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function BulkChip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.bulkChip,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.cardBorder,
        },
      ]}>
      <ThemedText type="captionBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.three,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  heroStat: {
    minWidth: 96,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    gap: 2,
  },
  captureShell: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  quickInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statGrid: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: "center",
    gap: 2,
  },
  focusCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  focusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  focusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  bulkBar: {
    gap: Spacing.two,
  },
  bulkActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  bulkChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
    alignItems: "center",
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
  },
  hintRow: {
    paddingHorizontal: 2,
  },
  taskList: {
    gap: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 20,
    gap: Spacing.one,
  },
});

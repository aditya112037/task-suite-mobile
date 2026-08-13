import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
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
import { buildTaskCreateInitialValues } from "@/services/domain-intelligence";
import { useAuth } from "@/services/auth-context";
import { createTask, deleteTask, getTasks, updateTask, type PersonalTask } from "@/services/tasks";
import { IntentGuidancePanel, type GuidanceAction } from "@/components/intent-guidance-panel";

const FILTERS = ["all", "todo", "in-progress", "completed"] as const;
type FilterKey = (typeof FILTERS)[number];

function prepareTaskCreate(text: string) {
  const prepared = buildTaskCreateInitialValues(text);
  const cleanTitle = prepared.title
    .replace(/\b(today|tomorrow|tonight|this evening|eod)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    ...prepared,
    title: cleanTitle || prepared.title,
    dueDate: prepared.dueDate || null,
  };
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
  const params = useLocalSearchParams<{
    intent?: string;
    title?: string;
    dueDate?: string;
    autocreate?: string;
    filter?: FilterKey;
  }>();
  const initialFilter =
    typeof params.filter === "string" && FILTERS.includes(params.filter as FilterKey)
      ? (params.filter as FilterKey)
      : "all";
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handledIntentRef = useRef("");

  const selectionMode = selectedIds.length > 0;

  const visibleTasks = useMemo(() => {
    let filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q)
      );
    }
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
  }, [filter, tasks, searchQuery]);

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

  useEffect(() => {
    if (params.intent !== "create-task") return;

    const titleFromIntent = typeof params.title === "string" ? params.title.trim() : "";
    const intentKey = `${params.intent}:${titleFromIntent}:${params.dueDate || ""}:${params.autocreate || ""}`;
    if (!intentKey || handledIntentRef.current === intentKey) return;

    handledIntentRef.current = intentKey;

    if (!titleFromIntent) {
      return;
    }

    const applyIntent = async () => {
      if (params.autocreate === "1") {
        setSaving(true);
        try {
          const prepared = prepareTaskCreate(titleFromIntent);
          const createdTask = await createTask({
            title: prepared.title,
            dueDate: params.dueDate || prepared.dueDate || undefined,
            priority: prepared.priority,
            workspace: prepared.workspace,
            intent: prepared.intent,
            capabilities: prepared.capabilities,
            dynamicFields: prepared.dynamicFields,
          });
          setTasks((currentTasks) => [createdTask, ...currentTasks]);
          setTitle("");
          setError(null);
          router.replace("/remote-work");
        } catch (err) {
          Alert.alert("Could not create task", err instanceof Error ? err.message : "Unknown error");
          setTitle(titleFromIntent);
        } finally {
          setSaving(false);
        }
        return;
      }

      setTitle(titleFromIntent);
    };

    void applyIntent();
  }, [params.autocreate, params.dueDate, params.intent, params.title]);

  async function handleCreateTask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    try {
      const prepared = prepareTaskCreate(trimmedTitle);
      const createdTask = await createTask({
        title: prepared.title,
        dueDate: prepared.dueDate || undefined,
        priority: prepared.priority,
        workspace: prepared.workspace,
        intent: prepared.intent,
        capabilities: prepared.capabilities,
        dynamicFields: prepared.dynamicFields,
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

  function handleGuidanceAction(action: GuidanceAction) {
    if (action.type === "draft-title" && typeof action.value === "string") {
      setTitle(action.value);
      return;
    }
    if (action.type === "focus-domain" && typeof action.domain === "string") {
      Alert.alert(
        "Domain guidance",
        `This looks like a ${action.domain} intent. Add the missing details for a more useful plan.`
      );
      return;
    }
    if (action.type === "suggest-calendar" || action.type === "open-tasks") {
      Alert.alert("Guidance", "Type a time hint like tomorrow or tonight and I will schedule it.");
      return;
    }
    if (action.type === "suggest-next-step" && typeof action.value === "string") {
      Alert.alert("Next step", action.value);
      return;
    }
    if (typeof action.value === "string") {
      Alert.alert("Guidance", action.value);
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
    router.push({ pathname: "/task-detail", params: { taskId: task.id } });
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

          <IntentGuidancePanel
            surface="task-form"
            context={{ title, dueDate: null }}
            onApply={handleGuidanceAction}
          />
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

        <Animated.View entering={FadeInDown.delay(80).duration(260)} style={styles.searchRow}>
          <View style={[styles.searchShell, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <SymbolView name={{ ios: "magnifyingglass", android: "search" }} size={16} tintColor={theme.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <SymbolView name={{ ios: "xmark.circle.fill", android: "close" }} size={16} tintColor={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

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
  searchRow: {
    gap: Spacing.one,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.one,
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

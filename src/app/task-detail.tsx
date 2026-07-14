import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createSubtask,
  deleteSubtask,
  toggleSubtask,
  updateSubtask,
} from "@/services/subtasks";
import { deleteTask, getTasks, updateTask, type PersonalTask } from "@/services/tasks";
import type { TaskChecklistItem } from "@/services/contracts";

const STATUS_OPTIONS = ["todo", "in-progress", "completed"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;

function formatDate(iso: string | null) {
  if (!iso) return "No date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId || "";
  const theme = useTheme();

  const [task, setTask] = useState<PersonalTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const newSubtaskInputRef = useRef<TextInput>(null);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const tasks = await getTasks();
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        setTask(found);
        setEditingTitle(found.title);
        setEditingDescription(found.description);
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadTask(), 0);
    return () => clearTimeout(timer);
  }, [loadTask]);

  async function handleSaveTitle() {
    if (!task || !editingTitle.trim()) return;
    try {
      setSaving(true);
      const updated = await updateTask(task.id, { title: editingTitle.trim() });
      setTask(updated);
      setIsEditingTitle(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDescription() {
    if (!task) return;
    try {
      setSaving(true);
      const updated = await updateTask(task.id, { description: editingDescription.trim() });
      setTask(updated);
      setIsEditingDescription(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: typeof STATUS_OPTIONS[number]) {
    if (!task) return;
    try {
      const updated = await updateTask(task.id, { status });
      setTask(updated);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handlePriorityChange(priority: typeof PRIORITY_OPTIONS[number]) {
    if (!task) return;
    try {
      const updated = await updateTask(task.id, { priority });
      setTask(updated);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleAddSubtask() {
    if (!task || !newSubtaskTitle.trim()) return;
    try {
      setSaving(true);
      const updated = await createSubtask(task.id, newSubtaskTitle.trim());
      setTask(updated);
      setNewSubtaskTitle("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSubtask(subtaskId: string) {
    if (!task) return;
    try {
      const updated = await toggleSubtask(task.id, subtaskId);
      setTask(updated);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!task) return;
    try {
      const updated = await deleteSubtask(task.id, subtaskId);
      setTask(updated);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDeleteTask() {
    if (!task) return;
    Alert.alert("Delete task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(task.id);
            router.back();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <ScreenShell includeTabInset={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.textSecondary} />
        </View>
      </ScreenShell>
    );
  }

  if (!task) {
    return (
      <ScreenShell includeTabInset={false}>
        <View style={styles.loadingWrap}>
          <ThemedText type="body" themeColor="textSecondary">Task not found</ThemedText>
          <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.two }}>
            <ThemedText type="captionBold" themeColor="primary">Go back</ThemedText>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const allItems = [...task.subtasks, ...task.checkpoints];

  return (
    <ScreenShell includeTabInset={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText type="captionBold" themeColor="primary">← Back</ThemedText>
          </Pressable>

          {/* Title */}
          {isEditingTitle ? (
            <View style={styles.editRow}>
              <TextInput
                value={editingTitle}
                onChangeText={setEditingTitle}
                style={[styles.titleInput, { color: theme.text, borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}
                autoFocus
                onSubmitEditing={handleSaveTitle}
              />
              <Pressable onPress={handleSaveTitle} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                <ThemedText type="captionBold" style={{ color: "#fff" }}>Save</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setIsEditingTitle(true)}>
              <ThemedText type="hero">{task.title}</ThemedText>
            </Pressable>
          )}

          {/* Progress */}
          <GlassView style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ThemedText type="cardTitle">Progress</ThemedText>
              <ThemedText type="body" themeColor="primary">{task.progressPercentage}%</ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
              <View style={[styles.progressFill, { width: `${Math.max(6, task.progressPercentage)}%`, backgroundColor: theme.primary }]} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {task.completedSubtasks} / {task.totalSubtasks || allItems.length} subtasks done
            </ThemedText>
          </GlassView>

          {/* Status */}
          <View>
            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>STATUS</ThemedText>
            <View style={styles.optionRow}>
              {STATUS_OPTIONS.map((s) => {
                const selected = task.status === s;
                const label = s === "in-progress" ? "In Progress" : s === "todo" ? "To Do" : "Completed";
                return (
                  <Pressable
                    key={s}
                    onPress={() => void handleStatusChange(s)}
                    style={[styles.optionChip, {
                      backgroundColor: selected ? theme.primary : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.cardBorder,
                    }]}>
                    <ThemedText type="captionBold" style={{ color: selected ? "#fff" : theme.textSecondary }}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Priority */}
          <View>
            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>PRIORITY</ThemedText>
            <View style={styles.optionRow}>
              {PRIORITY_OPTIONS.map((p) => {
                const selected = task.priority === p;
                const colors = { low: "#2f9d61", medium: Brand.warning, high: "#d94b4b" };
                return (
                  <Pressable
                    key={p}
                    onPress={() => void handlePriorityChange(p)}
                    style={[styles.optionChip, {
                      backgroundColor: selected ? colors[p] : theme.backgroundElement,
                      borderColor: selected ? colors[p] : theme.cardBorder,
                    }]}>
                    <ThemedText type="captionBold" style={{ color: selected ? "#fff" : theme.textSecondary }}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Due Date */}
          <GlassView style={styles.infoCard}>
            <View style={styles.infoRow}>
              <SymbolView name={{ ios: "calendar", android: "event" }} size={16} tintColor={theme.primary} />
              <ThemedText type="body">{formatDate(task.dueDate)}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <SymbolView name={{ ios: "folder", android: "folder" }} size={16} tintColor={theme.primary} />
              <ThemedText type="body">{task.workspace || "work"}</ThemedText>
            </View>
            {task.createdAt ? (
              <View style={styles.infoRow}>
                <SymbolView name={{ ios: "clock", android: "schedule" }} size={16} tintColor={theme.primary} />
                <ThemedText type="caption" themeColor="textSecondary">Created {formatDate(task.createdAt)}</ThemedText>
              </View>
            ) : null}
          </GlassView>

          {/* Description */}
          <View>
            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>DESCRIPTION</ThemedText>
            {isEditingDescription ? (
              <View style={styles.editCol}>
                <TextInput
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder="Add a description..."
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.descInput, { color: theme.text, borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}
                  multiline
                  numberOfLines={4}
                  autoFocus
                />
                <Pressable onPress={handleSaveDescription} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                  <ThemedText type="captionBold" style={{ color: "#fff" }}>Save</ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setIsEditingDescription(true)}>
                <GlassView style={styles.descCard}>
                  <ThemedText type="body" themeColor="textSecondary">
                    {task.description || "Tap to add a description..."}
                  </ThemedText>
                </GlassView>
              </Pressable>
            )}
          </View>

          {/* Subtasks */}
          <View>
            <ThemedText type="captionBold" themeColor="textSecondary" style={styles.sectionLabel}>
              SUBTASKS ({task.completedSubtasks}/{allItems.length})
            </ThemedText>
            <View style={styles.addSubtaskRow}>
              <TextInput
                ref={newSubtaskInputRef}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                placeholder="New subtask..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.subtaskInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                onSubmitEditing={handleAddSubtask}
              />
              <Pressable
                onPress={handleAddSubtask}
                disabled={saving || !newSubtaskTitle.trim()}
                style={[styles.addSubtaskBtn, { backgroundColor: theme.primary, opacity: saving || !newSubtaskTitle.trim() ? 0.5 : 1 }]}>
                <SymbolView name={{ ios: "plus", android: "add" }} size={18} tintColor="#fff" />
              </Pressable>
            </View>

            {allItems.map((item: TaskChecklistItem) => (
              <GlassView key={item.id} style={styles.subtaskCard}>
                <View style={styles.subtaskRow}>
                  <Pressable onPress={() => void handleToggleSubtask(item.id)} style={styles.checkboxWrap}>
                    <View style={[styles.checkbox, {
                      borderColor: item.completed ? "#2f9d61" : theme.divider,
                      backgroundColor: item.completed ? "#2f9d61" : "transparent",
                    }]}>
                      {item.completed ? (
                        <SymbolView name={{ ios: "checkmark", android: "check" }} size={12} tintColor="#fff" />
                      ) : null}
                    </View>
                  </Pressable>
                  <ThemedText
                    type="body"
                    style={{ flex: 1, textDecorationLine: item.completed ? "line-through" : "none", opacity: item.completed ? 0.5 : 1 }}>
                    {item.title}
                  </ThemedText>
                  <Pressable onPress={() => void handleDeleteSubtask(item.id)} style={styles.deleteSubtaskBtn}>
                    <SymbolView name={{ ios: "trash", android: "delete" }} size={14} tintColor="#d94b4b" />
                  </Pressable>
                </View>
              </GlassView>
            ))}

            {allItems.length === 0 ? (
              <GlassView style={styles.emptySubtasks}>
                <ThemedText type="caption" themeColor="textSecondary">No subtasks yet. Add one above.</ThemedText>
              </GlassView>
            ) : null}
          </View>

          {/* Delete */}
          <Pressable onPress={handleDeleteTask} style={styles.deleteBtn}>
            <ThemedText type="captionBold" style={{ color: "#d94b4b" }}>Delete Task</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, paddingBottom: Spacing.six },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.two },
  backButton: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  editRow: { flexDirection: "row", gap: Spacing.two, alignItems: "center" },
  titleInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 22, fontWeight: "700" },
  saveBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 12 },
  progressCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  sectionLabel: { marginBottom: Spacing.one, letterSpacing: 1 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  optionChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 999, borderWidth: 1 },
  infoCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  infoRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  editCol: { gap: Spacing.two },
  descInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 15, minHeight: 100, textAlignVertical: "top" },
  descCard: { padding: Spacing.three, borderRadius: 16 },
  addSubtaskRow: { flexDirection: "row", gap: Spacing.two, alignItems: "center" },
  subtaskInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 15 },
  addSubtaskBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  subtaskCard: { padding: Spacing.three, borderRadius: 14, marginBottom: Spacing.one },
  subtaskRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  checkboxWrap: { padding: Spacing.one },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  deleteSubtaskBtn: { padding: Spacing.one },
  emptySubtasks: { padding: Spacing.three, borderRadius: 14, alignItems: "center" },
  deleteBtn: { alignSelf: "center", paddingVertical: Spacing.two, paddingHorizontal: Spacing.four },
});

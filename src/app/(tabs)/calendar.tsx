import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { createTask, getTasks, type PersonalTask } from "@/services/tasks";
import { getMyTeamTasks, type TeamTask } from "@/services/team-tasks";

type CalendarItem = {
  id: string;
  title: string;
  dueDate: string;
  source: "personal" | "team";
  teamId?: string;
  teamName?: string;
  status: string;
};

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function formatDayHeading(value: Date) {
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const VIEW_FILTERS = ["agenda", "upcoming", "all"] as const;
type ViewFilter = (typeof VIEW_FILTERS)[number];

export default function CalendarScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    focus?: ViewFilter;
    intent?: string;
    title?: string;
  }>();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [captureTitle, setCaptureTitle] = useState("");
  const [todayAnchor] = useState(() => Date.now());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledIntentRef = useRef("");

  const focus: ViewFilter = params.focus && VIEW_FILTERS.includes(params.focus) ? params.focus : "agenda";

  const items = useMemo<CalendarItem[]>(() => {
    const personal = personalTasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `personal:${task.id}`,
        title: task.title,
        dueDate: task.dueDate!,
        source: "personal" as const,
        status: task.status,
      }));

    const team = teamTasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `team:${task.id}`,
        title: task.title,
        dueDate: task.dueDate!,
        source: "team" as const,
        teamId: task.teamId,
        teamName: task.teamName,
        status: task.status,
      }));

    return [...personal, ...team].sort(
      (left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    );
  }, [personalTasks, teamTasks]);

  const visibleItems = useMemo(() => {
    const now = todayAnchor;
    const today = startOfDay(new Date(todayAnchor)).getTime();
    const weekEnd = today + 7 * 24 * 60 * 60 * 1000;

    if (focus === "agenda") {
      return items.filter((item) => {
        const due = new Date(item.dueDate).getTime();
        return due >= today && due < weekEnd;
      });
    }

    if (focus === "upcoming") {
      return items.filter((item) => {
        const due = new Date(item.dueDate).getTime();
        return due >= now;
      });
    }

    return items;
  }, [focus, items, todayAnchor]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, { date: Date; items: CalendarItem[] }>();

    visibleItems.forEach((item) => {
      const date = new Date(item.dueDate);
      if (Number.isNaN(date.getTime())) return;

      const key = dayKey(date);
      if (!map.has(key)) {
        map.set(key, { date: startOfDay(date), items: [] });
      }
      map.get(key)?.items.push(item);
    });

    return Array.from(map.values()).sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [visibleItems]);

  const nextSevenDays = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, []);

  const loadCalendar = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const nextProfile = await getProfile();
      const [nextPersonalTasks, nextTeamTasks] = await Promise.all([getTasks(), getMyTeamTasks()]);

      setProfile(nextProfile);
      setPersonalTasks(nextPersonalTasks);
      setTeamTasks(nextTeamTasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadCalendar(), 0);
    return () => clearTimeout(timer);
  }, [loadCalendar]);

  useEffect(() => {
    const intentKey = `${params.intent || ""}:${params.title || ""}`;
    if (!params.intent || handledIntentRef.current === intentKey) return;

    handledIntentRef.current = intentKey;

    const nextTitle = params.title
      ? params.title
      : params.intent === "create-event"
        ? "New calendar event"
        : params.intent === "create-note"
          ? "New calendar note"
          : "";

    const timer = setTimeout(() => {
      setCaptureTitle(nextTitle);
    }, 0);

    return () => clearTimeout(timer);
  }, [params.intent, params.title]);

  async function handleCreateScheduledTask() {
    const trimmed = captureTitle.trim();
    if (!trimmed) return;

    const dueDate = new Date(selectedDate);
    dueDate.setHours(9, 0, 0, 0);

    setSaving(true);
    try {
      const created = await createTask({
        title: trimmed,
        workspace: "work",
        dueDate: dueDate.toISOString(),
      });
      setPersonalTasks((current) => [created, ...current]);
      setCaptureTitle("");
      router.replace("/calendar");
    } catch (err) {
      Alert.alert("Could not save schedule item", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openItem(item: CalendarItem) {
    if (item.source === "team" && item.teamId) {
      router.push({ pathname: "/team/[teamId]", params: { teamId: item.teamId, section: "tasks" } });
      return;
    }

    router.push("/remote-work");
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadCalendar(true)}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="hero">Calendar</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Native schedule, agenda, and due work in one place.
            </ThemedText>
          </View>

          <GlassView style={styles.headerBadge}>
            <ThemedText type="captionBold">{visibleItems.length}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              scheduled
            </ThemedText>
          </GlassView>
        </View>

        <View style={styles.filterRow}>
          {VIEW_FILTERS.map((item) => {
            const selected = item === focus;
            const label = item === "agenda" ? "This week" : item === "upcoming" ? "Upcoming" : "All";
            return (
              <Pressable
                key={item}
                onPress={() => router.replace({ pathname: "/calendar", params: { focus: item } })}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.primary : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.cardBorder,
                  },
                ]}>
                <ThemedText type="captionBold" style={{ color: selected ? "#fff" : theme.textSecondary }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <GlassView style={styles.captureCard}>
          <View style={styles.captureHeader}>
            <ThemedText type="cardTitle">Schedule something</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {profile?.name ? `${profile.name.split(" ")[0]}'s planner` : "Quick planner"}
            </ThemedText>
          </View>

          <TextInput
            value={captureTitle}
            onChangeText={setCaptureTitle}
            placeholder='Try "Design review" or "Pay electricity bill"'
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleCreateScheduledTask}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.divider }]}
          />

          <View style={styles.dayRow}>
            {nextSevenDays.map((date) => {
              const selected = dayKey(date) === dayKey(selectedDate);
              return (
                <Pressable
                  key={dayKey(date)}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? `${theme.primary}22` : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.cardBorder,
                    },
                  ]}>
                  <ThemedText type="captionBold" style={{ color: selected ? theme.primary : theme.textSecondary }}>
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </ThemedText>
                  <ThemedText type="smallBold">{date.getDate()}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleCreateScheduledTask}
            disabled={saving || !captureTitle.trim()}
            style={[
              styles.primaryButton,
              { backgroundColor: Brand.primary, opacity: saving || !captureTitle.trim() ? 0.55 : 1 },
            ]}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <SymbolView name={{ ios: "calendar.badge.plus", android: "event_available" }} size={18} tintColor="#fff" />
                <ThemedText type="captionBold" style={{ color: "#fff" }}>
                  Add to calendar
                </ThemedText>
              </>
            )}
          </Pressable>
        </GlassView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load calendar</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        {groupedItems.length ? (
          groupedItems.map((group) => (
            <View key={dayKey(group.date)} style={styles.section}>
              <ThemedText type="captionBold" themeColor="textSecondary">
                {formatDayHeading(group.date)}
              </ThemedText>

              {group.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openItem(item)}
                  style={[styles.rowCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  <View style={[styles.rowDot, { backgroundColor: item.source === "team" ? Brand.secondary : theme.primary }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="body">{item.title}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {buildDateLabel(item.dueDate)}
                      {item.teamName ? ` • ${item.teamName}` : " • Personal"}
                    </ThemedText>
                  </View>
                  <ThemedText type="captionBold" themeColor="textSecondary">
                    {item.status.replace("-", " ")}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))
        ) : !loading ? (
          <GlassView style={styles.emptyCard}>
            <ThemedText type="body" themeColor="textSecondary">
              Nothing scheduled yet. Capture a task above and it will land here.
            </ThemedText>
          </GlassView>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  headerBadge: {
    minWidth: 88,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    gap: 2,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  captureCard: {
    padding: Spacing.three,
    borderRadius: 24,
    gap: Spacing.three,
  },
  captureHeader: {
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 15,
  },
  dayRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  dayChip: {
    flex: 1,
    minWidth: 42,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
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
  section: {
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 20,
    gap: Spacing.one,
  },
});

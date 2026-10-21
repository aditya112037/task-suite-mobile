import { GlassView } from "expo-glass-effect";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { Brand } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { buildTaskCreateInitialValues } from "@/services/domain-intelligence";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { createTask, getTasks, type PersonalTask } from "@/services/tasks";
import { getMyTeamTasks, type TeamTask } from "@/services/team-tasks";
import {
  getConferenceStatus,
  getTeams,
  type TeamSummary,
} from "@/services/teams";

type MeetingSignal = {
  teamId: string;
  teamName: string;
  active: boolean;
  participantCount: number;
};

const FOCUS_LABELS: Record<string, string> = {
  agenda: "Today's agenda",
  "due-soon": "Due soon",
  assigned: "Assigned to you",
};

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

function isWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function formatDateLabel(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTaskUrgency(value: string | null) {
  if (!value) return null;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return null;
  return dueDate.getTime() < Date.now() ? "overdue" : null;
}

export default function HomeIntentScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const params = useLocalSearchParams<{ focus?: string }>();
  const focusType =
    params.focus === "due-soon" ||
    params.focus === "assigned" ||
    params.focus === "agenda"
      ? params.focus
      : null;
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [meetingSignals, setMeetingSignals] = useState<MeetingSignal[]>([]);
  const [quickCapture, setQuickCapture] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTasks = useMemo(
    () => personalTasks.filter((task) => task.status !== "completed"),
    [personalTasks],
  );
  const todayAgenda = useMemo(
    () => openTasks.filter((task) => isToday(task.dueDate)).slice(0, 3),
    [openTasks],
  );
  const dueSoon = useMemo(
    () =>
      openTasks
        .filter(
          (task) => isWithinDays(task.dueDate, 3) || isToday(task.dueDate),
        )
        .sort((left, right) => {
          const leftTime = left.dueDate
            ? new Date(left.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          const rightTime = right.dueDate
            ? new Date(right.dueDate).getTime()
            : Number.MAX_SAFE_INTEGER;
          return leftTime - rightTime;
        })
        .slice(0, 4),
    [openTasks],
  );
  const activeFocus = useMemo(
    () =>
      personalTasks.find((task) => task.status === "in-progress") ||
      dueSoon[0] ||
      openTasks[0] ||
      null,
    [dueSoon, openTasks, personalTasks],
  );
  const continueWorking = useMemo(
    () =>
      personalTasks.filter((task) => task.status === "in-progress").slice(0, 2),
    [personalTasks],
  );
  const assignedToMe = useMemo(() => {
    if (!profile) return [];
    return teamTasks.filter(
      (task) =>
        task.assigneeIds.includes(profile.id) && task.status !== "completed",
    );
  }, [profile, teamTasks]);
  const overdueCount = useMemo(
    () =>
      personalTasks.filter(
        (task) =>
          task.status !== "completed" &&
          getTaskUrgency(task.dueDate) === "overdue",
      ).length,
    [personalTasks],
  );

  const loadHome = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const nextProfile = await getProfile();
        const [nextPersonalTasks, nextTeamTasks, nextTeams] = await Promise.all(
          [getTasks(), getMyTeamTasks(), getTeams(nextProfile.id)],
        );

        const conferenceSignals = await Promise.all(
          nextTeams.slice(0, 3).map(async (team) => {
            try {
              const status = await getConferenceStatus(team.id);
              return {
                teamId: team.id,
                teamName: team.name,
                active: status.active,
                participantCount: status.conference?.participantCount || 0,
              } satisfies MeetingSignal;
            } catch {
              return {
                teamId: team.id,
                teamName: team.name,
                active: false,
                participantCount: 0,
              } satisfies MeetingSignal;
            }
          }),
        );

        setProfile(nextProfile);
        setPersonalTasks(nextPersonalTasks);
        setTeamTasks(nextTeamTasks);
        setTeams(nextTeams);
        setMeetingSignals(conferenceSignals);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load your workspace";
        setError(message);
        if (
          message.toLowerCase().includes("session") ||
          message.toLowerCase().includes("authorized")
        ) {
          await signOut();
          Alert.alert("Session expired", "Please sign in again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [signOut],
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
      const prepared = buildTaskCreateInitialValues(trimmed);
      const cleanTitle = prepared.title
        .replace(/\b(today|tomorrow|tonight|this evening|eod)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const created = await createTask({
        title: cleanTitle || prepared.title,
        dueDate: prepared.dueDate || undefined,
        priority: prepared.priority,
        workspace: prepared.workspace,
        intent: prepared.intent,
        capabilities: prepared.capabilities,
        dynamicFields: prepared.dynamicFields,
      });
      setPersonalTasks((current) => [created, ...current]);
      setQuickCapture("");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not create task",
      );
    } finally {
      setCapturing(false);
    }
  }

  const agendaWidget = (
    <WidgetCard
      title="Today's agenda"
      icon={{ ios: "checklist", android: "view_list" }}
      accent={theme.primary}
    >
      {todayAgenda.length ? (
        todayAgenda.map((task) => (
          <AgendaRow
            key={task.id}
            label={task.title}
            meta={formatDateLabel(task.dueDate)}
            onPress={() => router.push("/calendar")}
          />
        ))
      ) : (
        <EmptyState copy="Nothing locked to today yet. Shape the day before it shapes you." />
      )}
    </WidgetCard>
  );

  const dueSoonWidget = (
    <WidgetCard
      title="Due soon"
      icon={{ ios: "clock.fill", android: "schedule" }}
      accent={Brand.warning}
    >
      {dueSoon.length ? (
        dueSoon.map((task) => (
          <AgendaRow
            key={task.id}
            label={task.title}
            meta={formatDateLabel(task.dueDate)}
            onPress={() =>
              router.push({
                pathname: "/calendar",
                params: { focus: "upcoming" },
              })
            }
          />
        ))
      ) : (
        <EmptyState copy="Your next three days are surprisingly clear." />
      )}
    </WidgetCard>
  );

  const assignedWidget = (
    <WidgetCard
      title="Assigned to you"
      icon={{ ios: "person.badge.clock.fill", android: "assignment_ind" }}
      accent={Brand.secondary}
      large
    >
      {assignedToMe.length ? (
        assignedToMe.slice(0, 3).map((task) => (
          <AgendaRow
            key={task.id}
            label={task.title}
            meta={`${task.teamName} · ${formatDateLabel(task.dueDate)}`}
            onPress={() =>
              router.push({
                pathname: "/team/[teamId]",
                params: { teamId: task.teamId },
              })
            }
          />
        ))
      ) : (
        <EmptyState copy="Nothing assigned to you right now. Stay ready." />
      )}
    </WidgetCard>
  );

  const focusWidget = (
    <WidgetCard
      title="Focus mode"
      icon={{ ios: "bolt.fill", android: "flash_on" }}
      accent={Brand.secondary}
      large
    >
      {activeFocus ? (
        <Pressable
          onPress={() => router.push("/remote-work")}
          style={styles.focusBody}
        >
          <ThemedText type="cardTitle">{activeFocus.title}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {activeFocus.status === "in-progress"
              ? "Already moving"
              : "Best next move"}{" "}
            - {activeFocus.progressPercentage}% complete
          </ThemedText>
          <View
            style={[styles.progressTrack, { backgroundColor: theme.divider }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(8, activeFocus.progressPercentage)}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
        </Pressable>
      ) : (
        <EmptyState copy="No focus task yet. Capture one and we can make this screen come alive." />
      )}
    </WidgetCard>
  );

  const meetingsWidget = (
    <WidgetCard
      title="Upcoming meetings"
      icon={{ ios: "video.fill", android: "videocam" }}
      accent={theme.primaryLight}
      large
    >
      {meetingSignals.length ? (
        meetingSignals.map((meeting) => (
          <AgendaRow
            key={meeting.teamId}
            label={meeting.teamName}
            meta={
              meeting.active
                ? `${meeting.participantCount} in room now`
                : "Ready to host when you are"
            }
            onPress={() =>
              router.push({
                pathname: "/team/[teamId]",
                params: { teamId: meeting.teamId, section: "conference" },
              })
            }
          />
        ))
      ) : (
        <EmptyState copy="No team rooms connected yet." />
      )}
    </WidgetCard>
  );

  const continueWidget = (
    <WidgetCard
      title="Continue working"
      icon={{ ios: "arrow.trianglehead.clockwise", android: "autorenew" }}
      accent={theme.primary}
      large
    >
      {continueWorking.length ? (
        continueWorking.map((task) => (
          <Pressable
            key={task.id}
            onPress={() => router.push("/remote-work")}
            style={styles.continueCard}
          >
            <View style={styles.continueHeader}>
              <ThemedText type="body" style={{ flex: 1 }}>
                {task.title}
              </ThemedText>
              <ThemedText type="captionBold">
                {task.progressPercentage}%
              </ThemedText>
            </View>
            <View
              style={[styles.progressTrack, { backgroundColor: theme.divider }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(8, task.progressPercentage)}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState copy="Start a task and it will stay pinned here for one-tap resume." />
      )}
    </WidgetCard>
  );

  const pulseWidget = (
    <WidgetCard
      title="Team pulse"
      icon={{ ios: "person.3.fill", android: "groups" }}
      accent={Brand.secondary}
      large
    >
      <AgendaRow
        label={`${teams.length} workspaces`}
        meta={`${assignedToMe.length} assigned to you`}
        onPress={() => router.push("/teams")}
      />
      <AgendaRow
        label={`${teamTasks.filter((task) => task.status !== "completed").length} open team tasks`}
        meta="Coordination lives here"
        onPress={() => router.push("/teams")}
      />
    </WidgetCard>
  );

  const tasksWidget = (
    <WidgetCard
      title="Upcoming tasks"
      icon={{ ios: "checklist", android: "checklist" }}
      accent="#329CF5"
      large
    >
      {openTasks.length > 0 ? (
        openTasks
          .slice(0, 2)
          .map((task) => (
            <AgendaRow
              key={task.id}
              label={task.title}
              meta={formatDateLabel(task.dueDate)}
              onPress={() => router.push("/remote-work")}
            />
          ))
      ) : (
        <EmptyState copy="No tasks yet. Create one to start." />
      )}
    </WidgetCard>
  );

  // const gridOne =
  //   focusType === "due-soon"
  //     ? [dueSoonWidget, agendaWidget]
  //     : focusType === "assigned"
  //       ? [assignedWidget, agendaWidget]
  //       : [agendaWidget, dueSoonWidget];
  // const gridTwo =
  //   focusType === "assigned"
  //     ? [focusWidget, meetingsWidget]
  //     : [
  //         focusWidget,
  //         focusType === "due-soon" ? assignedWidget : meetingsWidget,
  //       ];
  // const gridThree = [continueWidget, pulseWidget];

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadHome(true)}>
      <Animated.View
        layout={LinearTransition.springify().damping(18).stiffness(170)}
        style={styles.container}
      >
        <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push("/")}
              style={[
                styles.intentHomeButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <SymbolView
                name={{ ios: "house.fill", android: "home" }}
                size={16}
                tintColor={theme.primary}
              />
              <ThemedText type="captionBold">Intent Home</ThemedText>
            </Pressable>
            <ThemedText type="caption" themeColor="textSecondary">
              Dashboard
            </ThemedText>
          </View>

          <View style={styles.heroHeading}>
            <View style={styles.heroCopy}>
              <ThemedText type="caption" themeColor="textSecondary">
                {getGreeting()}
              </ThemedText>
              <Pressable onPress={() => router.push("/")}>
                <ThemedText type="hero">
                  {profile?.name.split(" ")[0] || "there"}
                </ThemedText>
              </Pressable>
              <ThemedText type="body" themeColor="textSecondary">
                Native, fast, and built around what needs attention now.
              </ThemedText>
            </View>

          </View>

          <View
            style={[
              styles.captureBar,
              {
                backgroundColor: theme.heroSurface,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <TextInput
              value={quickCapture}
              onChangeText={setQuickCapture}
              placeholder='Type or say later: "remind me tomorrow..."'
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleQuickCapture}
              style={[styles.captureInput, { color: theme.text }]}
            />
            <Pressable
              onPress={handleQuickCapture}
              disabled={capturing || !quickCapture.trim()}
              style={[
                styles.captureButton,
                {
                  backgroundColor: theme.primary,
                  opacity: capturing || !quickCapture.trim() ? 0.55 : 1,
                },
              ]}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <SymbolView
                  name={{ ios: "mic.fill", android: "mic" }}
                  size={18}
                  tintColor="#fff"
                />
              )}
            </Pressable>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t sync</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        {focusType ? (
          <Animated.View entering={FadeInDown.duration(200)}>
            <GlassView
              style={[
                styles.focusBanner,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <SymbolView
                name={{
                  ios: "arrow.down.left.circle.fill",
                  android: "ads_click",
                }}
                size={16}
                tintColor={theme.primary}
              />
              <ThemedText type="captionBold">
                Focused: {FOCUS_LABELS[focusType] || focusType}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                via your command
              </ThemedText>
            </GlassView>
          </Animated.View>
        ) : null}

        {/* <IntentGuidancePanel
          surface="dashboard"
          context={{
            completionRate: profile?.progress.completionRate,
            onTimeRate: profile?.progress.onTimeRate,
            teamCount: teams.length,
            taskCount: personalTasks.length,
            completedCount: profile?.progress.personalCompletedTasks,
            atRiskCount: overdueCount,
          }}
          onApply={(action) => {
            if (action.type === "open-tasks") {
              router.push("/remote-work");
              return;
            }
            if (typeof action.value === "string") {
              Alert.alert("Guidance", action.value);
            }
          }}
        /> */}

        <View style={styles.dashboardSection}>
          <SectionHeading
            title="Upcoming items"
            icon={{ ios: "calendar", android: "event" }}
            accent={theme.primary}
            onViewAll={() => router.push("/calendar")}
          />
          <Animated.View
            entering={FadeInDown.delay(40).duration(260)}
            style={styles.widgetGrid}
          >
            {meetingsWidget}
            {tasksWidget}
          </Animated.View>
        </View>

        {/* Continue working */}
        <View style={styles.dashboardSection}>{continueWidget}</View>

        {/* Team pulse */}
        <View style={styles.dashboardSection}>{pulseWidget}</View>
      </Animated.View>
    </ScreenShell>
  );
}

type WidgetIcon = ComponentProps<typeof SymbolView>["name"];

function WidgetCard({
  title,
  icon,
  accent,
  large = false,
  children,
}: {
  title: string;
  icon: WidgetIcon;
  accent: string;
  large?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <GlassView
      style={[
        styles.widgetCard,
        large ? styles.largeCard : null,
        {
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.widgetHeader}>
        <View style={[styles.widgetIcon, { backgroundColor: `${accent}22` }]}>
          <SymbolView name={icon as any} size={16} tintColor={accent} />
        </View>
        <ThemedText type="cardTitle">{title}</ThemedText>
      </View>
      <View style={styles.widgetBody}>{children}</View>
    </GlassView>
  );
}

function AgendaRow({
  label,
  meta,
  onPress,
}: {
  label: string;
  meta: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.agendaRow,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View style={[styles.agendaDot, { backgroundColor: theme.primary }]} />
      <View style={{ flex: 1 }}>
        <ThemedText type="body" numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {meta}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={16}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary">
      {copy}
    </ThemedText>
  );
}

function SectionHeading({
  title,
  icon,
  accent,
  onViewAll,
}: {
  title: string;
  icon: WidgetIcon;
  accent: string;
  onViewAll: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${accent}22` }]}>
        <SymbolView name={icon as any} size={23} tintColor={accent} />
      </View>
      <ThemedText type="cardTitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <Pressable onPress={onViewAll} style={styles.viewAllButton}>
        <ThemedText type="caption" themeColor="textSecondary">
          View all
        </ThemedText>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={16}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 22,
    paddingBottom: 20,
  },
  hero: {
    gap: 24,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  intentHomeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    elevation: 2,
  },
  heroHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  captureBar: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 66,
    backgroundColor: "#FFFFFF",
  },
  captureInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  captureButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetGrid: {
    flexDirection: "column",
    gap: 14,
    width: "100%",
  },
  widgetCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    backgroundColor: "#FFFFFF",
  },
  largeCard: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 145,
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  widgetIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetBody: {
    gap: 10,
  },
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  dashboardSection: {
    gap: 14,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 58,
  },
  sectionIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
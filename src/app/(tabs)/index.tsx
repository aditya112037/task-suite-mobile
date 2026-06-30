import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput } from "react-native";

import { AppCard } from "@/components/app-card";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import {
  getIntentPrompts,
  getIntentSuggestions,
  resolveIntentCommand,
  type IntentAction,
  type IntentWorkflow,
} from "@/services/intent-engine";
import { getProfile, type ProfileSummary } from "@/services/profile";
import { openExternalInAppBrowser } from "@/services/smart-link";
import { getTasks, type PersonalTask } from "@/services/tasks";
import { getMyTeamTasks, type TeamTask } from "@/services/team-tasks";
import { getTeams, type TeamSummary } from "@/services/teams";

type WorkflowState =
  | { key: IntentWorkflow }
  | { key: "team-selector"; action: IntentAction };

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

export default function HomeIntentScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [commandText, setCommandText] = useState("");
  const [commandFeedback, setCommandFeedback] = useState("Tell me what you need and I will route you.");
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
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

  const hasTeamAccess = teams.length > 0;
  const hasAdminTeamAccess = teams.some((team) => team.isAdmin || team.myRole === "manager");
  const prompts = useMemo(
    () => getIntentPrompts({ signedIn: true, hasTeamAccess, hasAdminTeamAccess }),
    [hasAdminTeamAccess, hasTeamAccess]
  );
  const suggestions = useMemo(() => getIntentSuggestions(commandText, prompts), [commandText, prompts]);

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

  async function openExternalPath(path: string) {
    const url = path.startsWith("http") ? path : `https://tasksuite.co${path}`;
    await openExternalInAppBrowser(url);
  }

  function handleTeamAction(action: IntentAction, team: TeamSummary) {
    if (action === "members") {
      routeToTeam(team.id, "members");
      return;
    }
    if (action === "team_tasks" || action === "create_task") {
      routeToTeam(team.id, "tasks");
      return;
    }
    if (action === "extensions") {
      routeToTeam(team.id, "extensions");
      return;
    }
    if (action === "team_settings") {
      routeToTeam(team.id, "settings");
      return;
    }
    if (action === "conference_join") {
      routeToTeam(team.id, "conference", "join");
      return;
    }
    if (action === "conference_create") {
      routeToTeam(team.id, "conference", "create");
      return;
    }
    if (action === "attendance" || action === "punch_in" || action === "punch_out") {
      routeToTeam(team.id, "attendance", action === "punch_in" ? "in" : action === "punch_out" ? "out" : undefined);
    }
  }

  function performAction(action: IntentAction) {
    if (action === "create_task") {
      router.push({ pathname: "/remote-work", params: { action: "create" } });
      return;
    }
    if (action === "create_team") {
      router.push({ pathname: "/teams", params: { action: "create" } });
      return;
    }
    if (action === "join_team") {
      router.push({ pathname: "/teams", params: { action: "join" } });
      return;
    }

    if (!hasTeamAccess) {
      setCommandFeedback("You are not in a team yet. Create or join one first.");
      setWorkflow({ key: "teams" });
      return;
    }

    if (teams.length === 1) {
      handleTeamAction(action, teams[0]);
      return;
    }

    setWorkflow({ key: "team-selector", action });
    setCommandFeedback("Choose the team you want to open.");
  }

  async function continueToPath(path: string) {
    if (path.startsWith("http")) {
      await openExternalPath(path);
      return;
    }

    if (path === "/login") {
      router.push("/(auth)/login");
      return;
    }

    if (path === "/(tabs)") {
      setWorkflow(null);
      setCommandFeedback("You are already on the home workspace.");
      return;
    }

    if (path === "/profile") {
      router.push("/profile");
      return;
    }

    await openExternalPath(path);
  }

  async function runCommand(rawValue: string) {
    const routeMatch = resolveIntentCommand(rawValue);
    if (!routeMatch) {
      setWorkflow({ key: "plan" });
      setCommandFeedback("I did not route that yet. Try tasks, teams, attendance, conference, profile, calendar, inbox, or insights.");
      return;
    }

    setCommandFeedback(routeMatch.route.feedback);

    if (routeMatch.route.workflow) {
      setWorkflow({ key: routeMatch.route.workflow });
      return;
    }

    if (routeMatch.route.action) {
      setWorkflow(null);
      performAction(routeMatch.route.action);
      return;
    }

    setWorkflow(null);
    await continueToPath(routeMatch.route.path || "/(tabs)");
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadHome(true)}>
      <ThemedView style={styles.container}>
        <AppCard variant="hero" style={styles.heroCard}>
          <ThemedView style={styles.heroCopy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              INTENT GUIDANCE ENGINE
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              {profile ? `What do you want to move, ${profile.name.split(" ")[0]}?` : "What do you want to move today?"}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Search, prompt, and route into tasks, teams, attendance, conference, and the full web workspace when a flow still lives there.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.commandCard}>
            <TextInput
              value={commandText}
              onChangeText={setCommandText}
              placeholder="Try: create task, team members, extensions, profile, plan my day"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={() => void runCommand(commandText)}
              style={[styles.commandInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <ThemedView style={styles.commandActions}>
              <Pressable onPress={() => void runCommand(commandText)} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Route
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCommandText("");
                  setWorkflow({ key: "plan" });
                  setCommandFeedback("Choose a starting point below.");
                }}
                style={styles.secondaryButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Guide me
                </ThemedText>
              </Pressable>
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary">
              {commandFeedback}
            </ThemedText>
          </ThemedView>
        </AppCard>

        <ThemedView style={styles.promptWrap}>
          {suggestions.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => {
                setCommandText(prompt);
                void runCommand(prompt);
              }}
              style={[styles.promptChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{prompt}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {workflow?.key === "tasks" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Tasks workspace</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Create something new, jump into your task list, or review assigned work below on this home screen.
            </ThemedText>
            <ThemedView style={styles.workflowActions}>
              <Pressable onPress={() => performAction("create_task")} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Create
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push("/remote-work")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">View</ThemedText>
              </Pressable>
              <Pressable onPress={() => setCommandFeedback("Assigned work is listed below in your home workspace.")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Assigned</ThemedText>
              </Pressable>
            </ThemedView>
          </AppCard>
        ) : null}

        {workflow?.key === "teams" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Teams workspace</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Create a workspace, request to join one, or open your team surfaces.
            </ThemedText>
            <ThemedView style={styles.workflowActions}>
              <Pressable onPress={() => performAction("create_team")} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Create
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => performAction("join_team")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Join</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push("/teams")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">View</ThemedText>
              </Pressable>
            </ThemedView>
          </AppCard>
        ) : null}

        {workflow?.key === "conference" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Conference workspace</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Choose whether you want to join a live room or open the host flow for a team.
            </ThemedText>
            <ThemedView style={styles.workflowActions}>
              <Pressable onPress={() => performAction("conference_join")} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Join
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => performAction("conference_create")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Create</ThemedText>
              </Pressable>
            </ThemedView>
          </AppCard>
        ) : null}

        {workflow?.key === "plan" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Plan my day</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Start with personal tasks, team execution, profile review, or the full calendar on the web workspace.
            </ThemedText>
            <ThemedView style={styles.workflowActions}>
              <Pressable onPress={() => setWorkflow({ key: "tasks" })} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Tasks
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => setWorkflow({ key: "teams" })} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Teams</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push("/profile")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Profile</ThemedText>
              </Pressable>
              <Pressable onPress={() => void openExternalPath("https://tasksuite.co/app?view=calendar")} style={styles.secondaryActionButton}>
                <ThemedText type="smallBold">Calendar</ThemedText>
              </Pressable>
            </ThemedView>
          </AppCard>
        ) : null}

        {workflow?.key === "team-selector" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Choose a team</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Select the workspace where you want to continue.
            </ThemedText>
            <ThemedView style={styles.teamSelectorList}>
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => handleTeamAction(workflow.action, team)}
                  style={[styles.teamSelectorItem, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedView style={[styles.teamSelectorAccent, { backgroundColor: team.color }]} />
                  <ThemedView style={styles.teamSelectorCopy}>
                    <ThemedText>{team.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {team.myRole} - {team.memberCount} members
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </ThemedView>
          </AppCard>
        ) : null}

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
  commandCard: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  commandInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  commandActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: "#f5f1ea",
  },
  secondaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  promptChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  workflowCard: {
    borderRadius: 24,
  },
  workflowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  secondaryActionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  teamSelectorList: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  teamSelectorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 18,
    padding: Spacing.three,
  },
  teamSelectorAccent: {
    width: 14,
    height: 46,
    borderRadius: 999,
  },
  teamSelectorCopy: {
    flex: 1,
    gap: 4,
    backgroundColor: "transparent",
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, TextInput } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openExternalInAppBrowser } from "@/services/smart-link";
import { getProfile } from "@/services/profile";
import {
  approveJoinRequest,
  getConferenceStatus,
  getInviteLink,
  getTeam,
  getTeamAttendance,
  punchIn,
  punchOut,
  rejectJoinRequest,
  type TeamAttendance,
  type TeamDetail,
} from "@/services/teams";
import {
  approveExtension,
  createTeamTask,
  getPendingExtensions,
  getTeamTasks,
  rejectExtension,
  updateTeamTask,
  type TeamTask,
} from "@/services/team-tasks";

const TEAM_SECTIONS = ["overview", "attendance", "tasks", "members", "extensions", "conference", "settings"] as const;
type TeamSection = (typeof TEAM_SECTIONS)[number];

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTeamSection(value: string | undefined): value is TeamSection {
  return TEAM_SECTIONS.includes((value || "overview") as TeamSection);
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export default function TeamDetailsScreen() {
  const params = useLocalSearchParams<{ teamId: string; section?: string; mode?: string }>();
  const teamId = params.teamId;
  const sectionFromParams = isTeamSection(params.section) ? params.section : "overview";
  const mode = params.mode || "";
  const theme = useTheme();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [attendance, setAttendance] = useState<TeamAttendance | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [pendingExtensions, setPendingExtensions] = useState<TeamTask[]>([]);
  const [conference, setConference] = useState<{ active: boolean; participantCount: number; conferenceId: string | null }>({
    active: false,
    participantCount: 0,
    conferenceId: null,
  });
  const [inviteLink, setInviteLink] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingJoinRequestFor, setReviewingJoinRequestFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myAttendance = useMemo(() => {
    return attendance?.records.find((record) => record.user.id === currentUserId) || null;
  }, [attendance, currentUserId]);

  const assignedToMe = useMemo(
    () => tasks.filter((task) => task.assigneeIds.includes(currentUserId)),
    [currentUserId, tasks]
  );

  const canCreateTask = team?.myPowers.includes("create_task") || team?.isAdmin;
  const canAssignTask = team?.myPowers.includes("assign_task") || team?.isAdmin;
  const canApproveExtensions = team?.myPowers.includes("approve_extensions") || team?.isAdmin;
  const canReviewJoinRequests = team?.myPowers.includes("manage_join_requests") || team?.isAdmin;
  const activeSection = sectionFromParams;

  function openSection(section: TeamSection) {
    router.setParams({ section });
  }

  const loadTeamWorkspace = useCallback(
    async (isRefresh = false) => {
      if (!teamId) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const profile = await getProfile();
        const dateKey = getDateKey();
        const [nextTeam, nextAttendance, nextTasks, nextConference, nextPendingExtensions, nextInviteLink] = await Promise.all([
          getTeam(teamId, profile.id),
          getTeamAttendance(teamId, dateKey),
          getTeamTasks(teamId),
          getConferenceStatus(teamId),
          getPendingExtensions(teamId).catch(() => []),
          getInviteLink(teamId).catch(() => ({ inviteLink: "" })),
        ]);

        setCurrentUserId(profile.id);
        setTeam(nextTeam);
        setAttendance(nextAttendance);
        setTasks(nextTasks);
        setConference({
          active: nextConference.active,
          participantCount: nextConference.conference?.participantCount || 0,
          conferenceId: nextConference.conference?.conferenceId || null,
        });
        setPendingExtensions(nextPendingExtensions);
        setInviteLink(nextInviteLink.inviteLink || "");
        setSelectedAssigneeIds((current) => {
          if (current.length) {
            return current.filter((memberId) => nextTeam.members.some((member) => member.id === memberId));
          }

          return nextTeam.members.some((member) => member.id === profile.id) ? [profile.id] : [];
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team workspace");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTeamWorkspace();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTeamWorkspace]);

  async function handleAttendance(nextMode: "in" | "out") {
    if (!teamId) return;

    try {
      const dateKey = getDateKey();
      if (nextMode === "in") {
        await punchIn(teamId, dateKey);
      } else {
        await punchOut(teamId, dateKey);
      }
      await loadTeamWorkspace(true);
    } catch (err) {
      Alert.alert("Attendance update failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleCreateTask() {
    if (!teamId || !currentUserId) return;
    const title = newTaskTitle.trim();
    if (!title) {
      Alert.alert("Task title needed", "Name the team task before creating it.");
      return;
    }
    if (!selectedAssigneeIds.length) {
      Alert.alert("Assignee needed", "Pick at least one teammate to receive the task.");
      return;
    }

    setSaving(true);
    try {
      const createdTask = await createTeamTask(teamId, {
        title,
        priority: "medium",
        assignedToUsers: selectedAssigneeIds,
      });
      setTasks((currentTasks) => [createdTask, ...currentTasks]);
      setNewTaskTitle("");
      openSection("tasks");
    } catch (err) {
      Alert.alert("Could not create team task", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task: TeamTask) {
    try {
      const updatedTask = await updateTeamTask(task.id, { status: "completed" });
      setTasks((currentTasks) => currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry)));
    } catch (err) {
      Alert.alert("Could not update team task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleStartTask(task: TeamTask) {
    try {
      const updatedTask = await updateTeamTask(task.id, { status: "in-progress" });
      setTasks((currentTasks) => currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry)));
    } catch (err) {
      Alert.alert("Could not update team task", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleExtensionReview(task: TeamTask, decision: "approve" | "reject") {
    try {
      const updatedTask = decision === "approve" ? await approveExtension(task.id) : await rejectExtension(task.id);
      setTasks((currentTasks) => currentTasks.map((entry) => (entry.id === task.id ? updatedTask : entry)));
      setPendingExtensions((currentTasks) => currentTasks.filter((entry) => entry.id !== task.id));
    } catch (err) {
      Alert.alert("Could not review extension", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleJoinRequestReview(userId: string, decision: "approve" | "reject") {
    if (!teamId) return;

    try {
      setReviewingJoinRequestFor(userId);
      if (decision === "approve") {
        await approveJoinRequest(teamId, userId);
      } else {
        await rejectJoinRequest(teamId, userId);
      }

      await loadTeamWorkspace(true);
    } catch (err) {
      Alert.alert("Could not review join request", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setReviewingJoinRequestFor("");
    }
  }

  function toggleAssignee(memberId: string) {
    setSelectedAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((entry) => entry !== memberId) : [...current, memberId]
    );
  }

  async function openConferenceFlow(flow: "join" | "create") {
    if (!teamId) return;
    await openExternalInAppBrowser(`https://tasksuite.co/teams/${teamId}?conference=${flow}`);
  }

  function renderAttendanceSection() {
    return (
      <GlassView style={styles.sectionCard}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Attendance Today
        </ThemedText>
        <ThemedText>
          {myAttendance?.isPunchedIn
            ? `Punched in - ${Math.floor(myAttendance.timeSpentMs / 3600000)}h tracked`
            : myAttendance?.onLeave
              ? "You are marked on leave today."
              : "No active attendance session."}
        </ThemedText>
        <ThemedView style={styles.buttonRow}>
          {!myAttendance?.isPunchedIn ? (
            <Pressable onPress={() => handleAttendance("in")} style={[styles.inlineButton, styles.primaryButton]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Punch In
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={() => handleAttendance("out")} style={styles.inlineButton}>
              <ThemedText type="smallBold">Punch Out</ThemedText>
            </Pressable>
          )}
        </ThemedView>
        <ThemedView style={styles.stack}>
          {attendance?.records.slice(0, 6).map((record) => (
            <GlassView key={record.user.id} style={styles.inlineCard}>
              <ThemedText>{record.user.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {record.isPunchedIn ? "Active today" : record.onLeave ? "On leave" : "Offline"}
              </ThemedText>
            </GlassView>
          ))}
        </ThemedView>
      </GlassView>
    );
  }

  function renderTasksSection() {
    return (
      <ThemedView style={styles.stack}>
        {canCreateTask ? (
          <GlassView style={styles.sectionCard}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Create team task
            </ThemedText>
            <TextInput
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="Task title"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Assign to
            </ThemedText>
            <ThemedView style={styles.memberChipRow}>
              {(team?.members || []).map((member) => {
                const isSelected = selectedAssigneeIds.includes(member.id);
                const canToggle = canAssignTask || member.id === currentUserId;

                return (
                  <Pressable
                    key={member.id}
                    onPress={() => canToggle && toggleAssignee(member.id)}
                    style={[
                      styles.memberChip,
                      {
                        backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                        opacity: canToggle ? 1 : 0.45,
                      },
                    ]}>
                    <ThemedText type="smallBold">{member.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {member.role}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
            <Pressable onPress={handleCreateTask} disabled={saving} style={[styles.inlineButton, styles.primaryButton]}>
              {saving ? <ActivityIndicator color="#f5f1ea" /> : <ThemedText type="smallBold" style={styles.primaryButtonText}>Create Team Task</ThemedText>}
            </Pressable>
          </GlassView>
        ) : null}

        {tasks.length ? (
          tasks.map((task) => (
            <GlassView key={task.id} style={styles.taskCard}>
              <ThemedView style={styles.taskTopRow}>
                <ThemedView style={styles.taskCopy}>
                  <ThemedText>{task.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {task.assignees.length ? task.assignees.map((user) => user.name).join(", ") : "Unassigned"}
                  </ThemedText>
                </ThemedView>
                <ThemedText type="smallBold">{task.status.replace("-", " ")}</ThemedText>
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary">
                {task.progressPercentage}% - {task.priority} priority
                {task.reportLockActive ? " - report locked" : ""}
                {task.extensionStatus ? ` - extension ${task.extensionStatus}` : ""}
              </ThemedText>
              <ThemedView style={styles.actionsRow}>
                {task.assigneeIds.includes(currentUserId) && task.status === "todo" ? (
                  <Pressable onPress={() => handleStartTask(task)} style={styles.inlineButton}>
                    <ThemedText type="smallBold">Start</ThemedText>
                  </Pressable>
                ) : null}
                {task.assigneeIds.includes(currentUserId) && task.status !== "completed" ? (
                  <Pressable onPress={() => handleComplete(task)} style={[styles.inlineButton, styles.primaryButton]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      Mark complete
                    </ThemedText>
                  </Pressable>
                ) : null}
              </ThemedView>
            </GlassView>
          ))
        ) : (
          <GlassView style={styles.emptyCard}>
            <ThemedText>No team tasks yet.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Shared tasks created in this workspace will show up here.
            </ThemedText>
          </GlassView>
        )}
      </ThemedView>
    );
  }

  function renderMembersSection() {
    return (
      <ThemedView style={styles.stack}>
        {canReviewJoinRequests && team?.pendingJoinRequests.length ? (
          <GlassView style={styles.sectionCard}>
            <ThemedText type="smallBold">Pending Join Requests</ThemedText>
            <ThemedView style={styles.stack}>
              {team.pendingJoinRequests.map((request) => {
                const isReviewing = reviewingJoinRequestFor === request.id;
                return (
                  <GlassView key={request.id} style={styles.taskCard}>
                    <ThemedText>{request.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {request.email || "No email"} - requested {formatDateTime(request.requestedAt)}
                    </ThemedText>
                    <ThemedView style={styles.actionsRow}>
                      <Pressable
                        onPress={() => handleJoinRequestReview(request.id, "approve")}
                        disabled={Boolean(reviewingJoinRequestFor)}
                        style={[styles.inlineButton, styles.primaryButton]}>
                        <ThemedText type="smallBold" style={styles.primaryButtonText}>
                          {isReviewing ? "Working..." : "Approve"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleJoinRequestReview(request.id, "reject")}
                        disabled={Boolean(reviewingJoinRequestFor)}
                        style={styles.inlineButton}>
                        <ThemedText type="smallBold">Reject</ThemedText>
                      </Pressable>
                    </ThemedView>
                  </GlassView>
                );
              })}
            </ThemedView>
          </GlassView>
        ) : null}

        {team?.members.map((member) => (
          <GlassView key={member.id} style={styles.taskCard}>
            <ThemedView style={styles.taskTopRow}>
              <ThemedView style={styles.taskCopy}>
                <ThemedText>{member.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {member.role}
                  {member.email ? ` - ${member.email}` : ""}
                </ThemedText>
              </ThemedView>
              <ThemedText type="smallBold">{member.id === currentUserId ? "You" : "Member"}</ThemedText>
            </ThemedView>
          </GlassView>
        ))}
      </ThemedView>
    );
  }

  function renderExtensionsSection() {
    if (!pendingExtensions.length) {
      return (
        <GlassView style={styles.emptyCard}>
          <ThemedText>No pending extensions.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Extension requests will appear here when teammates ask for more time.
          </ThemedText>
        </GlassView>
      );
    }

    return (
      <ThemedView style={styles.stack}>
        {pendingExtensions.map((task) => (
          <GlassView key={task.id} style={styles.taskCard}>
            <ThemedText>{task.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Requested due date: {task.extensionRequestedDueDate || "Unknown"}
            </ThemedText>
            {canApproveExtensions ? (
              <ThemedView style={styles.actionsRow}>
                <Pressable onPress={() => handleExtensionReview(task, "approve")} style={[styles.inlineButton, styles.primaryButton]}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Approve
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleExtensionReview(task, "reject")} style={styles.inlineButton}>
                  <ThemedText type="smallBold">Reject</ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}
          </GlassView>
        ))}
      </ThemedView>
    );
  }

  function renderConferenceSection() {
    return (
      <GlassView style={styles.sectionCard}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Conference
        </ThemedText>
        <ThemedText>
          {conference.active
            ? `${conference.participantCount} people are active in the live room.`
            : "No live room is active right now."}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The mobile app routes conference hosting and joining into the full Task Suite web room so the behavior matches the main product.
        </ThemedText>
        <ThemedView style={styles.actionsRow}>
          <Pressable onPress={() => void openConferenceFlow("join")} style={[styles.inlineButton, mode === "join" ? styles.primaryButton : null]}>
            <ThemedText type="smallBold" style={mode === "join" ? styles.primaryButtonText : undefined}>
              Join Flow
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => void openConferenceFlow("create")} style={[styles.inlineButton, mode === "create" ? styles.primaryButton : null]}>
            <ThemedText type="smallBold" style={mode === "create" ? styles.primaryButtonText : undefined}>
              Host Flow
            </ThemedText>
          </Pressable>
        </ThemedView>
      </GlassView>
    );
  }

  function renderSettingsSection() {
    return (
      <ThemedView style={styles.stack}>
        <GlassView style={styles.sectionCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Workspace settings
          </ThemedText>
          <ThemedText>{team?.description || "No description yet."}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Role: {team?.myRole} - Powers: {team?.myPowers.join(", ") || "member"}
          </ThemedText>
        </GlassView>
        {inviteLink ? (
          <GlassView style={styles.sectionCard}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Invite Link
            </ThemedText>
            <ThemedText selectable>{inviteLink}</ThemedText>
            <ThemedView style={styles.actionsRow}>
              <Pressable onPress={() => Share.share({ message: inviteLink, url: inviteLink })} style={[styles.inlineButton, styles.primaryButton]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Share Invite Link
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => void openExternalInAppBrowser(`https://tasksuite.co/teams/${teamId}?tab=settings`)} style={styles.inlineButton}>
                <ThemedText type="smallBold">Open Web Settings</ThemedText>
              </Pressable>
            </ThemedView>
          </GlassView>
        ) : null}
      </ThemedView>
    );
  }

  function renderOverviewSection() {
    return (
      <ThemedView style={styles.stack}>
        <GlassView style={styles.sectionCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Team snapshot
          </ThemedText>
          <ThemedText>
            {assignedToMe.length} tasks are assigned to you, {team?.members.length || 0} teammates are visible here, and {pendingExtensions.length} extension requests are waiting.
          </ThemedText>
          <ThemedView style={styles.quickSectionGrid}>
            <Pressable onPress={() => openSection("attendance")} style={styles.quickSectionCard}>
              <ThemedText type="smallBold">Attendance</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Punch in, punch out, and see roster status.
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => openSection("tasks")} style={styles.quickSectionCard}>
              <ThemedText type="smallBold">Tasks</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Create team tasks and move execution forward.
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => openSection("members")} style={styles.quickSectionCard}>
              <ThemedText type="smallBold">Members</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Review join requests and open the member list.
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => openSection("conference")} style={styles.quickSectionCard}>
              <ThemedText type="smallBold">Conference</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Jump into the live web room flow.
              </ThemedText>
            </Pressable>
          </ThemedView>
        </GlassView>
      </ThemedView>
    );
  }

  function renderCurrentSection() {
    if (activeSection === "overview") return renderOverviewSection();
    if (activeSection === "attendance") return renderAttendanceSection();
    if (activeSection === "tasks") return renderTasksSection();
    if (activeSection === "members") return renderMembersSection();
    if (activeSection === "extensions") return renderExtensionsSection();
    if (activeSection === "conference") return renderConferenceSection();
    return renderSettingsSection();
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadTeamWorkspace(true)} includeTabInset={false}>
      <ThemedView style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="smallBold">Back</ThemedText>
        </Pressable>

        <GlassView style={[styles.heroCard, { borderColor: team?.color || theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            TEAM WORKSPACE
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            {team?.name || "Workspace"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {team?.description || "Team details, attendance, assigned work, and shared task execution."}
          </ThemedText>
        </GlassView>

        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="smallBold">Couldn&apos;t load team workspace</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        {team ? (
          <>
            <ThemedView style={styles.metricGrid}>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Members
                </ThemedText>
                <ThemedText type="subtitle">{team.memberCount}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  My role
                </ThemedText>
                <ThemedText type="subtitle">{team.myRole}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Assigned to me
                </ThemedText>
                <ThemedText type="subtitle">{assignedToMe.length}</ThemedText>
              </GlassView>
              <GlassView style={styles.metricCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Conference
                </ThemedText>
                <ThemedText type="subtitle">{conference.active ? conference.participantCount : 0}</ThemedText>
              </GlassView>
            </ThemedView>

            <ThemedView style={styles.sectionTabs}>
              {TEAM_SECTIONS.map((section) => (
                <Pressable
                  key={section}
                  onPress={() => openSection(section)}
                  style={[
                    styles.sectionTab,
                    { backgroundColor: activeSection === section ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="smallBold">{section[0].toUpperCase() + section.slice(1)}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>

            {renderCurrentSection()}
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
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.two,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: 28,
    gap: Spacing.two,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
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
  sectionTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  sectionTab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  sectionCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.two,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  inlineButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryButton: {
    backgroundColor: Brand.primary,
  },
  primaryButtonText: {
    color: "#f5f1ea",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  memberChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  memberChip: {
    minWidth: 120,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    gap: 2,
  },
  stack: {
    gap: Spacing.two,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.two,
  },
  inlineCard: {
    padding: Spacing.three,
    borderRadius: 18,
    gap: 4,
  },
  taskTopRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  taskCopy: {
    flex: 1,
    gap: 4,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 22,
    gap: Spacing.one,
  },
  quickSectionGrid: {
    gap: Spacing.two,
  },
  quickSectionCard: {
    padding: Spacing.three,
    borderRadius: 20,
  },
});

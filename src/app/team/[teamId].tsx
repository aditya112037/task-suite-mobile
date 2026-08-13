import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getTeamLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
} from "@/services/leave-requests";
import { checkConference, cleanupConference, requestConferenceCreation } from "@/services/conference-socket";
import { connectSocket, getSocket, initSocket, joinTeamRoom, leaveTeamRoom, whenConnected } from "@/services/socket";

const TEAM_SECTIONS = ["overview", "attendance", "tasks", "members", "extensions", "conference", "settings"] as const;
type TeamSection = (typeof TEAM_SECTIONS)[number];

function getDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isTeamSection(value: string | undefined): value is TeamSection {
  return TEAM_SECTIONS.includes((value || "overview") as TeamSection);
}

export default function TeamDetailsScreen() {
  const params = useLocalSearchParams<{ teamId: string; section?: string }>();
  const teamId = params.teamId;
  const sectionFromParams = isTeamSection(params.section) ? params.section : "overview";
  const theme = useTheme();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [attendance, setAttendance] = useState<TeamAttendance | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [pendingExtensions, setPendingExtensions] = useState<TeamTask[]>([]);
  const [conference, setConference] = useState<{ active: boolean; participantCount: number; conferenceId: string | null }>({
    active: false, participantCount: 0, conferenceId: null,
  });
  const [inviteLink, setInviteLink] = useState("");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [startingConference, setStartingConference] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingJoinRequestFor, setReviewingJoinRequestFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myAttendance = useMemo(() => attendance?.records.find((r) => r.user.id === currentUserId) || null, [attendance, currentUserId]);
  const assignedToMe = useMemo(() => tasks.filter((t) => t.assigneeIds.includes(currentUserId)), [currentUserId, tasks]);
  const canCreateTask = team?.myPowers.includes("create_task") || team?.isAdmin;
  const canAssignTask = team?.myPowers.includes("assign_task") || team?.isAdmin;
  const canApproveExtensions = team?.myPowers.includes("approve_extensions") || team?.isAdmin;
  const canReviewJoinRequests = team?.myPowers.includes("manage_join_requests") || team?.isAdmin;
  const activeSection = sectionFromParams;

  function openSection(section: TeamSection) { router.setParams({ section }); }

  const loadTeamWorkspace = useCallback(async (isRefresh = false) => {
    if (!teamId) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const profile = await getProfile();
      const dateKey = getDateKey();
      const [nextTeam, nextAttendance, nextTasks, nextConference, nextPendingExtensions, nextInviteLink, nextTeamLeaves, nextMyLeaves] = await Promise.all([
        getTeam(teamId, profile.id), getTeamAttendance(teamId, dateKey), getTeamTasks(teamId),
        getConferenceStatus(teamId), getPendingExtensions(teamId).catch(() => []), getInviteLink(teamId).catch(() => ({ inviteLink: "" })),
        getTeamLeaveRequests(teamId).catch(() => []), getMyLeaveRequests().catch(() => []),
      ]);
      setCurrentUserId(profile.id);
      setTeam(nextTeam);
      setAttendance(nextAttendance);
      setTasks(nextTasks);
      setConference({ active: nextConference.active, participantCount: nextConference.conference?.participantCount || 0, conferenceId: nextConference.conference?.conferenceId || null });
      setPendingExtensions(nextPendingExtensions);
      setInviteLink(nextInviteLink.inviteLink || "");
      setLeaveRequests(nextTeamLeaves);
      setMyLeaveRequests(nextMyLeaves);
      setSelectedAssigneeIds((current) => current.length ? current.filter((id) => nextTeam.members.some((m) => m.id === id)) : [profile.id]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team workspace");
    } finally { setLoading(false); setRefreshing(false); }
  }, [teamId]);

  useEffect(() => { const t = setTimeout(() => void loadTeamWorkspace(), 0); return () => clearTimeout(t); }, [loadTeamWorkspace]);

  useEffect(() => {
    if (!teamId) return;
    initSocket();
    connectSocket();
    joinTeamRoom(teamId);

    const handleStarted = (payload: { conferenceId: string; teamId: string }) => {
      if (String(payload.teamId) !== String(teamId)) return;
      setConference((current) =>
        current.active && current.conferenceId === payload.conferenceId
          ? current
          : { active: true, participantCount: 1, conferenceId: payload.conferenceId }
      );
      setStartingConference(false);
    };

    const handleEnded = (payload: { teamId: string }) => {
      if (String(payload.teamId) !== String(teamId)) return;
      setConference({ active: false, participantCount: 0, conferenceId: null });
      setStartingConference(false);
    };

    const handleRefresh = (payload: { teamId: string }) => {
      if (String(payload.teamId) !== String(teamId)) return;
      void loadTeamWorkspace(true);
    };

    const handleParticipants = (payload: { teamId?: string; participants?: Array<{ socketId: string }> }) => {
      if (String(payload.teamId) !== String(teamId)) return;
      setConference((current) =>
        current.active ? { ...current, participantCount: payload.participants?.length || 0 } : current
      );
    };

    const cleanups: Array<() => void> = [];
    whenConnected((connected) => {
      connected.on("conference:started", handleStarted);
      connected.on("conference:ended", handleEnded);
      connected.on("conference:refresh", handleRefresh);
      connected.on("conference:participants", handleParticipants);
      connected.on("connect", () => void checkConference(teamId));
      if (connected.connected) void checkConference(teamId);
      cleanups.push(() => {
        connected.off("conference:started", handleStarted);
        connected.off("conference:ended", handleEnded);
        connected.off("conference:refresh", handleRefresh);
        connected.off("conference:participants", handleParticipants);
        connected.off("connect");
      });
    });

    return () => {
      cleanups.forEach((off) => off());
      cleanups.length = 0;
      leaveTeamRoom(teamId);
    };
  }, [teamId, loadTeamWorkspace]);

  function handleStartConference() {
    if (!teamId) return;
    setStartingConference(true);
    if (!requestConferenceCreation(teamId)) {
      setStartingConference(false);
      Alert.alert("Conference", "Could not start a conference right now. Check your connection.");
    }
  }

  function openConferenceRoom() {
    if (!teamId || !conference.conferenceId || !team) return;
    cleanupConference();
    router.push({
      pathname: "/conference/[conferenceId]",
      params: { conferenceId: conference.conferenceId, teamId, teamName: team.name || "Team conference" },
    });
  }

  async function handleAttendance(nextMode: "in" | "out") {
    if (!teamId) return;
    try {
      if (nextMode === "in") await punchIn(teamId, getDateKey()); else await punchOut(teamId, getDateKey());
      await loadTeamWorkspace(true);
    } catch (err) { Alert.alert("Attendance update failed", err instanceof Error ? err.message : "Unknown error"); }
  }

  async function handleRequestLeave() {
    if (!teamId) return;
    const today = getDateKey();
    Alert.prompt?.("Leave reason", "Why do you need leave?", async (reason) => {
      if (!reason?.trim()) return;
      try {
        await createLeaveRequest({ teamId, reason: reason.trim(), startDate: today, endDate: today });
        await loadTeamWorkspace(true);
        Alert.alert("Done", "Leave request submitted.");
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed");
      }
    }) ?? Alert.alert("Leave", "To request leave, please contact your team admin.");
  }

  async function handleReviewLeave(leaveId: string, decision: "approve" | "reject") {
    try {
      await reviewLeaveRequest(leaveId, decision);
      await loadTeamWorkspace(true);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleCreateTask() {
    if (!teamId || !currentUserId) return;
    const title = newTaskTitle.trim();
    if (!title) { Alert.alert("Task title needed", "Name the team task before creating it."); return; }
    if (!selectedAssigneeIds.length) { Alert.alert("Assignee needed", "Pick at least one teammate."); return; }
    setSaving(true);
    try {
      const createdTask = await createTeamTask(teamId, { title, priority: "medium", assignedToUsers: selectedAssigneeIds });
      setTasks((prev) => [createdTask, ...prev]);
      setNewTaskTitle("");
      openSection("tasks");
    } catch (err) { Alert.alert("Could not create team task", err instanceof Error ? err.message : "Unknown error"); }
    finally { setSaving(false); }
  }

  async function handleComplete(task: TeamTask) {
    try { const u = await updateTeamTask(task.id, { status: "completed" }); setTasks((prev) => prev.map((e) => e.id === task.id ? u : e)); }
    catch (err) { Alert.alert("Could not update task", err instanceof Error ? err.message : "Unknown error"); }
  }

  async function handleStartTask(task: TeamTask) {
    try { const u = await updateTeamTask(task.id, { status: "in-progress" }); setTasks((prev) => prev.map((e) => e.id === task.id ? u : e)); }
    catch (err) { Alert.alert("Could not update task", err instanceof Error ? err.message : "Unknown error"); }
  }

  async function handleExtensionReview(task: TeamTask, decision: "approve" | "reject") {
    try {
      const u = decision === "approve" ? await approveExtension(task.id) : await rejectExtension(task.id);
      setTasks((prev) => prev.map((e) => e.id === task.id ? u : e));
      setPendingExtensions((prev) => prev.filter((e) => e.id !== task.id));
    } catch (err) { Alert.alert("Could not review extension", err instanceof Error ? err.message : "Unknown error"); }
  }

  async function handleJoinRequestReview(userId: string, decision: "approve" | "reject") {
    if (!teamId) return;
    try {
      setReviewingJoinRequestFor(userId);
      if (decision === "approve") await approveJoinRequest(teamId, userId); else await rejectJoinRequest(teamId, userId);
      await loadTeamWorkspace(true);
    } catch (err) { Alert.alert("Could not review join request", err instanceof Error ? err.message : "Unknown error"); }
    finally { setReviewingJoinRequestFor(""); }
  }

  function toggleAssignee(memberId: string) {
    setSelectedAssigneeIds((prev) => prev.includes(memberId) ? prev.filter((e) => e !== memberId) : [...prev, memberId]);
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadTeamWorkspace(true)} includeTabInset={false}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="captionBold" themeColor="primary">← Back</ThemedText>
        </Pressable>

        <ThemedText type="hero">{team?.name || "Workspace"}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{team?.description || ""}</ThemedText>

        <View style={styles.metrics}>
          <View style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{team?.memberCount || 0}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Members</ThemedText>
          </View>
          <View style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{assignedToMe.length}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Assigned</ThemedText>
          </View>
          <View style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <ThemedText type="cardTitle">{conference.active ? conference.participantCount : 0}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">In call</ThemedText>
          </View>
        </View>

        <View style={styles.tabRow}>
          {TEAM_SECTIONS.slice(0, 5).map((section) => (
            <Pressable key={section} onPress={() => openSection(section)}
              style={[styles.tab, { backgroundColor: activeSection === section ? theme.backgroundSelected : theme.backgroundElement }]}>
              <ThemedText type="captionBold">{section[0].toUpperCase() + section.slice(1)}</ThemedText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.textSecondary} /></View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
          </GlassView>
        ) : null}

        {team ? (
          <>
            {activeSection === "overview" && (
              <View style={styles.stack}>
                <GlassView style={styles.sectionCard}>
                  <ThemedText type="cardTitle">Overview</ThemedText>
                  <ThemedText type="body" themeColor="textSecondary">
                    {assignedToMe.length} tasks assigned to you, {team.members.length} members
                  </ThemedText>
                  <View style={styles.ovGrid}>
                    <Pressable onPress={() => openSection("attendance")} style={[styles.ovCard, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="captionBold">Attendance</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => openSection("tasks")} style={[styles.ovCard, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="captionBold">Tasks</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => openSection("members")} style={[styles.ovCard, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="captionBold">Members</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => openSection("conference")} style={[styles.ovCard, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="captionBold">Call</ThemedText>
                    </Pressable>
                  </View>
                </GlassView>
              </View>
            )}

            {activeSection === "attendance" && (
              <View style={styles.stack}>
                <GlassView style={styles.sectionCard}>
                  <ThemedText type="cardTitle">My Attendance</ThemedText>
                  <ThemedText type="body" themeColor="textSecondary">
                    {myAttendance?.isPunchedIn ? `Punched in - ${Math.floor(myAttendance.timeSpentMs / 3600000)}h ${Math.floor((myAttendance.timeSpentMs % 3600000) / 60000)}m` : myAttendance?.onLeave ? "On leave" : "No session today"}
                  </ThemedText>
                  <View style={styles.actionRow}>
                    {!myAttendance?.isPunchedIn ? (
                      <Pressable onPress={() => handleAttendance("in")} style={[styles.btn, styles.primaryBtn]}>
                        <ThemedText type="captionBold" style={{ color: "#fff" }}>Punch In</ThemedText>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => handleAttendance("out")} style={styles.btn}>
                        <ThemedText type="captionBold">Punch Out</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </GlassView>

                {attendance && attendance.records.length > 0 ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">Team Board — {attendance.dateKey}</ThemedText>
                    {attendance.records.map((record) => (
                      <View key={record.user.id} style={styles.attendanceRow}>
                        <View style={styles.attendanceUser}>
                          <View style={[styles.attendanceDot, {
                            backgroundColor: record.isPunchedIn ? "#2f9d61" : record.onLeave ? Brand.warning : theme.divider,
                          }]} />
                          <View style={{ flex: 1 }}>
                            <ThemedText type="body">
                              {record.user.name}{record.user.id === currentUserId ? " (You)" : ""}
                            </ThemedText>
                            <ThemedText type="caption" themeColor="textSecondary">
                              {record.isPunchedIn
                                ? `In since ${new Date(record.punchInAt!).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · ${Math.floor(record.timeSpentMs / 3600000)}h ${Math.floor((record.timeSpentMs % 3600000) / 60000)}m`
                                : record.onLeave
                                  ? "On leave"
                                  : record.punchOutAt
                                    ? `Left at ${new Date(record.punchOutAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · ${Math.floor(record.timeSpentMs / 3600000)}h`
                                    : "Not checked in"}
                            </ThemedText>
                          </View>
                          <ThemedText type="smallBold" style={{
                            color: record.isPunchedIn ? "#2f9d61" : record.onLeave ? Brand.warning : theme.textSecondary,
                          }}>
                            {record.isPunchedIn ? "ACTIVE" : record.onLeave ? "LEAVE" : "AWAY"}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </GlassView>
                ) : null}

                {myLeaveRequests.length > 0 ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">My Leave Requests</ThemedText>
                    {myLeaveRequests.slice(0, 3).map((lr) => (
                      <View key={lr.id} style={styles.leaveRow}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body">{lr.reason || "Leave"}</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">{lr.startDate} · {lr.status}</ThemedText>
                        </View>
                        <ThemedText type="smallBold" style={{
                          color: lr.status === "approved" ? "#2f9d61" : lr.status === "rejected" ? "#d94b4b" : Brand.warning,
                        }}>
                          {lr.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    ))}
                  </GlassView>
                ) : null}

                {canReviewJoinRequests && leaveRequests.filter((lr) => lr.status === "pending").length > 0 ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">Pending Leave Requests</ThemedText>
                    {leaveRequests.filter((lr) => lr.status === "pending").map((lr) => (
                      <View key={lr.id} style={styles.leaveRow}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body">{lr.reason || "Leave"}</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">{lr.startDate}</ThemedText>
                        </View>
                        <View style={styles.actionRow}>
                          <Pressable onPress={() => void handleReviewLeave(lr.id, "approve")} style={[styles.btn, styles.primaryBtn]}>
                            <ThemedText type="captionBold" style={{ color: "#fff" }}>Approve</ThemedText>
                          </Pressable>
                          <Pressable onPress={() => void handleReviewLeave(lr.id, "reject")} style={styles.btn}>
                            <ThemedText type="captionBold">Reject</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </GlassView>
                ) : null}
              </View>
            )}

            {activeSection === "tasks" && (
              <View style={styles.stack}>
                {canCreateTask ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">New task</ThemedText>
                    <TextInput value={newTaskTitle} onChangeText={setNewTaskTitle} placeholder="Task title" placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]} />
                    <View style={styles.memberRow}>
                      {(team?.members || []).map((member) => (
                        <Pressable key={member.id} onPress={() => (canAssignTask || member.id === currentUserId) && toggleAssignee(member.id)}
                          style={[styles.memberChip, { backgroundColor: selectedAssigneeIds.includes(member.id) ? theme.backgroundSelected : theme.backgroundElement, opacity: (canAssignTask || member.id === currentUserId) ? 1 : 0.45 }]}>
                          <ThemedText type="captionBold">{member.name}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={handleCreateTask} disabled={saving}
                      style={[styles.btn, styles.primaryBtn, { opacity: saving ? 0.5 : 1 }]}>
                      {saving ? <ActivityIndicator color="#fff" /> : <ThemedText type="captionBold" style={{ color: "#fff" }}>Create</ThemedText>}
                    </Pressable>
                  </GlassView>
                ) : null}
                {tasks.length ? tasks.map((task) => (
                  <GlassView key={task.id} style={styles.taskCard}>
                    <View style={styles.taskTop}>
                      <ThemedText type="body" style={{ flex: 1 }}>{task.title}</ThemedText>
                      <ThemedText type="captionBold">{task.status.replace("-", " ")}</ThemedText>
                    </View>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {task.assignees.length ? task.assignees.map((u) => u.name).join(", ") : "Unassigned"} · {task.progressPercentage}%
                    </ThemedText>
                    <View style={styles.actionRow}>
                      {task.assigneeIds.includes(currentUserId) && task.status === "todo" ? (
                        <Pressable onPress={() => handleStartTask(task)} style={styles.btn}><ThemedText type="captionBold">Start</ThemedText></Pressable>
                      ) : null}
                      {task.assigneeIds.includes(currentUserId) && task.status !== "completed" ? (
                        <Pressable onPress={() => handleComplete(task)} style={[styles.btn, styles.primaryBtn]}>
                          <ThemedText type="captionBold" style={{ color: "#fff" }}>Complete</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  </GlassView>
                )) : (
                  <GlassView style={styles.emptyCard}><ThemedText type="body" themeColor="textSecondary">No team tasks yet.</ThemedText></GlassView>
                )}
              </View>
            )}

            {activeSection === "members" && (
              <View style={styles.stack}>
                {canReviewJoinRequests && team?.pendingJoinRequests.length ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">Join requests</ThemedText>
                    {team.pendingJoinRequests.map((req) => (
                      <GlassView key={req.id} style={styles.taskCard}>
                        <ThemedText type="body">{req.name}</ThemedText>
                        <View style={styles.actionRow}>
                          <Pressable onPress={() => handleJoinRequestReview(req.id, "approve")} disabled={Boolean(reviewingJoinRequestFor)}
                            style={[styles.btn, styles.primaryBtn]}>
                            <ThemedText type="captionBold" style={{ color: "#fff" }}>{reviewingJoinRequestFor === req.id ? "..." : "Approve"}</ThemedText>
                          </Pressable>
                          <Pressable onPress={() => handleJoinRequestReview(req.id, "reject")} disabled={Boolean(reviewingJoinRequestFor)} style={styles.btn}>
                            <ThemedText type="captionBold">Reject</ThemedText>
                          </Pressable>
                        </View>
                      </GlassView>
                    ))}
                  </GlassView>
                ) : null}
                {team?.members.map((member) => (
                  <GlassView key={member.id} style={styles.taskCard}>
                    <View style={styles.taskTop}>
                      <ThemedText type="body" style={{ flex: 1 }}>{member.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">{member.id === currentUserId ? "You" : member.role}</ThemedText>
                    </View>
                  </GlassView>
                ))}
              </View>
            )}

            {activeSection === "extensions" && (
              pendingExtensions.length ? (
                <View style={styles.stack}>
                  {pendingExtensions.map((task) => (
                    <GlassView key={task.id} style={styles.taskCard}>
                      <ThemedText type="body">{task.title}</ThemedText>
                      {canApproveExtensions ? (
                        <View style={styles.actionRow}>
                          <Pressable onPress={() => handleExtensionReview(task, "approve")} style={[styles.btn, styles.primaryBtn]}>
                            <ThemedText type="captionBold" style={{ color: "#fff" }}>Approve</ThemedText>
                          </Pressable>
                          <Pressable onPress={() => handleExtensionReview(task, "reject")} style={styles.btn}>
                            <ThemedText type="captionBold">Reject</ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </GlassView>
                  ))}
                </View>
              ) : (
                <GlassView style={styles.emptyCard}><ThemedText type="body" themeColor="textSecondary">No pending extensions.</ThemedText></GlassView>
              )
            )}

            {activeSection === "conference" && (
              <View style={styles.stack}>
                <GlassView style={styles.sectionCard}>
                  <ThemedText type="cardTitle">Conference</ThemedText>
                  <View style={styles.conferenceRow}>
                    <View style={[styles.liveDot, conference.active && styles.liveDotActive]} />
                    <ThemedText type="body" themeColor={conference.active ? undefined : "textSecondary"}>
                      {conference.active
                        ? `${conference.participantCount} in the room now`
                        : "No live room active"}
                    </ThemedText>
                  </View>
                  <View style={styles.actionRow}>
                    {conference.active ? (
                      <Pressable onPress={openConferenceRoom} style={[styles.btn, styles.primaryBtn]}>
                        <ThemedText type="captionBold" style={{ color: "#fff" }}>Join call</ThemedText>
                      </Pressable>
                    ) : startingConference ? (
                      <Pressable style={[styles.btn, styles.primaryBtn]}>
                        <ActivityIndicator size="small" color="#fff" />
                      </Pressable>
                    ) : team?.myPowers.includes("start_conference") || team?.isAdmin ? (
                      <Pressable onPress={handleStartConference} style={[styles.btn, styles.primaryBtn]}>
                        <ThemedText type="captionBold" style={{ color: "#fff" }}>Start conference</ThemedText>
                      </Pressable>
                    ) : null}
                    {conference.active ? (
                      <Pressable onPress={openConferenceRoom} style={styles.btn}>
                        <ThemedText type="captionBold">Room preview</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                  {conference.active && !(team?.myPowers.includes("start_conference") || team?.isAdmin) ? (
                    <ThemedText type="caption" themeColor="textSecondary">
                      The room is live — join to see who{"'"}s there. Host approval applies.
                    </ThemedText>
                  ) : null}
                </GlassView>
              </View>
            )}

            {activeSection === "settings" && (
              <View style={styles.stack}>
                <GlassView style={styles.sectionCard}>
                  <ThemedText type="cardTitle">Settings</ThemedText>
                  <ThemedText type="body" themeColor="textSecondary">{team?.myRole} · {team?.myPowers.join(", ")}</ThemedText>
                </GlassView>
                {inviteLink ? (
                  <GlassView style={styles.sectionCard}>
                    <ThemedText type="cardTitle">Invite link</ThemedText>
                    <ThemedText type="caption" selectable>{inviteLink}</ThemedText>
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => Share.share({ message: inviteLink, url: inviteLink })} style={[styles.btn, styles.primaryBtn]}>
                        <ThemedText type="captionBold" style={{ color: "#fff" }}>Share</ThemedText>
                      </Pressable>
                    </View>
                  </GlassView>
                ) : null}
              </View>
            )}
          </>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  backButton: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  metrics: { flexDirection: "row", gap: Spacing.two },
  metric: { flex: 1, paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, borderRadius: 14, gap: 2, alignItems: "center" },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.one },
  tab: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 999 },
  loadingWrap: { paddingVertical: Spacing.five, alignItems: "center" },
  errorCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  stack: { gap: Spacing.two },
  sectionCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  conferenceRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#f59e0b" },
  liveDotActive: { backgroundColor: "#4ade80" },
  ovGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  ovCard: { padding: Spacing.three, borderRadius: 12, minWidth: "47%", flex: 1 },
  actionRow: { flexDirection: "row", gap: Spacing.two },
  btn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 999 },
  primaryBtn: { backgroundColor: Brand.primary },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 15 },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.one },
  memberChip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 999 },
  taskCard: { padding: Spacing.three, borderRadius: 14, gap: Spacing.two },
  taskTop: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  emptyCard: { padding: Spacing.four, borderRadius: 16, gap: Spacing.one },
  attendanceRow: { paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.15)" },
  attendanceUser: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  attendanceDot: { width: 10, height: 10, borderRadius: 999 },
  leaveRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.15)" },
});

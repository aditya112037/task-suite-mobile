import { apiRequest } from "@/services/api";
import {
  normalizeJoinRequestNotice,
  normalizeAttendance,
  normalizeTeamDetail,
  normalizeTeamSummary,
  type JoinRequestNotice,
  type TeamAttendance,
  type TeamDetail,
  type TeamSummary,
} from "@/services/contracts";

type TeamPayload = Record<string, unknown>;

export async function getTeams(currentUserId: string) {
  const payload = await apiRequest<TeamPayload[]>("/api/teams/my", { auth: true });
  return payload.map((team) => normalizeTeamSummary(team, currentUserId));
}

export async function createTeam(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const payload = await apiRequest<TeamPayload>("/api/teams", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });

  return payload;
}

export async function joinTeam(teamId: string) {
  return apiRequest<{ message?: string; status?: string }>(`/api/teams/${teamId}/join`, {
    method: "POST",
    auth: true,
  });
}

export async function getMyJoinRequests() {
  const payload = await apiRequest<{ pending?: TeamPayload[]; rejected?: TeamPayload[] }>("/api/teams/join-requests/mine", {
    auth: true,
  });

  return {
    pending: Array.isArray(payload.pending) ? payload.pending.map((entry) => normalizeJoinRequestNotice(entry)) : [],
    rejected: Array.isArray(payload.rejected) ? payload.rejected.map((entry) => normalizeJoinRequestNotice(entry)) : [],
  };
}

export async function retractJoinRequest(teamId: string) {
  return apiRequest<{ message?: string }>(`/api/teams/${teamId}/join/retract`, {
    method: "POST",
    auth: true,
  });
}

export async function clearRejectedJoinRequest(notificationId: string) {
  return apiRequest<{ message?: string }>(`/api/teams/join-requests/rejected/${notificationId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getInviteLink(teamId: string) {
  return apiRequest<{ inviteLink: string }>(`/api/teams/${teamId}/invite`, {
    auth: true,
  });
}

export async function approveJoinRequest(teamId: string, userId: string) {
  const payload = await apiRequest<TeamPayload>(`/api/teams/${teamId}/join-requests/${userId}/approve`, {
    method: "POST",
    auth: true,
  });

  return payload;
}

export async function rejectJoinRequest(teamId: string, userId: string) {
  const payload = await apiRequest<TeamPayload>(`/api/teams/${teamId}/join-requests/${userId}/reject`, {
    method: "POST",
    auth: true,
  });

  return payload;
}

export async function getTeam(teamId: string, currentUserId: string) {
  const payload = await apiRequest<TeamPayload>(`/api/teams/${teamId}/details`, {
    auth: true,
  });

  return normalizeTeamDetail(payload, currentUserId);
}

export async function getTeamAttendance(teamId: string, dateKey: string) {
  const payload = await apiRequest<Record<string, unknown>>(
    `/api/teams/${teamId}/attendance?dateKey=${encodeURIComponent(dateKey)}`,
    { auth: true }
  );

  return normalizeAttendance(payload);
}

export async function punchIn(teamId: string, dateKey: string) {
  return apiRequest(`/api/teams/${teamId}/attendance/punch-in`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ dateKey }),
  });
}

export async function punchOut(teamId: string, dateKey: string) {
  return apiRequest(`/api/teams/${teamId}/attendance/punch-out`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ dateKey }),
  });
}

export async function getConferenceStatus(teamId: string) {
  return apiRequest<{
    active: boolean;
    conference: {
      participantCount: number;
      conferenceId: string;
    } | null;
  }>(`/api/teams/${teamId}/conference`, {
    auth: true,
  });
}

export type { JoinRequestNotice, TeamAttendance, TeamDetail, TeamSummary };

import { apiRequest } from "@/services/api";

type LeavePayload = Record<string, unknown>;

export type LeaveRequest = {
  id: string;
  teamId: string;
  teamName: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string | null;
  reviewerName?: string | null;
};

function normalizeLeaveRequest(raw: LeavePayload): LeaveRequest {
  const team = raw.team as Record<string, unknown> | undefined;
  const reviewer = raw.reviewedBy as Record<string, unknown> | undefined;
  return {
    id: String(raw._id || raw.id || ""),
    teamId: String(team?._id || team?.id || raw.teamId || ""),
    teamName: String(team?.name || "Team"),
    reason: String(raw.reason || ""),
    startDate: String(raw.startDate || ""),
    endDate: String(raw.endDate || ""),
    status: String(raw.status || "pending") as LeaveRequest["status"],
    createdAt: String(raw.createdAt || ""),
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : null,
    reviewerName: reviewer?.name ? String(reviewer.name) : null,
  };
}

export async function getMyLeaveRequests() {
  const payload = await apiRequest<LeavePayload[]>("/api/leave-requests/my", { auth: true });
  return (Array.isArray(payload) ? payload : []).map(normalizeLeaveRequest);
}

export async function createLeaveRequest(data: { teamId: string; reason: string; startDate: string; endDate: string }) {
  const payload = await apiRequest<LeavePayload>("/api/leave-requests", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });
  return normalizeLeaveRequest(payload);
}

export async function getTeamLeaveRequests(teamId: string) {
  const payload = await apiRequest<LeavePayload[]>(`/api/leave-requests/team/${teamId}`, { auth: true });
  return (Array.isArray(payload) ? payload : []).map(normalizeLeaveRequest);
}

export async function reviewLeaveRequest(leaveRequestId: string, decision: "approve" | "reject") {
  const payload = await apiRequest<LeavePayload>(`/api/leave-requests/${leaveRequestId}/review`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ decision }),
  });
  return normalizeLeaveRequest(payload);
}

import { apiRequest } from "@/services/api";
import { normalizeTeamTask, type TeamTask } from "@/services/contracts";

type TeamTaskPayload = Record<string, unknown>;

export async function getMyTeamTasks() {
  const payload = await apiRequest<TeamTaskPayload[]>("/api/team-tasks/my/all", {
    auth: true,
  });

  return payload.map(normalizeTeamTask);
}

export async function getTeamTasks(teamId: string) {
  const payload = await apiRequest<TeamTaskPayload[]>(`/api/team-tasks/${teamId}`, {
    auth: true,
  });

  return payload.map(normalizeTeamTask);
}

export async function createTeamTask(
  teamId: string,
  data: {
    title: string;
    priority?: string;
    dueDate?: string | null;
    assignedToUsers?: string[];
  }
) {
  const payload = await apiRequest<TeamTaskPayload>(`/api/team-tasks/${teamId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });

  return normalizeTeamTask(payload);
}

export async function updateTeamTask(taskId: string, data: Record<string, unknown>) {
  const payload = await apiRequest<TeamTaskPayload>(`/api/team-tasks/${taskId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
  });

  return normalizeTeamTask(payload);
}

export async function getPendingExtensions(teamId: string) {
  const payload = await apiRequest<TeamTaskPayload[]>(`/api/team-tasks/${teamId}/extensions/pending`, {
    auth: true,
  });

  return payload.map(normalizeTeamTask);
}

export async function approveExtension(taskId: string) {
  const payload = await apiRequest<TeamTaskPayload>(`/api/team-tasks/${taskId}/extension/approve`, {
    method: "POST",
    auth: true,
  });

  return normalizeTeamTask(payload);
}

export async function rejectExtension(taskId: string) {
  const payload = await apiRequest<TeamTaskPayload>(`/api/team-tasks/${taskId}/extension/reject`, {
    method: "POST",
    auth: true,
  });

  return normalizeTeamTask(payload);
}

export type { TeamTask };

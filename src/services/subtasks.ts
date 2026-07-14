import { apiRequest } from "@/services/api";
import { normalizePersonalTask, normalizeTeamTask, type PersonalTask, type TeamTask } from "@/services/contracts";

type TaskPayload = Record<string, unknown>;

export async function createSubtask(taskId: string, title: string) {
  const payload = await apiRequest<TaskPayload>(`/api/tasks/${taskId}/subtasks`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ title }),
  });
  return normalizePersonalTask(payload);
}

export async function updateSubtask(taskId: string, subtaskId: string, data: { title?: string; completed?: boolean; progressPercentage?: number }) {
  const payload = await apiRequest<TaskPayload>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
  });
  return normalizePersonalTask(payload);
}

export async function toggleSubtask(taskId: string, subtaskId: string) {
  const payload = await apiRequest<TaskPayload>(`/api/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
    method: "PATCH",
    auth: true,
  });
  return normalizePersonalTask(payload);
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  const payload = await apiRequest<TaskPayload>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
    auth: true,
  });
  return normalizePersonalTask(payload);
}

export async function createTeamSubtask(taskId: string, title: string) {
  const payload = await apiRequest<TaskPayload>(`/api/team-tasks/${taskId}/subtasks`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ title }),
  });
  return normalizeTeamTask(payload);
}

export async function updateTeamSubtask(taskId: string, subtaskId: string, data: { title?: string; completed?: boolean; progressPercentage?: number }) {
  const payload = await apiRequest<TaskPayload>(`/api/team-tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
  });
  return normalizeTeamTask(payload);
}

export async function toggleTeamSubtask(taskId: string, subtaskId: string) {
  const payload = await apiRequest<TaskPayload>(`/api/team-tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
    method: "PATCH",
    auth: true,
  });
  return normalizeTeamTask(payload);
}

export async function deleteTeamSubtask(taskId: string, subtaskId: string) {
  const payload = await apiRequest<TaskPayload>(`/api/team-tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
    auth: true,
  });
  return normalizeTeamTask(payload);
}

export async function assignTeamSubtask(taskId: string, subtaskId: string, userId: string) {
  const payload = await apiRequest<TaskPayload>(`/api/team-tasks/${taskId}/subtasks/${subtaskId}/assign`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ assignedTo: userId }),
  });
  return normalizeTeamTask(payload);
}

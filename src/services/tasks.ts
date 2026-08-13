import { apiRequest } from "@/services/api";
import { normalizePersonalTask, type PersonalTask } from "@/services/contracts";

type PersonalTaskPayload = Record<string, unknown>;

export async function getTasks() {
  const payload = await apiRequest<PersonalTaskPayload[]>("/api/tasks", { auth: true });
  return payload.map(normalizePersonalTask);
}

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  workspace?: string;
  intent?: {
    domain?: string;
    subtype?: string;
    confidence?: number;
    entities?: { type: string; value: string }[];
    source?: string;
  };
  capabilities?: string[];
  dynamicFields?: Record<string, unknown>;
}) {
  const payload = await apiRequest<PersonalTaskPayload>("/api/tasks", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });

  return normalizePersonalTask(payload);
}

export async function updateTask(taskId: string, data: Record<string, unknown>) {
  const payload = await apiRequest<PersonalTaskPayload>(`/api/tasks/${taskId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
  });

  return normalizePersonalTask(payload);
}

export async function deleteTask(taskId: string) {
  return apiRequest(`/api/tasks/${taskId}`, {
    method: "DELETE",
    auth: true,
  });
}

export type { PersonalTask };

import { apiRequest } from "@/services/api";

type CommentPayload = Record<string, unknown>;

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  text: string;
  mentions: string[];
  createdAt: string;
};

function normalizeComment(raw: CommentPayload): TaskComment {
  const user = raw.user as Record<string, unknown> | undefined;
  return {
    id: String(raw._id || raw.id || ""),
    taskId: String(raw.taskId || ""),
    userId: user ? String(user._id || user.id || "") : "",
    userName: user?.name ? String(user.name) : "Unknown",
    userPhoto: user?.photo ? String(user.photo) : null,
    text: String(raw.text || ""),
    mentions: Array.isArray(raw.mentions) ? raw.mentions.map(String) : [],
    createdAt: String(raw.createdAt || ""),
  };
}

export async function getTaskComments(taskId: string) {
  const payload = await apiRequest<CommentPayload[]>(`/api/comments/${taskId}`, { auth: true });
  return (Array.isArray(payload) ? payload : []).map(normalizeComment);
}

export async function createTaskComment(taskId: string, text: string, mentions: string[] = []) {
  const payload = await apiRequest<CommentPayload>(`/api/comments/${taskId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ text, mentions }),
  });
  return normalizeComment(payload);
}

export async function deleteTaskComment(commentId: string) {
  return apiRequest(`/api/comments/${commentId}`, {
    method: "DELETE",
    auth: true,
  });
}

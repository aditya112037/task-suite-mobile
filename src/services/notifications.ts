import { apiRequest } from "@/services/api";

type NotificationPayload = Record<string, unknown>;

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  teamId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
};

function normalizeNotification(raw: NotificationPayload): NotificationItem {
  return {
    id: String(raw._id || raw.id || ""),
    type: String(raw.type || "info"),
    title: String(raw.title || "Notification"),
    message: String(raw.message || raw.text || ""),
    read: Boolean(raw.read),
    createdAt: String(raw.createdAt || ""),
    teamId: raw.teamId ? String(raw.teamId) : null,
    taskId: raw.taskId ? String(raw.taskId) : null,
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
  };
}

export async function getNotifications(limit = 30) {
  const payload = await apiRequest<NotificationPayload[]>(`/api/notifications?limit=${limit}`, {
    auth: true,
  });
  return (Array.isArray(payload) ? payload : []).map(normalizeNotification);
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
    auth: true,
  });
}

export async function markAllNotificationsRead() {
  return apiRequest("/api/notifications/read-all", {
    method: "PUT",
    auth: true,
  });
}

export async function deleteNotification(notificationId: string) {
  return apiRequest(`/api/notifications/${notificationId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function clearAllNotifications() {
  return apiRequest("/api/notifications", {
    method: "DELETE",
    auth: true,
  });
}

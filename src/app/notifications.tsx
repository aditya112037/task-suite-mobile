import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/services/notifications";

function timeAgo(dateString: string) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "join_request_approved": return "checkmark.circle.fill";
    case "join_request_rejected": return "xmark.circle.fill";
    case "join_request": return "person.badge.plus";
    case "task_assigned": return "checklist";
    case "task_completed": return "checkmark.circle";
    case "extension_approved": return "clock.badge.checkmark";
    case "extension_rejected": return "clock.badge.xmark";
    case "extension_requested": return "clock.badge";
    case "comment": return "bubble.left.fill";
    case "reminder": return "bell.fill";
    default: return "bell.fill";
  }
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const items = await getNotifications(50);
      setNotifications(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadNotifications(), 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDeleteItem(item: NotificationItem) {
    try {
      await deleteNotification(item.id);
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleClearAll() {
    Alert.alert("Clear all", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await clearAllNotifications();
            setNotifications([]);
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed");
          }
        },
      },
    ]);
  }

  async function handleTapItem(item: NotificationItem) {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      } catch {}
    }
    if (item.taskId) {
      router.push({ pathname: "/remote-work" });
    } else if (item.teamId) {
      router.push({ pathname: "/team/[teamId]", params: { teamId: item.teamId, section: "overview" } });
    }
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadNotifications(true)} includeTabInset={false}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="hero">Notifications</ThemedText>
            {unreadCount > 0 ? (
              <ThemedText type="caption" themeColor="primary">{unreadCount} unread</ThemedText>
            ) : null}
          </View>
          {notifications.length > 0 ? (
            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <Pressable onPress={handleMarkAllRead} style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="captionBold" themeColor="primary">Mark all read</ThemedText>
                </Pressable>
              ) : null}
              <Pressable onPress={handleClearAll} style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="captionBold" style={{ color: "#d94b4b" }}>Clear all</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </View>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="cardTitle">Couldn&apos;t load notifications</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
          </GlassView>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <GlassView style={styles.emptyCard}>
            <SymbolView name={{ ios: "bell.slash", android: "notifications_off" }} size={32} tintColor={theme.textSecondary} />
            <ThemedText type="body" themeColor="textSecondary">No notifications yet</ThemedText>
          </GlassView>
        ) : null}

        <View style={styles.list}>
          {notifications.map((item) => (
            <Pressable key={item.id} onPress={() => void handleTapItem(item)}>
              <GlassView
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: item.read ? theme.backgroundElement : theme.backgroundSelected,
                    borderColor: item.read ? theme.cardBorder : theme.primary,
                  },
                ]}>
                <View style={styles.notifRow}>
                  <View style={[styles.iconCircle, { backgroundColor: item.read ? theme.divider : theme.primaryLight }]}>
                    <SymbolView
                      name={{ ios: getNotificationIcon(item.type), android: "notifications" }}
                      size={16}
                      tintColor={item.read ? theme.textSecondary : "#fff"}
                    />
                  </View>
                  <View style={styles.notifContent}>
                    <ThemedText type="captionBold" style={{ flex: 1 }}>{item.title}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">{timeAgo(item.createdAt)}</ThemedText>
                  </View>
                </View>
                {item.message ? (
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.notifMessage}>
                    {item.message}
                  </ThemedText>
                ) : null}
                <Pressable
                  onPress={() => void handleDeleteItem(item)}
                  style={styles.deleteBtn}>
                  <ThemedText type="small" style={{ color: "#d94b4b" }}>Remove</ThemedText>
                </Pressable>
              </GlassView>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.two },
  headerActions: { flexDirection: "row", gap: Spacing.two },
  actionBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 999 },
  loadingWrap: { paddingVertical: Spacing.five, alignItems: "center" },
  errorCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  emptyCard: { padding: Spacing.five, borderRadius: 20, alignItems: "center", gap: Spacing.two },
  list: { gap: Spacing.two },
  notifCard: { padding: Spacing.three, borderRadius: 16, borderWidth: 1, gap: Spacing.two },
  notifRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  iconCircle: { width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1, flexDirection: "row", alignItems: "center" },
  notifMessage: { paddingLeft: 44 },
  deleteBtn: { alignSelf: "flex-end", paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
});

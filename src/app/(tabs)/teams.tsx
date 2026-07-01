import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile } from "@/services/profile";
import {
  clearRejectedJoinRequest,
  createTeam,
  getMyJoinRequests,
  getTeams,
  joinTeam,
  retractJoinRequest,
  type JoinRequestNotice,
  type TeamSummary,
} from "@/services/teams";

const COLOR_OPTIONS = ["#3c87f7", "#f97316", "#10b981", "#e11d48"];

function extractInviteCode(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const joinIndex = normalized.lastIndexOf("/join/");
  if (joinIndex >= 0) return normalized.slice(joinIndex + "/join/".length).split(/[?#]/)[0].trim();
  return normalized.replace(/^\/+|\/+$/g, "");
}

export default function TeamsScreen() {
  const theme = useTheme();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { signOut } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequestNotice[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<JoinRequestNotice[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [requestBusyId, setRequestBusyId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const profile = await getProfile();
        const [nextTeams, joinRequests] = await Promise.all([getTeams(profile.id), getMyJoinRequests().catch(() => ({ pending: [], rejected: [] }))]);
        setTeams(nextTeams);
        setPendingRequests(joinRequests.pending);
        setRejectedRequests(joinRequests.rejected);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load teams";
        setError(message);
        if (message.toLowerCase().includes("session") || message.toLowerCase().includes("authorized")) {
          await signOut();
          Alert.alert("Session expired", "Please sign in again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [signOut]
  );

  useEffect(() => {
    const timer = setTimeout(() => void loadTeams(), 0);
    return () => clearTimeout(timer);
  }, [loadTeams]);

  async function handleCreateTeam() {
    const name = teamName.trim();
    if (!name) { Alert.alert("Team name required", "Give the new workspace a name first."); return; }
    setCreating(true);
    try {
      await createTeam({ name, description: teamDescription.trim(), color: selectedColor, icon: "Workspace" });
      setTeamName(""); setTeamDescription("");
      await loadTeams();
    } catch (err) {
      Alert.alert("Could not create team", err instanceof Error ? err.message : "Unknown error");
    } finally { setCreating(false); }
  }

  async function handleJoinTeam() {
    const code = extractInviteCode(inviteCode);
    if (!code) { Alert.alert("Invite code required", "Paste a team invite link or the team code."); return; }
    setJoining(true);
    try {
      const result = await joinTeam(code);
      setInviteCode("");
      await loadTeams();
    } catch (err) {
      Alert.alert("Could not join team", err instanceof Error ? err.message : "Unknown error");
    } finally { setJoining(false); }
  }

  return (
    <ScreenShell refreshing={refreshing} onRefresh={() => loadTeams(true)}>
      <View style={styles.header}>
        <ThemedText type="hero">Teams</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{teams.length} workspace{teams.length !== 1 ? "s" : ""}</ThemedText>
      </View>

      <View style={styles.createRow}>
        <Pressable
          onPress={() => router.push({ pathname: "/teams", params: { action: "create" } })}
          style={[styles.createChip, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
          <ThemedText type="captionBold">+ Create</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/teams", params: { action: "join" } })}
          style={[styles.createChip, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
          <ThemedText type="captionBold">Join</ThemedText>
        </Pressable>
      </View>

      {action === "create" || action === "join" ? (
        <GlassView style={styles.formCard}>
          <ThemedText type="cardTitle">{action === "create" ? "Create workspace" : "Join workspace"}</ThemedText>
          {action === "create" ? (
            <>
              <TextInput value={teamName} onChangeText={setTeamName} placeholder="Team name" placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]} />
              <TextInput value={teamDescription} onChangeText={setTeamDescription} placeholder="Description (optional)" placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]} />
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((color) => (
                  <Pressable key={color} onPress={() => setSelectedColor(color)}
                    style={[styles.colorDot, { backgroundColor: color, borderColor: selectedColor === color ? theme.text : "transparent" }]} />
                ))}
              </View>
              <Pressable onPress={handleCreateTeam} disabled={creating}
                style={[styles.submitButton, { backgroundColor: theme.primary, opacity: creating ? 0.5 : 1 }]}>
                {creating ? <ActivityIndicator color="#fff" /> : <ThemedText type="captionBold" style={{ color: "#fff" }}>Create</ThemedText>}
              </Pressable>
            </>
          ) : (
            <>
              <TextInput value={inviteCode} onChangeText={setInviteCode} placeholder="Paste invite link or code" placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                style={[styles.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.backgroundElement }]} />
              <Pressable onPress={handleJoinTeam} disabled={joining}
                style={[styles.submitButton, { backgroundColor: Brand.secondary, opacity: joining ? 0.5 : 1 }]}>
                {joining ? <ActivityIndicator color="#fff" /> : <ThemedText type="captionBold" style={{ color: "#fff" }}>Join</ThemedText>}
              </Pressable>
            </>
          )}
        </GlassView>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.textSecondary} />
        </View>
      ) : null}

      {error ? (
        <GlassView style={styles.errorCard}>
          <ThemedText type="cardTitle">Couldn&apos;t load teams</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{error}</ThemedText>
        </GlassView>
      ) : null}

      {!loading && teams.length === 0 ? (
        <GlassView style={styles.emptyCard}>
          <ThemedText type="body" themeColor="textSecondary">No teams yet. Create or join one above.</ThemedText>
        </GlassView>
      ) : null}

      <View style={styles.teamList}>
        {teams.map((team) => (
          <GlassView key={team.id} style={styles.teamCard}>
            <Pressable onPress={() => router.push({ pathname: "/team/[teamId]", params: { teamId: team.id, section: "overview" } })}>
              <View style={styles.teamRow}>
                <View style={[styles.colorBadge, { backgroundColor: team.color }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="body">{team.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">{team.memberCount} members</ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">{team.myRole}</ThemedText>
              </View>
            </Pressable>
            <View style={styles.teamActions}>
              <Pressable onPress={() => router.push({ pathname: "/team/[teamId]", params: { teamId: team.id, section: "tasks" } })} style={styles.teamActionChip}>
                <ThemedText type="captionBold">Tasks</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/team/[teamId]", params: { teamId: team.id, section: "members" } })} style={styles.teamActionChip}>
                <ThemedText type="captionBold">Members</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/team/[teamId]", params: { teamId: team.id, section: "conference" } })} style={styles.teamActionChip}>
                <ThemedText type="captionBold">Call</ThemedText>
              </Pressable>
            </View>
          </GlassView>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  createRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  createChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
  },
  formCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
    alignItems: "center",
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.one,
  },
  teamList: {
    gap: Spacing.two,
  },
  teamCard: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  colorBadge: {
    width: 12,
    height: 40,
    borderRadius: 999,
  },
  teamActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  teamActionChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
  },
});

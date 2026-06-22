import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { getProfile } from "@/services/profile";
import { createTeam, getTeams, joinTeam, type TeamSummary } from "@/services/teams";

const COLOR_OPTIONS = ["#3c87f7", "#f97316", "#10b981", "#e11d48"];

function extractInviteCode(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";

  const joinIndex = normalized.lastIndexOf("/join/");
  if (joinIndex >= 0) {
    return normalized.slice(joinIndex + "/join/".length).split(/[?#]/)[0].trim();
  }

  return normalized.replace(/^\/+|\/+$/g, "");
}

export default function TeamsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { signOut } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const profile = await getProfile();
        const nextTeams = await getTeams(profile.id);
        setTeams(nextTeams);
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
    const timer = setTimeout(() => {
      void loadTeams();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTeams]);

  async function handleCreateTeam() {
    const name = teamName.trim();

    if (!name) {
      Alert.alert("Team name required", "Give the new workspace a name first.");
      return;
    }

    setCreating(true);

    try {
      await createTeam({
        name,
        description: teamDescription.trim(),
        color: selectedColor,
        icon: "Workspace",
      });
      setTeamName("");
      setTeamDescription("");
      await loadTeams();
    } catch (err) {
      Alert.alert("Could not create team", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinTeam() {
    const code = extractInviteCode(inviteCode);

    if (!code) {
      Alert.alert("Invite code required", "Paste a team invite link or the team code.");
      return;
    }

    setJoining(true);

    try {
      const result = await joinTeam(code);
      setInviteCode("");
      await loadTeams();
      Alert.alert("Invite sent", result.message || "Your join request has been sent.");
    } catch (err) {
      Alert.alert("Could not join team", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setJoining(false);
    }
  }

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTeams(true)} />}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Teams
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Shared workspaces, member roles, attendance, and team task visibility.
          </ThemedText>
        </ThemedView>

        <GlassView style={styles.createCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Create workspace
          </ThemedText>
          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Team name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            value={teamDescription}
            onChangeText={setTeamDescription}
            placeholder="Short description"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <ThemedView style={styles.colorRow}>
            {COLOR_OPTIONS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: color,
                    borderColor: selectedColor === color ? theme.text : "transparent",
                  },
                ]}
              />
            ))}
          </ThemedView>
          <Pressable onPress={handleCreateTeam} disabled={creating} style={styles.createButton}>
            {creating ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="smallBold">Create Team</ThemedText>
            )}
          </Pressable>
        </GlassView>

        <GlassView style={styles.createCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Join workspace
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Paste the invite link from Task Suite web, or just the team id at the end of it.
          </ThemedText>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="https://tasksuite.co/join/TEAM_ID"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <Pressable onPress={handleJoinTeam} disabled={joining} style={styles.createButton}>
            {joining ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="smallBold">Request to Join</ThemedText>
            )}
          </Pressable>
        </GlassView>

        {loading ? (
          <ThemedView style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        ) : null}

        {error ? (
          <GlassView style={styles.errorCard}>
            <ThemedText type="smallBold">Couldn&apos;t load teams</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          </GlassView>
        ) : null}

        <ThemedView style={styles.teamList}>
          {teams.length ? (
            teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() =>
                  router.push({
                    pathname: "/team/[teamId]",
                    params: { teamId: team.id },
                  })
                }
                style={styles.teamPressable}>
                <GlassView style={styles.teamCard}>
                  <ThemedView style={styles.teamTopRow}>
                    <ThemedView style={[styles.colorBadge, { backgroundColor: team.color }]} />
                    <ThemedView style={styles.teamCopy}>
                      <ThemedText>{team.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {team.memberCount} members • {team.myRole}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary">
                    {team.description || "No description yet."}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {team.pendingJoinRequestCount > 0
                      ? `${team.pendingJoinRequestCount} pending join requests`
                      : "Open workspace"}
                  </ThemedText>
                </GlassView>
              </Pressable>
            ))
          ) : (
            <GlassView style={styles.emptyCard}>
              <ThemedText>No team workspaces yet.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Create one above to start shared task execution from the Android app.
              </ThemedText>
            </GlassView>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  header: { gap: Spacing.one },
  headerTitle: { fontSize: 34, lineHeight: 40 },
  createCard: {
    padding: Spacing.four,
    borderRadius: 24,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
  },
  createButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  loadingWrap: { paddingVertical: Spacing.five },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.one,
  },
  teamList: {
    gap: Spacing.two,
  },
  teamPressable: {
    borderRadius: 24,
  },
  teamCard: {
    padding: Spacing.three,
    borderRadius: 24,
    gap: Spacing.two,
  },
  teamTopRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  colorBadge: {
    width: 16,
    height: 56,
    borderRadius: 999,
  },
  teamCopy: {
    flex: 1,
    gap: 4,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 24,
    gap: Spacing.one,
  },
});

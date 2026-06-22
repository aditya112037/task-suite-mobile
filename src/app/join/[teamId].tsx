import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useAuth } from "@/services/auth-context";
import { joinTeam } from "@/services/teams";

export default function JoinTeamScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { hasToken } = useAuth();
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Sending your join request to the team.");

  useEffect(() => {
    if (!teamId || !hasToken) return;

    let active = true;

    const run = async () => {
      try {
        const result = await joinTeam(teamId);
        if (!active) return;
        setStatus("success");
        setMessage(result.message || "Join request sent successfully.");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not send join request.");
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [hasToken, teamId]);

  if (hasToken === null) {
    return (
      <ScreenShell includeTabInset={false}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </ThemedView>
      </ScreenShell>
    );
  }

  if (!hasToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ScreenShell includeTabInset={false}>
      <GlassView style={styles.heroCard}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          TEAM INVITE
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          {status === "success" ? "You’re in the flow." : "Joining workspace..."}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{message}</ThemedText>
      </GlassView>

      <GlassView style={styles.panel}>
        {status === "working" ? (
          <ThemedView style={styles.center}>
            <ActivityIndicator size="large" color={Brand.primary} />
          </ThemedView>
        ) : (
          <>
            <Pressable
              onPress={() => router.replace("/(tabs)/teams")}
              style={[styles.button, { backgroundColor: Brand.primary }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Open Teams
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                if (status === "error") {
                  Alert.alert("Join request failed", message);
                }
              }}
              style={styles.secondaryButton}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {status === "error" ? "See Error" : "All set"}
              </ThemedText>
            </Pressable>
          </>
        )}
      </GlassView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: Spacing.four,
    borderRadius: 28,
    gap: Spacing.two,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  panel: {
    padding: Spacing.four,
    borderRadius: 24,
    gap: Spacing.three,
    minHeight: 180,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 120,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  buttonText: {
    color: "#f5f1ea",
  },
});

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";

import { AppCard } from "@/components/app-card";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import {
  getIntentPrompts,
  getIntentSuggestions,
  normalizeCommand,
  resolveIntentCommand,
  type IntentWorkflow,
} from "@/services/intent-engine";
import { openExternalInAppBrowser } from "@/services/smart-link";

type WorkflowState = { key: IntentWorkflow };

export default function HomePage() {
  const theme = useTheme();
  const { hasToken } = useAuth();
  const [commandText, setCommandText] = useState("");
  const [commandFeedback, setCommandFeedback] = useState("Tell me what you need and I will route you.");
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);

  const isLoggedIn = hasToken === true;
  const prompts = useMemo(
    () => getIntentPrompts({ signedIn: isLoggedIn, hasTeamAccess: false, hasAdminTeamAccess: false }),
    [isLoggedIn]
  );
  const suggestions = useMemo(() => getIntentSuggestions(commandText, prompts), [commandText, prompts]);

  useEffect(() => {
    if (hasToken === true) {
      router.replace("/(tabs)");
    }
  }, [hasToken]);

  function requireAuth() {
    router.push("/(auth)/login");
  }

  async function openExternalPath(path: string) {
    const url = path.startsWith("http") ? path : `https://tasksuite.co${path}`;
    await openExternalInAppBrowser(url);
  }

  async function runCommand(rawValue: string) {
    const normalizedValue = normalizeCommand(rawValue);
    if (!normalizedValue) {
      setWorkflow({ key: "plan" });
      setCommandFeedback("Choose a starting point below.");
      return;
    }

    const routeMatch = resolveIntentCommand(rawValue);
    if (!routeMatch) {
      setWorkflow({ key: "plan" });
      setCommandFeedback("I did not route that yet. Try tasks, teams, attendance, conference, profile, calendar, inbox, or insights.");
      return;
    }

    setCommandFeedback(routeMatch.route.feedback);

    if (routeMatch.route.path === "/login" || normalizedValue === "login" || normalizedValue === "sign in" || normalizedValue === "sign up" || normalizedValue === "create account") {
      setWorkflow(null);
      router.push("/(auth)/login");
      return;
    }

    if (routeMatch.route.protected && !isLoggedIn) {
      requireAuth();
      return;
    }

    if (routeMatch.route.workflow) {
      setWorkflow({ key: routeMatch.route.workflow });
      return;
    }

    if (routeMatch.route.action) {
      setWorkflow(null);
      requireAuth();
      return;
    }

    setWorkflow(null);
    const path = routeMatch.route.path;
    if (path?.startsWith("http")) {
      await openExternalPath(path);
      return;
    }
    requireAuth();
  }

  if (hasToken === null) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <ScreenShell>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.brand}>
            TASK SUITE
          </ThemedText>
          {!isLoggedIn ? (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={[styles.signInButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.signInButtonText}>
                Sign In
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>

        <AppCard variant="hero" style={styles.heroCard}>
          <ThemedView style={styles.heroCopy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              INTENT GUIDANCE ENGINE
            </ThemedText>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              What do you want to move today?
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Search, prompt, and route into tasks, teams, attendance, conference, and the web workspace.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.commandCard}>
            <TextInput
              value={commandText}
              onChangeText={setCommandText}
              placeholder="Try: create task, team members, extensions, profile, plan my day"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={() => void runCommand(commandText)}
              style={[styles.commandInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            <ThemedView style={styles.commandActions}>
              <Pressable onPress={() => void runCommand(commandText)} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Route
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCommandText("");
                  setWorkflow({ key: "plan" });
                  setCommandFeedback("Choose a starting point below.");
                }}
                style={styles.secondaryButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Guide me
                </ThemedText>
              </Pressable>
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary">
              {commandFeedback}
            </ThemedText>
          </ThemedView>
        </AppCard>

        <ThemedView style={styles.promptWrap}>
          {suggestions.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => {
                setCommandText(prompt);
                void runCommand(prompt);
              }}
              style={[styles.promptChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{prompt}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {workflow?.key === "plan" ? (
          <AppCard variant="soft" style={styles.workflowCard}>
            <ThemedText type="smallBold">Plan my day</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Start with personal tasks, team execution, profile review, or the full calendar on the web workspace.
            </ThemedText>
            <ThemedView style={styles.workflowActions}>
              {!isLoggedIn ? (
                <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Sign in to start
                  </ThemedText>
                </Pressable>
              ) : null}
            </ThemedView>
          </AppCard>
        ) : null}

        {!isLoggedIn ? (
          <ThemedView style={styles.loginPrompt}>
            <ThemedText themeColor="textSecondary" style={styles.loginPromptText}>
              Sign in to access your teams, tasks, and workspace.
            </ThemedText>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={[styles.loginButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.loginButtonText}>
                Sign In / Create Account
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    letterSpacing: 2,
  },
  signInButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  signInButtonText: {
    color: "#f5f1ea",
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: 28,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroCopy: {
    gap: Spacing.two,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  commandCard: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  commandInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  commandActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: "#f5f1ea",
  },
  secondaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  promptChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  workflowCard: {
    borderRadius: 24,
  },
  workflowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  loginPrompt: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  loginPromptText: {
    textAlign: "center",
  },
  loginButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  loginButtonText: {
    color: "#f5f1ea",
  },
});

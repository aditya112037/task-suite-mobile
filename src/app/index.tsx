import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Spacing } from "@/constants/theme";
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
  const { width, height } = useWindowDimensions();
  const [commandText, setCommandText] = useState("");
  const [commandFeedback, setCommandFeedback] = useState("Search, prompt, and route into the right workspace.");
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const isCompact = height < 780 || width < 380;
  const isShort = height < 720;
  const isTiny = height < 690 || width < 360;
  const promptLimit = isTiny ? 3 : isShort ? 4 : isCompact ? 6 : 8;

  const redirectedRef = useRef(false);
  const isLoggedIn = hasToken === true;
  const prompts = useMemo(
    () => getIntentPrompts({ signedIn: isLoggedIn, hasTeamAccess: false, hasAdminTeamAccess: false }),
    [isLoggedIn]
  );
  const suggestions = useMemo(() => getIntentSuggestions(commandText, prompts), [commandText, prompts]);
  const visiblePrompts = showAllPrompts ? prompts : suggestions.length ? suggestions.slice(0, promptLimit) : prompts.slice(0, promptLimit);
  const hiddenPromptCount = Math.max(prompts.length - visiblePrompts.length, 0);

  useEffect(() => {
    if (hasToken === true && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/(tabs)");
    }
  }, [hasToken, router]);

  useEffect(() => {
    if (hasToken === false || hasToken === null) {
      redirectedRef.current = false;
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
      setCommandFeedback("Try tasks, teams, calendar, profile, conference, or plan my day.");
      return;
    }

    setCommandFeedback(routeMatch.route.feedback);

    if (
      routeMatch.route.path === "/login" ||
      normalizedValue === "login" ||
      normalizedValue === "sign in" ||
      normalizedValue === "sign up" ||
      normalizedValue === "create account"
    ) {
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
    <ScreenShell includeTabInset={false} topInset={false} fitToScreen>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.brandBlock}>
            <ThemedText
              style={[
                styles.brand,
                isCompact ? styles.brandCompact : null,
                { fontFamily: Fonts.serif, color: theme.text },
              ]}>
              TaskSuite
            </ThemedText>
            <ThemedText style={[styles.brandMark, { color: theme.textSecondary }]}>TM</ThemedText>
          </ThemedView>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={[
              styles.avatarButton,
              isCompact ? styles.avatarButtonCompact : null,
              { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText style={[styles.avatarEmoji, isTiny ? styles.avatarEmojiTiny : null]}>☆</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView
          style={[
            styles.badge,
            isCompact ? styles.badgeCompact : null,
            { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
          ]}>
          <ThemedText style={[styles.badgeSpark, isCompact ? styles.badgeSparkCompact : null]}>✦</ThemedText>
          <ThemedText type="small">
            Workspace <ThemedText type="smallBold" style={{ color: theme.primary }}>For Everything</ThemedText>
          </ThemedText>
        </ThemedView>

        {!isTiny ? (
          <ThemedText
            style={[
              styles.tagline,
              isCompact ? styles.taglineCompact : null,
              { fontFamily: Fonts.serif, color: theme.textSecondary },
            ]}>
            Guiding users diversifying needs
          </ThemedText>
        ) : null}

        <ThemedView
          style={[
            styles.searchShell,
            isCompact ? styles.searchShellCompact : null,
            isTiny ? styles.searchShellTiny : null,
            { borderColor: theme.primaryLight, backgroundColor: "rgba(255,255,255,0.28)" },
          ]}>
          <TextInput
            value={commandText}
            onChangeText={(value) => {
              setCommandText(value);
              setShowAllPrompts(false);
            }}
            placeholder="what's on your mind?"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={() => void runCommand(commandText)}
            style={[
              styles.commandInput,
              isCompact ? styles.commandInputCompact : null,
              isTiny ? styles.commandInputTiny : null,
              { color: theme.text },
            ]}
          />
          <Pressable
            onPress={() => void runCommand(commandText)}
            style={[
              styles.searchButton,
              isCompact ? styles.searchButtonCompact : null,
              isTiny ? styles.searchButtonTiny : null,
              { backgroundColor: "rgba(255,255,255,0.34)" },
            ]}>
            <SymbolView name={{ ios: "magnifyingglass", android: "search" }} size={24} tintColor={theme.primary} />
          </Pressable>
        </ThemedView>

        {!isTiny ? (
          <ThemedView style={styles.featureRow}>
            <ThemedText style={[styles.featureSpark, { color: theme.primary }]}>✦</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              7 new features available
            </ThemedText>
          </ThemedView>
        ) : null}

        <ThemedText type="subtitle" style={[styles.pitch, isCompact ? styles.pitchCompact : null, isTiny ? styles.pitchTiny : null]}>
          Build a workspace for tasks, teams, deadlines, and the work that moves between them.
        </ThemedText>

        <ThemedView style={styles.promptWrap}>
          {visiblePrompts.map((prompt, index) => (
            <Pressable
              key={prompt}
              onPress={() => {
                setCommandText(prompt);
                void runCommand(prompt);
              }}
              style={[
                styles.promptChip,
                isTiny ? styles.promptChipTiny : null,
                {
                  backgroundColor: index === 0 && workflow?.key === "plan" ? "rgba(95, 242, 255, 0.12)" : theme.backgroundElement,
                  borderColor: theme.primaryLight,
                },
              ]}>
              {index === 0 && workflow?.key === "plan" ? <View style={[styles.promptDot, { backgroundColor: theme.primary }]} /> : null}
              <ThemedText>{prompt}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {hiddenPromptCount > 0 && !isTiny ? (
          <Pressable onPress={() => setShowAllPrompts(true)} style={styles.showMoreButton}>
            <ThemedText type="smallBold">Show {hiddenPromptCount} more prompts</ThemedText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => (isLoggedIn ? router.push("/(tabs)") : requireAuth())}
          style={[styles.primaryCta, isTiny ? styles.primaryCtaTiny : null, { backgroundColor: theme.primary }]}>
          <SymbolView name={{ ios: "square.grid.2x2.fill", android: "dashboard" }} size={20} tintColor="#f5f1ea" />
          <ThemedText type="smallBold" style={[styles.primaryCtaText, isCompact ? styles.primaryCtaTextCompact : null]}>
            Straight to dashboard
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            setWorkflow({ key: "plan" });
            setCommandFeedback("Choose a starting point below.");
          }}
          style={[styles.secondaryCta, isTiny ? styles.secondaryCtaTiny : null, { borderColor: theme.cardBorder, backgroundColor: "rgba(255,255,255,0.32)" }]}>
          <ThemedText type="smallBold">Get started</ThemedText>
        </Pressable>

        {!isTiny ? (
          <ThemedText themeColor="textSecondary" style={styles.poweredBy}>
          powered by Intent Guidance Engine
          </ThemedText>
        ) : null}

        {workflow?.key === "plan" ? (
          <ThemedView
            style={[
              styles.workflowPanel,
              isTiny ? styles.workflowPanelTiny : null,
              { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
            ]}>
            <ThemedText type="smallBold">Choose your lane</ThemedText>
            <ThemedText themeColor="textSecondary">{commandFeedback}</ThemedText>
            <ThemedView style={styles.workflowActions}>
              <Pressable onPress={() => void runCommand("my tasks")} style={[styles.workflowChip, { borderColor: theme.cardBorder }]}>
                <ThemedText type="smallBold">Tasks</ThemedText>
              </Pressable>
              <Pressable onPress={() => void runCommand("teams")} style={[styles.workflowChip, { borderColor: theme.cardBorder }]}>
                <ThemedText type="smallBold">Teams</ThemedText>
              </Pressable>
              <Pressable onPress={() => void runCommand("calendar")} style={[styles.workflowChip, { borderColor: theme.cardBorder }]}>
                <ThemedText type="smallBold">Calendar</ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push("/(auth)/login")} style={[styles.workflowChip, { borderColor: theme.cardBorder }]}>
                <ThemedText type="smallBold">Sign in</ThemedText>
              </Pressable>
            </ThemedView>
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
    flex: 1,
    justifyContent: "space-evenly",
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  brand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
  },
  brandCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  brandMark: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    letterSpacing: 1.4,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButtonCompact: {
    width: 46,
    height: 46,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  avatarEmojiTiny: {
    fontSize: 16,
  },
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  badgeCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeSpark: {
    fontSize: 18,
    lineHeight: 22,
  },
  badgeSparkCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
  tagline: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 28,
  },
  taglineCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: 92,
    shadowColor: "#c6f7ff",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  searchShellCompact: {
    minHeight: 76,
    paddingLeft: Spacing.three,
  },
  searchShellTiny: {
    minHeight: 64,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  commandInput: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    paddingVertical: Spacing.two,
  },
  commandInputCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  commandInputTiny: {
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 4,
  },
  searchButton: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonCompact: {
    width: 54,
    height: 54,
  },
  searchButtonTiny: {
    width: 46,
    height: 46,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  featureSpark: {
    fontSize: 18,
  },
  pitch: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 38,
  },
  pitchCompact: {
    fontSize: 22,
    lineHeight: 32,
  },
  pitchTiny: {
    fontSize: 20,
    lineHeight: 28,
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.two,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  promptChipTiny: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  promptDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  showMoreButton: {
    alignSelf: "center",
    paddingVertical: Spacing.one,
  },
  primaryCta: {
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: Spacing.four,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  primaryCtaTiny: {
    minHeight: 56,
  },
  primaryCtaText: {
    color: "#f5f1ea",
    fontSize: 16,
  },
  primaryCtaTextCompact: {
    fontSize: 15,
  },
  secondaryCta: {
    minHeight: 56,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCtaTiny: {
    minHeight: 48,
  },
  poweredBy: {
    textAlign: "center",
    fontSize: 14,
  },
  workflowPanel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  workflowPanelTiny: {
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  workflowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  workflowChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

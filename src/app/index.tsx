import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { router, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/services/auth-context";
import { savePendingIntent, type IntentTarget } from "@/services/intent-navigation";
import { getProfile } from "@/services/profile";
import { getTeams } from "@/services/teams";
import { getTaskCreationHint } from "@/services/guidance";
import {
  getIntentPrompts,
  getIntentSuggestions,
  normalizeCommand,
  resolveIntentCommand,
} from "@/services/intent-engine";

export default function HomePage() {
  const theme = useTheme();
  const { hasToken } = useAuth();
  const { width, height } = useWindowDimensions();
  const [commandText, setCommandText] = useState("");
  const [commandFeedback, setCommandFeedback] = useState("Search, prompt, and route into the right workspace.");
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [hasTeamAccess, setHasTeamAccess] = useState(false);
  const [hasAdminTeamAccess, setHasAdminTeamAccess] = useState(false);
  const isCompact = height < 780 || width < 380;
  const isShort = height < 720;
  const isTiny = height < 690 || width < 360;
  const promptLimit = isTiny ? 2 : isShort ? 4 : isCompact ? 5 : 8;
  const compactLayout = height < 800 || width < 380;

  const isLoggedIn = hasToken === true;
  const prompts = useMemo(
    () => getIntentPrompts({ signedIn: isLoggedIn, hasTeamAccess, hasAdminTeamAccess }),
    [hasAdminTeamAccess, hasTeamAccess, isLoggedIn]
  );
  const suggestions = useMemo(() => getIntentSuggestions(commandText, prompts), [commandText, prompts]);
  const domainHint = useMemo(
    () => (commandText.trim() ? getTaskCreationHint(commandText) : null),
    [commandText]
  );
  const visiblePrompts = showAllPrompts ? prompts : suggestions.length ? suggestions.slice(0, promptLimit) : prompts.slice(0, promptLimit);
  const hiddenPromptCount = Math.max(prompts.length - visiblePrompts.length, 0);

  useEffect(() => {
    let active = true;

    async function loadIntentCapabilities() {
      if (!isLoggedIn) {
        if (!active) return;
        setHasTeamAccess(false);
        setHasAdminTeamAccess(false);
        return;
      }

      try {
        const profile = await getProfile();
        const teams = await getTeams(profile.id);

        if (!active) return;

        setHasTeamAccess(teams.length > 0);
        setHasAdminTeamAccess(
          teams.some((team) => team.isAdmin || team.myPowers.includes("approve_extensions"))
        );
      } catch {
        if (!active) return;
        setHasTeamAccess(false);
        setHasAdminTeamAccess(false);
      }
    }

    void loadIntentCapabilities();

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  async function openTarget(target: IntentTarget, protectedRoute = false) {
    if (protectedRoute && !isLoggedIn) {
      await savePendingIntent(target);
      router.push("/(auth)/login");
      return;
    }

    router.push(target as Href);
  }

  async function runCommand(rawValue: string) {
    const normalizedValue = normalizeCommand(rawValue);
    if (!normalizedValue) {
      setCommandFeedback("Try hi, tasks, calendar, teams, profile, or create task.");
      return;
    }

    const routeMatch = resolveIntentCommand(rawValue);
    if (!routeMatch) {
      setCommandFeedback("I couldn't place that yet. Try tasks, calendar, teams, profile, or create task.");
      return;
    }

    setCommandFeedback(routeMatch.route.feedback);

    if (routeMatch.route.responseOnly) {
      return;
    }

    if (routeMatch.route.target) {
      await openTarget(routeMatch.route.target, routeMatch.route.protected);
      return;
    }
  }

  async function runDomainCreate() {
    if (!domainHint) return;
    const prepared = domainHint.build();
    const cleanTitle = prepared.title
      .replace(/\b(today|tomorrow|tonight|this evening|eod)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    setCommandFeedback(`Capturing a ${domainHint.label.toLowerCase()} task.`);
    await openTarget(
      {
        pathname: "/remote-work",
        params: {
          intent: "create-task",
          title: cleanTitle || prepared.title,
          ...(prepared.dueDate ? { dueDate: prepared.dueDate, autocreate: "1" } : {}),
        },
      },
      true
    );
  }

  if (hasToken === null) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <ScreenShell includeTabInset={false} topInset fitToScreen>
      <ThemedView style={[styles.container, compactLayout ? styles.containerCompact : null, { backgroundColor: "#FBF8F2" }]}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.brandBlock}>
            <ThemedText style={[styles.brand, { color: theme.text }]}>Task<ThemedText style={{ color: theme.primary }}>Suite</ThemedText></ThemedText>
            <ThemedText style={[styles.brandMark, { color: theme.text }]}>TM</ThemedText>
          </ThemedView>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push(isLoggedIn ? "/profile" : "/(auth)/login")} style={[styles.headerIcon, { backgroundColor: "#FFFFFF", borderColor: "#E1DEDA" }]}>
              <ThemedText style={[styles.starGlyph, { color: theme.text }]}>☆</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push(isLoggedIn ? "/profile" : "/(auth)/login")} style={[styles.headerIcon, styles.settingsIcon, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <SymbolView name={{ ios: "gearshape.fill", android: "settings" }} size={23} tintColor="#FFFFFF" />
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView style={[styles.badge, compactLayout ? styles.badgeCompact : null, { backgroundColor: "#F4FBF8", borderColor: "#CFE4DF" }]}>
          <ThemedText style={[styles.badgeSpark, { color: theme.primary }]}>✦</ThemedText>
          <ThemedText style={[styles.badgeText, { color: theme.text }]}>Workspace <ThemedText style={{ color: theme.primary }}>For Everything</ThemedText></ThemedText>
        </ThemedView>
        {!isTiny ? <ThemedText style={[styles.tagline, compactLayout ? styles.taglineCompact : null, { color: theme.textSecondary }]}>Guiding users diversifying needs</ThemedText> : null}

        <ThemedView style={[styles.searchShell, compactLayout ? styles.searchShellCompact : null, { borderColor: theme.primaryLight, backgroundColor: "rgba(255,255,255,0.88)" }]}>
          <Pressable onPress={() => void runCommand(commandText)} style={styles.searchLeading}>
            <SymbolView name={{ ios: "magnifyingglass", android: "search" }} size={25} tintColor={theme.text} />
          </Pressable>
          <TextInput
            value={commandText}
            onChangeText={(value) => { setCommandText(value); setShowAllPrompts(false); }}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={() => void runCommand(commandText)}
            returnKeyType="search"
            style={[styles.commandInput, { color: theme.text }]}
          />
          <Pressable onPress={() => void runCommand(commandText)} style={[styles.searchButton, { backgroundColor: "#E3F5EF" }]}>
            <SymbolView name={{ ios: "mic.fill", android: "mic" }} size={23} tintColor={theme.primary} />
          </Pressable>
        </ThemedView>

        <ThemedView style={[styles.workflowPanel, compactLayout ? styles.workflowPanelCompact : null, { backgroundColor: "rgba(255,255,255,0.84)", borderColor: "#E2DED8" }]}>
          <ThemedText style={[styles.workflowTitle, { color: theme.text }]}>Intent response</ThemedText>
          <ThemedText style={[styles.feedbackText, { color: theme.textSecondary }]}>{commandFeedback}</ThemedText>
          {domainHint ? (
            <ThemedView style={styles.domainRow}>
              <ThemedView style={[styles.domainPill, { backgroundColor: `${theme.primary}1f`, borderColor: `${theme.primary}55` }]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>{domainHint.label} intent</ThemedText>
              </ThemedView>
              <ThemedText themeColor="textSecondary" style={{ flex: 1, fontSize: 13 }}>{domainHint.subtitle}</ThemedText>
            </ThemedView>
          ) : null}
          <ThemedView style={styles.workflowActions}>
            {domainHint ? (
              <Pressable onPress={() => void runDomainCreate()} style={[styles.workflowChip, { borderColor: theme.primary, backgroundColor: `${theme.primary}1f` }]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>Create {domainHint.label.toLowerCase()} task</ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void runCommand("my tasks")} style={[styles.workflowChip, { borderColor: "#E0E0DE" }]}>
              <View style={[styles.miniIcon, { backgroundColor: "#E8F2FF" }]}><SymbolView name={{ ios: "list.bullet", android: "list" }} size={19} tintColor="#1680F8" /></View>
              <ThemedText style={styles.actionLabel}>Tasks</ThemedText>
            </Pressable>
            <Pressable onPress={() => void runCommand("calendar")} style={[styles.workflowChip, { borderColor: "#E0E0DE" }]}>
              <View style={[styles.miniIcon, { backgroundColor: "#FFF0E5" }]}><SymbolView name={{ ios: "calendar", android: "calendar-month" }} size={19} tintColor="#F36C22" /></View>
              <ThemedText style={styles.actionLabel}>Calendar</ThemedText>
            </Pressable>
            <Pressable onPress={() => void runCommand("teams")} style={[styles.workflowChip, { borderColor: "#E0E0DE" }]}>
              <View style={[styles.miniIcon, { backgroundColor: "#E6F7F0" }]}><SymbolView name={{ ios: "person.3.fill", android: "groups" }} size={19} tintColor={theme.primary} /></View>
              <ThemedText style={styles.actionLabel}>Teams</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        {!isTiny ? <ThemedView style={[styles.featureBadge, compactLayout ? styles.featureBadgeCompact : null, { backgroundColor: "#F4FBF8", borderColor: "#D3E6E1" }]}>
          <ThemedText style={{ color: theme.primary, fontSize: 20 }}>✦</ThemedText>
          <ThemedText style={[styles.featureText, { color: theme.primary }]}>7 new features available</ThemedText>
          <SymbolView name={{ ios: "chevron.right", android: "chevron-right" }} size={16} tintColor={theme.primary} />
        </ThemedView> : null}

        <ThemedText style={[styles.pitch, compactLayout ? styles.pitchCompact : null, { color: theme.text }]}>Build a workspace for <ThemedText style={{ color: theme.primary }}>tasks, teams,</ThemedText> deadlines, and the work that moves between them.</ThemedText>

        <ThemedView style={[styles.promptWrap, compactLayout ? styles.promptWrapCompact : null]}>
          {visiblePrompts.map((prompt) => {
            const lower = prompt.toLowerCase();
            const icon = lower.includes("login") || lower.includes("profile") ? "person" : lower.includes("account") || lower.includes("sign") ? "person.badge.plus" : lower.includes("calendar") || lower.includes("event") ? "calendar" : lower.includes("day") ? "sun.max" : lower.includes("team") ? "person.3.fill" : lower.includes("hi") ? "bubble.left.and.bubble.right.fill" : lower.includes("create") || lower.includes("add") ? "plus" : "list.bullet";
            const tint = lower.includes("login") ? "#008F7A" : lower.includes("account") ? "#1680F8" : lower.includes("calendar") || lower.includes("event") ? "#F36C22" : lower.includes("day") ? "#F5A900" : lower.includes("team") ? "#008F7A" : lower.includes("hi") ? "#9C36D7" : lower.includes("create") || lower.includes("add") ? "#9C36D7" : "#1680F8";
            return (
              <Pressable key={prompt} onPress={() => { setCommandText(prompt); void runCommand(prompt); }} style={[styles.promptChip, compactLayout ? styles.promptChipCompact : null, { backgroundColor: "rgba(255,255,255,0.82)", borderColor: "#E1DEDA" }]}>
                <View style={[styles.promptIcon, { backgroundColor: `${tint}18` }]}>
                  <SymbolView name={{ ios: icon, android: lower.includes("calendar") || lower.includes("event") ? "calendar-month" : lower.includes("team") ? "groups" : lower.includes("hi") ? "chat" : lower.includes("create") || lower.includes("add") ? "add" : lower.includes("day") ? "wb-sunny" : lower.includes("login") || lower.includes("profile") ? "person-outline" : "list" } as any} size={20} tintColor={tint} />
                </View>
                <ThemedText style={[styles.promptLabel, { color: theme.text }]}>{prompt}</ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        {hiddenPromptCount > 0 && !showAllPrompts && !isTiny ? (
          <Pressable onPress={() => setShowAllPrompts(true)} style={styles.showMoreButton}>
            <ThemedText style={[styles.showMoreText, { color: theme.text }]}>Show {hiddenPromptCount} more prompts</ThemedText>
            <SymbolView name={{ ios: "chevron.down", android: "expand-more" }} size={17} tintColor={theme.text} />
          </Pressable>
        ) : null}

        <Pressable onPress={() => { if (isLoggedIn) router.push("/dashboard"); else void openTarget({ pathname: "/dashboard" }, true); }} style={[styles.primaryCta, compactLayout ? styles.primaryCtaCompact : null, { backgroundColor: theme.primary }]}>
          <SymbolView name={{ ios: "square.grid.2x2", android: "dashboard" }} size={22} tintColor="#FFFFFF" />
          <ThemedText style={styles.primaryCtaText}>Straight to dashboard</ThemedText>
          <SymbolView name={{ ios: "chevron.right", android: "chevron-right" }} size={18} tintColor="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => { if (isLoggedIn) router.push("/dashboard"); else router.push("/(auth)/login"); }} style={[styles.secondaryCta, compactLayout ? styles.secondaryCtaCompact : null, { borderColor: theme.primary, backgroundColor: "rgba(255,255,255,0.75)" }]}>
          <ThemedText style={[styles.secondaryCtaText, { color: theme.text }]}>Get started</ThemedText>
          <SymbolView name={{ ios: "chevron.right", android: "chevron-right" }} size={17} tintColor={theme.text} />
        </Pressable>
      </ThemedView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, justifyContent: "space-evenly", paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 7 },
  containerCompact: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 4, gap: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerIcon: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  starGlyph: { fontSize: 27, lineHeight: 32 },
  settingsIcon: { width: 42, height: 42 },
  brandBlock: { flexDirection: "row", alignItems: "flex-start", gap: 3 },
  brand: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -1.2 },
  brandMark: { fontSize: 8, lineHeight: 12, marginTop: 3, letterSpacing: 1 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  badgeCompact: { paddingVertical: 4, paddingHorizontal: 11 },
  badgeSpark: { fontSize: 18, lineHeight: 21 },
  badgeText: { fontSize: 13, fontWeight: "500" },
  tagline: { fontSize: 14, lineHeight: 19 },
  taglineCompact: { fontSize: 13, lineHeight: 16 },
  searchShell: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, paddingLeft: 12, paddingRight: 7, minHeight: 58, shadowColor: "#147F75", shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  searchShellCompact: { minHeight: 50 },
  searchLeading: { width: 33, height: 38, alignItems: "center", justifyContent: "center" },
  commandInput: { flex: 1, fontSize: 16, lineHeight: 21, paddingHorizontal: 8, paddingVertical: 5 },
  searchButton: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  workflowPanel: { borderWidth: 1, borderRadius: 21, paddingHorizontal: 16, paddingVertical: 12, gap: 6, shadowColor: "#6A6257", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  workflowPanelCompact: { paddingHorizontal: 13, paddingVertical: 9, gap: 4 },
  workflowTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  feedbackText: { fontSize: 13, lineHeight: 18 },
  domainRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  domainPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  workflowActions: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", gap: 5, marginTop: 2 },
  workflowChip: { minHeight: 35, borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  miniIcon: { width: 25, height: 25, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontWeight: "600", color: "#171C2F", flexShrink: 1 },
  featureBadge: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  featureBadgeCompact: { paddingVertical: 4 },
  featureText: { fontSize: 12, fontWeight: "600" },
  pitch: { textAlign: "center", fontSize: 23, lineHeight: 28, fontWeight: "800", letterSpacing: -0.5, marginHorizontal: 1 },
  pitchCompact: { fontSize: 20, lineHeight: 24, letterSpacing: -0.35 },
  promptWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7 },
  promptWrapCompact: { gap: 5 },
  promptChip: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 16, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, maxWidth: "100%" },
  promptChipCompact: { minHeight: 36, gap: 5, paddingHorizontal: 7, paddingVertical: 3 },
  promptIcon: { width: 30, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  promptLabel: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  showMoreButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 0 },
  showMoreText: { fontSize: 12, fontWeight: "500" },
  primaryCta: { minHeight: 50, borderRadius: 18, paddingHorizontal: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, shadowColor: "#087C70", shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryCtaCompact: { minHeight: 46 },
  primaryCtaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryCta: { minHeight: 44, borderRadius: 17, borderWidth: 1.2, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  secondaryCtaCompact: { minHeight: 40 },
  secondaryCtaText: { fontSize: 14, fontWeight: "700" },
});




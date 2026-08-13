import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  DOMAIN_LABELS,
  getDomainConfig,
  inferTaskProfile,
  summarizeDynamicFields,
} from "@/services/domain-intelligence";
import { getGuidance, type GuidanceResponse, type GuidanceSuggestion } from "@/services/guidance";

export type GuidanceAction = GuidanceSuggestion["action"];

type IntentGuidancePanelProps = {
  surface: "task" | "task-form" | "dashboard";
  context: {
    title?: string;
    description?: string;
    dueDate?: string | null;
    status?: string;
    completionRate?: number;
    onTimeRate?: number;
    teamCount?: number;
    taskCount?: number;
    completedCount?: number;
    atRiskCount?: number;
  };
  onApply?: (action: GuidanceAction) => void;
  delayMs?: number;
};

export function IntentGuidancePanel({
  surface,
  context,
  onApply,
  delayMs = 350,
}: IntentGuidancePanelProps) {
  const theme = useTheme();
  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const title = String(context.title || "").trim();
  const description = String(context.description || "").trim();
  const profile = inferTaskProfile(`${title} ${description}`.trim());
  const domainDetected =
    profile.intent.domain !== "work" && profile.intent.confidence >= 0.55 && Boolean(title || description);

  useEffect(() => {
    if (!title && !description) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void getGuidance(surface, context)
        .then((next) => {
          if (!active) return;
          setGuidance(next);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
        });
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, delayMs, surface]);

  if (!title && !description && !domainDetected) return null;

  const domainFields = domainDetected
    ? summarizeDynamicFields(profile.intent.domain, profile.dynamicFields).join(" · ")
    : "";
  const domainLabel = DOMAIN_LABELS[profile.intent.domain] || getDomainConfig(profile.intent.domain).label;
  const entities = profile.intent.entities
    .filter((entity) => entity.type !== "time" && entity.value)
    .map((entity) => entity.value)
    .slice(0, 3);

  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <GlassView style={[styles.panel, { borderColor: theme.cardBorder }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <SymbolView
                name={{ ios: "sparkles", android: "auto_awesome" }}
                size={14}
                tintColor={theme.primary}
              />
              <ThemedText type="captionBold">Intent guidance</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {guidance?.summary || (domainDetected ? `${domainLabel} detected` : "Reading your intent...")}
            </ThemedText>
          </View>
          {loading ? <ThemedText type="small" themeColor="textSecondary">…</ThemedText> : null}
        </View>

        {domainDetected ? (
          <View style={styles.domainBanner}>
            <View
              style={[
                styles.domainPill,
                {
                  backgroundColor: `${theme.primary}1f`,
                  borderColor: `${theme.primary}55`,
                },
              ]}>
              <ThemedText type="captionBold" style={{ color: theme.primary }}>
                {domainLabel}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.domainDetail}>
              {entities.length ? `Noticed "${entities.join(", ")}". ` : ""}
              {domainFields || "Add the domain details for a more useful plan."}
            </ThemedText>
          </View>
        ) : null}

        {guidance?.suggestions?.length ? (
          <View style={styles.suggestionList}>
            {guidance.suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.id}
                onPress={() => onApply?.(suggestion.action)}
                style={[
                  styles.suggestionRow,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.divider,
                  },
                ]}>
                <View style={[styles.suggestionIcon, { backgroundColor: `${theme.primary}22` }]}>
                  <SymbolView name={{ ios: "arrow.right", android: "arrow_forward" }} size={12} tintColor={theme.primary} />
                </View>
                <View style={styles.suggestionCopy}>
                  <ThemedText type="captionBold">{suggestion.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {suggestion.detail}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  domainBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  domainPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  domainDetail: {
    flex: 1,
    paddingTop: 2,
  },
  suggestionList: {
    gap: Spacing.one,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.two,
  },
  suggestionIcon: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  suggestionCopy: {
    flex: 1,
    gap: 1,
  },
});
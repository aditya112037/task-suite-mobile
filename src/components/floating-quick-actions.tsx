import { type ComponentProps, useState } from "react";
import { router, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { DOMAIN_LABELS, buildTaskCreateInitialValues } from "@/services/domain-intelligence";
import { createTask } from "@/services/tasks";
import { ThemedText } from "./themed-text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function prepareTaskCreate(text: string) {
  const prepared = buildTaskCreateInitialValues(text);
  const cleanTitle = prepared.title
    .replace(/\b(today|tomorrow|tonight|this evening|eod)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    ...prepared,
    title: cleanTitle || prepared.title,
    dueDate: prepared.dueDate || null,
  };
}

export function FloatingQuickActions() {
  const theme = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const bottomOffset = insets.bottom + BottomTabInset - 18;

  async function handleCreateTask() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const prepared = prepareTaskCreate(trimmed);
      await createTask({
        title: prepared.title,
        dueDate: prepared.dueDate || undefined,
        priority: prepared.priority,
        workspace: prepared.workspace,
        intent: prepared.intent,
        capabilities: prepared.capabilities,
        dynamicFields: prepared.dynamicFields,
      });
      setTitle("");
      setOpen(false);
      if (!pathname.includes("remote-work")) {
        router.push("/remote-work");
      }
    } finally {
      setSaving(false);
    }
  }

  const detected = title.trim() ? buildTaskCreateInitialValues(title.trim()) : null;
  const detectedLabel =
    detected && detected.intent.domain !== "work" && detected.intent.confidence >= 0.55
      ? DOMAIN_LABELS[detected.intent.domain] || detected.intent.domain
      : null;

  return (
    <>
      {open ? (
        <AnimatedPressable
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
      ) : null}

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" style={styles.anchor}>
          {open ? (
            <Animated.View
              entering={SlideInDown.springify().damping(17).stiffness(180)}
              exiting={SlideOutDown.duration(180)}
              layout={LinearTransition.springify().damping(18).stiffness(170)}
              style={[
                styles.sheet,
                {
                  bottom: bottomOffset + 74,
                  backgroundColor: theme.heroSurface,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.mode === "dark" ? "#000" : theme.primaryDark,
                },
              ]}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleWrap}>
                  <ThemedText type="cardTitle">Quick add</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Capture work before it slips away.
                  </ThemedText>
                </View>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <SymbolView
                    name={{ ios: "xmark", android: "close" }}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </View>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder='Try "Remind me tomorrow to send the deck"'
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={handleCreateTask}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.divider,
                  },
                ]}
              />

              <View style={styles.shortcutRow}>
                <ShortcutChip
                  label="Today"
                  icon={{ ios: "sun.max.fill", android: "today" }}
                  onPress={() => setTitle("Finish today's top priority")}
                />
                <ShortcutChip
                  label="Meeting"
                  icon={{ ios: "video.fill", android: "videocam" }}
                  onPress={() => setTitle("Prep for the next team meeting")}
                />
                <ShortcutChip
                  label="Follow up"
                  icon={{ ios: "bubble.left.and.bubble.right.fill", android: "chat" }}
                  onPress={() => setTitle("Follow up with the team tomorrow")}
                />
                <ShortcutChip
                  label="Groceries"
                  icon={{ ios: "cart.fill", android: "shopping_cart" }}
                  onPress={() => setTitle("Buy groceries for dinner tonight")}
                />
                <ShortcutChip
                  label="Workout"
                  icon={{ ios: "figure.run", android: "directions_run" }}
                  onPress={() => setTitle("Cricket practice tomorrow")}
                />
                <ShortcutChip
                  label="Pay bill"
                  icon={{ ios: "indianrupeesign.circle.fill", android: "payments" }}
                  onPress={() => setTitle("Pay electricity bill today")}
                />
              </View>

              {detectedLabel ? (
                <View style={styles.detectedRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {detectedLabel} intent detected
                    {detected?.dueDate ? ` · will set due for ${new Date(detected.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    router.push("/teams");
                  }}
                  style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}>
                  <ThemedText type="captionBold">Teams</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleCreateTask}
                  disabled={saving || !title.trim()}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: saving || !title.trim() ? 0.55 : 1,
                    },
                  ]}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <SymbolView
                        name={{ ios: "plus", android: "add" }}
                        size={16}
                        tintColor="#fff"
                      />
                      <ThemedText type="captionBold" style={{ color: "#fff" }}>
                        Create task
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          <AnimatedPressable
            layout={LinearTransition.springify().damping(18).stiffness(190)}
            onPress={() => setOpen((current) => !current)}
            style={[
              styles.fab,
              {
                bottom: bottomOffset,
                backgroundColor: theme.primary,
                shadowColor: theme.primaryDark,
              },
            ]}>
            <SymbolView
              name={{ ios: open ? "xmark" : "plus", android: open ? "close" : "add" }}
              size={24}
              tintColor="#fff"
            />
          </AnimatedPressable>
        </View>
      </View>
    </>
  );
}

function ShortcutChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof SymbolView>["name"];
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.shortcutChip,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.cardBorder,
        },
      ]}>
      <SymbolView name={icon as any} size={15} tintColor={theme.primary} />
      <ThemedText type="captionBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 8, 15, 0.24)",
  },
  anchor: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
  },
  sheet: {
    position: "absolute",
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  sheetTitleWrap: {
    flex: 1,
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 15,
  },
  shortcutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  detectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: 2,
  },
  shortcutChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fab: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
});

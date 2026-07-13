import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Brand, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { PersonalTask } from "@/services/tasks";
import { ThemedText } from "./themed-text";

const RIGHT_COMPLETE_THRESHOLD = 86;
const LEFT_SNOOZE_THRESHOLD = -86;
const LEFT_DELETE_THRESHOLD = -156;
const MAX_SWIPE = 170;

function formatDueLabel(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SwipeTaskRow({
  task,
  selected,
  selectionMode,
  onPress,
  onToggleSelect,
  onComplete,
  onDelete,
  onSnooze,
}: {
  task: PersonalTask;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onToggleSelect: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onSnooze: () => void;
}) {
  const theme = useTheme();
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      const next = Math.min(Math.max(event.translationX, -MAX_SWIPE), MAX_SWIPE * 0.7);
      translateX.value = next;
    })
    .onEnd(() => {
      if (translateX.value >= RIGHT_COMPLETE_THRESHOLD) {
        translateX.value = withSpring(0);
        runOnJS(onComplete)();
        return;
      }

      if (translateX.value <= LEFT_DELETE_THRESHOLD) {
        translateX.value = withSpring(0);
        runOnJS(onDelete)();
        return;
      }

      if (translateX.value <= LEFT_SNOOZE_THRESHOLD) {
        translateX.value = withSpring(0);
        runOnJS(onSnooze)();
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const longPress = Gesture.LongPress()
    .minDuration(220)
    .onStart(() => {
      runOnJS(onToggleSelect)();
    });

  const gesture = Gesture.Simultaneous(pan, longPress);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.rowWrap}>
      <View style={styles.backgroundLayer}>
        <View style={[styles.leftAction, { backgroundColor: "rgba(47, 157, 97, 0.22)" }]}>
          <ThemedText type="captionBold" style={{ color: "#2f9d61" }}>
            Complete
          </ThemedText>
        </View>
        <View style={styles.rightActions}>
          <View style={[styles.rightAction, { backgroundColor: "rgba(247, 168, 60, 0.18)" }]}>
            <ThemedText type="captionBold" style={{ color: Brand.warning }}>
              Snooze
            </ThemedText>
          </View>
          <View style={[styles.rightAction, { backgroundColor: "rgba(217, 75, 75, 0.18)" }]}>
            <ThemedText type="captionBold" style={{ color: "#d94b4b" }}>
              Delete
            </ThemedText>
          </View>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          layout={LinearTransition.springify().damping(18).stiffness(180)}
          style={[
            animatedStyle,
            styles.card,
            {
              backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: selected ? theme.primary : theme.cardBorder,
            },
          ]}>
          <Pressable
            onPress={selectionMode ? onToggleSelect : onPress}
            style={styles.pressable}>
            <View
              style={[
                styles.selectionDot,
                {
                  borderColor: selected ? theme.primary : theme.divider,
                  backgroundColor: selected ? theme.primary : "transparent",
                },
              ]}
            />

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <ThemedText type="body" style={{ flex: 1 }}>
                  {task.title}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {task.status === "in-progress" ? "Doing" : task.status === "completed" ? "Done" : "Ready"}
                </ThemedText>
              </View>

              <View style={styles.metaRow}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatDueLabel(task.dueDate)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {task.priority}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {task.completedSubtasks}/{task.totalSubtasks || task.subtasks.length + task.checkpoints.length || 0} checked
                </ThemedText>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(task.status === "completed" ? 100 : 6, task.progressPercentage)}%`,
                      backgroundColor: task.status === "completed" ? "#2f9d61" : theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    borderRadius: 24,
    overflow: "hidden",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftAction: {
    width: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  rightActions: {
    flexDirection: "row",
    marginLeft: "auto",
  },
  rightAction: {
    width: 94,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
  },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  selectionDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});

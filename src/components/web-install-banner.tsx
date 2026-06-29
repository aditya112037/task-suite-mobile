import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { AppCard } from "@/components/app-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const DISMISSED_KEY = "task-suite-web-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

export function WebInstallBanner() {
  const theme = useTheme();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
    if (isStandalone) return;

    if (window.localStorage.getItem(DISMISSED_KEY) === "true") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      window.localStorage.removeItem(DISMISSED_KEY);
      setPromptEvent(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (Platform.OS !== "web" || !visible || !promptEvent) {
    return null;
  }

  async function handleInstall() {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    setVisible(false);

    if (choice.outcome !== "accepted" && typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  function handleDismiss() {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  return (
    <ThemedView pointerEvents="box-none" style={styles.wrap}>
      <AppCard
        variant="hero"
        style={[
          styles.card,
          {
            backgroundColor: theme.heroSurface,
            borderColor: theme.cardBorder,
          },
        ]}>
        <ThemedView style={styles.copy}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            INSTALL TASK SUITE
          </ThemedText>
          <ThemedText type="small">
            Add this app to your home screen for a cleaner full-screen workflow and faster relaunches.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actions}>
          <Pressable onPress={handleInstall} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Install
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleDismiss} style={styles.secondaryButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Later
            </ThemedText>
          </Pressable>
        </ThemedView>
      </AppCard>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    zIndex: 40,
  },
  card: {
    width: "100%",
    maxWidth: 620,
    padding: Spacing.three,
    borderRadius: 24,
    gap: Spacing.three,
  },
  copy: {
    gap: 6,
    backgroundColor: "transparent",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  primaryButton: {
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
  },
});

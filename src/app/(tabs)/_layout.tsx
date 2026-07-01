import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { WebInstallBanner } from "@/components/web-install-banner";
import { useAuth } from "@/services/auth-context";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { hasToken } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (hasToken === false && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/");
    }
  }, [hasToken, router]);

  useEffect(() => {
    if (hasToken === true) {
      redirectedRef.current = false;
    }
  }, [hasToken]);

  if (hasToken === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <WebInstallBanner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

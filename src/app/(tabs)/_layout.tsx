import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider, router } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { WebInstallBanner } from "@/components/web-install-banner";
import { useAuth } from "@/services/auth-context";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { hasToken } = useAuth();
  const prevHasToken = useRef(hasToken);

  useEffect(() => {
    console.log("[TabsLayout] hasToken changed:", prevHasToken.current, "→", hasToken);
    if (prevHasToken.current === true && hasToken === false) {
      console.log("[TabsLayout] hasToken transitioned true→false, navigating to /");
      router.replace("/");
    }
    prevHasToken.current = hasToken;
  }, [hasToken]);

  if (hasToken === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasToken) {
    console.log("[TabsLayout] hasToken is false, rendering blank overlay");
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={styles.loading} />
      </ThemeProvider>
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

import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { WebInstallBanner } from "@/components/web-install-banner";
import { useAuth } from "@/services/auth-context";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { hasToken } = useAuth();

  if (hasToken === null) {
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

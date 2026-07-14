import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, Redirect, ThemeProvider } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { FloatingQuickActions } from "@/components/floating-quick-actions";
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

  if (!hasToken) {
    return <Redirect href="/" />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <FloatingQuickActions />
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

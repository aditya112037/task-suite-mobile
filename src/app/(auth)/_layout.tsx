import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { useAuth } from "@/services/auth-context";

export default function AuthLayout() {
  const router = useRouter();
  const { hasToken } = useAuth();
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (hasToken === true && !navigatingRef.current) {
      navigatingRef.current = true;
      setTimeout(() => router.replace("/(tabs)"), 0);
    }
  }, [hasToken, router]);

  if (hasToken === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasToken) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

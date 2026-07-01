import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";

import { useAuth } from "@/services/auth-context";

export default function AuthLayout() {
  const { hasToken } = useAuth();

  if (hasToken === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasToken) {
    return null;
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

import { Stack } from 'expo-router';
import { AuthProvider } from '@/services/auth-context';
import { ThemeProvider } from '@/services/theme-context';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join/[teamId]" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}

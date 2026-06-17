import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Redirect } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/services/auth-context';

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
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

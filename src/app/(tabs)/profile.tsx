import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/services/auth-context';

const MENU_ITEMS = [
  {
    id: '1',
    icon: { ios: 'gearshape.fill', android: 'settings' } as const,
    title: 'Settings',
    accent: '#3c87f7',
  },
  {
    id: '2',
    icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' } as const,
    title: 'Logout',
    accent: '#ff3b30',
  },
];

export default function ProfileScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { signOut } = useAuth();

  function handlePress(item: (typeof MENU_ITEMS)[number]) {
    if (item.id === '2') {
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut },
      ]);
    }
  }

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.profileSection}>
          <ThemedView style={styles.avatarContainer}>
            <ThemedView style={[styles.avatarRing, { borderColor: theme.text + '20' }]}>
              <ThemedView style={[styles.avatar, { backgroundColor: theme.text + '15' }]}>
                <SymbolView
                  tintColor={theme.text}
                  name={{ ios: 'person.fill', android: 'person' }}
                  size={36}
                />
              </ThemedView>
            </ThemedView>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.name}>
            Aditya
          </ThemedText>
          <ThemedText themeColor="textSecondary">aditya@taskmail.com</ThemedText>
        </ThemedView>

        <GlassView style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <ThemedView key={item.id}>
              <Pressable onPress={() => handlePress(item)}>
                <ThemedView style={styles.menuItem}>
                  <ThemedView
                    style={[styles.menuIcon, { backgroundColor: item.accent + '20' }]}>
                    <SymbolView tintColor={item.accent} name={item.icon} size={20} />
                  </ThemedView>
                  <ThemedText type="default" style={styles.menuTitle}>
                    {item.title}
                  </ThemedText>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{ ios: 'chevron.right', android: 'chevron_right' }}
                    size={16}
                  />
                </ThemedView>
              </Pressable>
              {index < MENU_ITEMS.length - 1 && (
                <ThemedView style={[styles.divider, { backgroundColor: theme.text + '10' }]} />
              )}
            </ThemedView>
          ))}
        </GlassView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.five,
  },
  profileSection: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  avatarContainer: {
    marginBottom: Spacing.one,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 32,
    lineHeight: 40,
  },
  menuCard: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 4,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 36 + Spacing.three + Spacing.four,
  },
});

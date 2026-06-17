import { useEffect } from 'react';
import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { testConnection } from '@/services/api';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TASKS = [
  { id: '1', title: 'Finish Marketing Video', done: false },
  { id: '2', title: 'Contact Leads', done: false },
  { id: '3', title: 'Update Website', done: false },
];

export default function TodayScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    async function check() {
      const data = await testConnection();
      console.log(data);
    }

    check();
  }, []);

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
        <ThemedView style={styles.hero}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'sun.max.fill', android: 'light_mode' }}
            size={32}
          />
          <ThemedText type="subtitle" style={styles.greeting}>
            Good Morning
          </ThemedText>
          <GlassView style={styles.badge}>
            <SymbolView
              tintColor={theme.textSecondary}
              name={{ ios: 'list.bullet.clipboard', android: 'assignment' }}
              size={14}
            />
            <ThemedText type="smallBold" themeColor="textSecondary">
              {TASKS.length} Tasks Due
            </ThemedText>
          </GlassView>
        </ThemedView>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          Today's Tasks
        </ThemedText>

        <ThemedView style={styles.taskList}>
          {TASKS.map((task) => (
            <GlassView key={task.id} style={styles.taskItem}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: 'circle', android: 'radio_button_unchecked' }}
                size={22}
              />
              <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
            </GlassView>
          ))}
        </ThemedView>
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
  },
  hero: {
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  greeting: {
    fontSize: 36,
    lineHeight: 44,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Spacing.five,
  },
  sectionLabel: {
    marginBottom: Spacing.three,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 2,
    borderRadius: Spacing.three,
  },
  taskTitle: {
    flex: 1,
  },
});

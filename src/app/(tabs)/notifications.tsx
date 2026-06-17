import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const NOTIFICATIONS = [
  {
    id: '1',
    icon: Platform.OS === 'ios' ? 'checkmark.circle.fill' : 'check_circle',
    iconColor: '#34c759',
    title: 'Task completed',
    subtitle: 'You finished "Update Website"',
    time: '2m ago',
  },
  {
    id: '2',
    icon: Platform.OS === 'ios' ? 'bell.fill' : 'notifications',
    iconColor: '#3c87f7',
    title: 'Reminder',
    subtitle: 'Marketing meeting at 3 PM',
    time: '1h ago',
  },
  {
    id: '3',
    icon: Platform.OS === 'ios' ? 'person.fill' : 'person',
    iconColor: '#f7a83c',
    title: 'New team member',
    subtitle: 'Sarah joined "Marketing"',
    time: '3h ago',
  },
  {
    id: '4',
    icon: Platform.OS === 'ios' ? 'doc.fill' : 'description',
    iconColor: '#7c3cf7',
    title: 'New assignment',
    subtitle: 'CS project due next week',
    time: '1d ago',
  },
];

export default function NotificationsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

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
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Notifications
          </ThemedText>
          <ThemedText themeColor="textSecondary">You have {NOTIFICATIONS.length} new</ThemedText>
        </ThemedView>

        <ThemedView style={styles.notificationList}>
          {NOTIFICATIONS.map((notification, index) => (
            <GlassView key={notification.id} style={styles.notificationItem}>
              <ThemedView
                style={[
                  styles.notificationIcon,
                  { backgroundColor: notification.iconColor + '20' },
                ]}>
                <SymbolView
                  tintColor={notification.iconColor}
                  name={notification.icon as any}
                  size={20}
                />
              </ThemedView>
              <ThemedView style={styles.notificationContent}>
                <ThemedView style={styles.notificationTop}>
                  <ThemedText type="default" style={styles.notificationTitle}>
                    {notification.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {notification.time}
                  </ThemedText>
                </ThemedView>
                <ThemedText type="small" themeColor="textSecondary">
                  {notification.subtitle}
                </ThemedText>
              </ThemedView>
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
  header: {
    marginBottom: Spacing.five,
  },
  headerTitle: {
    fontSize: 36,
    lineHeight: 44,
  },
  notificationList: {
    gap: Spacing.two,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 2,
    borderRadius: Spacing.three,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTitle: {
    fontWeight: 600,
  },
});

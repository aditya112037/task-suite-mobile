import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS: Record<string, string> = {
  index: '\u{1F3E0}',
  'remote-work': '\u2705',
  teams: '\u{1F465}',
  profile: '\u{1F464}',
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={TAB_ICONS['index']}>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="remote-work" href="/remote-work" asChild>
            <TabButton icon={TAB_ICONS['remote-work']}>Tasks</TabButton>
          </TabTrigger>
          <TabTrigger name="teams" href="/teams" asChild>
            <TabButton icon={TAB_ICONS['teams']}>Teams</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon={TAB_ICONS['profile']}>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="caption">{icon}</ThemedText>
        <ThemedText type={isFocused ? 'captionBold' : 'caption'} themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children as string}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: theme.cardBorder }]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    pointerEvents: 'box-none',
  },
  innerContainer: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    pointerEvents: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    minWidth: 72,
    alignItems: 'center',
    gap: 2,
  },
});

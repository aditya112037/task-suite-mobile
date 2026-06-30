import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Overview</TabButton>
          </TabTrigger>
          <TabTrigger name="remote-work" href="/remote-work" asChild>
            <TabButton>My Tasks</TabButton>
          </TabTrigger>
          <TabTrigger name="teams" href="/teams" asChild>
            <TabButton>Teams</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 430 || height < 780;

  return (
    <View {...props} style={[styles.tabListContainer, isCompact ? styles.tabListContainerCompact : null]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, isCompact ? styles.innerContainerCompact : null, { borderColor: theme.cardBorder }]}>
        <ThemedText type="smallBold" style={[styles.brandText, isCompact ? styles.brandTextCompact : null, { color: theme.primary }]}>
          Task Suite
        </ThemedText>

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
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    pointerEvents: 'box-none',
  },
  tabListContainerCompact: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: 720,
    borderWidth: 1,
    pointerEvents: 'auto',
  },
  innerContainerCompact: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    gap: 6,
  },
  brandText: {
    marginRight: 'auto',
    paddingLeft: Spacing.one,
  },
  brandTextCompact: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    minWidth: 88,
    alignItems: 'center',
  },
});

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.tabSurface}
      iconColor={colors.textSecondary}
      tintColor={colors.primary}
      indicatorColor={colors.primary}
      labelStyle={{
        selected: { color: colors.text, fontWeight: '700' },
        default: { color: colors.textSecondary },
      }}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md={{ default: "dashboard", selected: "dashboard" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="remote-work">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "checklist", selected: "checklist.checked" }}
          md={{ default: "checklist", selected: "checklist" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="teams">
        <NativeTabs.Trigger.Label>Teams</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.3", selected: "person.3.fill" }}
          md={{ default: "groups", selected: "groups" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          md={{ default: "account_circle", selected: "account_circle" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

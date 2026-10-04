import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useAppInsets } from '@/components/insets';
import { colors } from '@/components/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Tab bar height above the navigation bar, and the gap kept below the labels. */
const TAB_BAR_HEIGHT = 64;
const LABEL_GAP = 8;

function tabIcon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <MaterialCommunityIcons name={focused ? focusedName : name} size={26} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { bottom } = useAppInsets();
  return (
    <Tabs
      safeAreaInsets={{ bottom }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        // The tab bar's white background runs under the (scrim-free) navigation
        // buttons; the icons and labels stay above them with a small gap.
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + bottom,
          paddingBottom: bottom + LABEL_GAP,
          paddingTop: 6,
          backgroundColor: colors.card,
        },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Devices', tabBarIcon: tabIcon('power-plug-outline', 'power-plug') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tasks', tabBarIcon: tabIcon('checkbox-marked-circle-outline', 'checkbox-marked-circle') }}
      />
      <Tabs.Screen
        name="visitor"
        options={{ title: 'Visitor Code', tabBarIcon: tabIcon('gate', 'gate-open') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('cog-outline', 'cog') }}
      />
    </Tabs>
  );
}

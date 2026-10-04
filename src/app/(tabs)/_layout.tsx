import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';

import { useAppInsets } from '@/components/insets';
import { colors } from '@/components/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color }}>{symbol}</Text>;
}

export default function TabsLayout() {
  const insets = useAppInsets();
  return (
    <Tabs
      safeAreaInsets={{ bottom: insets.bottom }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Devices', tabBarIcon: ({ color }) => <TabIcon symbol="⏻" color={color} /> }}
      />
      <Tabs.Screen
        name="visitor"
        options={{ title: 'Visitor Code', tabBarIcon: ({ color }) => <TabIcon symbol="⌘" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon symbol="⚙" color={color} /> }}
      />
    </Tabs>
  );
}

import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';

import { colors } from '@/components/theme';
import { AppStateProvider } from '@/state/stores';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="device/[id]" options={{ title: 'Schedule' }} />
      </Stack>
    </AppStateProvider>
  );
}

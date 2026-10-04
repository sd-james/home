import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/components/theme';
import { applyUpdateOnLaunch } from '@/lib/updates';
import { HouseholdProvider } from '@/state/household';
import { AppStateProvider } from '@/state/stores';

export default function RootLayout() {
  // Fetch and apply a newer update as soon as the app opens.
  useEffect(applyUpdateOnLaunch, []);

  return (
    <AppStateProvider>
      <HouseholdProvider>
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
      </HouseholdProvider>
    </AppStateProvider>
  );
}

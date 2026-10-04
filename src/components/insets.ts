import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * Safe-area insets for laying out the app's edges. Android reports the
 * navigation bar correctly (48dp for the Pixel's 3-button bar, less for
 * gesture navigation); the grey band that looked like an overlap was the
 * system's contrast scrim, now turned off with expo-navigation-bar's
 * `enforceContrast: false` in app.json. Kept as one place to adjust insets.
 */
export function useAppInsets(): EdgeInsets {
  return useSafeAreaInsets();
}

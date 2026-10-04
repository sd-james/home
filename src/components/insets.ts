import { Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/** Height of Android's 3-button navigation bar, in dp. */
const ANDROID_NAV_BAR = 48;

/**
 * Safe-area insets with a guard for Android: when the app is drawn behind the
 * navigation bar but the bottom inset reads 0 (seen in Expo Go 58.0.2 on a
 * Pixel), fall back to the navigation bar's size. A real edge-to-edge Android
 * screen always has a bottom inset (≥24dp for gesture navigation), so this
 * does nothing when insets are reported correctly.
 */
export function useAppInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || insets.bottom > 0) return insets;
  const screen = Dimensions.get('screen').height;
  const window = Dimensions.get('window').height;
  const measured = Math.round(screen - window - (StatusBar.currentHeight ?? 0));
  return { ...insets, bottom: measured > 0 ? measured : ANDROID_NAV_BAR };
}

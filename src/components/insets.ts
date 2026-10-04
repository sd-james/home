import { Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/** Height of Android's 3-button navigation bar, in dp. */
const ANDROID_NAV_BAR = 48;

/**
 * Safe-area insets with a fallback for Android Expo Go, which can report a
 * bottom inset of 0 even though the app is drawn behind the navigation bar
 * (seen on a Pixel with Expo Go 58.0.2). A real edge-to-edge Android screen
 * always has a bottom inset (≥24dp for gesture navigation), so 0 means the
 * value was lost; use the navigation bar's size instead.
 */
export function useAppInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || insets.bottom > 0) return insets;
  const screen = Dimensions.get('screen').height;
  const window = Dimensions.get('window').height;
  const measured = Math.round(screen - window - (StatusBar.currentHeight ?? 0));
  return { ...insets, bottom: measured > 0 ? measured : ANDROID_NAV_BAR };
}

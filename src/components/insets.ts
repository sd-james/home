import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/** Height of Android's 3-button navigation bar, in dp. */
const ANDROID_NAV_BAR = 48;

/**
 * Safe-area insets that keep content clear of Android's navigation bar. On
 * the Pixel (Android 16, 3-button navigation) the reported bottom inset is
 * too small, so the tab bar ended up under the back/home buttons, both in
 * Expo Go and in our own build. On Android the bottom inset is therefore at
 * least the 3-button bar's height (gesture navigation gets a little extra
 * space).
 */
export function useAppInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return insets;
  return { ...insets, bottom: Math.max(insets.bottom, ANDROID_NAV_BAR) };
}

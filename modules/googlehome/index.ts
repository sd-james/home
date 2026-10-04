/**
 * JS side of the local `GoogleHome` Kotlin module (modules/googlehome/android),
 * a thin wrapper around Google's Home APIs for Android. Android only; on other
 * platforms or builds without the module, `isGoogleHomeModuleAvailable` is false.
 */
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { Platform } from 'react-native';

export type GoogleHomeDevice = {
  /** Google Home's device id (stable). */
  id: string;
  name: string;
  /** Room name, or "" when the device isn't in a room. */
  room: string;
  /** Home (structure) name. */
  home: string;
  /** Current on/off state, or null when it couldn't be read. */
  on: boolean | null;
};

export type GoogleHomePermission = 'granted' | 'not_granted' | 'unavailable';

declare class GoogleHomeModule extends NativeModule {
  isAvailable(): boolean;
  getPermissionState(): Promise<GoogleHomePermission>;
  requestPermissions(force: boolean): Promise<'granted' | 'cancelled'>;
  listDevices(): Promise<GoogleHomeDevice[]>;
  setOnOff(deviceId: string, on: boolean): Promise<void>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<GoogleHomeModule>('GoogleHome') : null;

export const isGoogleHomeModuleAvailable = native !== null;

function requireNative(): GoogleHomeModule {
  if (!native) throw new Error('Google Home isn’t available in this build.');
  return native;
}

/** False when Google Play services is missing or out of date. */
export function isGoogleHomeAvailable(): boolean {
  return native?.isAvailable() ?? false;
}

export function getPermissionState(): Promise<GoogleHomePermission> {
  return requireNative().getPermissionState();
}

/** Shows Google's consent screen. `force` re-opens it to change the home or devices. */
export function requestPermissions(force = false): Promise<'granted' | 'cancelled'> {
  return requireNative().requestPermissions(force);
}

/** Devices that can switch on/off, sorted by room then name. */
export function listDevices(): Promise<GoogleHomeDevice[]> {
  return requireNative().listDevices();
}

export function setOnOff(deviceId: string, on: boolean): Promise<void> {
  return requireNative().setOnOff(deviceId, on);
}

// @firebase/auth lists its browser types before its "react-native" ones, so
// TypeScript misses the React Native-only export that Metro does load.
import type { Persistence } from '@firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}

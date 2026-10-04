import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Updater<T> = T | ((current: T) => T);

export type PersistedStore<T> = {
  value: T;
  set: (next: Updater<T>) => void;
  /** False until the saved value has been read from the phone. */
  loaded: boolean;
};

/**
 * Creates a React context whose value is saved to AsyncStorage on every
 * change. `revive` turns whatever was stored (possibly from an older app
 * version) into a valid value.
 */
export function createPersistedStore<T>(key: string, initial: T, revive: (stored: unknown) => T) {
  const Context = createContext<PersistedStore<T> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [value, setValue] = useState<T>(initial);
    const [loaded, setLoaded] = useState(false);
    const latest = useRef(value);

    useEffect(() => {
      let cancelled = false;
      AsyncStorage.getItem(key)
        .then((raw) => {
          if (cancelled || raw === null) return;
          const next = revive(JSON.parse(raw));
          latest.current = next;
          setValue(next);
        })
        .catch((e) => console.warn(`Couldn't load ${key}`, e))
        .finally(() => !cancelled && setLoaded(true));
      return () => {
        cancelled = true;
      };
    }, []);

    const set = useCallback((next: Updater<T>) => {
      const resolved =
        typeof next === 'function' ? (next as (current: T) => T)(latest.current) : next;
      latest.current = resolved;
      setValue(resolved);
      AsyncStorage.setItem(key, JSON.stringify(resolved)).catch((e) =>
        console.warn(`Couldn't save ${key}`, e)
      );
    }, []);

    return <Context.Provider value={{ value, set, loaded }}>{children}</Context.Provider>;
  }

  function useStore(): PersistedStore<T> {
    const store = useContext(Context);
    if (!store) throw new Error(`${key} store used outside its provider`);
    return store;
  }

  return { Provider, useStore };
}

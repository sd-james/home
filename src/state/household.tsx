/**
 * The shared household: sign-in, membership, live household and tasks, and
 * push registration. Screens use `useHousehold()`.
 */
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import {
  saveDevice,
  watchHousehold,
  watchMembership,
  watchTasks,
  type Household,
} from '@/lib/householdApi';
import { getDeviceId, registerForPush, routeFromNotification } from '@/lib/notifications';
import type { Task } from '@/lib/tasks';

export type HouseholdState =
  | { status: 'not-configured' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-household'; uid: string }
  | { status: 'ready'; uid: string; household: Household; tasks: Task[]; pushError: string | null };

const Context = createContext<HouseholdState>({ status: 'loading' });

export function useHousehold(): HouseholdState {
  return useContext(Context);
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null | undefined>(undefined);
  const [household, setHousehold] = useState<Household | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const router = useRouter();

  // Sign in, then follow which household this person belongs to.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        setUid(user.uid);
        stop = watchMembership(user.uid, setHouseholdId, (e) => setError(message(e)));
      })
      .catch((e) => !cancelled && setError(message(e)));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // Live household and tasks.
  useEffect(() => {
    if (!householdId) return;
    const onError = (e: Error) => setError(message(e));
    const stopHousehold = watchHousehold(householdId, setHousehold, onError);
    const stopTasks = watchTasks(householdId, setTasks, onError);
    return () => {
      stopHousehold();
      stopTasks();
    };
  }, [householdId]);

  // Register this phone for the household's notifications.
  useEffect(() => {
    if (!householdId || !uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPush();
        if (cancelled) return;
        if (!token) {
          setPushError('Notifications are turned off for Home.');
          return;
        }
        await saveDevice(householdId, await getDeviceId(), uid, token);
        if (!cancelled) setPushError(null);
      } catch (e) {
        if (!cancelled) setPushError(`Couldn’t set up notifications: ${message(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [householdId, uid]);

  // Tapping a notification opens the screen it's about.
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const route = routeFromNotification(response);
      if (!route) return;
      // On a cold start the navigator may not be mounted yet; try again shortly.
      const go = (retry: boolean) => {
        try {
          router.navigate(route as never);
        } catch {
          if (retry) setTimeout(() => go(false), 500);
        }
      };
      setTimeout(() => go(true), 0);
    };
    // A notification that opened the app (cleared so a reload doesn't reopen it).
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      Notifications.clearLastNotificationResponse();
      open(last);
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);

  let state: HouseholdState;
  if (!isFirebaseConfigured) state = { status: 'not-configured' };
  else if (error) state = { status: 'error', message: error };
  else if (!uid || householdId === undefined) state = { status: 'loading' };
  else if (householdId === null) state = { status: 'no-household', uid };
  else if (!household || household.id !== householdId) state = { status: 'loading' };
  else state = { status: 'ready', uid, household, tasks, pushError };

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

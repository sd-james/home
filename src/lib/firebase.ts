/**
 * Firebase (JS SDK) for the household features: anonymous sign-in kept on the
 * phone, Firestore, and the Cloud Functions in firebase/functions.
 */
import { getReactNativePersistence, initializeAuth, signInAnonymously, type Auth, type User } from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

import { FIREBASE_CONFIG, FUNCTIONS_REGION } from './firebaseConfig';

export const isFirebaseConfigured = FIREBASE_CONFIG !== null;

type Services = { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions };
let services: Services | null = null;

export function firebase(): Services {
  if (!FIREBASE_CONFIG) throw new Error('The household backend isn’t set up yet.');
  if (!services) {
    const app = initializeApp(FIREBASE_CONFIG);
    services = {
      app,
      auth: initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }),
      db: initializeFirestore(app, { experimentalAutoDetectLongPolling: true }),
      functions: getFunctions(app, FUNCTIONS_REGION),
    };
  }
  return services;
}

/** Signs in invisibly (once per install); the account identifies this phone's person. */
export async function ensureSignedIn(): Promise<User> {
  const { auth } = firebase();
  await auth.authStateReady();
  return auth.currentUser ?? (await signInAnonymously(auth)).user;
}

/** Calls a Cloud Function, turning its error into a readable message. */
export async function callFunction<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  try {
    const result = await httpsCallable<Record<string, unknown>, T>(firebase().functions, name)(data);
    return result.data;
  } catch (e) {
    // Firebase may append a status like " [404]"; the rest is the function's own message.
    throw new Error(e instanceof Error ? e.message.replace(/\s*\[\d+\]$/, '') : String(e));
  }
}

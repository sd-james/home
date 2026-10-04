/**
 * The Firebase project's web app config (Firebase console → Project settings →
 * Your apps → Web app → SDK setup and configuration → Config). These values
 * identify the project; they aren't secrets. Access is controlled by the
 * Firestore rules in firebase/firestore.rules.
 *
 * null until the household backend is set up; the Tasks tab says so.
 */
export const FIREBASE_CONFIG: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
} | null = null;

/** Where the Cloud Functions run (firebase/functions/src/index.ts setGlobalOptions). */
export const FUNCTIONS_REGION = 'europe-west1';

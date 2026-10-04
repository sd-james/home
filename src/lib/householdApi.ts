/**
 * Reading and writing the shared household data in Firestore. Households and
 * members are changed through Cloud Functions; tasks and push tokens are
 * written directly (allowed by firebase/firestore.rules).
 */
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';

import { callFunction, firebase } from './firebase';
import { nextOccurrence, remindAtFor, type Repeat, type Task, type TaskDraft } from './tasks';

export type Member = { id: string; name: string };

export type Household = {
  id: string;
  name: string;
  joinCode: string;
  members: Member[];
};

const toDate = (value: unknown): Date | null => (value instanceof Timestamp ? value.toDate() : null);
const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

function toHousehold(id: string, data: DocumentData): Household {
  const members = (data.members ?? {}) as Record<string, { name?: string }>;
  return {
    id,
    name: str(data.name, 'Our home'),
    joinCode: str(data.joinCode),
    members: ((data.memberIds ?? []) as string[]).map((uid) => ({ id: uid, name: members[uid]?.name ?? 'Someone' })),
  };
}

function toTask(id: string, data: DocumentData): Task {
  const repeat = ['daily', 'weekly', 'monthly'].includes(data.repeat) ? (data.repeat as Repeat) : 'none';
  return {
    id,
    title: str(data.title),
    notes: str(data.notes),
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : null,
    remindAt: toDate(data.remindAt),
    reminderPending: data.reminderPending === true,
    assigneeId: typeof data.assigneeId === 'string' ? data.assigneeId : null,
    repeat,
    done: data.done === true,
    doneBy: typeof data.doneBy === 'string' ? data.doneBy : null,
    doneAt: toDate(data.doneAt),
    createdBy: str(data.createdBy),
    createdAt: toDate(data.createdAt),
  };
}

// --- Live data ---------------------------------------------------------------

/** Calls back with the user's household id (or null) whenever it changes. */
export function watchMembership(uid: string, onChange: (householdId: string | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    doc(firebase().db, 'users', uid),
    (snap) => onChange(str(snap.get('householdId')) || null),
    onError
  );
}

export function watchHousehold(householdId: string, onChange: (h: Household | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    doc(firebase().db, 'households', householdId),
    (snap) => onChange(snap.exists() ? toHousehold(snap.id, snap.data()) : null),
    onError
  );
}

export function watchTasks(householdId: string, onChange: (tasks: Task[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    collection(firebase().db, 'households', householdId, 'tasks'),
    (snap) => onChange(snap.docs.map((d) => toTask(d.id, d.data()))),
    onError
  );
}

// --- Households (Cloud Functions) ---------------------------------------------

export const createHousehold = (name: string, memberName: string) =>
  callFunction<{ householdId: string; joinCode: string }>('createHousehold', { name, memberName });

export const joinHousehold = (code: string, memberName: string) =>
  callFunction<{ householdId: string }>('joinHousehold', { code, memberName });

export const leaveHousehold = () => callFunction('leaveHousehold');

export const updateHousehold = (changes: { memberName?: string; householdName?: string }) =>
  callFunction('updateHousehold', changes);

// --- Tasks ---------------------------------------------------------------------

function draftFields(draft: TaskDraft, now: Date) {
  const remindAt = remindAtFor(draft.dueDate, draft.remindTime, now);
  return {
    title: draft.title.trim(),
    notes: draft.notes.trim(),
    dueDate: draft.dueDate,
    remindAt: remindAt ? Timestamp.fromDate(remindAt) : null,
    // Only future reminders are sent.
    reminderPending: remindAt !== null && remindAt.getTime() > now.getTime(),
    assigneeId: draft.assigneeId,
    repeat: draft.repeat,
  };
}

const tasksOf = (householdId: string) => collection(firebase().db, 'households', householdId, 'tasks');

export async function addTask(householdId: string, uid: string, draft: TaskDraft): Promise<void> {
  await addDoc(tasksOf(householdId), {
    ...draftFields(draft, new Date()),
    done: false,
    doneBy: null,
    doneAt: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(householdId: string, taskId: string, draft: TaskDraft): Promise<void> {
  await updateDoc(doc(tasksOf(householdId), taskId), { ...draftFields(draft, new Date()), updatedAt: serverTimestamp() });
}

/**
 * Ticks a task off (or back on). A repeating task instead moves to its next
 * date and stays open, remembering who did it last.
 */
export async function setTaskDone(householdId: string, task: Task, uid: string, done: boolean): Promise<void> {
  const ref = doc(tasksOf(householdId), task.id);
  const now = new Date();
  const next = done ? nextOccurrence(task, now) : null;
  if (next) {
    await updateDoc(ref, {
      dueDate: next.dueDate,
      remindAt: next.remindAt ? Timestamp.fromDate(next.remindAt) : null,
      reminderPending: next.remindAt !== null,
      lastDoneBy: uid,
      lastDoneAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await updateDoc(ref, {
    done,
    doneBy: done ? uid : null,
    doneAt: done ? serverTimestamp() : null,
    // Re-opening a task with a future reminder re-arms it.
    reminderPending: !done && task.remindAt !== null && task.remindAt.getTime() > now.getTime(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(householdId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(tasksOf(householdId), taskId));
}

// --- Push tokens ---------------------------------------------------------------

/** Saves this phone's push token so the household's notifications reach it. */
export async function saveDevice(householdId: string, deviceId: string, uid: string, token: string): Promise<void> {
  await setDoc(doc(firebase().db, 'households', householdId, 'devices', deviceId), {
    uid,
    token,
    updatedAt: serverTimestamp(),
  });
}

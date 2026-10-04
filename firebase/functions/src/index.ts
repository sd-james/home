/**
 * Cloud Functions for household tasks and reminders.
 *
 * Firestore layout (rules in ../firestore.rules):
 *   users/{uid}                     { householdId }                     (written here only)
 *   joinCodes/{code}                { householdId }                     (written here only)
 *   households/{hid}                { name, joinCode, memberIds, members: {uid: {name, joinedAt}} }
 *   households/{hid}/tasks/{tid}    written by the app (see src/lib/tasks.ts)
 *   households/{hid}/devices/{id}   { uid, token, updatedAt }           Expo push tokens
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { sendPush } from './expoPush.js';
import { generateJoinCode, normalizeJoinCode } from './joinCode.js';

setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

initializeApp();
const db = getFirestore();

const MAX_MEMBERS = 12;

function requireUid(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return request.auth.uid;
}

function cleanName(value: unknown, fallback: string): string {
  const name = typeof value === 'string' ? value.trim().slice(0, 40) : '';
  return name || fallback;
}

/** Removes the user from their current household (deleting it when empty). */
async function leaveCurrentHousehold(uid: string): Promise<void> {
  const user = await db.doc(`users/${uid}`).get();
  const householdId = user.get('householdId') as string | undefined;
  if (!householdId) return;
  const ref = db.doc(`households/${householdId}`);
  await db.runTransaction(async (tx) => {
    const household = await tx.get(ref);
    tx.delete(db.doc(`users/${uid}`));
    if (!household.exists) return;
    const memberIds = (household.get('memberIds') as string[]).filter((id) => id !== uid);
    if (memberIds.length === 0) {
      tx.delete(ref);
      tx.delete(db.doc(`joinCodes/${household.get('joinCode')}`));
    } else {
      tx.update(ref, { memberIds, [`members.${uid}`]: FieldValue.delete() });
    }
  });
  // This person's phones shouldn't get the household's notifications any more.
  const devices = await ref.collection('devices').where('uid', '==', uid).get();
  await Promise.all(devices.docs.map((d) => d.ref.delete()));
}

/** Creates a household with the caller as its first member. */
export const createHousehold = onCall(async (request) => {
  const uid = requireUid(request);
  const name = cleanName(request.data?.name, 'Our home');
  const memberName = cleanName(request.data?.memberName, 'Me');
  await leaveCurrentHousehold(uid);

  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    const householdRef = db.collection('households').doc();
    try {
      await db.runTransaction(async (tx) => {
        const codeRef = db.doc(`joinCodes/${joinCode}`);
        if ((await tx.get(codeRef)).exists) throw new Error('code-taken');
        tx.create(codeRef, { householdId: householdRef.id });
        tx.create(householdRef, {
          name,
          joinCode,
          memberIds: [uid],
          members: { [uid]: { name: memberName, joinedAt: Timestamp.now() } },
          createdAt: Timestamp.now(),
        });
        tx.set(db.doc(`users/${uid}`), { householdId: householdRef.id });
      });
      return { householdId: householdRef.id, joinCode };
    } catch (e) {
      if (e instanceof Error && e.message === 'code-taken') continue;
      throw e;
    }
  }
  throw new HttpsError('internal', 'Couldn’t create a join code. Try again.');
});

/** Adds the caller to the household with this join code. */
export const joinHousehold = onCall(async (request) => {
  const uid = requireUid(request);
  const code = normalizeJoinCode(String(request.data?.code ?? ''));
  if (!code) throw new HttpsError('invalid-argument', 'That isn’t a valid join code.');
  const memberName = cleanName(request.data?.memberName, 'Me');

  const codeDoc = await db.doc(`joinCodes/${code}`).get();
  if (!codeDoc.exists) throw new HttpsError('not-found', 'No household has that join code.');
  const householdId = codeDoc.get('householdId') as string;

  const current = await db.doc(`users/${uid}`).get();
  if (current.get('householdId') !== householdId) await leaveCurrentHousehold(uid);

  const ref = db.doc(`households/${householdId}`);
  await db.runTransaction(async (tx) => {
    const household = await tx.get(ref);
    if (!household.exists) throw new HttpsError('not-found', 'That household no longer exists.');
    const memberIds = household.get('memberIds') as string[];
    if (!memberIds.includes(uid) && memberIds.length >= MAX_MEMBERS) {
      throw new HttpsError('resource-exhausted', 'That household is full.');
    }
    tx.update(ref, {
      memberIds: FieldValue.arrayUnion(uid),
      [`members.${uid}`]: { name: memberName, joinedAt: Timestamp.now() },
    });
    tx.set(db.doc(`users/${uid}`), { householdId });
  });
  return { householdId };
});

export const leaveHousehold = onCall(async (request) => {
  await leaveCurrentHousehold(requireUid(request));
  return { ok: true };
});

/** Changes the caller's display name and/or the household's name. */
export const updateHousehold = onCall(async (request) => {
  const uid = requireUid(request);
  const user = await db.doc(`users/${uid}`).get();
  const householdId = user.get('householdId') as string | undefined;
  if (!householdId) throw new HttpsError('failed-precondition', 'You’re not in a household.');
  const changes: DocumentData = {};
  if (typeof request.data?.memberName === 'string') {
    changes[`members.${uid}.name`] = cleanName(request.data.memberName, 'Me');
  }
  if (typeof request.data?.householdName === 'string') {
    changes.name = cleanName(request.data.householdName, 'Our home');
  }
  if (Object.keys(changes).length) await db.doc(`households/${householdId}`).update(changes);
  return { ok: true };
});

type Household = { name: string; memberIds: string[]; members: Record<string, { name: string }> };

/** Sends a notification to the given members' phones and forgets dead tokens. */
async function notifyMembers(
  householdId: string,
  uids: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (uids.length === 0) return;
  const devices = await db.collection(`households/${householdId}/devices`).get();
  const targets = devices.docs.filter((d) => uids.includes(d.get('uid')));
  if (targets.length === 0) return;
  const invalid = await sendPush(targets.map((d) => ({ to: d.get('token') as string, title, body, data })));
  await Promise.all(targets.filter((d) => invalid.includes(d.get('token'))).map((d) => d.ref.delete()));
}

/** Tells the rest of the household about a new task. */
export const onTaskCreated = onDocumentCreated('households/{householdId}/tasks/{taskId}', async (event) => {
  const task = event.data?.data();
  if (!task) return;
  const household = (await db.doc(`households/${event.params.householdId}`).get()).data() as Household | undefined;
  if (!household) return;
  const creator = household.members[task.createdBy]?.name ?? 'Someone';
  const assignee = task.assigneeId ? household.members[task.assigneeId]?.name : null;
  const recipients = household.memberIds.filter((id) => id !== task.createdBy);
  await notifyMembers(
    event.params.householdId,
    recipients,
    assignee ? `${creator} added a task for ${assignee}` : `${creator} added a task`,
    task.title,
    { url: '/tasks', taskId: event.params.taskId }
  );
});

/**
 * Every minute: sends reminders that are due. A reminder goes to the
 * assignee, or to everyone when the task isn't assigned.
 */
export const sendDueReminders = onSchedule('every 1 minutes', async () => {
  const due = await db
    .collectionGroup('tasks')
    .where('reminderPending', '==', true)
    .where('remindAt', '<=', Timestamp.now())
    .limit(200)
    .get();

  for (const doc of due.docs) {
    const householdId = doc.ref.parent.parent?.id;
    const task = doc.data();
    // Claim it first so a slow run can't send it twice.
    await doc.ref.update({ reminderPending: false });
    if (!householdId || task.done) continue;
    const household = (await db.doc(`households/${householdId}`).get()).data() as Household | undefined;
    if (!household) continue;
    const recipients =
      task.assigneeId && household.memberIds.includes(task.assigneeId) ? [task.assigneeId] : household.memberIds;
    await notifyMembers(householdId, recipients, 'Reminder', task.title, { url: '/tasks', taskId: doc.id });
  }
});

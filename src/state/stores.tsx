import type { ReactNode } from 'react';

import { DAYS, normalizeTime } from '@/lib/days';
import { normalizeEvents } from '@/lib/schedule';
import { DEFAULT_SETTINGS, clampUses } from '@/lib/settings';
import type { Day, Device, ScheduleEvent, Settings, VisitorCode } from '@/lib/types';
import { isStillValid } from '@/lib/visitorCode';

import { createPersistedStore } from './createPersistedStore';

// Bump a key's version only when stored data can't be revived any more.
const DEVICES_KEY = 'home.devices.v1';
const SETTINGS_KEY = 'home.settings.v1';
const VISITOR_CODES_KEY = 'home.visitorCodes.v1';

const MAX_RECENT_CODES = 30;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

function reviveEvent(v: unknown): ScheduleEvent | null {
  if (!isObject(v)) return null;
  const time = normalizeTime(str(v.time));
  const days = Array.isArray(v.days) ? v.days.filter((d): d is Day => DAYS.includes(d as Day)) : [];
  if (!time || typeof v.on !== 'boolean') return null;
  return { id: str(v.id) || `${time}-${v.on}`, time, on: v.on, days };
}

function reviveDevices(stored: unknown): Device[] {
  if (!Array.isArray(stored)) return [];
  return stored.filter(isObject).map((d) => ({
    id: str(d.id),
    name: str(d.name),
    room: str(d.room),
    events: normalizeEvents(
      (Array.isArray(d.events) ? d.events : []).map(reviveEvent).filter((e): e is ScheduleEvent => !!e)
    ),
  }));
}

function reviveSettings(stored: unknown): Settings {
  if (!isObject(stored)) return DEFAULT_SETTINGS;
  return {
    estateNumber: str(stored.estateNumber, DEFAULT_SETTINGS.estateNumber),
    requestFormat: str(stored.requestFormat, DEFAULT_SETTINGS.requestFormat),
    defaultUses:
      typeof stored.defaultUses === 'number' ? clampUses(stored.defaultUses) : DEFAULT_SETTINGS.defaultUses,
    visitorTemplate: str(stored.visitorTemplate, DEFAULT_SETTINGS.visitorTemplate),
  };
}

function reviveVisitorCodes(stored: unknown): VisitorCode[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(isObject)
    .filter((c) => typeof c.code === 'string')
    .map((c) => ({
      id: str(c.id) || str(c.code),
      code: str(c.code),
      uses: typeof c.uses === 'number' ? c.uses : null,
      expiresAt: typeof c.expiresAt === 'string' ? c.expiresAt : null,
      expiryText: typeof c.expiryText === 'string' ? c.expiryText : null,
      requestedAt: str(c.requestedAt, new Date(0).toISOString()),
    }))
    .filter((c) => isStillValid(c))
    .slice(0, MAX_RECENT_CODES);
}

const devices = createPersistedStore<Device[]>(DEVICES_KEY, [], reviveDevices);
const settings = createPersistedStore<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS, reviveSettings);
const visitorCodes = createPersistedStore<VisitorCode[]>(VISITOR_CODES_KEY, [], reviveVisitorCodes);

export const useDevicesStore = devices.useStore;
export const useSettingsStore = settings.useStore;
export const useVisitorCodesStore = visitorCodes.useStore;

/** Adds a code to the front of the recent list, replacing an identical one and dropping expired ones. */
export function withRecentCode(list: VisitorCode[], code: VisitorCode): VisitorCode[] {
  const rest = list.filter(
    (c) => isStillValid(c) && !(c.code === code.code && c.expiresAt === code.expiresAt)
  );
  return [code, ...rest].slice(0, MAX_RECENT_CODES);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  return (
    <settings.Provider>
      <devices.Provider>
        <visitorCodes.Provider>{children}</visitorCodes.Provider>
      </devices.Provider>
    </settings.Provider>
  );
}

export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

/**
 * One switch time for a device. Events are kept unique per (time, on): two
 * events with the same time and action are merged into one with both sets of
 * days, which also matches how they are exported to Google Home.
 */
export type ScheduleEvent = {
  id: string;
  /** 24-hour "HH:MM". */
  time: string;
  on: boolean;
  days: Day[];
};

export type Device = {
  id: string;
  /** Exact device name in Google Home, e.g. "Kettle". */
  name: string;
  /** Google Home room, e.g. "Kitchen". May be empty. */
  room: string;
  events: ScheduleEvent[];
};

export type Settings = {
  estateNumber: string;
  /** SMS sent to the estate; {uses} is replaced with the number of uses. */
  requestFormat: string;
  defaultUses: number;
  /** Message sent to visitors; supports {code}, {uses} and {expiry}. */
  visitorTemplate: string;
};

export type VisitorCode = {
  id: string;
  code: string;
  uses: number | null;
  /** ISO timestamp, or null when the expiry couldn't be read. */
  expiresAt: string | null;
  /** Expiry exactly as written in the SMS, for display when parsing fails. */
  expiryText: string | null;
  /** When the code was added to the app (ISO timestamp). */
  requestedAt: string;
};

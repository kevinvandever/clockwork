import type { Contact } from "@clockwork/connector-core";

export interface DueTouch {
  contact: Contact;
  /** "birthday", "home anniversary", or "rotation". */
  reason: string;
}

export interface DueTouchOptions {
  today?: Date;
  /** Days since last contact that triggers a rotation touch (default 90). */
  rotationDays?: number;
  /** How many days ahead a key date counts as "upcoming" (default 7). */
  lookaheadDays?: number;
}

const DAY_MS = 86_400_000;

export function daysSince(iso: string, today: Date): number {
  return Math.floor((today.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** Days until the next annual occurrence of month/day (0 = today). */
export function daysUntilNextOccurrence(
  month: number,
  day: number,
  today: Date,
): number {
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  let next = Date.UTC(today.getUTCFullYear(), month - 1, day);
  if (next < start) {
    next = Date.UTC(today.getUTCFullYear() + 1, month - 1, day);
  }
  return Math.round((next - start) / DAY_MS);
}

export function needsRotation(
  contact: Contact,
  today: Date,
  rotationDays: number,
): boolean {
  if (!contact.lastContactedAt) {
    return true;
  }
  return daysSince(contact.lastContactedAt, today) >= rotationDays;
}

/** The label of an upcoming key date within the lookahead window, or null. */
export function upcomingDate(
  contact: Contact,
  today: Date,
  lookaheadDays: number,
): string | null {
  for (const d of contact.importantDates ?? []) {
    if (daysUntilNextOccurrence(d.month, d.day, today) <= lookaheadDays) {
      return d.label;
    }
  }
  return null;
}

/**
 * One touch per contact. An upcoming key date wins over rotation; contacts with
 * neither are skipped.
 */
export function computeDueTouches(
  contacts: Contact[],
  options: DueTouchOptions = {},
): DueTouch[] {
  const today = options.today ?? new Date();
  const rotationDays = options.rotationDays ?? 90;
  const lookaheadDays = options.lookaheadDays ?? 7;

  const touches: DueTouch[] = [];
  for (const contact of contacts) {
    const dateLabel = upcomingDate(contact, today, lookaheadDays);
    if (dateLabel) {
      touches.push({ contact, reason: dateLabel });
    } else if (needsRotation(contact, today, rotationDays)) {
      touches.push({ contact, reason: "rotation" });
    }
  }
  return touches;
}

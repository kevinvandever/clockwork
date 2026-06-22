/**
 * Internal cross-robot activity feed.
 *
 * This is the canonical record the Chief of Staff (Task 9) reads to build the
 * daily brief and oversight dashboard. It is distinct from `connector.logActivity`
 * (which writes to the CRM's own contact timeline) — see docs/DECISIONS.md D5.
 */

export interface ActivityInput {
  tenantId: string;
  /** Resolved persona name or robot key that performed the action. */
  robot: string;
  action: string;
  contactId?: string;
  /** Optional non-contact subject (e.g. an agentfolio property id). */
  subjectId?: string;
  outcome?: string;
  detail?: string;
  /** ISO-8601 timestamp; defaults to now on append. */
  at?: string;
}

export interface ActivityRecord {
  id: string;
  tenantId: string;
  robot: string;
  action: string;
  contactId?: string;
  subjectId?: string;
  outcome?: string;
  detail?: string;
  at: string;
}

export interface ActivityQuery {
  tenantId: string;
  robot?: string;
  /** Inclusive lower bound (ISO-8601). */
  since?: string;
  /** Inclusive upper bound (ISO-8601). */
  until?: string;
  limit?: number;
  /** Return newest-first (for dashboards). Default is chronological. */
  newestFirst?: boolean;
}

export type ActivityLogErrorCode = "invalid_input";

/** Local typed error (kept package-local per docs/DECISIONS.md D7). */
export class ActivityLogError extends Error {
  readonly code: ActivityLogErrorCode;

  constructor(code: ActivityLogErrorCode, message: string) {
    super(message);
    this.name = "ActivityLogError";
    this.code = code;
  }
}

export interface ActivityLog {
  append(input: ActivityInput): Promise<ActivityRecord>;
  query(filter: ActivityQuery): Promise<ActivityRecord[]>;
}

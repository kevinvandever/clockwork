import {
  ActivityLogError,
  type ActivityInput,
  type ActivityLog,
  type ActivityQuery,
  type ActivityRecord,
} from "./types.js";

/**
 * In-memory activity feed (Task 4). A Postgres-backed implementation replaces this
 * behind the same `ActivityLog` interface once Railway is provisioned
 * (docs/DECISIONS.md D6). Every record is tenant-tagged and queries require a
 * tenantId, so cross-tenant reads aren't expressible.
 */
export class InMemoryActivityLog implements ActivityLog {
  private readonly records: ActivityRecord[] = [];
  private seq = 0;

  async append(input: ActivityInput): Promise<ActivityRecord> {
    if (!input.tenantId) {
      throw new ActivityLogError("invalid_input", "tenantId is required");
    }
    if (!input.robot || !input.action) {
      throw new ActivityLogError(
        "invalid_input",
        "robot and action are required",
      );
    }

    this.seq += 1;
    const record: ActivityRecord = {
      id: `act_${this.seq}`,
      tenantId: input.tenantId,
      robot: input.robot,
      action: input.action,
      contactId: input.contactId,
      subjectId: input.subjectId,
      outcome: input.outcome,
      detail: input.detail,
      at: input.at ?? new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  async query(filter: ActivityQuery): Promise<ActivityRecord[]> {
    if (!filter.tenantId) {
      throw new ActivityLogError(
        "invalid_input",
        "tenantId is required to query the activity log",
      );
    }
    if (filter.limit !== undefined && filter.limit < 0) {
      throw new ActivityLogError("invalid_input", "limit must be >= 0");
    }

    let out = this.records.filter((r) => r.tenantId === filter.tenantId);

    if (filter.robot !== undefined) {
      out = out.filter((r) => r.robot === filter.robot);
    }
    if (filter.since !== undefined) {
      const since = filter.since;
      out = out.filter((r) => r.at >= since);
    }
    if (filter.until !== undefined) {
      const until = filter.until;
      out = out.filter((r) => r.at <= until);
    }

    // Chronological; stable sort preserves insertion order for equal timestamps.
    out = out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

    if (filter.newestFirst) {
      out.reverse();
    }
    if (filter.limit !== undefined) {
      out = out.slice(0, filter.limit);
    }
    return out;
  }
}

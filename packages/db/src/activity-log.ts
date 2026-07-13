import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  ActivityLogError,
  type ActivityInput,
  type ActivityLog,
  type ActivityQuery,
  type ActivityRecord,
} from "@clockwork/activity-log";

interface ActivityRow {
  id: string;
  tenant_id: string;
  robot: string;
  action: string;
  contact_id: string | null;
  subject_id: string | null;
  outcome: string | null;
  detail: string | null;
  at: string;
}

function toRecord(r: ActivityRow): ActivityRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    robot: r.robot,
    action: r.action,
    contactId: r.contact_id ?? undefined,
    subjectId: r.subject_id ?? undefined,
    outcome: r.outcome ?? undefined,
    detail: r.detail ?? undefined,
    at: r.at,
  };
}

/**
 * Postgres-backed internal activity feed. Same contract as InMemoryActivityLog:
 * tenantId required on append + query (cross-tenant reads inexpressible),
 * chronological by `at` with stable insertion order (tiebroken by `seq`).
 */
export class PostgresActivityLog implements ActivityLog {
  constructor(private readonly pool: Pool) {}

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
    const id = `act_${randomUUID()}`;
    const at = input.at ?? new Date().toISOString();
    const { rows } = await this.pool.query<ActivityRow>(
      `insert into activity_log
         (id, tenant_id, robot, action, contact_id, subject_id, outcome, detail, at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        id,
        input.tenantId,
        input.robot,
        input.action,
        input.contactId ?? null,
        input.subjectId ?? null,
        input.outcome ?? null,
        input.detail ?? null,
        at,
      ],
    );
    return toRecord(rows[0]);
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

    const conds: string[] = ["tenant_id = $1"];
    const params: unknown[] = [filter.tenantId];
    if (filter.robot !== undefined) {
      params.push(filter.robot);
      conds.push(`robot = $${params.length}`);
    }
    if (filter.since !== undefined) {
      params.push(filter.since);
      conds.push(`at >= $${params.length}`);
    }
    if (filter.until !== undefined) {
      params.push(filter.until);
      conds.push(`at <= $${params.length}`);
    }

    const direction = filter.newestFirst ? "desc" : "asc";
    let sql = `select * from activity_log where ${conds.join(" and ")}
       order by at ${direction}, seq ${direction}`;
    if (filter.limit !== undefined) {
      params.push(filter.limit);
      sql += ` limit $${params.length}`;
    }

    const { rows } = await this.pool.query<ActivityRow>(sql, params);
    return rows.map(toRecord);
  }
}

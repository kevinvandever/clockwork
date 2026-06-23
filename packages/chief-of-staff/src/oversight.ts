import type { ActivityLog, ActivityRecord } from "@clockwork/activity-log";

export interface RobotRollup {
  total: number;
  byAction: Record<string, number>;
}

export interface OversightSummary {
  tenantId: string;
  window: { since: string; until: string };
  totalEvents: number;
  byRobot: Record<string, RobotRollup>;
  /** Newest-first sample of recent events. */
  recent: ActivityRecord[];
}

export interface OversightInput {
  tenantId: string;
  /** Inclusive ISO-8601 window bounds. */
  since: string;
  until: string;
  /** How many recent events to include (default 5). */
  recentLimit?: number;
}

/**
 * Aggregate the activity log into the deterministic oversight dashboard for a
 * tenant over a window. No AI — pure rollups the brief writer summarizes.
 */
export async function buildOversight(
  activityLog: ActivityLog,
  input: OversightInput,
): Promise<OversightSummary> {
  const { tenantId, since, until, recentLimit = 5 } = input;
  const events = await activityLog.query({ tenantId, since, until });

  const byRobot: Record<string, RobotRollup> = {};
  for (const event of events) {
    const rollup = (byRobot[event.robot] ??= { total: 0, byAction: {} });
    rollup.total += 1;
    rollup.byAction[event.action] = (rollup.byAction[event.action] ?? 0) + 1;
  }

  const recent = [...events].reverse().slice(0, recentLimit);

  return {
    tenantId,
    window: { since, until },
    totalEvents: events.length,
    byRobot,
    recent,
  };
}

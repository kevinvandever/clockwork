import type { ActivityLog } from "@clockwork/activity-log";
import type { ResolvedPersona } from "@clockwork/config";
import { buildOversight, type OversightSummary } from "./oversight.js";
import type { Brief, BriefWriter } from "./writer.js";

export interface RunChiefOfStaffDeps {
  tenantId: string;
  activityLog: ActivityLog;
  persona: ResolvedPersona;
  writer: BriefWriter;
  /** Reference "now"; defaults to the current time. */
  now?: Date;
  /** Look-back window in hours (default 24). */
  windowHours?: number;
  recentLimit?: number;
}

export interface ChiefOfStaffRunResult {
  oversight: OversightSummary;
  brief: Brief;
}

/**
 * Run the Chief of Staff once: aggregate the activity log over the window, write
 * the synthesis brief, and record that the brief ran. Cadence is a Cowork
 * scheduled task in the real install; triggered on demand here.
 */
export async function runChiefOfStaff(
  deps: RunChiefOfStaffDeps,
): Promise<ChiefOfStaffRunResult> {
  const {
    tenantId,
    activityLog,
    persona,
    writer,
    now = new Date(),
    windowHours = 24,
    recentLimit,
  } = deps;

  const until = now.toISOString();
  const since = new Date(now.getTime() - windowHours * 3_600_000).toISOString();

  const oversight = await buildOversight(activityLog, {
    tenantId,
    since,
    until,
    recentLimit,
  });
  const brief = await writer.write(oversight, persona);

  // Record that Linda ran (after building oversight, so it doesn't count itself).
  await activityLog.append({
    tenantId,
    robot: persona.name,
    action: "daily_brief_generated",
    outcome: String(oversight.totalEvents),
    detail: `window=${windowHours}h`,
    at: new Date().toISOString(),
  });

  return { oversight, brief };
}

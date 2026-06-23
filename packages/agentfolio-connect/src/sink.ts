import type { ActivityLog } from "@clockwork/activity-log";
import type {
  AgentfolioEvent,
  AgentfolioEventSink,
} from "@clockwork/agentfolio-core";

/** The source label agentfolio activity appears under in the Chief of Staff brief. */
export const AGENTFOLIO_ROBOT_LABEL = "agentfolio";

/**
 * Bridges agentfolio's event sink to the shared activity log, so a connected
 * install surfaces board activity in Linda's daily brief. agentfolio-core and
 * activity-log stay independent — this package depends on both.
 */
export class ActivityLogEventSink implements AgentfolioEventSink {
  constructor(
    private readonly activityLog: ActivityLog,
    private readonly robotLabel: string = AGENTFOLIO_ROBOT_LABEL,
  ) {}

  async record(event: AgentfolioEvent): Promise<void> {
    await this.activityLog.append({
      tenantId: event.tenantId,
      robot: this.robotLabel,
      action: event.type,
      subjectId: event.propertyId,
      detail: event.detail,
      at: event.at,
    });
  }
}

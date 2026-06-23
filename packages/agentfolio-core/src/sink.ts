import type { AgentfolioEvent, AgentfolioEventSink } from "./types.js";

/** Default sink: agentfolio runs standalone, reporting nowhere. */
export class NoopEventSink implements AgentfolioEventSink {
  async record(_event: AgentfolioEvent): Promise<void> {
    // intentionally empty
  }
}

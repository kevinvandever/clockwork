import type { ResolvedPersona } from "@clockwork/config";
import type { OversightSummary } from "./oversight.js";
import type { Brief, BriefWriter } from "./writer.js";

/** Deterministic brief writer (default; tests + no-key demo). */
export class StubBriefWriter implements BriefWriter {
  async write(
    summary: OversightSummary,
    persona: ResolvedPersona,
  ): Promise<Brief> {
    const robots = Object.keys(summary.byRobot);
    const headline = `${persona.name}'s daily brief — ${summary.totalEvents} action${
      summary.totalEvents === 1 ? "" : "s"
    } across ${robots.length} robot${robots.length === 1 ? "" : "s"}`;

    const lines: string[] = ["Good morning,", ""];
    if (summary.totalEvents === 0) {
      lines.push("Quiet day — no robot activity in the window.");
    } else {
      lines.push("Here's where things stand:");
      for (const robot of robots) {
        const rollup = summary.byRobot[robot];
        const actions = Object.entries(rollup.byAction)
          .map(([action, count]) => `${count} ${action}`)
          .join(", ");
        lines.push(`- ${robot}: ${actions}`);
      }
    }
    lines.push("", "—", persona.name);

    return { headline, body: lines.join("\n") };
  }
}

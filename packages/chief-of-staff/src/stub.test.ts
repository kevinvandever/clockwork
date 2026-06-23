import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { StubBriefWriter } from "./stub.js";
import type { OversightSummary } from "./oversight.js";

const persona = resolveAllPersonas().chiefOfStaff; // "Linda"

function summary(overrides: Partial<OversightSummary> = {}): OversightSummary {
  return {
    tenantId: "t1",
    window: { since: "a", until: "b" },
    totalEvents: 3,
    byRobot: {
      "Josh 2": { total: 2, byAction: { instant_response_sent: 2 } },
      Dave: { total: 1, byAction: { newsletter_sent: 1 } },
    },
    recent: [],
    ...overrides,
  };
}

describe("StubBriefWriter", () => {
  it("headlines totals and lists per-robot activity, signed by the persona", async () => {
    const brief = await new StubBriefWriter().write(summary(), persona);
    expect(brief.headline).toContain("Linda");
    expect(brief.headline).toContain("3 actions across 2 robots");
    expect(brief.body).toContain("Josh 2: 2 instant_response_sent");
    expect(brief.body).toContain("Dave: 1 newsletter_sent");
    expect(brief.body.trimEnd().endsWith("Linda")).toBe(true);
  });

  it("handles a quiet day", async () => {
    const brief = await new StubBriefWriter().write(
      summary({ totalEvents: 0, byRobot: {} }),
      persona,
    );
    expect(brief.body).toContain("Quiet day");
  });
});

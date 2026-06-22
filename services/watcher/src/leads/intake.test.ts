import { describe, it, expect } from "vitest";
import type { WatcherConfig } from "../config.js";
import { LeadIntake } from "./intake.js";
import type { LeadHandler, ReceivedLead } from "./types.js";

function makeConfig(): WatcherConfig {
  return { port: 0, intakeTokens: { secret123: "tenant-a" } };
}

function collector(): { handler: LeadHandler; received: ReceivedLead[] } {
  const received: ReceivedLead[] = [];
  const handler: LeadHandler = async (r) => {
    received.push(r);
  };
  return { received, handler };
}

describe("LeadIntake", () => {
  it("rejects a missing or unknown token as unauthorized", async () => {
    const { handler, received } = collector();
    const intake = new LeadIntake(makeConfig(), handler);
    expect((await intake.process(undefined, { from: "a@b.com" })).status).toBe(
      "unauthorized",
    );
    expect((await intake.process("wrong", { from: "a@b.com" })).status).toBe(
      "unauthorized",
    );
    expect(received).toHaveLength(0);
  });

  it("rejects a body without a sender as invalid", async () => {
    const { handler } = collector();
    const intake = new LeadIntake(makeConfig(), handler);
    expect((await intake.process("secret123", {})).status).toBe("invalid");
    expect((await intake.process("secret123", null)).status).toBe("invalid");
  });

  it("accepts a valid lead, maps token to tenant, and emits it", async () => {
    const { handler, received } = collector();
    const intake = new LeadIntake(makeConfig(), handler);
    const result = await intake.process("secret123", {
      from: "Jane <jane@example.com>",
      text: "Tour please, 212-555-1234",
      messageId: "m1",
    });
    expect(result.status).toBe("accepted");
    expect(received).toHaveLength(1);
    expect(received[0]?.tenantId).toBe("tenant-a");
    expect(received[0]?.lead.email).toBe("jane@example.com");
  });

  it("drops a duplicate delivery and emits only once", async () => {
    const { handler, received } = collector();
    const intake = new LeadIntake(makeConfig(), handler);
    const payload = { from: "jane@example.com", messageId: "m1" };
    expect((await intake.process("secret123", payload)).status).toBe("accepted");
    expect((await intake.process("secret123", payload)).status).toBe("duplicate");
    expect(received).toHaveLength(1);
  });
});

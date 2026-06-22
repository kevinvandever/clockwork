import { describe, it, expect, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { buildHealthBody, createServer } from "./server.js";
import { LeadIntake } from "./leads/intake.js";
import type { WatcherConfig } from "./config.js";
import type { ReceivedLead } from "./leads/types.js";

function listen(s: Server): Promise<number> {
  return new Promise((resolve) => {
    s.listen(0, () => resolve((s.address() as AddressInfo).port));
  });
}

const config: WatcherConfig = { port: 0, intakeTokens: { secret123: "tenant-a" } };

describe("watcher health endpoint", () => {
  let server: Server | undefined;
  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it("builds a well-formed health body", () => {
    const body = buildHealthBody(new Date("2026-01-01T00:00:00.000Z"));
    expect(body.status).toBe("ok");
    expect(body.service).toBe("watcher");
    expect(body.timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("responds 200 with status ok on GET /health", async () => {
    server = createServer();
    const port = await listen(server);
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("ok");
  });

  it("responds 404 for unknown routes", async () => {
    server = createServer();
    const port = await listen(server);
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    expect(res.status).toBe(404);
  });
});

describe("watcher POST /inbound", () => {
  let server: Server | undefined;
  let received: ReceivedLead[] = [];

  afterEach(() => {
    server?.close();
    server = undefined;
    received = [];
  });

  function startWithIntake(): Promise<number> {
    const intake = new LeadIntake(config, async (r) => {
      received.push(r);
    });
    server = createServer(intake);
    return listen(server);
  }

  async function postInbound(
    port: number,
    body: unknown,
    token?: string,
  ): Promise<Response> {
    return fetch(`http://127.0.0.1:${port}/inbound`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-intake-token": token } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("accepts a valid lead (202) and invokes the handler", async () => {
    const port = await startWithIntake();
    const res = await postInbound(
      port,
      { from: "Jane <jane@example.com>", text: "tour please", messageId: "m1" },
      "secret123",
    );
    expect(res.status).toBe(202);
    expect(received).toHaveLength(1);
    expect(received[0]?.lead.email).toBe("jane@example.com");
  });

  it("rejects a bad token (401) and does not invoke the handler", async () => {
    const port = await startWithIntake();
    const res = await postInbound(port, { from: "x@y.com" }, "wrong");
    expect(res.status).toBe(401);
    expect(received).toHaveLength(0);
  });

  it("rejects an invalid body (400)", async () => {
    const port = await startWithIntake();
    const res = await postInbound(port, { subject: "no sender" }, "secret123");
    expect(res.status).toBe(400);
  });

  it("returns 200 for a duplicate delivery", async () => {
    const port = await startWithIntake();
    const payload = { from: "x@y.com", messageId: "dup-1" };
    expect((await postInbound(port, payload, "secret123")).status).toBe(202);
    expect((await postInbound(port, payload, "secret123")).status).toBe(200);
    expect(received).toHaveLength(1);
  });

  it("responds 503 when no intake is configured", async () => {
    server = createServer();
    const port = await listen(server);
    const res = await postInbound(port, { from: "x@y.com" }, "secret123");
    expect(res.status).toBe(503);
  });
});

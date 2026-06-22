import { describe, it, expect, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { buildHealthBody, createServer } from "./server.js";

describe("watcher health endpoint", () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  function listen(s: Server): Promise<number> {
    return new Promise((resolve) => {
      s.listen(0, () => {
        const addr = s.address() as AddressInfo;
        resolve(addr.port);
      });
    });
  }

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
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("ok");
  });

  it("responds 404 for unknown routes", async () => {
    server = createServer();
    const port = await listen(server);
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    expect(res.status).toBe(404);
  });
});

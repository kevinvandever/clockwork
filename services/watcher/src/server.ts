import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { LeadIntake } from "./leads/intake.js";

export interface HealthBody {
  status: "ok";
  service: string;
  timestamp: string;
}

export function buildHealthBody(now: Date = new Date()): HealthBody {
  return {
    status: "ok",
    service: "watcher",
    timestamp: now.toISOString(),
  };
}

const MAX_BODY_BYTES = 1_000_000;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (raw === "") {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const INTAKE_STATUS_CODES = {
  accepted: 202,
  duplicate: 200,
  unauthorized: 401,
  invalid: 400,
} as const;

/**
 * The always-on speed-to-lead service. Exposes:
 *  - GET  /health  — liveness
 *  - POST /inbound — authenticated lead intake (Task 5). The injected `intake`
 *    handles auth/parse/dedup/emit. In Task 6 the emit handler drafts + sends.
 */
export function createServer(intake?: LeadIntake): Server {
  return createHttpServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, buildHealthBody());
      return;
    }

    if (req.method === "POST" && req.url === "/inbound") {
      if (!intake) {
        sendJson(res, 503, { error: "intake_not_configured" });
        return;
      }
      const token = headerValue(req, "x-intake-token");
      readJsonBody(req)
        .then((body) => intake.process(token, body))
        .then((result) => {
          sendJson(res, INTAKE_STATUS_CODES[result.status], {
            status: result.status,
          });
        })
        .catch(() => sendJson(res, 400, { error: "bad_request" }));
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });
}

function headerValue(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

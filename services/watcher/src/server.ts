import { createServer as createHttpServer, type Server } from "node:http";

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

/**
 * The always-on speed-to-lead service (Task 5 adds the inbox watching + lead
 * pipeline). For now it exposes a health endpoint so the hosted deploy can be
 * stood up and monitored from day one.
 */
export function createServer(): Server {
  return createHttpServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildHealthBody()));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}

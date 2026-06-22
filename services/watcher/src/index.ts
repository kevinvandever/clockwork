import { resolveClientConfig } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { loadConfig } from "./config.js";
import { createPipelineHandler, type TenantContext } from "./handler.js";
import { LeadIntake } from "./leads/intake.js";
import { ClaudeResponder } from "./respond/claude.js";
import { StubResponder } from "./respond/stub.js";
import type { LeadResponder } from "./respond/types.js";
import { createServer } from "./server.js";

const config = loadConfig();

// Real Claude when a key is present; deterministic stub otherwise.
function createResponder(): LeadResponder {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    console.log("watcher: using ClaudeResponder");
    return new ClaudeResponder({ apiKey, model: process.env.ANTHROPIC_MODEL });
  }
  console.log("watcher: using StubResponder (set ANTHROPIC_API_KEY for real drafts)");
  return new StubResponder();
}

// One mock CRM + resolved persona per configured tenant. Shared activity log
// (tenant-tagged). A durable, multi-tenant runtime registry comes with real infra.
const activityLog = new InMemoryActivityLog();
const tenantContexts = new Map<string, TenantContext>();
for (const tenantId of new Set(Object.values(config.intakeTokens))) {
  const clientConfig = resolveClientConfig({ tenantId, displayName: tenantId });
  tenantContexts.set(tenantId, {
    connector: new MockCrmConnector(tenantId),
    pipelinePersona: clientConfig.personas.pipeline,
  });
}

const handler = createPipelineHandler({
  activityLog,
  responder: createResponder(),
  resolveTenant: (tenantId) => tenantContexts.get(tenantId),
});

const intake = new LeadIntake(config, handler);
const server = createServer(intake);
server.listen(config.port, () => {
  console.log(`watcher listening on :${config.port}`);
});

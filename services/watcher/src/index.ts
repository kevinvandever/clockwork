import { loadConfig } from "./config.js";
import { LeadIntake } from "./leads/intake.js";
import type { ReceivedLead } from "./leads/types.js";
import { createServer } from "./server.js";

const config = loadConfig();

// Task 5 handler: log the detected lead. Task 6 swaps in draft + send via the CRM.
const logHandler = async (received: ReceivedLead): Promise<void> => {
  const { tenantId, lead } = received;
  console.log(
    `[lead] tenant=${tenantId} source=${lead.source} ` +
      `name=${lead.name ?? "?"} email=${lead.email ?? "?"} phone=${lead.phone ?? "?"}`,
  );
};

const intake = new LeadIntake(config, logHandler);
const server = createServer(intake);
server.listen(config.port, () => {
  console.log(`watcher listening on :${config.port}`);
});

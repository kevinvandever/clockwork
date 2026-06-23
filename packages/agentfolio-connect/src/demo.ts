import { InMemoryActivityLog } from "@clockwork/activity-log";
import {
  AgentfolioService,
  InMemoryAgentfolioStore,
  type Actor,
} from "@clockwork/agentfolio-core";
import { resolveAllPersonas } from "@clockwork/config";
import { runChiefOfStaff, StubBriefWriter } from "@clockwork/chief-of-staff";
import { ActivityLogEventSink } from "./sink.js";

/**
 * Full cross-system loop: agentfolio (connected via the sink) records board
 * actions into the shared activity log, then the Chief of Staff brief surfaces
 * them alongside the robots.
 */
async function main(): Promise<void> {
  const tenantId = "tenant-joe";
  const activityLog = new InMemoryActivityLog();

  // A robot logs something, too, so the brief shows both sources.
  await activityLog.append({
    tenantId,
    robot: "Josh 2",
    action: "instant_response_sent",
    at: new Date().toISOString(),
  });

  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store, {
    eventSink: new ActivityLogEventSink(activityLog),
  });
  const dana = await store.createUser({
    tenantId,
    role: "agent",
    name: "Dana",
    email: "dana@demo.com",
  });
  const agent: Actor = { userId: dana.id, tenantId, role: "agent" };
  const board = await service.createBoard(agent, { title: "Cal's Search" });
  const prop = await service.addProperty(agent, board.id, {
    address: "12 Maple St",
  });
  await service.moveStage(agent, prop.id, "offer");
  await service.initiateHandoff(agent, prop.id);

  const { oversight, brief } = await runChiefOfStaff({
    tenantId,
    activityLog,
    persona: resolveAllPersonas().chiefOfStaff,
    writer: new StubBriefWriter(),
  });

  console.log("=== Oversight (note the 'agentfolio' source) ===");
  for (const [robot, rollup] of Object.entries(oversight.byRobot)) {
    console.log(`  ${robot}: ${JSON.stringify(rollup.byAction)}`);
  }
  console.log("");
  console.log(brief.headline);
  console.log(brief.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

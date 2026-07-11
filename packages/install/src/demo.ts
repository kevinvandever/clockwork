import { createInstall } from "./install.js";
import { loadSkills } from "./skills.js";

/**
 * One narrated end-to-end "day at the practice": a lead becomes an instant reply,
 * Marketing and Client Care run, agentfolio records a board + handoff, and the
 * Chief of Staff rolls the whole day — robots and agentfolio — into one brief.
 *
 * Runs entirely on stand-ins (mock CRM, in-memory stores, stub drafters). Set
 * ANTHROPIC_API_KEY to see real Claude drafting in Joe's voice.
 */
function hr(title: string): void {
  console.log(`\n${"─".repeat(64)}\n${title}\n${"─".repeat(64)}`);
}

async function main(): Promise<void> {
  const skills = loadSkills();
  const install = createInstall({
    tenantId: "tenant-joe",
    displayName: "Joe's Practice",
    crm: { type: "mock" },
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL,
    skills,
  });

  hr("Clockwork — a day at the practice");
  console.log(`tenant: ${install.config.displayName}`);
  console.log(`drafting: ${install.usingClaude ? "real Claude" : "deterministic stub"}`);
  console.log(
    `Joe's skills loaded: ${[
      skills.marketing ? "newsletter" : null,
      skills.clientCare ? "sal-method" : null,
    ]
      .filter(Boolean)
      .join(", ") || "none (using generic stubs)"}`,
  );

  // 1) Speed-to-lead -------------------------------------------------------
  hr("1) A new lead emails in → Pipeline (Josh 2) replies instantly");
  await install.handleLead({
    tenantId: "tenant-joe",
    dedupKey: "lead-1",
    lead: {
      source: "zillow",
      email: "jane@example.com",
      name: "Jane Buyer",
      message: "Is 123 Main St still available? I'd love a tour.",
      receivedAt: new Date().toISOString(),
    },
  });

  // Seed a small sphere for the cadence robots.
  const today = new Date();
  await install.connector.createContact({
    email: "amy@example.com",
    name: "Amy",
    segment: "sphere",
    importantDates: [
      { label: "birthday", month: today.getUTCMonth() + 1, day: today.getUTCDate() },
    ],
  });
  await install.connector.createContact({
    email: "ben@example.com",
    name: "Ben",
    segment: "sphere",
    lastContactedAt: new Date(today.getTime() - 200 * 86_400_000).toISOString(),
  });
  await install.connector.createContact({
    email: "cara@example.com",
    name: "Cara",
    segment: "sphere",
    lastContactedAt: new Date(today.getTime() - 5 * 86_400_000).toISOString(),
  });

  // 2) Marketing -----------------------------------------------------------
  hr("2) Marketing (Dave) drafts a newsletter from an anchor story");
  const mk = await install.draftNewsletter({
    kind: "notes",
    value: "spring townhouse market update — inventory shifting, demand strong",
  });
  console.log(
    `Dave drafted "${mk.headline}" (${mk.wordCount} words, status: ${mk.status})`,
  );

  // 3) Client Care ---------------------------------------------------------
  hr("3) Client Care (Stephanie) reaches out to who's due");
  const cc = await install.runClientCare({ segment: "sphere", today });
  console.log(`Stephanie sent ${cc.sentCount} touches (${cc.dueCount} due):`);
  for (const t of cc.touches) {
    console.log(`  - ${t.reason} (sent=${t.sent})`);
  }

  // 4) agentfolio ----------------------------------------------------------
  hr("4) agentfolio — the agent works a buyer board");
  const agent = await install.agentfolioStore.createUser({
    tenantId: "tenant-joe",
    role: "agent",
    name: "Dana Agent",
    email: "dana@example.com",
  });
  const client = await install.agentfolioStore.createUser({
    tenantId: "tenant-joe",
    role: "client",
    name: "Cal Client",
    email: "cal@example.com",
  });
  const actor = { userId: agent.id, tenantId: "tenant-joe", role: "agent" as const };
  const board = await install.agentfolio.createBoard(actor, {
    title: "Cal's Home Search",
    clientId: client.id,
  });
  const property = await install.agentfolio.addProperty(actor, board.id, {
    address: "12 Maple St",
    agentPrivate: { strategy: "Seller relocating — room to negotiate" },
  });
  await install.agentfolio.moveStage(actor, property.id, "offer");
  await install.agentfolio.initiateHandoff(actor, property.id);
  console.log(
    `Dana added ${property.address} (records owner: ${property.publicRecords?.owner ?? "n/a"}), moved it to offer, and handed it off to transaction.`,
  );

  // 5) Chief of Staff ------------------------------------------------------
  hr("5) Chief of Staff (Linda) rolls up the whole day");
  const { oversight, brief } = await install.runChiefOfStaff();
  console.log("Activity by source:");
  for (const [robot, rollup] of Object.entries(oversight.byRobot)) {
    console.log(`  ${robot}: ${JSON.stringify(rollup.byAction)}`);
  }
  console.log("");
  console.log(brief.headline);
  console.log(brief.body);

  hr("Done — that's the full loop, all on stand-ins");
  console.log(
    "Swap mock→Rechat in the install config, add an ANTHROPIC_API_KEY, and point the\nwatcher at a real inbox — no other code changes.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

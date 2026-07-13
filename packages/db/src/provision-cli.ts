import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SecretCipher, provisionTenant } from "@clockwork/tenants";
import { getPool, closePool } from "./pool.js";
import { migrate } from "./migrate.js";
import { PostgresTenantStore } from "./tenant-store.js";
import { PostgresAgentfolioStore } from "./agentfolio-store.js";

/**
 * Admin provisioning CLI (Clockwork is agent-installed, not self-serve).
 * Creates a tenant + its agent user, seeds skills from skills/*.md, and prints
 * the login. Requires DATABASE_URL + KEY_ENCRYPTION_SECRET (same values the app
 * runs with, so a seeded key is decryptable by the app).
 *
 *   node packages/db/dist/provision-cli.js \
 *     --name "Kevin's Practice" --email kevin@example.com [--tenant kevin] \
 *     [--agent-name "Kevin"] [--api-key sk-ant-...]
 */

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tenant"
  );
}

function loadSkill(file: string): string | undefined {
  for (const p of [
    resolve(process.cwd(), "skills", file),
    resolve(process.cwd(), "../../skills", file),
  ]) {
    try {
      return readFileSync(p, "utf-8");
    } catch {
      // try next
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  // Strip a leading `--` (pnpm forwards one when invoked as `pnpm provision -- ...`).
  const rawArgs = process.argv.slice(2);
  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

  const { values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      tenant: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      "agent-name": { type: "string" },
      "api-key": { type: "string" },
    },
  });

  const displayName = values.name;
  const email = values.email;
  if (!displayName || !email) {
    console.error(
      "usage: provision --name <display name> --email <agent email> " +
        "[--tenant <id>] [--agent-name <name>] [--api-key <key>]",
    );
    process.exitCode = 1;
    return;
  }

  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    console.error(
      "KEY_ENCRYPTION_SECRET is required (must match the app's value).",
    );
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exitCode = 1;
    return;
  }

  const tenantId = values.tenant ?? `tenant-${slugify(displayName)}`;
  const agentName = values["agent-name"] ?? email.split("@")[0];

  const pool = getPool();
  await migrate(pool);

  const tenantStore = new PostgresTenantStore(pool, new SecretCipher(secret));
  const afStore = new PostgresAgentfolioStore(pool);

  const existing = await tenantStore.getTenant(tenantId);
  if (existing) {
    console.error(
      `tenant "${tenantId}" already exists — choose a different --tenant id.`,
    );
    await closePool();
    process.exitCode = 1;
    return;
  }

  await provisionTenant(tenantStore, {
    tenantId,
    displayName,
    apiKey: values["api-key"],
    skills: {
      marketing: loadSkill("newsletter-draft.md"),
      clientCare: loadSkill("sal-method.md"),
    },
  });

  const agent = await afStore.createUser({
    tenantId,
    role: "agent",
    name: agentName,
    email,
  });

  await closePool();

  console.log("\nProvisioned tenant:");
  console.log(`  tenantId:   ${tenantId}`);
  console.log(`  displayName ${displayName}`);
  console.log(`  agent user: ${agent.id} (${agentName})`);
  console.log(`  login email ${email}`);
  console.log(
    values["api-key"]
      ? "  API key:    set (encrypted)"
      : "  API key:    not set — add it in Settings after first login",
  );
  console.log(
    "\nLog in at the app root with this email and the deployment's AGENT_PASSWORD.\n",
  );
}

main().catch((err) => {
  console.error("[provision] failed:", err);
  process.exitCode = 1;
});

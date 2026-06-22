import { resolveTenant, type WatcherConfig } from "../config.js";
import { dedupKeyFor, InMemoryDedup } from "./dedup.js";
import { parseLeadEmail } from "./parse.js";
import type { InboundEmail, LeadHandler, ReceivedLead } from "./types.js";

export type IntakeStatus = "accepted" | "duplicate" | "unauthorized" | "invalid";

export interface IntakeResult {
  status: IntakeStatus;
  received?: ReceivedLead;
}

function isInboundEmail(body: unknown): body is InboundEmail {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as InboundEmail).from === "string" &&
    (body as InboundEmail).from.trim() !== ""
  );
}

/**
 * The intake pipeline: authenticate + resolve tenant → parse → dedup → emit.
 * Provider/source-agnostic — anything that POSTs a normalized email (Gmail push,
 * Graph notification, email forwarding, or a CRM webhook) flows through here.
 */
export class LeadIntake {
  constructor(
    private readonly config: WatcherConfig,
    private readonly handler: LeadHandler,
    private readonly dedup: InMemoryDedup = new InMemoryDedup(),
  ) {}

  async process(token: string | undefined, body: unknown): Promise<IntakeResult> {
    const tenantId = resolveTenant(this.config, token);
    if (!tenantId) {
      return { status: "unauthorized" };
    }
    if (!isInboundEmail(body)) {
      return { status: "invalid" };
    }

    const dedupKey = dedupKeyFor(tenantId, body);
    if (!this.dedup.markIfNew(dedupKey)) {
      return { status: "duplicate" };
    }

    const received: ReceivedLead = {
      tenantId,
      lead: parseLeadEmail(body),
      dedupKey,
    };
    await this.handler(received);
    return { status: "accepted", received };
  }
}

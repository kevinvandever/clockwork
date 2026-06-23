import { AI_DISCLOSURE } from "@clockwork/connector-core";
import type { CareDraft, CareTouchInput, ClientCareDrafter } from "./drafter.js";

/** Deterministic Client Care drafter (default; tests + no-key demo). */
export class StubClientCareDrafter implements ClientCareDrafter {
  async draftTouch({
    persona,
    contact,
    reason,
  }: CareTouchInput): Promise<CareDraft> {
    const who = contact.name ?? "there";
    const { subject, opener } = messageFor(reason);
    const body = [
      `Hi ${who},`,
      "",
      opener,
      "",
      "Anything I can help with? I'm always here.",
      "",
      "Warmly,",
      persona.name,
      "",
      AI_DISCLOSURE,
    ].join("\n");
    return { subject, body };
  }
}

function messageFor(reason: string): { subject: string; opener: string } {
  switch (reason) {
    case "birthday":
      return {
        subject: "Happy birthday!",
        opener: "Wishing you a wonderful birthday from all of us.",
      };
    case "home anniversary":
      return {
        subject: "Happy home anniversary!",
        opener:
          "Hard to believe how the time flies — happy anniversary in your home!",
      };
    default:
      return {
        subject: "Just checking in",
        opener:
          "It's been a little while, so I wanted to say hello and see how you're doing.",
      };
  }
}

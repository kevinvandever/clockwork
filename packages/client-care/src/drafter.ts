import type { ResolvedPersona } from "@clockwork/config";
import type { Contact } from "@clockwork/connector-core";

export interface CareDraft {
  subject: string;
  body: string;
}

export interface CareTouchInput {
  persona: ResolvedPersona;
  contact: Contact;
  /** Why we're reaching out: "birthday", "home anniversary", "rotation", … */
  reason: string;
}

/**
 * Drafts a personal Client Care touch in the persona's voice. Stub (default) +
 * env-gated Claude, same pattern as the other robots.
 */
export interface ClientCareDrafter {
  draftTouch(input: CareTouchInput): Promise<CareDraft>;
}

export type { ReceivedLead, LeadHandler } from "./types.js";
export type { DraftedReply, LeadResponder } from "./respond/types.js";
export { StubResponder } from "./respond/stub.js";
export {
  ClaudeResponder,
  DEFAULT_MODEL,
  buildPrompt,
  type ClaudeResponderOptions,
} from "./respond/claude.js";
export { subjectFor, AI_DISCLOSURE, ensureDisclosure } from "./respond/format.js";
export {
  createPipelineHandler,
  type TenantContext,
  type TenantContextResolver,
  type PipelineHandlerDeps,
} from "./handler.js";

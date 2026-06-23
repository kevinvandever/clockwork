export {
  buildOversight,
  type OversightSummary,
  type OversightInput,
  type RobotRollup,
} from "./oversight.js";
export type { Brief, BriefWriter } from "./writer.js";
export { StubBriefWriter } from "./stub.js";
export {
  ClaudeBriefWriter,
  DEFAULT_MODEL,
  buildPrompt,
  type ClaudeBriefOptions,
} from "./claude.js";
export {
  runChiefOfStaff,
  type RunChiefOfStaffDeps,
  type ChiefOfStaffRunResult,
} from "./run.js";

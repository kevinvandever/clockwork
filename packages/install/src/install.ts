import {
  resolveClientConfig,
  type PersonaOverrides,
  type ResolvedClientConfig,
} from "@clockwork/config";
import type { CrmConnector } from "@clockwork/connector-core";
import {
  InMemoryActivityLog,
  type ActivityLog,
} from "@clockwork/activity-log";
import {
  ClaudeResponder,
  StubResponder,
  createPipelineHandler,
  type LeadHandler,
  type LeadResponder,
} from "@clockwork/pipeline";
import {
  ClaudeMarketingDrafter,
  StubMarketingDrafter,
  runMarketingNewsletter,
  type MarketingDrafter,
  type MarketingRunResult,
} from "@clockwork/marketing";
import {
  ClaudeClientCareDrafter,
  StubClientCareDrafter,
  runClientCare,
  type ClientCareDrafter,
  type ClientCareRunResult,
} from "@clockwork/client-care";
import {
  ClaudeBriefWriter,
  StubBriefWriter,
  runChiefOfStaff,
  type BriefWriter,
  type ChiefOfStaffRunResult,
} from "@clockwork/chief-of-staff";
import {
  AgentfolioService,
  InMemoryAgentfolioStore,
} from "@clockwork/agentfolio-core";
import { ActivityLogEventSink } from "@clockwork/agentfolio-connect";
import { StubRecordsProvider } from "@clockwork/records";
import { createConnector, type CrmConfig } from "./connector.js";

/** Optional per-robot skill text (Joe's skills/*.md), used when Claude is enabled. */
export interface SkillInstructions {
  pipeline?: string;
  marketing?: string;
  clientCare?: string;
  chiefOfStaff?: string;
}

export interface InstallConfig {
  tenantId: string;
  displayName: string;
  personaOverrides?: PersonaOverrides;
  crm: CrmConfig;
  /** When set, robots draft with real Claude; otherwise deterministic stubs. */
  anthropicApiKey?: string;
  anthropicModel?: string;
  skills?: SkillInstructions;
}

/** A fully wired per-client install. */
export interface Install {
  tenantId: string;
  config: ResolvedClientConfig;
  connector: CrmConnector;
  activityLog: ActivityLog;
  agentfolio: AgentfolioService;
  agentfolioStore: InMemoryAgentfolioStore;
  usingClaude: boolean;
  /** Pipeline (Josh 2) instant-response handler. */
  handleLead: LeadHandler;
  runMarketing(opts?: {
    context?: string;
    segment?: string;
  }): Promise<MarketingRunResult>;
  runClientCare(opts?: {
    today?: Date;
    segment?: string;
    rotationDays?: number;
    lookaheadDays?: number;
  }): Promise<ClientCareRunResult>;
  runChiefOfStaff(opts?: {
    now?: Date;
    windowHours?: number;
  }): Promise<ChiefOfStaffRunResult>;
}

/**
 * Wire a complete Clockwork install from one per-client config: the CRM connector
 * (via the factory), a shared activity log, all four robots (stub or Claude), and
 * agentfolio connected to the same activity log. This is the "sell-the-setup"
 * composition root.
 */
export function createInstall(input: InstallConfig): Install {
  const config = resolveClientConfig({
    tenantId: input.tenantId,
    displayName: input.displayName,
    personaOverrides: input.personaOverrides,
  });
  const connector = createConnector(input.tenantId, input.crm);
  const activityLog = new InMemoryActivityLog();
  const usingClaude = Boolean(input.anthropicApiKey);
  const skills = input.skills ?? {};

  const claude = (skillInstructions?: string) => ({
    apiKey: input.anthropicApiKey as string,
    model: input.anthropicModel,
    skillInstructions,
  });

  const responder: LeadResponder = usingClaude
    ? new ClaudeResponder(claude(skills.pipeline))
    : new StubResponder();
  const marketingDrafter: MarketingDrafter = usingClaude
    ? new ClaudeMarketingDrafter(claude(skills.marketing))
    : new StubMarketingDrafter();
  const careDrafter: ClientCareDrafter = usingClaude
    ? new ClaudeClientCareDrafter(claude(skills.clientCare))
    : new StubClientCareDrafter();
  const briefWriter: BriefWriter = usingClaude
    ? new ClaudeBriefWriter(claude(skills.chiefOfStaff))
    : new StubBriefWriter();

  const handleLead = createPipelineHandler({
    activityLog,
    responder,
    resolveTenant: (tenantId) =>
      tenantId === input.tenantId
        ? { connector, pipelinePersona: config.personas.pipeline }
        : undefined,
  });

  const agentfolioStore = new InMemoryAgentfolioStore();
  const agentfolio = new AgentfolioService(agentfolioStore, {
    recordsProvider: new StubRecordsProvider(),
    eventSink: new ActivityLogEventSink(activityLog),
  });

  return {
    tenantId: input.tenantId,
    config,
    connector,
    activityLog,
    agentfolio,
    agentfolioStore,
    usingClaude,
    handleLead,
    runMarketing: (opts = {}) =>
      runMarketingNewsletter({
        tenantId: input.tenantId,
        connector,
        persona: config.personas.marketing,
        drafter: marketingDrafter,
        activityLog,
        context: opts.context,
        segment: opts.segment,
      }),
    runClientCare: (opts = {}) =>
      runClientCare({
        tenantId: input.tenantId,
        connector,
        persona: config.personas.clientCare,
        drafter: careDrafter,
        activityLog,
        today: opts.today,
        segment: opts.segment,
        rotationDays: opts.rotationDays,
        lookaheadDays: opts.lookaheadDays,
      }),
    runChiefOfStaff: (opts = {}) =>
      runChiefOfStaff({
        tenantId: input.tenantId,
        activityLog,
        persona: config.personas.chiefOfStaff,
        writer: briefWriter,
        now: opts.now,
        windowHours: opts.windowHours,
      }),
  };
}

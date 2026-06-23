/**
 * agentfolio domain types. Multi-tenant: every record carries a tenantId and all
 * access is scoped by it, mirroring the rest of the codebase.
 */

export type Role = "agent" | "client";

export const STAGES = ["new", "touring", "offer", "passed"] as const;
export type Stage = (typeof STAGES)[number];

export type NoteVisibility = "shared" | "agent_private";

export interface User {
  id: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}

export interface Board {
  id: string;
  tenantId: string;
  agentId: string;
  clientId?: string;
  title: string;
  createdAt: string;
}

/** Agent-only strategy info; never shown to clients. */
export interface AgentPrivateInfo {
  strategy?: string;
  sellerMotivation?: string;
}

/** Public records populated by the Task 11 records pull. */
export interface PublicRecords {
  owner?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  assessedValue?: number;
  source?: string;
  pulledAt?: string;
}

export interface Property {
  id: string;
  tenantId: string;
  boardId: string;
  address: string;
  stage: Stage;
  addedBy: string;
  createdAt: string;
  /** Agent-only; omitted from the client view. */
  agentPrivate?: AgentPrivateInfo;
  /** Populated in Task 11; public, so visible to clients. */
  publicRecords?: PublicRecords;
}

export interface Tour {
  id: string;
  tenantId: string;
  propertyId: string;
  scheduledAt: string;
  note?: string;
}

export interface Note {
  id: string;
  tenantId: string;
  propertyId: string;
  authorId: string;
  visibility: NoteVisibility;
  body: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  tenantId: string;
  propertyId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type AgentfolioErrorCode = "not_found" | "forbidden" | "invalid_input";

/** Typed error so the API/UI can branch on `code`. */
export class AgentfolioError extends Error {
  readonly code: AgentfolioErrorCode;

  constructor(code: AgentfolioErrorCode, message: string) {
    super(message);
    this.name = "AgentfolioError";
    this.code = code;
  }
}

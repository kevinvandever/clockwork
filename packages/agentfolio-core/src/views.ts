import type { Note, Property, PublicRecords, Role, Stage } from "./types.js";

/**
 * Role-shaped property view. The client variant intentionally has no
 * `agentPrivate` field, so agent-only data cannot leak through serialization.
 */
export interface PropertyView {
  id: string;
  boardId: string;
  address: string;
  stage: Stage;
  addedBy: string;
  createdAt: string;
  publicRecords?: PublicRecords;
  /** Present only in the agent view. */
  agentPrivate?: Property["agentPrivate"];
}

export function viewProperty(property: Property, role: Role): PropertyView {
  const base: PropertyView = {
    id: property.id,
    boardId: property.boardId,
    address: property.address,
    stage: property.stage,
    addedBy: property.addedBy,
    createdAt: property.createdAt,
    publicRecords: property.publicRecords,
  };
  if (role === "agent") {
    base.agentPrivate = property.agentPrivate;
  }
  return base;
}

/** Clients only ever see shared notes; agents see everything. */
export function visibleNotes(notes: Note[], role: Role): Note[] {
  return role === "agent"
    ? notes
    : notes.filter((n) => n.visibility === "shared");
}

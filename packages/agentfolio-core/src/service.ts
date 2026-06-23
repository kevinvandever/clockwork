import type {
  AgentfolioStore,
  AddPropertyInput,
} from "./store.js";
import {
  AgentfolioError,
  STAGES,
  type Board,
  type Comment,
  type Note,
  type NoteVisibility,
  type Stage,
  type Tour,
} from "./types.js";
import { viewProperty, visibleNotes, type PropertyView } from "./views.js";

/** The authenticated caller (from the session). */
export interface Actor {
  userId: string;
  tenantId: string;
  role: "agent" | "client";
}

/**
 * agentfolio application service. Enforces tenant isolation, board membership,
 * and role permissions, and returns role-shaped views. The UI/API calls this,
 * never the store directly.
 */
export class AgentfolioService {
  constructor(private readonly store: AgentfolioStore) {}

  // --- boards ---

  async createBoard(
    actor: Actor,
    input: { title: string; clientId?: string },
  ): Promise<Board> {
    this.requireAgent(actor);
    if (!input.title.trim()) {
      throw new AgentfolioError("invalid_input", "title is required");
    }
    return this.store.createBoard({
      tenantId: actor.tenantId,
      agentId: actor.userId,
      clientId: input.clientId,
      title: input.title,
    });
  }

  async listMyBoards(actor: Actor): Promise<Board[]> {
    return this.store.listBoardsForUser(actor.tenantId, actor.userId);
  }

  async getBoard(actor: Actor, boardId: string): Promise<Board> {
    return this.requireBoardMember(actor, boardId);
  }

  // --- properties ---

  async addProperty(
    actor: Actor,
    boardId: string,
    input: { address: string; agentPrivate?: AddPropertyInput["agentPrivate"] },
  ): Promise<PropertyView> {
    await this.requireBoardMember(actor, boardId);
    if (!input.address.trim()) {
      throw new AgentfolioError("invalid_input", "address is required");
    }
    if (input.agentPrivate && actor.role !== "agent") {
      throw new AgentfolioError(
        "forbidden",
        "only an agent can set agent-private info",
      );
    }
    const property = await this.store.addProperty({
      tenantId: actor.tenantId,
      boardId,
      address: input.address,
      addedBy: actor.userId,
      agentPrivate: actor.role === "agent" ? input.agentPrivate : undefined,
    });
    return viewProperty(property, actor.role);
  }

  async listProperties(actor: Actor, boardId: string): Promise<PropertyView[]> {
    await this.requireBoardMember(actor, boardId);
    const properties = await this.store.listProperties(actor.tenantId, boardId);
    return properties.map((p) => viewProperty(p, actor.role));
  }

  async moveStage(
    actor: Actor,
    propertyId: string,
    stage: Stage,
  ): Promise<PropertyView> {
    this.requireAgent(actor);
    if (!STAGES.includes(stage)) {
      throw new AgentfolioError("invalid_input", `invalid stage: ${stage}`);
    }
    const property = await this.requirePropertyBoardMember(actor, propertyId);
    const updated = await this.store.updatePropertyStage(
      actor.tenantId,
      property.id,
      stage,
    );
    return viewProperty(updated, actor.role);
  }

  // --- tours ---

  async addTour(
    actor: Actor,
    propertyId: string,
    input: { scheduledAt: string; note?: string },
  ): Promise<Tour> {
    this.requireAgent(actor);
    await this.requirePropertyBoardMember(actor, propertyId);
    return this.store.addTour({
      tenantId: actor.tenantId,
      propertyId,
      scheduledAt: input.scheduledAt,
      note: input.note,
    });
  }

  async listTours(actor: Actor, propertyId: string): Promise<Tour[]> {
    await this.requirePropertyBoardMember(actor, propertyId);
    return this.store.listTours(actor.tenantId, propertyId);
  }

  // --- notes ---

  async addNote(
    actor: Actor,
    propertyId: string,
    input: { body: string; visibility?: NoteVisibility },
  ): Promise<Note> {
    await this.requirePropertyBoardMember(actor, propertyId);
    const visibility: NoteVisibility = input.visibility ?? "shared";
    if (visibility === "agent_private" && actor.role !== "agent") {
      throw new AgentfolioError(
        "forbidden",
        "only an agent can write agent-private notes",
      );
    }
    if (!input.body.trim()) {
      throw new AgentfolioError("invalid_input", "note body is required");
    }
    return this.store.addNote({
      tenantId: actor.tenantId,
      propertyId,
      authorId: actor.userId,
      visibility,
      body: input.body,
    });
  }

  async listNotes(actor: Actor, propertyId: string): Promise<Note[]> {
    await this.requirePropertyBoardMember(actor, propertyId);
    const notes = await this.store.listNotes(actor.tenantId, propertyId);
    return visibleNotes(notes, actor.role);
  }

  // --- comments ---

  async addComment(
    actor: Actor,
    propertyId: string,
    input: { body: string },
  ): Promise<Comment> {
    await this.requirePropertyBoardMember(actor, propertyId);
    if (!input.body.trim()) {
      throw new AgentfolioError("invalid_input", "comment body is required");
    }
    return this.store.addComment({
      tenantId: actor.tenantId,
      propertyId,
      authorId: actor.userId,
      body: input.body,
    });
  }

  async listComments(actor: Actor, propertyId: string): Promise<Comment[]> {
    await this.requirePropertyBoardMember(actor, propertyId);
    return this.store.listComments(actor.tenantId, propertyId);
  }

  // --- guards ---

  private requireAgent(actor: Actor): void {
    if (actor.role !== "agent") {
      throw new AgentfolioError("forbidden", "agent role required");
    }
  }

  private async requireBoardMember(
    actor: Actor,
    boardId: string,
  ): Promise<Board> {
    const board = await this.store.getBoard(actor.tenantId, boardId);
    // not_found (rather than forbidden) for missing/cross-tenant, to avoid leaking existence.
    if (!board) {
      throw new AgentfolioError("not_found", `board ${boardId} not found`);
    }
    const isMember =
      board.agentId === actor.userId || board.clientId === actor.userId;
    if (!isMember) {
      throw new AgentfolioError("forbidden", "not a member of this board");
    }
    return board;
  }

  private async requirePropertyBoardMember(actor: Actor, propertyId: string) {
    const property = await this.store.getProperty(actor.tenantId, propertyId);
    if (!property) {
      throw new AgentfolioError("not_found", `property ${propertyId} not found`);
    }
    await this.requireBoardMember(actor, property.boardId);
    return property;
  }
}

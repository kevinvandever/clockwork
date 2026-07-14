import {
  AgentfolioError,
  type Board,
  type Comment,
  type Handoff,
  type Note,
  type NoteVisibility,
  type Property,
  type PublicRecords,
  type Role,
  type Stage,
  type Tour,
  type User,
} from "./types.js";
export interface CreateUserInput {
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}

export interface CreateBoardInput {
  tenantId: string;
  agentId: string;
  clientId?: string;
  title: string;
}

export interface AddPropertyInput {
  tenantId: string;
  boardId: string;
  address: string;
  addedBy: string;
  agentPrivate?: Property["agentPrivate"];
}

export interface AddTourInput {
  tenantId: string;
  propertyId: string;
  scheduledAt: string;
  note?: string;
}

export interface AddNoteInput {
  tenantId: string;
  propertyId: string;
  authorId: string;
  visibility: NoteVisibility;
  body: string;
}

export interface AddCommentInput {
  tenantId: string;
  propertyId: string;
  authorId: string;
  body: string;
}

/**
 * Low-level persistence for agentfolio. No access control — that lives in the
 * service. Every method is tenant-scoped by parameter. The in-memory version is
 * used now; a Postgres-backed implementation replaces it behind this interface
 * later (consistent with docs/DECISIONS.md D6).
 */
export interface AgentfolioStore {
  createUser(input: CreateUserInput): Promise<User>;
  getUser(tenantId: string, id: string): Promise<User | null>;
  /**
   * Global identity lookup for authentication only. Login must resolve who is
   * signing in before a tenant is known, so this is the one intentional
   * non-tenant-scoped read. Email is treated as unique across the system.
   */
  getUserByEmail(email: string): Promise<User | null>;
  /** List users in a tenant, optionally filtered by role. */
  listUsers(tenantId: string, role?: Role): Promise<User[]>;

  createBoard(input: CreateBoardInput): Promise<Board>;
  getBoard(tenantId: string, id: string): Promise<Board | null>;
  listBoardsForUser(tenantId: string, userId: string): Promise<Board[]>;

  addProperty(input: AddPropertyInput): Promise<Property>;
  getProperty(tenantId: string, id: string): Promise<Property | null>;
  listProperties(tenantId: string, boardId: string): Promise<Property[]>;
  updatePropertyStage(
    tenantId: string,
    id: string,
    stage: Stage,
  ): Promise<Property>;
  setPropertyRecords(
    tenantId: string,
    id: string,
    records: PublicRecords,
  ): Promise<Property>;
  setPropertyHandoff(
    tenantId: string,
    id: string,
    handoff: Handoff,
  ): Promise<Property>;

  addTour(input: AddTourInput): Promise<Tour>;
  listTours(tenantId: string, propertyId: string): Promise<Tour[]>;

  addNote(input: AddNoteInput): Promise<Note>;
  listNotes(tenantId: string, propertyId: string): Promise<Note[]>;

  addComment(input: AddCommentInput): Promise<Comment>;
  listComments(tenantId: string, propertyId: string): Promise<Comment[]>;
}

export class InMemoryAgentfolioStore implements AgentfolioStore {
  private readonly users: User[] = [];
  private readonly boards: Board[] = [];
  private readonly properties: Property[] = [];
  private readonly tours: Tour[] = [];
  private readonly notes: Note[] = [];
  private readonly comments: Comment[] = [];
  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = { id: this.id("user"), ...input };
    this.users.push(user);
    return user;
  }

  async getUser(tenantId: string, id: string): Promise<User | null> {
    return this.users.find((u) => u.tenantId === tenantId && u.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const target = email.toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === target) ?? null;
  }

  async listUsers(tenantId: string, role?: Role): Promise<User[]> {
    return this.users.filter(
      (u) => u.tenantId === tenantId && (role ? u.role === role : true),
    );
  }

  async createBoard(input: CreateBoardInput): Promise<Board> {
    const board: Board = { id: this.id("board"), createdAt: this.now(), ...input };
    this.boards.push(board);
    return board;
  }

  async getBoard(tenantId: string, id: string): Promise<Board | null> {
    return (
      this.boards.find((b) => b.tenantId === tenantId && b.id === id) ?? null
    );
  }

  async listBoardsForUser(tenantId: string, userId: string): Promise<Board[]> {
    return this.boards.filter(
      (b) =>
        b.tenantId === tenantId &&
        (b.agentId === userId || b.clientId === userId),
    );
  }

  async addProperty(input: AddPropertyInput): Promise<Property> {
    const property: Property = {
      id: this.id("prop"),
      stage: "new",
      createdAt: this.now(),
      ...input,
    };
    this.properties.push(property);
    return property;
  }

  async getProperty(tenantId: string, id: string): Promise<Property | null> {
    return (
      this.properties.find((p) => p.tenantId === tenantId && p.id === id) ?? null
    );
  }

  async listProperties(tenantId: string, boardId: string): Promise<Property[]> {
    return this.properties.filter(
      (p) => p.tenantId === tenantId && p.boardId === boardId,
    );
  }

  private mustGetProperty(tenantId: string, id: string): Property {
    const p = this.properties.find(
      (x) => x.tenantId === tenantId && x.id === id,
    );
    if (!p) {
      throw new AgentfolioError("not_found", `property ${id} not found`);
    }
    return p;
  }

  async updatePropertyStage(
    tenantId: string,
    id: string,
    stage: Stage,
  ): Promise<Property> {
    const p = this.mustGetProperty(tenantId, id);
    p.stage = stage;
    return p;
  }

  async setPropertyRecords(
    tenantId: string,
    id: string,
    records: PublicRecords,
  ): Promise<Property> {
    const p = this.mustGetProperty(tenantId, id);
    p.publicRecords = records;
    return p;
  }

  async setPropertyHandoff(
    tenantId: string,
    id: string,
    handoff: Handoff,
  ): Promise<Property> {
    const p = this.mustGetProperty(tenantId, id);
    p.handoff = handoff;
    return p;
  }

  async addTour(input: AddTourInput): Promise<Tour> {
    const tour: Tour = { id: this.id("tour"), ...input };
    this.tours.push(tour);
    return tour;
  }

  async listTours(tenantId: string, propertyId: string): Promise<Tour[]> {
    return this.tours.filter(
      (t) => t.tenantId === tenantId && t.propertyId === propertyId,
    );
  }

  async addNote(input: AddNoteInput): Promise<Note> {
    const note: Note = { id: this.id("note"), createdAt: this.now(), ...input };
    this.notes.push(note);
    return note;
  }

  async listNotes(tenantId: string, propertyId: string): Promise<Note[]> {
    return this.notes.filter(
      (n) => n.tenantId === tenantId && n.propertyId === propertyId,
    );
  }

  async addComment(input: AddCommentInput): Promise<Comment> {
    const comment: Comment = {
      id: this.id("cmt"),
      createdAt: this.now(),
      ...input,
    };
    this.comments.push(comment);
    return comment;
  }

  async listComments(tenantId: string, propertyId: string): Promise<Comment[]> {
    return this.comments.filter(
      (c) => c.tenantId === tenantId && c.propertyId === propertyId,
    );
  }
}

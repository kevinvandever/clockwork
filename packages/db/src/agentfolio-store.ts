import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  AgentfolioError,
  type AddCommentInput,
  type AddNoteInput,
  type AddPropertyInput,
  type AddTourInput,
  type AgentfolioStore,
  type Board,
  type Comment,
  type CreateBoardInput,
  type CreateUserInput,
  type Handoff,
  type Note,
  type Property,
  type PublicRecords,
  type Role,
  type Stage,
  type Tour,
  type User,
} from "@clockwork/agentfolio-core";

interface UserRow {
  id: string;
  tenant_id: string;
  role: Role;
  name: string;
  email: string;
}
interface BoardRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  client_id: string | null;
  title: string;
  created_at: string;
}
interface PropertyRow {
  id: string;
  tenant_id: string;
  board_id: string;
  address: string;
  stage: Stage;
  added_by: string;
  created_at: string;
  agent_private: Property["agentPrivate"] | null;
  public_records: PublicRecords | null;
  handoff: Handoff | null;
}
interface TourRow {
  id: string;
  tenant_id: string;
  property_id: string;
  scheduled_at: string;
  note: string | null;
}
interface NoteRow {
  id: string;
  tenant_id: string;
  property_id: string;
  author_id: string;
  visibility: Note["visibility"];
  body: string;
  created_at: string;
}
interface CommentRow {
  id: string;
  tenant_id: string;
  property_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

function toUser(r: UserRow): User {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role,
    name: r.name,
    email: r.email,
  };
}
function toBoard(r: BoardRow): Board {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    agentId: r.agent_id,
    clientId: r.client_id ?? undefined,
    title: r.title,
    createdAt: r.created_at,
  };
}
function toProperty(r: PropertyRow): Property {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    boardId: r.board_id,
    address: r.address,
    stage: r.stage,
    addedBy: r.added_by,
    createdAt: r.created_at,
    agentPrivate: r.agent_private ?? undefined,
    publicRecords: r.public_records ?? undefined,
    handoff: r.handoff ?? undefined,
  };
}
function toTour(r: TourRow): Tour {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    scheduledAt: r.scheduled_at,
    note: r.note ?? undefined,
  };
}
function toNote(r: NoteRow): Note {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    authorId: r.author_id,
    visibility: r.visibility,
    body: r.body,
    createdAt: r.created_at,
  };
}
function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
  };
}

/**
 * Postgres-backed agentfolio store. No access control (that lives in the
 * service); every method is tenant-scoped by parameter so cross-tenant reads
 * are not expressible. Mirrors InMemoryAgentfolioStore exactly.
 */
export class PostgresAgentfolioStore implements AgentfolioStore {
  constructor(private readonly pool: Pool) {}

  private now(): string {
    return new Date().toISOString();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = `user_${randomUUID()}`;
    await this.pool.query(
      `insert into af_users (id, tenant_id, role, name, email)
       values ($1, $2, $3, $4, $5)`,
      [id, input.tenantId, input.role, input.name, input.email],
    );
    return { id, ...input };
  }

  async getUser(tenantId: string, id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `select * from af_users where tenant_id = $1 and id = $2`,
      [tenantId, id],
    );
    return rows.length ? toUser(rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `select * from af_users where lower(email) = lower($1) limit 1`,
      [email],
    );
    return rows.length ? toUser(rows[0]) : null;
  }

  async listUsers(tenantId: string, role?: Role): Promise<User[]> {
    if (role) {
      const { rows } = await this.pool.query<UserRow>(
        `select * from af_users where tenant_id = $1 and role = $2 order by name`,
        [tenantId, role],
      );
      return rows.map(toUser);
    }
    const { rows } = await this.pool.query<UserRow>(
      `select * from af_users where tenant_id = $1 order by name`,
      [tenantId],
    );
    return rows.map(toUser);
  }

  async createBoard(input: CreateBoardInput): Promise<Board> {
    const id = `board_${randomUUID()}`;
    const createdAt = this.now();
    await this.pool.query(
      `insert into af_boards (id, tenant_id, agent_id, client_id, title, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.tenantId,
        input.agentId,
        input.clientId ?? null,
        input.title,
        createdAt,
      ],
    );
    return {
      id,
      tenantId: input.tenantId,
      agentId: input.agentId,
      clientId: input.clientId,
      title: input.title,
      createdAt,
    };
  }

  async getBoard(tenantId: string, id: string): Promise<Board | null> {
    const { rows } = await this.pool.query<BoardRow>(
      `select * from af_boards where tenant_id = $1 and id = $2`,
      [tenantId, id],
    );
    return rows.length ? toBoard(rows[0]) : null;
  }

  async listBoardsForUser(tenantId: string, userId: string): Promise<Board[]> {
    const { rows } = await this.pool.query<BoardRow>(
      `select * from af_boards
        where tenant_id = $1 and (agent_id = $2 or client_id = $2)
        order by created_at`,
      [tenantId, userId],
    );
    return rows.map(toBoard);
  }

  async addProperty(input: AddPropertyInput): Promise<Property> {
    const id = `prop_${randomUUID()}`;
    const createdAt = this.now();
    await this.pool.query(
      `insert into af_properties
         (id, tenant_id, board_id, address, stage, added_by, created_at, agent_private)
       values ($1, $2, $3, $4, 'new', $5, $6, $7::jsonb)`,
      [
        id,
        input.tenantId,
        input.boardId,
        input.address,
        input.addedBy,
        createdAt,
        input.agentPrivate ? JSON.stringify(input.agentPrivate) : null,
      ],
    );
    return {
      id,
      tenantId: input.tenantId,
      boardId: input.boardId,
      address: input.address,
      stage: "new",
      addedBy: input.addedBy,
      createdAt,
      agentPrivate: input.agentPrivate,
    };
  }

  async getProperty(tenantId: string, id: string): Promise<Property | null> {
    const { rows } = await this.pool.query<PropertyRow>(
      `select * from af_properties where tenant_id = $1 and id = $2`,
      [tenantId, id],
    );
    return rows.length ? toProperty(rows[0]) : null;
  }

  async listProperties(tenantId: string, boardId: string): Promise<Property[]> {
    const { rows } = await this.pool.query<PropertyRow>(
      `select * from af_properties where tenant_id = $1 and board_id = $2
        order by created_at`,
      [tenantId, boardId],
    );
    return rows.map(toProperty);
  }

  private async mustGetProperty(
    tenantId: string,
    id: string,
  ): Promise<PropertyRow> {
    const { rows } = await this.pool.query<PropertyRow>(
      `select * from af_properties where tenant_id = $1 and id = $2`,
      [tenantId, id],
    );
    if (rows.length === 0) {
      throw new AgentfolioError("not_found", `property ${id} not found`);
    }
    return rows[0];
  }

  async updatePropertyStage(
    tenantId: string,
    id: string,
    stage: Stage,
  ): Promise<Property> {
    await this.mustGetProperty(tenantId, id);
    const { rows } = await this.pool.query<PropertyRow>(
      `update af_properties set stage = $3 where tenant_id = $1 and id = $2
       returning *`,
      [tenantId, id, stage],
    );
    return toProperty(rows[0]);
  }

  async setPropertyRecords(
    tenantId: string,
    id: string,
    records: PublicRecords,
  ): Promise<Property> {
    await this.mustGetProperty(tenantId, id);
    const { rows } = await this.pool.query<PropertyRow>(
      `update af_properties set public_records = $3::jsonb
        where tenant_id = $1 and id = $2 returning *`,
      [tenantId, id, JSON.stringify(records)],
    );
    return toProperty(rows[0]);
  }

  async setPropertyHandoff(
    tenantId: string,
    id: string,
    handoff: Handoff,
  ): Promise<Property> {
    await this.mustGetProperty(tenantId, id);
    const { rows } = await this.pool.query<PropertyRow>(
      `update af_properties set handoff = $3::jsonb
        where tenant_id = $1 and id = $2 returning *`,
      [tenantId, id, JSON.stringify(handoff)],
    );
    return toProperty(rows[0]);
  }

  async addTour(input: AddTourInput): Promise<Tour> {
    const id = `tour_${randomUUID()}`;
    await this.pool.query(
      `insert into af_tours (id, tenant_id, property_id, scheduled_at, note)
       values ($1, $2, $3, $4, $5)`,
      [
        id,
        input.tenantId,
        input.propertyId,
        input.scheduledAt,
        input.note ?? null,
      ],
    );
    return {
      id,
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      scheduledAt: input.scheduledAt,
      note: input.note,
    };
  }

  async listTours(tenantId: string, propertyId: string): Promise<Tour[]> {
    const { rows } = await this.pool.query<TourRow>(
      `select * from af_tours where tenant_id = $1 and property_id = $2
        order by scheduled_at`,
      [tenantId, propertyId],
    );
    return rows.map(toTour);
  }

  async addNote(input: AddNoteInput): Promise<Note> {
    const id = `note_${randomUUID()}`;
    const createdAt = this.now();
    await this.pool.query(
      `insert into af_notes
         (id, tenant_id, property_id, author_id, visibility, body, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.tenantId,
        input.propertyId,
        input.authorId,
        input.visibility,
        input.body,
        createdAt,
      ],
    );
    return {
      id,
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      authorId: input.authorId,
      visibility: input.visibility,
      body: input.body,
      createdAt,
    };
  }

  async listNotes(tenantId: string, propertyId: string): Promise<Note[]> {
    const { rows } = await this.pool.query<NoteRow>(
      `select * from af_notes where tenant_id = $1 and property_id = $2
        order by created_at`,
      [tenantId, propertyId],
    );
    return rows.map(toNote);
  }

  async addComment(input: AddCommentInput): Promise<Comment> {
    const id = `cmt_${randomUUID()}`;
    const createdAt = this.now();
    await this.pool.query(
      `insert into af_comments
         (id, tenant_id, property_id, author_id, body, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.tenantId,
        input.propertyId,
        input.authorId,
        input.body,
        createdAt,
      ],
    );
    return {
      id,
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      authorId: input.authorId,
      body: input.body,
      createdAt,
    };
  }

  async listComments(tenantId: string, propertyId: string): Promise<Comment[]> {
    const { rows } = await this.pool.query<CommentRow>(
      `select * from af_comments where tenant_id = $1 and property_id = $2
        order by created_at`,
      [tenantId, propertyId],
    );
    return rows.map(toComment);
  }
}

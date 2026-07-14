import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { STAGES, type Stage } from "@clockwork/agentfolio-core";
import { getApp } from "@/lib/app";
import { getActor } from "@/lib/session";
import {
  addCommentAction,
  addNoteAction,
  addPropertyAction,
  handoffAction,
  moveStageAction,
  refreshRecordsAction,
} from "../../actions";

/** Friendly labels + one-line meaning for each pipeline stage. */
const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  touring: "Touring",
  offer: "Offer",
  passed: "Passed",
};
const STAGE_HELP: Record<Stage, string> = {
  new: "Just added — not visited yet",
  touring: "Scheduled or visited",
  offer: "An offer is in play",
  passed: "Ruled out",
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) {
    redirect("/");
  }
  const { id: boardId } = await params;
  const { service } = await getApp();

  const board = await service.getBoard(actor, boardId).catch(() => null);
  if (!board) {
    notFound();
  }

  const properties = await service.listProperties(actor, boardId);
  const enriched = await Promise.all(
    properties.map(async (property) => ({
      property,
      notes: await service.listNotes(actor, property.id),
      comments: await service.listComments(actor, property.id),
    })),
  );

  const isAgent = actor.role === "agent";

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/boards" className="text-sm text-zinc-500 underline">
            ← All searches
          </Link>
          <h1 className="text-2xl font-semibold">{board.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Properties move through stages as the search progresses:{" "}
            <span className="font-medium">New → Touring → Offer → Passed</span>.
          </p>
        </div>
        <span
          className="rounded-full bg-zinc-200 px-3 py-1 text-sm"
          title={
            isAgent
              ? "You see everything, including your private notes."
              : "You see the shared view — your agent's private notes are hidden."
          }
        >
          {isAgent ? "Agent view" : "Client view"}
        </span>
      </div>

      {isAgent && (
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          This is your view. Your client sees the same properties, stages, and
          comments — but never your agent-private notes.
        </p>
      )}

      {enriched.length === 0 && (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
          No properties yet. Add the first one at the bottom.
        </p>
      )}

      {STAGES.map((stage) => {
        const inStage = enriched.filter((e) => e.property.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <section key={stage} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                {STAGE_LABEL[stage]} ({inStage.length})
              </h2>
              <span className="text-xs text-zinc-400">{STAGE_HELP[stage]}</span>
            </div>
            {inStage.map(({ property, notes, comments }) => (
              <article
                key={property.id}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">
                    {property.address}
                    {property.handoff && (
                      <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        in transaction
                      </span>
                    )}
                  </h3>
                  {property.publicRecords && (
                    <span className="text-xs text-zinc-500">
                      {property.publicRecords.owner}
                      {property.publicRecords.assessedValue
                        ? ` · assessed $${property.publicRecords.assessedValue.toLocaleString()}`
                        : ""}
                    </span>
                  )}
                </div>

                {isAgent && property.agentPrivate?.strategy && (
                  <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-800">
                    <span className="font-medium">Private strategy:</span>{" "}
                    {property.agentPrivate.strategy}
                    <span className="ml-1 text-xs text-amber-600">
                      (only you see this)
                    </span>
                  </p>
                )}

                {/* Stage control (agent) */}
                {isAgent && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-zinc-500">
                      Move to stage:
                    </p>
                    <form
                      action={moveStageAction}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="boardId" value={boardId} />
                      <input
                        type="hidden"
                        name="propertyId"
                        value={property.id}
                      />
                      {STAGES.filter((s) => s !== property.stage).map((s) => (
                        <button
                          key={s}
                          name="stage"
                          value={s}
                          className="cursor-pointer rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-500"
                        >
                          {STAGE_LABEL[s]}
                        </button>
                      ))}
                    </form>
                  </div>
                )}

                {/* Notes: the agent's record of this property */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-zinc-500">
                    Notes{" "}
                    {isAgent && (
                      <span className="font-normal text-zinc-400">
                        — your record; mark private to hide from your client
                      </span>
                    )}
                  </p>
                  <div className="mt-1 space-y-1">
                    {notes.length === 0 && (
                      <p className="text-sm text-zinc-400">No notes yet.</p>
                    )}
                    {notes.map((n) => (
                      <p key={n.id} className="text-sm">
                        {n.visibility === "agent_private" && (
                          <span className="mr-1 rounded bg-amber-100 px-1 text-xs text-amber-800">
                            private
                          </span>
                        )}
                        {n.body}
                      </p>
                    ))}
                  </div>

                  {isAgent && (
                    <form action={addNoteAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="boardId" value={boardId} />
                      <input
                        type="hidden"
                        name="propertyId"
                        value={property.id}
                      />
                      <input
                        name="body"
                        placeholder="Add a note"
                        className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <select
                        name="visibility"
                        className="rounded border border-zinc-300 px-1 text-sm"
                        title="Shared notes are visible to your client; private notes are not."
                      >
                        <option value="shared">shared</option>
                        <option value="agent_private">private</option>
                      </select>
                      <button className="cursor-pointer rounded bg-zinc-900 px-3 py-1 text-sm text-white">
                        Add note
                      </button>
                    </form>
                  )}
                </div>

                {/* Comments: the shared agent ↔ client conversation */}
                <div className="mt-4 border-t border-zinc-100 pt-3">
                  <p className="text-xs font-medium text-zinc-500">
                    Comments{" "}
                    <span className="font-normal text-zinc-400">
                      — shared conversation between you and your{" "}
                      {isAgent ? "client" : "agent"}
                    </span>
                  </p>
                  <div className="mt-1 space-y-1">
                    {comments.map((c) => (
                      <p key={c.id} className="text-sm text-zinc-700">
                        💬 {c.body}
                      </p>
                    ))}
                  </div>
                  <form action={addCommentAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="boardId" value={boardId} />
                    <input
                      type="hidden"
                      name="propertyId"
                      value={property.id}
                    />
                    <input
                      name="body"
                      placeholder="Add a comment"
                      className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <button className="cursor-pointer rounded border border-zinc-300 px-3 py-1 text-sm">
                      Comment
                    </button>
                  </form>
                </div>

                {/* Agent-only property actions */}
                {isAgent && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
                    <form action={refreshRecordsAction}>
                      <input type="hidden" name="boardId" value={boardId} />
                      <input
                        type="hidden"
                        name="propertyId"
                        value={property.id}
                      />
                      <button className="cursor-pointer text-xs text-zinc-500 underline">
                        Refresh owner / tax records
                      </button>
                    </form>
                    {!property.handoff && (
                      <form action={handoffAction}>
                        <input type="hidden" name="boardId" value={boardId} />
                        <input
                          type="hidden"
                          name="propertyId"
                          value={property.id}
                        />
                        <button
                          className="cursor-pointer rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                          title="Move this property into the transaction room (for when an offer is accepted)."
                        >
                          Start transaction
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        );
      })}

      {/* Add a property */}
      <section className="space-y-2 border-t border-zinc-200 pt-4">
        <h2 className="text-sm font-medium text-zinc-700">Add a property</h2>
        <form action={addPropertyAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="boardId" value={boardId} />
          <input
            name="address"
            placeholder="Property address"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
          {isAgent && (
            <input
              name="strategy"
              placeholder="Private strategy note (optional, only you see it)"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
            />
          )}
          <button className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-white">
            Add property
          </button>
        </form>
      </section>
    </main>
  );
}

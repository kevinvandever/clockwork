import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { STAGES, type Stage } from "@clockwork/agentfolio-core";
import { getApp } from "@/lib/app";
import { getActor } from "@/lib/session";
import {
  addCommentAction,
  addNoteAction,
  addPropertyAction,
  moveStageAction,
} from "../../actions";

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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/boards" className="text-sm text-zinc-500 underline">
            ← Boards
          </Link>
          <h1 className="text-2xl font-semibold">{board.title}</h1>
        </div>
        <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm">
          {actor.role} view
        </span>
      </div>

      {STAGES.map((stage) => {
        const inStage = enriched.filter((e) => e.property.stage === stage);
        return (
          <section key={stage} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {stage} ({inStage.length})
            </h2>
            {inStage.map(({ property, notes, comments }) => (
              <article
                key={property.id}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">{property.address}</h3>
                  {property.publicRecords?.owner && (
                    <span className="text-xs text-zinc-500">
                      owner: {property.publicRecords.owner}
                    </span>
                  )}
                </div>

                {isAgent && property.agentPrivate?.strategy && (
                  <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-sm text-amber-800">
                    Agent-private: {property.agentPrivate.strategy}
                  </p>
                )}

                {isAgent && (
                  <form action={moveStageAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="boardId" value={boardId} />
                    <input type="hidden" name="propertyId" value={property.id} />
                    {STAGES.filter((s) => s !== property.stage).map((s) => (
                      <button
                        key={s}
                        name="stage"
                        value={s}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-500"
                      >
                        → {s}
                      </button>
                    ))}
                  </form>
                )}

                <div className="mt-3 space-y-1">
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

                <form action={addNoteAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="boardId" value={boardId} />
                  <input type="hidden" name="propertyId" value={property.id} />
                  <input
                    name="body"
                    placeholder="Add a note"
                    className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                  />
                  {isAgent && (
                    <select
                      name="visibility"
                      className="rounded border border-zinc-300 px-1 text-sm"
                    >
                      <option value="shared">shared</option>
                      <option value="agent_private">private</option>
                    </select>
                  )}
                  <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white">
                    Note
                  </button>
                </form>

                <div className="mt-3 border-t border-zinc-100 pt-2">
                  {comments.map((c) => (
                    <p key={c.id} className="text-sm text-zinc-700">
                      💬 {c.body}
                    </p>
                  ))}
                  <form action={addCommentAction} className="mt-1 flex gap-2">
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
                    <button className="rounded border border-zinc-300 px-3 py-1 text-sm">
                      Comment
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </section>
        );
      })}

      <form
        action={addPropertyAction}
        className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4"
      >
        <input type="hidden" name="boardId" value={boardId} />
        <input
          name="address"
          placeholder="Property address"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
        />
        {isAgent && (
          <input
            name="strategy"
            placeholder="Agent-private strategy (optional)"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
        )}
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-white">
          Add property
        </button>
      </form>
    </main>
  );
}

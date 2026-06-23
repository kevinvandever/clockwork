import Link from "next/link";
import { redirect } from "next/navigation";
import { getApp } from "@/lib/app";
import { getActor } from "@/lib/session";
import { createBoardAction, logoutAction } from "../actions";

export default async function BoardsPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/");
  }
  const { service } = await getApp();
  const boards = await service.listMyBoards(actor);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Boards</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span className="rounded-full bg-zinc-200 px-3 py-1">
            {actor.role}
          </span>
          <form action={logoutAction}>
            <button className="underline">Log out</button>
          </form>
        </div>
      </div>

      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id}>
            <Link
              href={`/boards/${b.id}`}
              className="block rounded-md border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400"
            >
              {b.title}
            </Link>
          </li>
        ))}
        {boards.length === 0 && (
          <li className="text-zinc-500">No boards yet.</li>
        )}
      </ul>

      {actor.role === "agent" && (
        <form action={createBoardAction} className="flex gap-2">
          <input
            name="title"
            placeholder="New board title"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-white">
            Create board
          </button>
        </form>
      )}
    </main>
  );
}

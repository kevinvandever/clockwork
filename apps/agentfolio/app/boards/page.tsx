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
  const isAgent = actor.role === "agent";

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Property searches</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          {isAgent && (
            <>
              <Link href="/newsletter" className="underline">
                Newsletter
              </Link>
              <Link href="/settings" className="underline">
                Settings
              </Link>
            </>
          )}
          <span className="rounded-full bg-zinc-200 px-3 py-1">
            {actor.role}
          </span>
          <form action={logoutAction}>
            <button className="underline">Log out</button>
          </form>
        </div>
      </div>

      <p className="text-zinc-600">
        {isAgent
          ? "Each board is a shared property search you run with one buyer. You and your client see the same properties and stages; your private notes stay hidden from them."
          : "Each board is a property search you share with your agent. You can add properties you like and comment on them."}
      </p>

      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id}>
            <Link
              href={`/boards/${b.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <span className="font-medium">{b.title}</span>
              <span className="text-sm text-zinc-500">Open →</span>
            </Link>
          </li>
        ))}
        {boards.length === 0 && (
          <li className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
            {isAgent
              ? "No searches yet. Create one below to start tracking properties with a client."
              : "No searches yet. Your agent will start one with you."}
          </li>
        )}
      </ul>

      {isAgent && (
        <section className="space-y-2 border-t border-zinc-200 pt-4">
          <h2 className="text-sm font-medium text-zinc-700">
            Start a new search
          </h2>
          <p className="text-sm text-zinc-500">
            Give it a name your client will recognize — usually their name or
            the area they&apos;re searching (e.g. &quot;Cal&apos;s Home
            Search&quot;).
          </p>
          <form action={createBoardAction} className="flex gap-2">
            <input
              name="title"
              placeholder="e.g. Cal's Home Search"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
            />
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-white">
              Create search
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

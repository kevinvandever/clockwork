import { redirect } from "next/navigation";
import { getApp } from "@/lib/app";
import { getActor } from "@/lib/session";
import { loginAction } from "./actions";

export default async function LoginPage() {
  if (await getActor()) {
    redirect("/boards");
  }
  const app = await getApp();

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">agentfolio</h1>
        <p className="text-zinc-600">
          Demo login — pick a seeded user to see their view of the board.
        </p>
      </header>

      <div className="flex gap-4">
        <form action={loginAction}>
          <input type="hidden" name="userId" value={app.agentId} />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-white">
            Log in as Joe (agent)
          </button>
        </form>
        <form action={loginAction}>
          <input type="hidden" name="userId" value={app.clientId} />
          <button className="rounded-md border border-zinc-300 px-4 py-2">
            Log in as Cal (client)
          </button>
        </form>
      </div>
    </main>
  );
}

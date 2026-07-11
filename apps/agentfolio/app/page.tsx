import { redirect } from "next/navigation";
import { getApp } from "@/lib/app";
import { getActor } from "@/lib/session";
import { loginAction } from "./actions";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  if (await getActor()) {
    redirect("/boards");
  }
  const app = await getApp();
  const params = await searchParams;
  const error = params.error === "invalid";

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">agentfolio</h1>
        <p className="text-zinc-600">
          Log in to access your boards and tools.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          Invalid password. Please try again.
        </p>
      )}

      <form action={loginAction} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="userId"
              value={app.agentId}
              defaultChecked
            />
            Joe (agent)
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" name="userId" value={app.clientId} />
            Cal (client)
          </label>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            className="mt-1 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          {!process.env.AGENT_PASSWORD && (
            <p className="mt-1 text-xs text-zinc-400">
              No password configured — leave blank for dev mode.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Log in
        </button>
      </form>
    </main>
  );
}

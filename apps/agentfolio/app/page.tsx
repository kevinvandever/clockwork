import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { loginAction } from "./actions";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  if (await getActor()) {
    redirect("/boards");
  }
  const params = await searchParams;
  const error = params.error === "invalid";
  // In dev (no password configured) hint the seeded demo login.
  const devHint = !process.env.AGENT_PASSWORD && !process.env.SESSION_SECRET;

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">agentfolio</h1>
        <p className="text-zinc-600">Log in to access your boards and tools.</p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          Invalid email or password. Please try again.
        </p>
      )}

      <form action={loginAction} className="max-w-xs space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
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
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Log in
        </button>

        {devHint && (
          <p className="text-xs text-zinc-400">
            Dev mode — try <code>joe@demo.com</code> with any password.
          </p>
        )}
      </form>
    </main>
  );
}

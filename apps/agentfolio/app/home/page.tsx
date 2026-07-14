import Link from "next/link";
import { redirect } from "next/navigation";
import { resolvePersonaName } from "@clockwork/config";
import { getApp } from "@/lib/app";
import { getNewsletterStore } from "@/lib/newsletter";
import { getActor } from "@/lib/session";
import { logoutAction } from "../actions";

/** Compact relative time for the feed (server-rendered, UTC-based). */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTIVITY_LABEL: Record<string, string> = {
  property_added: "Property added",
  stage_changed: "Stage changed",
  handoff_initiated: "Handed off to transaction",
};

export default async function HomePage() {
  const actor = await getActor();
  if (!actor) redirect("/");
  // Home is the agent's cockpit; clients go straight to their board.
  if (actor.role !== "agent") redirect("/boards");

  const { service, activityLog, tenantStore } = await getApp();

  const [tenant, boards, activity, drafts] = await Promise.all([
    tenantStore.getTenant(actor.tenantId),
    service.listMyBoards(actor),
    activityLog.query({
      tenantId: actor.tenantId,
      newestFirst: true,
      limit: 8,
    }),
    getNewsletterStore().list(actor.tenantId),
  ]);

  const overrides = tenant?.personaOverrides ?? {};
  const marketingName = resolvePersonaName("marketing", overrides);
  const recentDrafts = [...drafts]
    .sort((a, b) => (a.storySubmittedAt < b.storySubmittedAt ? 1 : -1))
    .slice(0, 5);

  const comingSoon = [
    {
      name: resolvePersonaName("pipeline", overrides),
      role: "Pipeline",
      blurb: "Instant replies to new leads, the moment they arrive.",
    },
    {
      name: resolvePersonaName("clientCare", overrides),
      role: "Client Care",
      blurb: "Sphere touches, anniversaries, and check-ins on cadence.",
    },
    {
      name: resolvePersonaName("chiefOfStaff", overrides),
      role: "Chief of Staff",
      blurb: "A daily brief synthesizing everything above.",
    },
  ];

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Home</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <Link href="/boards" className="underline">
            Searches
          </Link>
          <Link href="/newsletter" className="underline">
            Newsletter
          </Link>
          <Link href="/settings" className="underline">
            Settings
          </Link>
          <form action={logoutAction}>
            <button className="cursor-pointer underline">Log out</button>
          </form>
        </div>
      </div>

      {/* Recent activity */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
            Nothing yet. Activity from your searches and robots shows up here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>
                  <span className="text-zinc-500">{a.robot}</span>{" "}
                  {ACTIVITY_LABEL[a.action] ?? a.action}
                  {a.detail ? (
                    <span className="text-zinc-500"> — {a.detail}</span>
                  ) : null}
                </span>
                <span className="text-xs text-zinc-400">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Newsletter (Marketing — live) */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Newsletter drafts
            <span className="ml-2 font-normal normal-case tracking-normal text-zinc-400">
              {marketingName} · Marketing
            </span>
          </h2>
          <Link href="/newsletter" className="text-sm text-zinc-500 underline">
            New draft →
          </Link>
        </div>
        {recentDrafts.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
            No drafts yet.{" "}
            <Link href="/newsletter" className="underline">
              Draft your first newsletter
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
            {recentDrafts.map((d) => (
              <li key={d.id} className="px-4 py-2 text-sm">
                <Link
                  href={`/newsletter?id=${d.id}`}
                  className="flex items-center justify-between hover:underline"
                >
                  <span className="truncate">
                    {d.status === "ready"
                      ? d.headline || "Untitled draft"
                      : d.status === "refused"
                        ? "Refused — needs more input"
                        : d.status === "error"
                          ? "Error — try again"
                          : "Draft"}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-zinc-400">
                    {d.disposition ?? d.status} · {timeAgo(d.storySubmittedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Searches */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Property searches
          </h2>
          <Link href="/boards" className="text-sm text-zinc-500 underline">
            All searches →
          </Link>
        </div>
        {boards.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
            No searches yet.{" "}
            <Link href="/boards" className="underline">
              Start one with a buyer
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {boards.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boards/${b.id}`}
                  className="block rounded-md border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <span className="font-medium">{b.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coming soon — the rest of the roster */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Coming soon
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {comingSoon.map((r) => (
            <div
              key={r.role}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-zinc-700">{r.name}</span>
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  soon
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{r.role}</p>
              <p className="mt-2 text-sm text-zinc-600">{r.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

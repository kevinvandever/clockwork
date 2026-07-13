import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { getNewsletterStore } from "@/lib/newsletter";
import { submitStoryAction, setDispositionAction } from "./actions";
import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsletterPage({ searchParams }: PageProps) {
  const actor = await getActor();
  if (!actor) redirect("/");
  // Newsletter drafting is an agent tool (spends the agent's API budget).
  if (actor.role !== "agent") redirect("/boards");

  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;
  const disposed = typeof params.disposed === "string";
  const prefillKind =
    typeof params.kind === "string" ? params.kind : undefined;
  const prefillValue =
    typeof params.value === "string" ? params.value : undefined;

  // Special states (no draft ID)
  if (state === "missing_key") {
    return <MissingKeyState />;
  }

  if (state === "needs_paste") {
    return (
      <NeedsPasteState
        originalKind={prefillKind}
        originalValue={prefillValue}
      />
    );
  }

  // If we have an ID, fetch the draft record
  if (id) {
    const store = getNewsletterStore();
    const record = await store.get(actor.tenantId, id);

    if (!record) {
      return <EmptyState />;
    }

    switch (record.status) {
      case "ready":
        return <DraftReadyState record={record} disposed={disposed} />;
      case "refused":
        return <RefusalState reason={record.refusalReason} />;
      case "error":
        return <ErrorState record={record} />;
      default:
        return <EmptyState />;
    }
  }

  // Default: empty form
  return <EmptyState kind={prefillKind} value={prefillValue} />;
}

// --- State Components ---

/** Persistent nav so there's always a way back to the app. */
function TopNav() {
  return (
    <nav className="flex gap-4 text-sm text-zinc-500">
      <a href="/boards" className="underline hover:text-zinc-800">
        Boards
      </a>
      <a href="/settings" className="underline hover:text-zinc-800">
        Settings
      </a>
    </nav>
  );
}

function EmptyState({ kind, value }: { kind?: string; value?: string }) {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
        <p className="text-zinc-600">
          Paste a URL, the article text, or your notes — one anchor story
          becomes a publish-ready piece.
        </p>
      </header>

      <form action={submitStoryAction} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-700">
            Story type
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="kind"
                value="url"
                defaultChecked={kind === "url"}
              />
              URL
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="kind"
                value="text"
                defaultChecked={kind === "text" || !kind}
              />
              Article text
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="kind"
                value="notes"
                defaultChecked={kind === "notes"}
              />
              Notes
            </label>
          </div>
        </fieldset>

        <textarea
          name="value"
          rows={8}
          required
          defaultValue={value ?? ""}
          placeholder="Paste a URL, the article text, or your notes"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />

        <SubmitButton pendingText="Drafting…">Draft it</SubmitButton>
        <p className="text-xs text-zinc-400">
          Drafting calls Claude and can take up to a minute.
        </p>
      </form>
    </main>
  );
}

function DraftReadyState({
  record,
  disposed,
}: {
  record: {
    id: string;
    headline: string;
    body: string;
    wordCount: number;
    editorNotes: string[];
    disposition?: string;
  };
  disposed: boolean;
}) {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
      </header>

      <article className="space-y-4">
        <h2 className="text-xl font-semibold">{record.headline}</h2>

        <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {record.body}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {record.wordCount} words
          </span>
          <CopyButton text={record.body} />
        </div>

        {record.editorNotes.length > 0 && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-medium text-zinc-700">
              Editor&apos;s notes
            </h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600">
              {record.editorNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* Disposition */}
      {disposed || record.disposition ? (
        <p className="text-sm text-zinc-600">
          Marked as:{" "}
          <span className="font-medium">
            {record.disposition ?? "recorded"}
          </span>
        </p>
      ) : (
        <form action={setDispositionAction} className="space-y-2">
          <input type="hidden" name="draftId" value={record.id} />
          <p className="text-sm text-zinc-600">What did you do with it?</p>
          <div className="flex gap-2">
            <button
              type="submit"
              name="disposition"
              value="published-as-is"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Published as-is
            </button>
            <button
              type="submit"
              name="disposition"
              value="edited"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Edited
            </button>
            <button
              type="submit"
              name="disposition"
              value="discarded"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Discarded
            </button>
          </div>
        </form>
      )}

      <a href="/newsletter" className="inline-block text-sm text-zinc-500 underline">
        Draft another
      </a>
    </main>
  );
}

function RefusalState({ reason }: { reason?: string }) {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
      </header>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-medium text-amber-800">
          Needs more to work with
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          {reason || "The story is too thin to support a real take. Send the article body or your notes."}
        </p>
      </div>

      <a
        href="/newsletter"
        className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        Try again
      </a>
    </main>
  );
}

function ErrorState({
  record,
}: {
  record: { input: { kind: string; value: string }; id: string };
}) {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
      </header>

      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-medium text-red-800">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-red-700">
          The draft couldn&apos;t be generated. Your story is preserved below —
          try again when ready.
        </p>
      </div>

      {/* Show the submitted story so Joe doesn't lose it */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-medium text-zinc-500">Your submitted story:</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
          {record.input.value}
        </p>
      </div>

      {/* Retry form pre-filled with the original story */}
      <form action={submitStoryAction} className="space-y-3">
        <input type="hidden" name="kind" value={record.input.kind} />
        <textarea
          name="value"
          rows={6}
          defaultValue={record.input.value}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton pendingText="Drafting…">Retry</SubmitButton>
      </form>
    </main>
  );
}

function NeedsPasteState({
  originalKind,
  originalValue,
}: {
  originalKind?: string;
  originalValue?: string;
}) {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
      </header>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-medium text-amber-800">
          Couldn&apos;t fetch the article
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          The URL couldn&apos;t be retrieved (it may be paywalled or
          unavailable). Paste the article text instead.
        </p>
      </div>

      <form action={submitStoryAction} className="space-y-4">
        <input type="hidden" name="kind" value="text" />
        <textarea
          name="value"
          rows={8}
          required
          defaultValue={originalValue ?? ""}
          placeholder="Paste the article text here"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <SubmitButton pendingText="Drafting…">Draft it</SubmitButton>
      </form>
    </main>
  );
}

function MissingKeyState() {
  return (
    <main className="space-y-6">
      <TopNav />
      <header>
        <h1 className="text-2xl font-semibold">Newsletter Draft</h1>
      </header>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-medium text-zinc-800">Setup needed</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Add your Anthropic API key in{" "}
          <a href="/settings" className="font-medium underline">
            Settings
          </a>{" "}
          to enable newsletter drafting. Your key is stored encrypted and used
          only to draft your newsletters.
        </p>
      </div>

      <a
        href="/settings"
        className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        Go to Settings
      </a>
    </main>
  );
}

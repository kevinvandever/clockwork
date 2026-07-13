import { redirect } from "next/navigation";
import {
  ROBOT_KEYS,
  DEFAULT_PERSONAS,
  type RobotKey,
} from "@clockwork/config";
import { getActor } from "@/lib/session";
import { getTenantStore } from "@/lib/app";
import {
  setApiKeyAction,
  removeApiKeyAction,
  setPersonaNamesAction,
  setSkillAction,
} from "./actions";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface SkillView {
  robot: RobotKey;
  role: string;
  name: string;
  version: number;
  text: string;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const actor = await getActor();
  if (!actor) redirect("/");
  if (actor.role !== "agent") redirect("/boards");

  const params = await searchParams;
  const saved = typeof params.saved === "string" ? params.saved : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  const tenantStore = await getTenantStore();
  const tenant = await tenantStore.getTenant(actor.tenantId);
  const hasKey = await tenantStore.hasApiKey(actor.tenantId);
  const overrides = tenant?.personaOverrides ?? {};

  // Collect the robots that currently have a skill set (seeded or edited).
  const skills: SkillView[] = [];
  for (const robot of ROBOT_KEYS) {
    const skill = await tenantStore.getSkill(actor.tenantId, robot);
    if (skill) {
      skills.push({
        robot,
        role: DEFAULT_PERSONAS[robot].role,
        name: overrides[robot] ?? DEFAULT_PERSONAS[robot].defaultName,
        version: skill.version,
        text: skill.text,
      });
    }
  }

  return (
    <main className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-zinc-600">
          Your Anthropic key, your robot names, and your skills — all private to
          your practice.
        </p>
      </header>

      {saved && <Banner tone="ok">{savedMessage(saved)}</Banner>}
      {error && <Banner tone="err">{errorMessage(error)}</Banner>}

      {/* --- API key --- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Anthropic API key</h2>
          <p className="text-sm text-zinc-600">
            Bring your own key. It&apos;s stored encrypted and used only to draft
            your work. We never display it back.
          </p>
        </div>

        <p className="text-sm">
          Status:{" "}
          {hasKey ? (
            <span className="font-medium text-green-700">Key is set</span>
          ) : (
            <span className="font-medium text-amber-700">No key set</span>
          )}
        </p>

        <form action={setApiKeyAction} className="space-y-2">
          <input
            type="password"
            name="apiKey"
            autoComplete="off"
            placeholder={hasKey ? "Enter a new key to replace" : "sk-ant-..."}
            className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <div>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              {hasKey ? "Replace key" : "Save key"}
            </button>
          </div>
        </form>

        {hasKey && (
          <form action={removeApiKeyAction}>
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Remove key
            </button>
          </form>
        )}
      </section>

      {/* --- Robot names --- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Robot names</h2>
          <p className="text-sm text-zinc-600">
            Rename any robot. Leave blank to use the default. Names flow through
            drafted messages, the activity log, and the Chief of Staff brief.
          </p>
        </div>

        <form action={setPersonaNamesAction} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROBOT_KEYS.map((key) => (
              <label key={key} className="block text-sm">
                <span className="text-zinc-700">
                  {DEFAULT_PERSONAS[key].role}
                </span>
                <input
                  type="text"
                  name={`persona_${key}`}
                  defaultValue={overrides[key] ?? ""}
                  placeholder={DEFAULT_PERSONAS[key].defaultName}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Save names
          </button>
        </form>
      </section>

      {/* --- Skills --- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Skills</h2>
          <p className="text-sm text-zinc-600">
            Your robots&apos; instructions. Edits save a new version — your
            history is kept.
          </p>
        </div>

        {skills.length === 0 ? (
          <p className="text-sm text-zinc-500">No skills configured yet.</p>
        ) : (
          skills.map((skill) => (
            <form
              key={skill.robot}
              action={setSkillAction}
              className="space-y-2 rounded-md border border-zinc-200 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-800">
                  {skill.name}{" "}
                  <span className="font-normal text-zinc-500">
                    ({skill.role})
                  </span>
                </h3>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  v{skill.version}
                </span>
              </div>
              <input type="hidden" name="robot" value={skill.robot} />
              <textarea
                name="text"
                rows={10}
                defaultValue={skill.text}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Save new version
              </button>
            </form>
          ))
        )}
      </section>

      <a href="/boards" className="inline-block text-sm text-zinc-500 underline">
        Back to boards
      </a>
    </main>
  );
}

function savedMessage(saved: string): string {
  switch (saved) {
    case "key":
      return "API key saved.";
    case "key_removed":
      return "API key removed.";
    case "names":
      return "Robot names saved.";
    case "skill":
      return "Skill saved as a new version.";
    default:
      return "Saved.";
  }
}

function errorMessage(error: string): string {
  switch (error) {
    case "empty_key":
      return "The API key can't be empty.";
    case "empty_skill":
      return "The skill text can't be empty.";
    case "bad_robot":
      return "Unknown robot.";
    default:
      return "Something went wrong.";
  }
}

function Banner({
  tone,
  children,
}: {
  tone: "ok" | "err";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-red-200 bg-red-50 text-red-800";
  return (
    <div className={`rounded-md border p-3 text-sm ${cls}`}>{children}</div>
  );
}

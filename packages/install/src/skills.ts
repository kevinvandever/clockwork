import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SkillInstructions } from "./install.js";

/** Repo-root `skills/` dir, resolved from this module (dist/skills.js → ../../../skills). */
function defaultSkillsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../../skills");
}

function tryRead(dir: string, file: string): string | undefined {
  try {
    return readFileSync(resolve(dir, file), "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Best-effort load of Joe's skill text from `skills/*.md`, mapped to robots per
 * skills/README.md. Missing files are simply omitted (stubs ignore them anyway).
 */
export function loadSkills(dir: string = defaultSkillsDir()): SkillInstructions {
  return {
    marketing: tryRead(dir, "newsletter-draft.md"),
    clientCare: tryRead(dir, "sal-method.md"),
  };
}

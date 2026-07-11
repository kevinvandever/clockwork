"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { getNewsletterStore, getOrchestrator } from "@/lib/newsletter";
import { DEMO_TENANT } from "@/lib/app";
import type { StoryInput } from "@clockwork/marketing";

/**
 * Submit a story for newsletter drafting.
 * Reads kind/value from the form, orchestrates the draft server-side,
 * and redirects to the result page.
 */
export async function submitStoryAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const kind = String(formData.get("kind") ?? "text") as StoryInput["kind"];
  const value = String(formData.get("value") ?? "").trim();

  if (!value) {
    redirect("/newsletter");
    return;
  }

  const tenantId = DEMO_TENANT;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const orchestrator = getOrchestrator();

  const result = await orchestrator.submit(tenantId, { kind, value }, apiKey);

  switch (result.status) {
    case "ready":
    case "refused":
    case "error":
      redirect(`/newsletter?id=${result.record!.id}`);
      break;
    case "needs_paste":
      redirect(
        `/newsletter?state=needs_paste&kind=${encodeURIComponent(kind)}&value=${encodeURIComponent(value)}`,
      );
      break;
    case "missing_key":
      redirect("/newsletter?state=missing_key");
      break;
  }
}

/**
 * Record Joe's disposition for a draft.
 * Reads draftId and disposition from the form and persists it.
 */
export async function setDispositionAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const draftId = String(formData.get("draftId") ?? "");
  const disposition = String(formData.get("disposition") ?? "") as
    | "published-as-is"
    | "edited"
    | "discarded";

  if (!draftId || !disposition) {
    redirect("/newsletter");
    return;
  }

  const tenantId = DEMO_TENANT;
  const store = getNewsletterStore();
  await store.updateDisposition(tenantId, draftId, disposition);

  redirect("/newsletter?id=" + draftId + "&disposed=1");
}

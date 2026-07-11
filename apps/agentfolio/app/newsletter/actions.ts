"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { getNewsletterStore, getOrchestrator } from "@/lib/newsletter";
import type { StoryInput } from "@clockwork/marketing";

/**
 * Submit a story for newsletter drafting.
 * Reads kind/value from the form, orchestrates the draft server-side for the
 * actor's tenant (BYO key), and redirects to the result page.
 */
export async function submitStoryAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  // Drafting spends the agent's API budget — agent-only.
  if (actor.role !== "agent") redirect("/boards");

  const kind = String(formData.get("kind") ?? "text") as StoryInput["kind"];
  const value = String(formData.get("value") ?? "").trim();

  if (!value) {
    redirect("/newsletter");
    return;
  }

  const tenantId = actor.tenantId;

  // Resolve the tenant's own key + skill. No key → setup-needed (no fallback).
  const resolved = await getOrchestrator(tenantId);
  if (!resolved) {
    redirect("/newsletter?state=missing_key");
    return;
  }

  const result = await resolved.orchestrator.submit(
    tenantId,
    { kind, value },
    resolved.apiKey,
  );

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
 * Record the agent's disposition for a draft.
 * Reads draftId and disposition from the form and persists it.
 */
export async function setDispositionAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  if (actor.role !== "agent") redirect("/boards");

  const draftId = String(formData.get("draftId") ?? "");
  const disposition = String(formData.get("disposition") ?? "") as
    | "published-as-is"
    | "edited"
    | "discarded";

  if (!draftId || !disposition) {
    redirect("/newsletter");
    return;
  }

  const store = getNewsletterStore();
  await store.updateDisposition(actor.tenantId, draftId, disposition);

  redirect("/newsletter?id=" + draftId + "&disposed=1");
}

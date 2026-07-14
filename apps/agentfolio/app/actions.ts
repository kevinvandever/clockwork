"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Stage } from "@clockwork/agentfolio-core";
import { getApp } from "@/lib/app";
import { clearSession, getActor, setSession, verifyPassword } from "@/lib/session";

export async function loginAction(formData: FormData): Promise<void> {
  // Email + password login. The email resolves the user (and thus their tenant)
  // across the whole deployment; the tenant is then re-signed into the cookie.
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect("/?error=invalid");
    return;
  }

  // Verify the shared access password first (dev mode allows blank).
  if (!verifyPassword(password)) {
    redirect("/?error=invalid");
    return;
  }

  const { store } = await getApp();
  const user = await store.getUserByEmail(email);
  if (!user) {
    redirect("/?error=invalid");
    return;
  }

  await setSession(user.tenantId, user.id);
  redirect("/boards");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}

export async function createBoardAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  if (actor.role !== "agent") redirect("/boards");

  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();

  if (title && clientName && clientEmail) {
    const { service } = await getApp();
    // Create/reuse the buyer, then open their search tied to them.
    const client = await service.createClient(actor, {
      name: clientName,
      email: clientEmail,
    });
    await service.createBoard(actor, { title, clientId: client.id });
  }
  revalidatePath("/boards");
}

export async function addPropertyAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const strategy = String(formData.get("strategy") ?? "").trim();
  if (address) {
    const { service } = await getApp();
    await service.addProperty(actor, boardId, {
      address,
      agentPrivate:
        actor.role === "agent" && strategy ? { strategy } : undefined,
    });
  }
  revalidatePath(`/boards/${boardId}`);
}

export async function moveStageAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const stage = String(formData.get("stage") ?? "") as Stage;
  const { service } = await getApp();
  await service.moveStage(actor, propertyId, stage);
  revalidatePath(`/boards/${boardId}`);
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const visibility =
    String(formData.get("visibility") ?? "shared") === "agent_private"
      ? "agent_private"
      : "shared";
  if (body) {
    const { service } = await getApp();
    await service.addNote(actor, propertyId, { body, visibility });
  }
  revalidatePath(`/boards/${boardId}`);
}

export async function addCommentAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (body) {
    const { service } = await getApp();
    await service.addComment(actor, propertyId, { body });
  }
  revalidatePath(`/boards/${boardId}`);
}

export async function refreshRecordsAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const { service } = await getApp();
  await service.refreshRecords(actor, propertyId);
  revalidatePath(`/boards/${boardId}`);
}

export async function handoffAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const boardId = String(formData.get("boardId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const { service } = await getApp();
  await service.initiateHandoff(actor, propertyId);
  revalidatePath(`/boards/${boardId}`);
}

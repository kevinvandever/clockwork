"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Stage } from "@clockwork/agentfolio-core";
import { getApp } from "@/lib/app";
import { clearSession, getActor, setSession } from "@/lib/session";

export async function loginAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  if (userId) {
    await setSession(userId);
  }
  redirect("/boards");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}

export async function createBoardAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");
  const title = String(formData.get("title") ?? "").trim();
  if (title) {
    const { service } = await getApp();
    await service.createBoard(actor, { title, clientId: actor.userId });
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

"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { WorkspaceData, WorkspaceUser } from "../types/workspace";

// ─── Get the current authenticated user ──────────────────────────────────────

export async function getWorkspaceUser(): Promise<WorkspaceUser> {
  const user = await checkUser();
  if (!user) redirect("/sign-in");

  return {
    id: user.id,
    credits: user.credits,
    plan: user.plan,
    imageUrl: user.imageUrl,
  };
}

// ─── Get a workspace by id (must belong to the current user) ─────────────────

export async function getWorkspaceById(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceData> {
  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: {
      id: true,
      title: true,
      messages: true,
      fileData: true,
    },
  });

  if (!workspace) redirect("/");

  return workspace;
}

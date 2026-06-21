import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { FileData } from "../../../../../types/workspace";

export async function PATCH(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, userId, fileData } = body as {
    workspaceId: string;
    userId: string;
    fileData: FileData;
  };

  if (!workspaceId || !userId || !fileData?.files) {
    return Response.json({ message: "Invalid payload" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId, clerkId },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const workspace = await db.workspace.updateMany({
    where: { id: workspaceId, userId },
    data: { fileData: fileData as never },
  });

  if (workspace.count === 0) {
    return Response.json({ message: "Workspace not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}

export const runtime = "nodejs";

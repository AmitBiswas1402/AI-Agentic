import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { resolveSandpackDependencies } from "@/lib/resolve-dependencies";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { dependencies } = body as {
    dependencies?: Record<string, string>;
  };

  if (!dependencies || typeof dependencies !== "object") {
    return Response.json({ message: "Invalid dependencies" }, { status: 400 });
  }

  const resolved = await resolveSandpackDependencies({ dependencies });

  return Response.json({ dependencies: resolved });
}

export const runtime = "nodejs";

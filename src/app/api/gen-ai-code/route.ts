import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION, GEMINI_MODELS } from "@/lib/constants";
import { FileData, Message } from "../../../../types/workspace";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(type: string, payload: unknown): string {
  return `data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`;
}

// ─── npm validation ───────────────────────────────────────────────────────────

async function validateDependencies(
  deps: Record<string, string>,
): Promise<Record<string, string>> {
  const valid: Record<string, string> = {};
  await Promise.all(
    Object.entries(deps).map(async ([pkg, version]) => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) valid[pkg] = version;
      } catch {
        // silently skip hallucinated packages
      }
    }),
  );
  return valid;
}

// ─── History trimming ─────────────────────────────────────────────────────────

function trimHistory(messages: Message[]): Message[] {
  if (messages.length <= 10) return messages;
  return [messages[0], ...messages.slice(-8)];
}

function extractJsonString(text: string): string {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();

  const start = s.indexOf("{");
  if (start === -1) throw new SyntaxError("No JSON object found");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }

  return s.slice(start);
}

function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (const ch of s) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
  }

  if (inString) s += '"';
  while (depth > 0) {
    s += "}";
    depth--;
  }
  return s;
}

function parseGeminiJson(text: string): unknown {
  const jsonStr = extractJsonString(text);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(repairTruncatedJson(jsonStr));
  }
}

function normalizeGeneratedFiles(
  files: Record<string, unknown>,
): Record<string, { code: string }> {
  const normalized: Record<string, { code: string }> = {};

  for (const [path, file] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`;
    let code: string | null = null;

    if (typeof file === "string") {
      code = file;
    } else if (file && typeof file === "object" && "code" in file) {
      code = String((file as { code: unknown }).code);
    }

    if (code) normalized[key] = { code };
  }

  return normalized;
}

const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    assistantMessage: { type: "string" },
    title: { type: "string" },
    files: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: { code: { type: "string" } },
        required: ["code"],
      },
    },
    dependencies: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
  required: ["assistantMessage", "files", "dependencies"],
} as const;

function isRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /503|429|UNAVAILABLE|high demand|quota/i.test(message);
}

function getGeminiErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/429|quota/i.test(message)) {
    return "AI quota exceeded. Check your Gemini API key billing.";
  }
  if (/503|UNAVAILABLE|high demand/i.test(message)) {
    return "AI is busy right now. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

async function generateContentWithFallback({
  contents,
  systemInstruction,
}: {
  contents: ReturnType<typeof buildContents>;
  systemInstruction: string;
}): Promise<string> {
  let lastError: unknown;

  for (const model of GEMINI_MODELS) {
    for (const useSchema of [true, false] as const) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
            ...(useSchema
              ? { responseJsonSchema: GEMINI_RESPONSE_SCHEMA }
              : {}),
          },
        });

        const text = response.text?.trim() ?? "";
        if (!text) throw new Error("Empty response from model");
        return text;
      } catch (err) {
        lastError = err;
        if (useSchema) continue;
        const isLast = model === GEMINI_MODELS[GEMINI_MODELS.length - 1];
        if (!isRetryableGeminiError(err) || isLast) {
          throw err;
        }
        console.warn(`[gen-ai-code] ${model} unavailable, trying next model`);
        break;
      }
    }
  }

  throw lastError ?? new Error("No Gemini models available");
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Keep code clean, readable, and production-quality.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

// ─── Gemini contents builder ──────────────────────────────────────────────────

function buildContents(messages: Message[], fileData: FileData | null) {
  const trimmed = trimHistory(messages);

  return trimmed.map((msg, idx) => {
    const role = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "user") {
      const parts: object[] = [];

      let text = msg.content;

      if (msg.imageUrl) {
        text = `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}]\n\n${text}`;
      }

      const isLast = idx === trimmed.length - 1;
      if (isLast && fileData) {
        text +=
          "\n\nCurrent project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }

      parts.push({ text });
      return { role, parts };
    }

    return { role, parts: [{ text: msg.content }] };
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, userId, messages, fileData } = body as {
    workspaceId: string | null;
    userId: string;
    messages: Message[];
    fileData: FileData | null;
  };

  if (!messages?.length) {
    return Response.json({ message: "No messages provided" }, { status: 400 });
  }

  // ── Arcjet: rate limit, prompt injection, sensitive info ──────────────────
  // detectPromptInjectionMessage requires the actual user text to inspect.

  // const arcjetReq = new Request(request.url, {
  //   method: request.method,
  //   headers: request.headers,
  //   body: JSON.stringify(body),
  // });

  // const lastUserMessage =
  //   [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  // const decision = await aj.protect(arcjetReq, {
  //   requested: 1,
  //   userId: clerkId,
  //   detectPromptInjectionMessage: lastUserMessage,
  // });

  // if (decision.isDenied()) {
  //   return Response.json(
  //     { message: decision.reason?.type ?? "Request blocked" },
  //     { status: 429 }
  //   );
  // }

  const user = await db.user.findUnique({
    where: { id: userId, clerkId },
    select: { id: true, credits: true },
  });

  if (!user)
    return Response.json({ message: "User not found" }, { status: 404 });
  if (user.credits < CREDIT_COST_PER_GENERATION) {
    return Response.json({ message: "Insufficient credits" }, { status: 402 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      try {
        enqueue(sseEvent("status", { message: "Generating code…" }));

        const contents = buildContents(messages, fileData);

        const accumulated = await generateContentWithFallback({
          contents,
          systemInstruction: SYSTEM_PROMPT,
        });

        // ── Parse the complete JSON response ──────────────────────────────────

        let parsed: {
          assistantMessage?: string;
          title?: string;
          files: Record<string, unknown>;
          dependencies?: Record<string, string>;
        };

        try {
          parsed = parseGeminiJson(accumulated) as typeof parsed;
        } catch (parseErr) {
          console.error(
            "[gen-ai-code] JSON parse failed:",
            parseErr,
            "response length:",
            accumulated.length,
            "preview:",
            accumulated.slice(0, 300),
          );
          enqueue(
            sseEvent("error", {
              message: "AI returned invalid JSON. Please try again.",
            }),
          );
          controller.close();
          return;
        }

        const {
          assistantMessage,
          title: aiTitle,
          files: rawFiles,
          dependencies,
        } = parsed;

        const files = normalizeGeneratedFiles(rawFiles ?? {});

        if (!files["/App.js"]) {
          enqueue(
            sseEvent("error", {
              message:
                "AI response missing /App.js entry point. Please try again.",
            }),
          );
          controller.close();
          return;
        }

        // ── Validate npm packages ──────────────────────────────────────────────

        enqueue(sseEvent("status", { message: "Validating packages…" }));
        const validatedDeps = await validateDependencies(dependencies ?? {});
        const newFileData: FileData = {
          files,
          dependencies: validatedDeps,
          title: aiTitle,
        };

        // ── Upsert workspace + deduct credit (single transaction) ──────────────

        enqueue(sseEvent("status", { message: "Saving…" }));

        const lastUserMessage = messages[messages.length - 1];
        const replyText = assistantMessage ?? "Here's your updated app.";
        const updatedMessages: Message[] = [
          ...messages,
          { role: "assistant", content: replyText },
        ];

        const workspaceResult = await db.$transaction(
          async (tx) => {
            const ws = workspaceId
              ? await tx.workspace.update({
                  where: { id: workspaceId, userId },
                  data: {
                    messages: updatedMessages as never,
                    fileData: newFileData as never,
                  },
                })
              : await tx.workspace.create({
                  data: {
                    userId,
                    title: aiTitle ?? lastUserMessage.content.slice(0, 80),
                    messages: updatedMessages as never,
                    fileData: newFileData as never,
                  },
                });

            const updatedUser = await tx.user.update({
              where: { id: userId },
              data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
              select: { credits: true },
            });

            return { workspace: ws, creditsRemaining: updatedUser.credits };
          },
          { timeout: 200000 },
        );

        // ── Emit final result ──────────────────────────────────────────────────

        enqueue(
          sseEvent("done", {
            workspaceId: workspaceResult.workspace.id,
            assistantMessage: replyText,
            fileData: newFileData,
            creditsRemaining: workspaceResult.creditsRemaining,
          }),
        );
      } catch (err) {
        console.error("[gen-ai-code] stream error:", err);
        enqueue(
          sseEvent("error", {
            message: getGeminiErrorMessage(err),
          }),
        );
      } finally { 
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300; // for vercel - 300s on Fluid

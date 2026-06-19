"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileData, Message, StatusStep, WorkspaceData } from "../../types/workspace";
import CodePanel from "./CodePanel";
import ChatPanel from "./ChatPanel";
import { MIN_CREDITS_TO_GENERATE } from "@/lib/constants";
import { toast } from "sonner";

interface WorkSpaceClientProps {
  initialPrompt: string | null;
  workspace?: WorkspaceData | null;
  userCredits: number;
  userId: string;
  userPlan: string;
  userImageUrl?: string | null;
}

function parseMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Message =>
      typeof m === "object" && m !== null && "role" in m && "content" in m
  );
}

function parseFileData(raw: unknown): FileData | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (!f.files || typeof f.files !== "object") return null;
  return {
    files: f.files as FileData["files"],
    dependencies: (f.dependencies as Record<string, string>) ?? {},
    title: typeof f.title === "string" ? f.title : undefined,
  };
}

const WorkSpaceClient = ({
  initialPrompt,
  workspace = null,
  userCredits,
  userId,
  userPlan,
  userImageUrl = null,
}: WorkSpaceClientProps) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusLog, setStatusLog] = useState<StatusStep[]>([]);
  const [isImproving, setIsImproving] = useState(false);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState(userCredits);

  const hasAutoSubmitted = useRef(false);
  const generateAbortRef = useRef<AbortController | null>(null);
  const improveAbortRef = useRef<AbortController | null>(null);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const workspaceIdRef = useRef<string | null>(workspaceId);
  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspace) return;

    setWorkspaceId(workspace.id);
    setMessages(parseMessages(workspace.messages));
    setFileData(parseFileData(workspace.fileData));
  }, [workspace]);

  const handleFilePatch = useCallback((patches: FileData) => {
    setFileData(patches);
  }, []);

  const fileDataRef = useRef<FileData | null>(fileData);
  useEffect(() => {
    fileDataRef.current = fileData;
  }, [fileData]);

  const completeSteps = () => {
    setStatusLog((prev) =>
      prev.map((s, i) =>
        i === prev.length - 1 ? { ...s, status: "done" as const } : s,
      ),
    );
  };

  const pushStep = (label: string) => {
    setStatusLog((prev) => [
      ...prev.map((s, i) =>
        i === prev.length - 1 ? { ...s, status: "done" as const } : s,
      ),
      { label, status: "running" as const },
    ]);
  };

  const handleGenerate = useCallback(
    async (prompt: string, imageUrl?: string) => {
      if (isGenerating) return;
      if (credits < MIN_CREDITS_TO_GENERATE) return;

      const userMessage: Message = {
        role: "user",
        content: prompt,
        ...(imageUrl ? { imageUrl } : {}),
      };

      const currentmessages = messagesRef.current;
      const currentWorkspaceId = workspaceIdRef.current;

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);
      setStatusLog([{ label: "Thinking...", status: "running" }]);

      const abortController = new AbortController();
      generateAbortRef.current = abortController;

      try {
        const res = await fetch("/api/gen-ai-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            workspaceId: currentWorkspaceId,
            userId,
            messages: [...currentmessages, userMessage],
            fileData: fileDataRef.current,
          }),
        });

        if (res.status === 402) {
          toast.error("Not enough credits to generate.");
          return;
        }
        if (res.status === 429) {
          toast.error("Too many requests. Please slow down.");
          return;
        }
        if (!res.ok || !res.body) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(errorBody?.message ?? "Generation failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            let event: {
              type: string;
              message?: string;
              workspaceId?: string;
              assistantMessage?: string;
              fileData?: FileData;
              creditsRemaining?: number;
            };

            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (event.type === "status" && event.message) {
              pushStep(event.message);
            } else if (event.type === "done") {
              completeSteps();
              if (event.workspaceId) setWorkspaceId(event.workspaceId);
              if (event.fileData) setFileData(event.fileData);
              if (typeof event.creditsRemaining === "number") {
                setCredits(event.creditsRemaining);
              }
              if (event.assistantMessage) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: event.assistantMessage! },
                ]);
              }
              if (event.workspaceId) {
                window.history.replaceState(
                  null,
                  "",
                  `/workspace?id=${event.workspaceId}`,
                );
              }
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Generation failed");
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      } finally {
        generateAbortRef.current = null;
        setIsGenerating(false);
        setStatusLog([]);
      }
    },
    [credits, isGenerating, userId],
  );

  const handleStop = useCallback(() => {
    generateAbortRef.current?.abort();
    improveAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const trimmed = initialPrompt?.trim();
    if (!trimmed || hasAutoSubmitted.current) return;
    if (isGenerating) return;
    if (credits < MIN_CREDITS_TO_GENERATE) return;

    // Wait until an existing workspace's messages are hydrated from the server
    if (workspace) {
      const serverMessages = parseMessages(workspace.messages);
      if (serverMessages.length > 0 && messages.length === 0) return;
    }

    hasAutoSubmitted.current = true;

    const params = new URLSearchParams(window.location.search);
    params.delete("prompt");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `/workspace${qs ? `?${qs}` : ""}`,
    );

    void handleGenerate(trimmed);
  }, [
    initialPrompt,
    workspace,
    messages.length,
    isGenerating,
    credits,
    handleGenerate,
  ]);

  return (
    <div className="flex h-full overflow-hidden bg-[#0a0a0a]">
      {/* Chat Panel on left */}
      <div className="w-[320px] shrink-0 border-r border-white/6 bg-[#0d0d0d] flex items-center justify-center">
        {/* <p>Chat Panel</p> */}
        <ChatPanel
          messages={messages}
          isGenerating={isGenerating}
          isImproving={false}
          statusLog={statusLog}
          credits={credits}
          initialPrompt={initialPrompt}
          onGenerate={handleGenerate}
          userId={userId}
          workspaceId={workspaceId}
          appTitle={fileData?.title ?? workspace?.title ?? null}
          userImageUrl={userImageUrl}
          onStop={handleStop}
        />
      </div>

      {/* Code Panel on right */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <CodePanel
          fileData={fileData}
          isGenerating={isGenerating}
          statusLog={statusLog}
          onFilePatch={handleFilePatch}
        />
      </div>
    </div>
  );
};

export default WorkSpaceClient;

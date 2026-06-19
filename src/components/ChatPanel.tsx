import React, { useRef, useState, type KeyboardEvent } from "react";
import { Message, StatusStep } from "../../types/workspace";
import { BlueTitle } from "./reusables";
import { PricingModal } from "./PricingModal";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ArrowUp, Loader2, Paperclip, Square, X } from "lucide-react";
import { Button } from "./ui/button";

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  isImproving: boolean;
  statusLog: StatusStep[];
  credits: number;
  initialPrompt: string | null;
  onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
  onStop: () => void;
  userId: string;
  workspaceId: string | null;
  appTitle: string | null;
  userImageUrl?: string | null;
}

const ChatPanel = ({
  messages,
  isGenerating,
  isImproving,
  statusLog,
  credits,
  initialPrompt,
  onGenerate,
  onStop,
  userId,
  workspaceId,
  appTitle,
  userImageUrl,
}: ChatPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState(initialPrompt ?? "");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const noCredits = credits < 1;
  const canSubmit = input.trim() && !isGenerating && !isImproving && !noCredits;

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isImproving || noCredits) return;
    setInput("");
    setPendingImageUrl(null);
    await onGenerate(trimmed, pendingImageUrl ?? undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!canSubmit) return;
    void handleSubmit();
  };

  const dummyMessages: Message[] = [
    {
      role: "user",
      content: "Build a simple todo app with dark theme",
    },
    {
      role: "assistant",
      content:
        "I've built a simple todo app with dark theme. Here's the code:\n\n- Add and delete todos\n- Mark todos as complete\n- Filter todos by status\n- Add a dark theme\n- Add a light theme",
    },
  ];
  const showPlaceholder = messages.length === 0 && !isGenerating && !initialPrompt;
  const renderedMessages = messages.length > 0 ? messages : showPlaceholder ? dummyMessages : [];

  const statuses = [
    {
      label: "Planning the component structure",
      status: "done",
    },
    {
      label: "Improving the component structure",
      status: "running",
    },
    {
      label: "Implementing the component structure",
      status: "running",
    },
    {
      label: "Testing the component structure",
      status: "running",
    },
  ];

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isGenerating]);

  // Clear the input once the prompt has been submitted (auto or manual)
  React.useEffect(() => {
    const trimmed = initialPrompt?.trim();
    if (!trimmed) return;

    const submitted = messages.some(
      (message) =>
        message.role === "user" && message.content.trim() === trimmed,
    );

    if (submitted) {
      setInput("");
    }
  }, [messages, initialPrompt]);

  return (
    <div className="flex flex-col h-full shrink-0 w-[320px] border-r border-white/6 bg-[#0d0d0d]">
      <div className="border-b border-white/6 px-4 py-3 flex items-center justify-between">
        <BlueTitle>{appTitle}</BlueTitle>
        <PricingModal reason={noCredits ? "credits" : "upgrade"}>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] transition-colors",
              noCredits
                ? "bg-red-500/15 text-red-400/80 hover:bg-red-500/25"
                : "bg-white/6 text-white/30 hover:bg-white/10 hover:text-white/50",
            )}
          >
            {noCredits
              ? "No credits · Upgrade"
              : `${credits} credit${credits !== 1 ? "s" : ""}`}
          </span>
        </PricingModal>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
      >
        <div className="space-y-4">
          {renderedMessages.map((msg, index) => (
            <div key={index}>
              {msg.role === "user" ? (
                <div className="flex items-end justify-end gap-2">
                  <div className="relative max-w-[240px] rounded-2xl rounded-br-sm border border-white/20 bg-white/10 p-3 text-sm text-white/70">
                    <span className="absolute -right-1 bottom-3 h-2.5 w-2.5 rotate-45 border-r border-b border-white/20 bg-white/10" />
                    <p className="whitespace-pre-wrap word-break-words">
                      {msg.content}
                    </p>
                  </div>
                  {userImageUrl ? (
                    <img
                      src={userImageUrl}
                      alt="You"
                      className="h-8 w-8 shrink-0 rounded-full border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-medium text-white/60">
                      U
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Image
                    src="/logo.svg"
                    alt="Forge"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/5 p-1"
                  />
                  <div className="relative max-w-[240px] rounded-2xl rounded-bl-sm border border-white/20 bg-white/10 p-3 text-sm text-white/70">
                    <span className="absolute -left-1 bottom-3 h-2.5 w-2.5 rotate-45 border-b border-l border-white/20 bg-white/10" />
                    <p className="whitespace-pre-wrap word-break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Statuses */}
        {isGenerating && (
          <div className="mt-4 flex items-end gap-2">
            <Image
              src="/logo.svg"
              alt="Forge"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/5 p-1"
            />
            <div className="relative rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3.5 py-3">
              <span className="absolute -left-1 bottom-3 h-2.5 w-2.5 rotate-45 border-b border-l border-white/10 bg-white/5" />
              <div className="space-y-2">
                {statusLog.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {step.status === "running" ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-400/80" />
                      ) : (
                        <svg
                          className="h-3 w-3 text-white/25"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[12px] transition-colors duration-300",
                        step.status === "running"
                          ? "text-white/75"
                          : "text-white/25",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/6 p-3">
        {pendingImageUrl && (
          <div className="relative mb-2 w-fit">
            <img
              src={pendingImageUrl}
              alt="pending upload"
              className="h-14 w-14 rounded-lg border border-white/10 object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingImageUrl(null)}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white/60 hover:text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            "rounded-xl border bg-[#141414] transition-colors focus-within:border-white/15",
            isGenerating || isImproving
              ? "border-white/6"
              : noCredits
                ? "border-white/6 opacity-60"
                : "border-white/10 hover:border-white/14",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || isImproving || noCredits}
            placeholder={
              noCredits
                ? "Upgrade to keep building…"
                : isImproving
                  ? "Cline is improving your app…"
                  : isGenerating
                    ? "Generating…"
                    : "Ask AI to modify…"
            }
            rows={1}
            className="max-h-[120px] min-h-[40px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-white/85 placeholder:text-white/25 focus:outline-none"
          />

          <div className="flex items-center justify-between border-t border-white/6 px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={isGenerating || isImproving || isUploading || noCredits}
              className="h-7 w-7 rounded-md text-white/35 hover:bg-white/6 hover:text-white/60 disabled:opacity-40"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
            />

            {isGenerating || isImproving ? (
              <Button
                type="button"
                size="icon"
                onClick={onStop}
                className="h-7 w-7 rounded-md bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "h-7 w-7 rounded-md transition-all",
                  canSubmit
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/8 text-white/20",
                )}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/15">
          {isGenerating || isImproving
            ? "Click ■ to stop generation"
            : "⏎ to send · Shift+⏎ for new line"}
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;

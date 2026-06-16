"use client";

import React, { useCallback, useState } from "react";
import { FileData, Message, StatusStep } from "../../types/workspace";
import CodePanel from "./CodePanel";
import ChatPanel from "./ChatPanel";

interface WorkSpaceClientProps {
  initialPrompt: string | null;
  userCredits: number;
  userId: string;
  userPlan: string;
  userImageUrl?: string | null;
}

const WorkSpaceClient = ({
  initialPrompt,
  userCredits,
  userId,
  userPlan,
  userImageUrl,
}: WorkSpaceClientProps) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusLog, setStatusLog] = useState<StatusStep[]>([]);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState(userCredits);

  const handleFilePatch = useCallback((patches: FileData) => {
    setFileData(patches);
  }, []);

  const handleGenerate = useCallback(async (prompt: string, imageUrl?: string) => {
  }, [credits, isGenerating, userId])

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
          appTitle={"Test App"}
          userImageUrl={userImageUrl}
          onStop={() => {}}
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

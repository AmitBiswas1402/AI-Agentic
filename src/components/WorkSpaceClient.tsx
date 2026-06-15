"use client";

import React, { useCallback, useState } from "react";
import { FileData, StatusStep } from "../../types/workspace";
import CodePanel from "./CodePanel";

const WorkSpaceClient = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusLog, setStatusLog] = useState<StatusStep[]>([]);

  const handleFilePatch = useCallback((patches: FileData) => {
    setFileData(patches);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-[#0a0a0a]">
      {/* Chat Panel on left */}
      <div className="w-[320px] shrink-0 border-r border-white/6 bg-[#0d0d0d] flex items-center justify-center">
        <p>Chat Panel</p>
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

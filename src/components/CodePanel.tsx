"use client";

import { useEffect, useRef, useState } from "react";
import { FileData, StatusStep } from "../../types/workspace";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  useSandpack,
} from "@codesandbox/sandpack-react";
import {
  Eye,
  Code2,
  Download,
  AlertTriangle,
  Bot,
  Loader2,
  ArrowUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const PLACEHOLDER_FILES = {
  "/App.js": {
    code: `export default function App() {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <p style={{ fontSize: 14 }}>Your app will appear here</p>
        </div>
      </div>
    );
  }`,
  },
};

const BASE_DEPENDENCIES: Record<string, string> = {
  "react-is": "latest",
  "react-router-dom": "latest",
  "lucide-react": "latest",
  recharts: "latest",
  "date-fns": "latest",
  "framer-motion": "latest",
  "react-hook-form": "latest",
  "@hookform/resolvers": "latest",
  zod: "latest",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-tooltip": "latest",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-select": "latest",
  axios: "latest",
  clsx: "latest",
  "class-variance-authority": "latest",
  "tailwind-merge": "latest",
};

type ActiveTab = "preview" | "code";

interface CodePanelProps {
  fileData: FileData | null;
  isGenerating: boolean;
  statusLog: StatusStep[];
  onFilePatch: (patches: FileData) => void;
  onImprove?: (userRequest: string) => Promise<void>;
  onFixError?: (error: string) => Promise<void>;
  appTitle?: string | null;
  isImproving?: boolean;
  isProUser?: boolean;
}

function SandPackInner({
  fileData,
  isGenerating,
  activeTab,
  setActiveTab,
}: {
  fileData: FileData | null;
  isGenerating: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
  const { sandpack, listen } = useSandpack();

  const prevFilesRef = useRef<Record<string, { code: string }>>({});

  useEffect(() => {
    if (!fileData?.files) return;

    const prev = prevFilesRef.current;

    for (const [path, { code }] of Object.entries(fileData.files)) {
      sandpack.updateFile(path, code);
    }
    prevFilesRef.current = fileData.files;
  }, [fileData?.files]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ActiveTab)}
      className="flex h-full flex-col gap-0"
    >
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
        <TabsList className="h-auto gap-0.5 rounded-lg border border-white/10 bg-white/3 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <TabsTrigger
            value="code"
            className="h-8 gap-2 rounded-md border border-transparent px-3.5 text-xs font-medium tracking-wide text-white/45 transition-all duration-200 hover:border-white/8 hover:bg-white/4 hover:text-white/75 data-active:border-white/15 data-active:bg-white/10 data-active:text-white data-active:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] after:hidden"
          >
            <Code2 className="size-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="h-8 gap-2 rounded-md border border-transparent px-3.5 text-xs font-medium tracking-wide text-white/45 transition-all duration-200 hover:border-white/8 hover:bg-white/4 hover:text-white/75 data-active:border-white/15 data-active:bg-white/10 data-active:text-white data-active:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] after:hidden"
          >
            <Eye className="size-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TabsContent
          value="preview"
          forceMount
          className="absolute inset-0 mt-0 h-full w-full data-[state=inactive]:hidden"
        >
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            className="h-full w-full"
          />
        </TabsContent>
        <TabsContent
          value="code"
          forceMount
          className="absolute inset-0 mt-0 h-full w-full data-[state=inactive]:hidden"
        >
          <SandpackLayout className="sandpack-code-layout h-full min-h-0 w-full">
            <SandpackFileExplorer />
            <SandpackCodeEditor showTabs closableTabs />
          </SandpackLayout>
        </TabsContent>
      </div>
    </Tabs>
  );
}

const CodePanel = ({ fileData, isGenerating, onFilePatch }: CodePanelProps) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const files = fileData?.files || PLACEHOLDER_FILES;

  const filePathKey = Object.keys(files).sort().join("|");

  return (
    <div className="sandpack-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <SandpackProvider
        key={filePathKey}
        template="react"
        theme="dark"
        files={files}
        customSetup={{ dependencies: BASE_DEPENDENCIES }}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
        className="flex h-full min-h-0 w-full flex-1 flex-col"
      >
        <SandPackInner
          fileData={fileData}
          isGenerating={isGenerating}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </SandpackProvider>
    </div>
  );
};

export default CodePanel;

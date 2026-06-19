"use client";

import { useEffect, useState } from "react";
import { FileData, StatusStep } from "../../types/workspace";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
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

function normalizeSandpackFiles(
  files: Record<string, { code: string }>,
): Record<string, { code: string }> {
  const normalized: Record<string, { code: string }> = {};
  for (const [path, file] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`;
    normalized[key] = file;
  }
  return normalized;
}

function buildSandpackDependencies(fileData: FileData | null) {
  return {
    ...BASE_DEPENDENCIES,
    ...(fileData?.dependencies ?? {}),
  };
}

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
  activeTab,
  setActiveTab,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
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
  const files = fileData?.files
    ? normalizeSandpackFiles(fileData.files)
    : PLACEHOLDER_FILES;
  const dependencies = buildSandpackDependencies(fileData);

  const sandpackKey = [
    Object.keys(files).sort().join("|"),
    Object.keys(dependencies).sort().join("|"),
  ].join("::");

  useEffect(() => {
    if (fileData?.files) {
      setActiveTab("preview");
    }
  }, [sandpackKey]);

  return (
    <div className="sandpack-panel relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isGenerating && !fileData?.files && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]/80">
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Generating your app…</p>
          </div>
        </div>
      )}
      <SandpackProvider
        key={sandpackKey}
        template="react"
        theme="dark"
        files={files}
        customSetup={{ dependencies }}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
        className="flex h-full min-h-0 w-full flex-1 flex-col"
      >
        <SandPackInner
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </SandpackProvider>
    </div>
  );
};

export default CodePanel;

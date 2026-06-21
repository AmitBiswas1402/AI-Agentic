import { FileData } from "../../types/workspace";
import { parseMissingDependency } from "./resolve-dependencies";

export function buildPreviewFixPrompt({
  error,
  fileData,
}: {
  error: string;
  fileData: FileData;
}): string {
  const missing = parseMissingDependency(error);
  const currentDeps =
    Object.keys(fileData.dependencies).length > 0
      ? Object.entries(fileData.dependencies)
          .map(([name, version]) => `${name}@${version}`)
          .join(", ")
      : "(none)";

  const missingHint = missing
    ? `The preview is missing npm package "${missing}". Add "${missing}" and any required peer/runtime dependencies (for example prop-types, classnames, react-is) to "dependencies" with version "latest".`
    : `Identify any missing npm packages from the error and add them to "dependencies" with version "latest".`;

  return `[PREVIEW RUNTIME ERROR — auto-fix]
The live Sandpack preview crashed with:

"""
${error.trim()}
"""

${missingHint}

Current dependencies: ${currentDeps}

Fix instructions:
1. Return valid JSON with assistantMessage, files, and dependencies.
2. Include ALL project files (changed and unchanged).
3. List every npm import in "dependencies", including transitive deps Sandpack needs (prop-types is required by many React libraries).
4. Do NOT add react, react-dom, or tailwindcss to dependencies.
5. Only change code if required to fix the error; prefer adding missing packages first.
6. Keep the app working in the browser preview.`;
}

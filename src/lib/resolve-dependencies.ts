const SKIP_PACKAGES = new Set(["react", "react-dom", "tailwindcss"]);

/** Bundler peers Sandpack often needs listed explicitly */
const ALWAYS_INCLUDE = ["prop-types", "react-is", "classnames"];

const MAX_DEPTH = 3;

type NpmPackageMeta = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

async function fetchNpmPackageMeta(pkg: string): Promise<NpmPackageMeta | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    return (await res.json()) as NpmPackageMeta;
  } catch {
    return null;
  }
}

export function parseMissingDependency(error: string): string | null {
  const patterns = [
    /Could not find dependency:\s*'([^']+)'/i,
    /Cannot find module\s*'([^']+)'/i,
    /Module not found:\s*'?([^'"\s]+)'?/i,
  ];

  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match?.[1] && !match[1].startsWith(".") && !match[1].startsWith("/")) {
      return match[1].split("/")[0];
    }
  }

  return null;
}

export async function resolveSandpackDependencies({
  dependencies,
}: {
  dependencies: Record<string, string>;
}): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const pkg of [...Object.keys(dependencies), ...ALWAYS_INCLUDE]) {
    if (!SKIP_PACKAGES.has(pkg)) {
      queue.push(pkg);
      depths.set(pkg, 0);
    }
  }

  while (queue.length > 0) {
    const pkg = queue.shift()!;
    if (visited.has(pkg) || SKIP_PACKAGES.has(pkg)) continue;
    visited.add(pkg);

    resolved[pkg] = dependencies[pkg] ?? "latest";

    const currentDepth = depths.get(pkg) ?? 0;
    if (currentDepth >= MAX_DEPTH) continue;

    const meta = await fetchNpmPackageMeta(pkg);
    if (!meta) continue;

    const combined = {
      ...(meta.dependencies ?? {}),
      ...(meta.peerDependencies ?? {}),
    };

    for (const dep of Object.keys(combined)) {
      if (visited.has(dep) || SKIP_PACKAGES.has(dep)) continue;
      queue.push(dep);
      depths.set(dep, currentDepth + 1);
    }
  }

  return resolved;
}

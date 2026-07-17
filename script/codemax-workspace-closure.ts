import fs from "fs/promises"
import path from "path"

type PackageManifest = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

export type WorkspaceManifest = {
  name: string
  path: string
  dependencies: string[]
}

export function workspaceClosure(manifests: WorkspaceManifest[], roots: string[]) {
  const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]))
  const retained = new Set<string>()
  const queue = [...roots]

  while (queue.length) {
    const name = queue.shift()!
    if (retained.has(name)) continue
    const manifest = byName.get(name)
    if (!manifest) throw new Error(`Missing workspace root: ${name}`)
    retained.add(name)
    queue.push(...manifest.dependencies)
  }

  return [...retained].sort()
}

export async function readWorkspaceManifests(root: string): Promise<WorkspaceManifest[]> {
  const manifests: WorkspaceManifest[] = []
  for await (const file of new Bun.Glob("packages/**/package.json").scan({ cwd: root, onlyFiles: true })) {
    const normalized = file.replaceAll("\\", "/")
    if (normalized.includes("/dist/") || normalized.includes("/node_modules/")) continue

    const source = (await Bun.file(path.join(root, file)).json()) as PackageManifest
    if (!source.name) continue

    const dependencies = [source.dependencies, source.devDependencies, source.peerDependencies, source.optionalDependencies]
      .flatMap((group) => Object.entries(group ?? {}))
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("workspace:"))
      .map(([name]) => name)

    manifests.push({
      name: source.name,
      path: normalized,
      dependencies: [...new Set(dependencies)].sort(),
    })
  }

  return manifests.sort((left, right) => left.name.localeCompare(right.name))
}

export function retentionReport(manifests: WorkspaceManifest[], roots: string[]) {
  const retained = workspaceClosure(manifests, roots)
  const retainedSet = new Set(retained)
  const removable = manifests
    .filter((manifest) => !retainedSet.has(manifest.name))
    .map((manifest) => manifest.name)
    .sort()

  return [
    "# CodeMax Workspace Retention Report",
    "",
    "## Roots",
    ...roots.sort().map((name) => `- ${name}`),
    "",
    "## Retained",
    ...retained.map((name) => `- ${name}`),
    "",
    "## Removable",
    ...removable.map((name) => `- ${name}`),
    "",
  ].join("\n")
}

if (import.meta.main) {
  const root = path.resolve(import.meta.dir, "..")
  const manifests = await readWorkspaceManifests(root)
  const report = retentionReport(manifests, ["codemax", "@opencode-ai/script"])
  const output = path.join(root, "docs/pruning/2026-07-17-workspace-retention.md")
  await fs.mkdir(path.dirname(output), { recursive: true })
  await Bun.write(output, report)
}

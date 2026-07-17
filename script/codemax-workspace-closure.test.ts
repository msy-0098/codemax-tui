import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { readWorkspaceManifests, workspaceClosure, type WorkspaceManifest } from "./codemax-workspace-closure"

const manifests: WorkspaceManifest[] = [
  { name: "codemax", path: "packages/opencode/package.json", dependencies: ["@opencode-ai/core", "@opencode-ai/tui"] },
  { name: "@opencode-ai/core", path: "packages/core/package.json", dependencies: ["@opencode-ai/schema"] },
  { name: "@opencode-ai/tui", path: "packages/tui/package.json", dependencies: ["@opencode-ai/ui"] },
  { name: "@opencode-ai/schema", path: "packages/schema/package.json", dependencies: [] },
  { name: "@opencode-ai/ui", path: "packages/ui/package.json", dependencies: [] },
  { name: "@opencode-ai/desktop", path: "packages/desktop/package.json", dependencies: ["@opencode-ai/core"] },
]

describe("CodeMax workspace closure", () => {
  test("retains transitive dependencies without retaining reverse dependents", () => {
    expect(workspaceClosure(manifests, ["codemax"])).toEqual([
      "@opencode-ai/core",
      "@opencode-ai/schema",
      "@opencode-ai/tui",
      "@opencode-ai/ui",
      "codemax",
    ])
  })

  test("fails when a root workspace package is missing", () => {
    expect(() => workspaceClosure(manifests, ["missing"])).toThrow("Missing workspace root: missing")
  })

  test("ignores generated and installed package manifests", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codemax-workspace-"))
    try {
      await fs.mkdir(path.join(root, "packages/opencode/dist/codemax-windows-x64"), { recursive: true })
      await fs.mkdir(path.join(root, "packages/core/node_modules/example"), { recursive: true })
      await Bun.write(path.join(root, "packages/opencode/package.json"), JSON.stringify({ name: "codemax" }))
      await Bun.write(
        path.join(root, "packages/opencode/dist/codemax-windows-x64/package.json"),
        JSON.stringify({ name: "codemax-windows-x64" }),
      )
      await Bun.write(path.join(root, "packages/core/node_modules/example/package.json"), JSON.stringify({ name: "example" }))

      expect(await readWorkspaceManifests(root)).toEqual([
        { name: "codemax", path: "packages/opencode/package.json", dependencies: [] },
      ])
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})

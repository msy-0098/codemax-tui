import { describe, expect, test } from "bun:test"
import { existsSync } from "fs"
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
const root = path.resolve(import.meta.dir, "..")

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

  test("keeps only CodeMax product surfaces", async () => {
    const removed = [
      "packages/app",
      "packages/desktop",
      "packages/console",
      "packages/enterprise",
      "packages/httpapi-codegen",
      "packages/slack",
      "packages/sdk-next",
      "packages/stats",
      "packages/storybook",
      "packages/web",
      "infra",
      "nix",
    ]

    for (const target of removed) {
      const result = Bun.spawnSync(["git", "ls-files", "--", target], { cwd: root, stdout: "pipe" })
      expect(new TextDecoder().decode(result.stdout).trim()).toBe("")
    }

    expect(existsSync(path.join(root, "packages/opencode/package.json"))).toBe(true)
    expect(existsSync(path.join(root, "packages/tui/package.json"))).toBe(true)
    expect(existsSync(path.join(root, ".github/workflows/codemax-release.yml"))).toBe(true)

    const manifest = await Bun.file(path.join(root, "package.json")).json()
    expect(manifest.scripts["dev:desktop"]).toBeUndefined()
    expect(manifest.scripts["dev:web"]).toBeUndefined()
    expect(manifest.scripts["dev:console"]).toBeUndefined()
    expect(manifest.scripts["dev:stats"]).toBeUndefined()
    expect(manifest.scripts["dev:storybook"]).toBeUndefined()
    expect(manifest.workspaces.packages).toEqual(["packages/*", "packages/sdk/js"])
    expect(manifest.repository.url).toBe("https://github.com/msy-0098/codemax-tui.git")

    for (const target of [
      ".github/CODEOWNERS",
      "script/publish.ts",
      "script/raw-changelog.ts",
      "script/translate-app.ts",
      "script/translate-app.test.ts",
    ]) {
      const result = Bun.spawnSync(["git", "ls-files", "--", target], { cwd: root, stdout: "pipe" })
      expect(new TextDecoder().decode(result.stdout).trim()).toBe("")
    }
  })

  test("documents CodeMax rather than upstream product downloads", async () => {
    const readme = await Bun.file(path.join(root, "README.md")).text()

    expect(readme).toContain("# CodeMax")
    expect(readme).toContain("codemax")
    expect(readme).toContain(".codemax")
    expect(readme).toContain("CodeMax-Setup-x64.exe")
    expect(readme).toContain("https://github.com/msy-0098/codemax-tui/releases")
    expect(readme).not.toContain("opencode.ai/install")
    expect(readme).not.toContain("opencode-desktop")
  })
})

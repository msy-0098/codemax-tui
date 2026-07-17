# CodeMax CLI/TUI Pruning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the repository to CodeMax CLI/TUI runtime, Windows distribution, and public release support while replacing the upstream README with a Chinese CodeMax README.

**Architecture:** A small manifest-graph utility computes the workspace closure from `codemax` and the retained release script package. Its checked-in report is the deletion allowlist. Pruning happens only after the report proves a package is unreachable; the remaining workspace, lockfile, tests, release scripts, and README are then updated as one CLI/TUI product.

**Tech Stack:** Bun 1.3.14, TypeScript, Bun test, workspace `package.json` manifests, Git, GitHub Actions, Inno Setup release scripts.

---

## File Structure

- Create: `script/codemax-workspace-closure.ts` - parse manifests, follow `workspace:` dependencies, and write a deterministic retention report.
- Create: `script/codemax-workspace-closure.test.ts` - unit test closure traversal without reading the live repository.
- Create: `docs/pruning/2026-07-17-workspace-retention.md` - committed actual retention/removal report generated from manifests.
- Modify: `package.json` - remove non-CLI dev scripts/workspace groups, set CodeMax repository metadata.
- Modify: `README.md` - replace OpenCode content with Chinese CodeMax project guidance.
- Modify: `bun.lock` - regenerated after workspace deletion.
- Delete: unreachable workspace product packages, their product-only root surfaces, and product-only workflows identified by the retention report.
- Modify: `.github/workflows/codemax-release.yml` and `.github/workflows/codemax-gitee-mirror.yml` only if removed product paths are still referenced.

The initial closure roots are `codemax` and `@opencode-ai/script`. The expected retained workspace packages are:

```text
@opencode-ai/codemode
@opencode-ai/core
@opencode-ai/effect-drizzle-sqlite
@opencode-ai/effect-sqlite-node
@opencode-ai/http-recorder
@opencode-ai/llm
@opencode-ai/plugin
@opencode-ai/protocol
@opencode-ai/schema
@opencode-ai/script
@opencode-ai/sdk
@opencode-ai/server
@opencode-ai/tui
@opencode-ai/ui
codemax
```

### Task 1: Create a Tested Workspace Closure Tool

**Files:**
- Create: `script/codemax-workspace-closure.ts`
- Create: `script/codemax-workspace-closure.test.ts`

- [ ] **Step 1: Write the failing graph traversal tests**

```ts
import { describe, expect, test } from "bun:test"
import { workspaceClosure, type WorkspaceManifest } from "./codemax-workspace-closure"

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
})
```

- [ ] **Step 2: Run the new test and verify it fails because the module is absent**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
```

Expected: module-not-found failure for `./codemax-workspace-closure`.

- [ ] **Step 3: Implement the deterministic closure utility**

```ts
import path from "path"

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
    const source = await Bun.file(path.join(root, file)).json()
    if (!source.name) continue
    const dependencyGroups = [source.dependencies, source.devDependencies, source.peerDependencies, source.optionalDependencies]
    const dependencies = dependencyGroups
      .flatMap((group) => Object.entries(group ?? {}))
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("workspace:"))
      .map(([name]) => name)
    manifests.push({ name: source.name, path: file.replaceAll("\\", "/"), dependencies: [...new Set(dependencies)].sort() })
  }
  return manifests.sort((left, right) => left.name.localeCompare(right.name))
}

export function retentionReport(manifests: WorkspaceManifest[], roots: string[]) {
  const retained = workspaceClosure(manifests, roots)
  const retainedSet = new Set(retained)
  const removable = manifests.filter((manifest) => !retainedSet.has(manifest.name)).map((manifest) => manifest.name).sort()
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
  await Bun.write(path.join(root, "docs/pruning/2026-07-17-workspace-retention.md"), report)
}
```

- [ ] **Step 4: Run the unit test and generate the live retention report**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
bun script/codemax-workspace-closure.ts
Get-Content docs/pruning/2026-07-17-workspace-retention.md
```

Expected: both tests pass; the report retains exactly the 15 packages listed above and classifies desktop/web/console/enterprise/slack/stats/storybook packages as removable.

- [ ] **Step 5: Commit the report before deletion**

```powershell
git add script/codemax-workspace-closure.ts script/codemax-workspace-closure.test.ts docs/pruning/2026-07-17-workspace-retention.md
git commit -m "feat(prune): record CodeMax workspace closure"
```

### Task 2: Remove Unreachable Product Packages and Root Surfaces

**Files:**
- Modify: `package.json`
- Delete: `packages/app`, `packages/cli`, `packages/client`, `packages/console`, `packages/containers`, `packages/desktop`, `packages/docs`, `packages/enterprise`, `packages/function`, `packages/identity`, `packages/session-ui`, `packages/slack`, `packages/stats`, `packages/storybook`, `packages/web`
- Delete: `infra`, `nix`, `perf`, `sdks`, `specs`, `github`
- Delete: product-only `docs` content except `docs/pruning`, `docs/release/codemax-windows.md`, and `docs/superpowers`
- Delete: upstream product workflows except `.github/workflows/codemax-release.yml` and `.github/workflows/codemax-gitee-mirror.yml`
- Test: `script/codemax-workspace-closure.test.ts`

- [ ] **Step 1: Add a failing repository-surface contract test**

At the top of `script/codemax-workspace-closure.test.ts`, add these imports and shared root constant once, then append the test:

```ts
import { existsSync } from "fs"
import path from "path"

const root = path.resolve(import.meta.dir, "..")

test("keeps only CodeMax product surfaces", async () => {
  const removed = [
    "packages/app",
    "packages/desktop",
    "packages/console",
    "packages/enterprise",
    "packages/slack",
    "packages/stats",
    "packages/storybook",
    "packages/web",
    "infra",
    "nix",
  ]

  for (const target of removed) {
    expect(existsSync(path.join(root, target))).toBe(false)
  }

  expect(existsSync(path.join(root, "packages/opencode/package.json"))).toBe(true)
  expect(existsSync(path.join(root, "packages/tui/package.json"))).toBe(true)
  expect(existsSync(path.join(root, ".github/workflows/codemax-release.yml"))).toBe(true)
})
```

- [ ] **Step 2: Run the test and verify it fails on the first retained upstream product directory**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
```

Expected: the product-surface test fails because `packages/app` still exists.

- [ ] **Step 3: Prune only report-classified product surfaces**

Use the committed report as the deletion authority. Delete the directories listed in this task only after confirming none are in `## Retained`:

```powershell
git rm -r packages/app packages/cli packages/client packages/console packages/containers packages/desktop packages/docs packages/enterprise packages/function packages/identity packages/session-ui packages/slack packages/stats packages/storybook packages/web infra nix perf sdks specs github
Get-ChildItem docs -Force | Where-Object { $_.Name -notin 'pruning', 'release', 'superpowers' } | ForEach-Object { git rm -r -- (Join-Path 'docs' $_.Name) }
Get-ChildItem .github/workflows -File | Where-Object { $_.Name -notin 'codemax-release.yml', 'codemax-gitee-mirror.yml' } | ForEach-Object { git rm -- (Join-Path '.github/workflows' $_.Name) }
```

Replace the root workspace declaration and scripts with:

```json
"scripts": {
  "dev": "bun run --cwd packages/opencode --conditions=browser src/index.ts",
  "lint": "oxlint",
  "typecheck": "bun turbo typecheck --filter=codemax --filter=@opencode-ai/core --filter=@opencode-ai/tui --filter=@opencode-ai/sdk --filter=@opencode-ai/server --filter=@opencode-ai/plugin --filter=@opencode-ai/schema --filter=@opencode-ai/protocol --filter=@opencode-ai/llm",
  "postinstall": "bun run --cwd packages/core fix-node-pty",
  "prepare": "husky"
},
"workspaces": {
  "packages": ["packages/*", "packages/sdk/js"]
},
"repository": {
  "type": "git",
  "url": "https://github.com/msy-0098/codemax-tui.git"
}
```

Keep the existing catalog, trusted dependencies, overrides, patches, `@opencode-ai/plugin`, `@opencode-ai/script`, and `@opencode-ai/sdk` root dependencies because retained release scripts import them.

- [ ] **Step 4: Reinstall and detect stale workspace references**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
bun install
rg -n "packages/(app|desktop|console|enterprise|slack|stats|storybook|web)|@opencode-ai/(app|desktop|console|enterprise|slack|stats|storybook|web)" package.json bun.lock .github packages script -g '!node_modules'
```

Expected: installation succeeds. Remaining search results must be only the intentional static removal test; remove every stale runtime, build, or workflow reference.

- [ ] **Step 5: Run the closure and product-surface tests**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
```

Expected: graph tests and product-surface contract pass.

- [ ] **Step 6: Commit the product prune**

```powershell
git add package.json bun.lock .github docs packages script
git commit -m "refactor: prune CodeMax to CLI and TUI"
```

### Task 3: Replace the Root README with CodeMax Documentation

**Files:**
- Modify: `README.md`
- Test: `script/codemax-workspace-closure.test.ts`

- [ ] **Step 1: Add a failing README contract test**

Append this test, reusing the `path` import and `root` constant added in Task 2:

```ts
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
```

- [ ] **Step 2: Run the test and verify it fails against the current OpenCode README**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
```

Expected: the assertion for `# CodeMax` fails.

- [ ] **Step 3: Replace `README.md` with this Chinese CodeMax README**

```md
# CodeMax

CodeMax 是一个开源的终端 AI 编程助手。它在本地项目目录中运行，支持多模型、工具调用、会话、插件和中文界面。

## 下载与安装

Windows 用户优先下载 [CodeMax-Setup-x64.exe](https://github.com/msy-0098/codemax-tui/releases)。安装器默认将 CodeMax 加入当前用户的 `PATH`；重新打开 PowerShell、Windows Terminal 或命令提示符后，可在任意目录运行：

```powershell
codemax
```

便携版用户可下载 `CodeMax-x64.zip` 或 `CodeMax-x64-baseline.zip`，解压后运行其中的 `codemax.exe`。便携版不会自动修改 `PATH`。

每次发布都附带 `SHA256SUMS.txt`，可用于校验下载文件。

## 使用

在项目目录中启动：

```powershell
codemax --language zh-CN
```

在 TUI 中选择模型、输入任务并确认所需权限即可开始工作。

## 配置

项目配置使用 `.codemax/codemax.json` 或 `.codemax/codemax.jsonc`，全局配置使用 CodeMax 用户目录。首次启动时可以迁移已有 OpenCode 配置；迁移后仍可独立使用。

## 本地开发

```powershell
bun install
bun run dev
bun run --cwd packages/opencode typecheck
bun test --cwd packages/tui
```

构建 Windows 二进制：

```powershell
cd packages/opencode
$env:CODEMAX_VERSION = "0.1.0"
bun run script/build.ts --windows-x64
bun run script/package-windows.ts --version 0.1.0 --output dist/release
```

## 发布

推送 `codemax-v<版本号>` 标签会触发公开发布工作流，生成 Windows 安装器、x64 ZIP、baseline ZIP 和 `SHA256SUMS.txt`，并同步到 GitHub 与 Gitee Release。

## 许可与致谢

CodeMax 使用 MIT 许可证发布，源自 OpenCode 的开源代码并保留上游版权与第三方声明。
```

- [ ] **Step 4: Run the README and closure tests**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\script
bun test codemax-workspace-closure.test.ts
```

Expected: all graph, product-surface, and README tests pass.

- [ ] **Step 5: Commit the CodeMax documentation**

```powershell
git add README.md script/codemax-workspace-closure.test.ts
git commit -m "docs: replace README with CodeMax guide"
```

### Task 4: Verify the Retained CodeMax Product

**Files:**
- Test: `script/codemax-workspace-closure.test.ts`
- Test: `script/codemax-public-release.test.ts`
- Test: `script/codemax-gitee-release.test.ts`
- Test: `packages/opencode/test/script/installer-windows.test.ts`
- Test: `packages/opencode/test/script/package-windows.test.ts`
- Test: `packages/tui/test/branding.test.ts`
- Test: `packages/tui/test/runtime.test.tsx`

- [ ] **Step 1: Run retained focused tests**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
$bun = 'C:\Users\21578\.cache\codemax-tools\bun-1.3.14\bun-windows-x64-baseline\bun.exe'
Set-Location script
& $bun test codemax-workspace-closure.test.ts codemax-public-release.test.ts codemax-gitee-release.test.ts codemax-release-check.test.ts
Set-Location ..\packages\opencode
& $bun test test/script/installer-windows.test.ts test/script/package-windows.test.ts
Set-Location ..\tui
& $bun test test/branding.test.ts test/runtime.test.tsx
```

Expected: every focused test passes with zero failures.

- [ ] **Step 2: Typecheck retained packages and build release binaries**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
$bun = 'C:\Users\21578\.cache\codemax-tools\bun-1.3.14\bun-windows-x64-baseline\bun.exe'
& $bun run typecheck
Set-Location packages/opencode
$env:CODEMAX_VERSION = '0.1.0'
& $bun run script/build.ts --windows-x64 --skip-install
& .\dist\codemax-windows-x64\bin\codemax.exe --version
& .\dist\codemax-windows-x64-baseline\bin\codemax.exe --version
& $bun run script/package-windows.ts --version 0.1.0 --output dist/release
tar -tf dist/release/CodeMax-x64.zip
```

Expected: retained typechecks pass; both binaries print `0.1.0`; each ZIP contains only `codemax.exe`, `LICENSE`, `README.txt`, and `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 3: Confirm final repository boundaries and commit verification fixes**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
git diff --check
git status --short
rg -n "opencode.ai/install|opencode-desktop|packages/(app|desktop|console|enterprise|slack|stats|storybook|web)" README.md package.json .github packages script -g '!node_modules'
```

Expected: no whitespace errors; no removed runtime product references; remaining OpenCode mentions are only license attribution, migration compatibility, or retained package namespace imports.

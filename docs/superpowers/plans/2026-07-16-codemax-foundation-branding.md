# CodeMax Foundation And Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one tested CodeMax identity boundary, isolated user paths, the `codemax` CLI entry point, and user-facing terminal branding without renaming internal workspace packages.

**Architecture:** A new `Product` namespace in `packages/core` is the only source of public product names and IDs. Existing internals continue using `@opencode-ai/*`, while global paths, public environment variables, CLI metadata, build output, titles, logos, and user agents consume CodeMax identity values.

**Tech Stack:** TypeScript, Bun, Effect, yargs, SolidJS/OpenTUI.

---

### Task 1: Add The Product Identity Boundary

**Files:**
- Create: `packages/core/src/product.ts`
- Create: `packages/core/test/product.test.ts`

- [ ] **Step 1: Write the failing identity test**

```ts
import { describe, expect, test } from "bun:test"
import { Product } from "../src/product"

describe("Product", () => {
  test("exposes stable CodeMax public identity", () => {
    expect(Product.Name).toBe("CodeMax")
    expect(Product.Command).toBe("codemax")
    expect(Product.ID).toBe("codemax")
    expect(Product.ConfigEnvironment).toEqual({
      file: "CODEMAX_CONFIG",
      directory: "CODEMAX_CONFIG_DIR",
      content: "CODEMAX_CONFIG_CONTENT",
    })
  })
})
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

Run from `packages/core`:

```powershell
bun test test/product.test.ts
```

Expected: FAIL because `src/product.ts` does not exist.

- [ ] **Step 3: Implement the identity namespace**

```ts
export const Name = "CodeMax"
export const Command = "codemax"
export const ID = "codemax"
export const UserAgent = "codemax"
export const ConfigEnvironment = {
  file: "CODEMAX_CONFIG",
  directory: "CODEMAX_CONFIG_DIR",
  content: "CODEMAX_CONFIG_CONTENT",
} as const

export * as Product from "./product"
```

- [ ] **Step 4: Run the focused test and type check**

```powershell
bun test test/product.test.ts
bun typecheck
```

Expected: PASS and both commands exit `0`.

- [ ] **Step 5: Commit the identity boundary**

```powershell
git add packages/core/src/product.ts packages/core/test/product.test.ts
git commit -m "feat(core): add CodeMax product identity"
```

### Task 2: Isolate Global Paths And Public Config Variables

**Files:**
- Modify: `packages/core/src/global.ts`
- Modify: `packages/core/src/flag/flag.ts`
- Create: `packages/core/test/product-global.test.ts`

- [ ] **Step 1: Write failing path and environment tests**

```ts
import { afterEach, describe, expect, test } from "bun:test"
import path from "path"

const previous = {
  config: process.env.CODEMAX_CONFIG,
  directory: process.env.CODEMAX_CONFIG_DIR,
  content: process.env.CODEMAX_CONFIG_CONTENT,
}

afterEach(() => {
  set("CODEMAX_CONFIG", previous.config)
  set("CODEMAX_CONFIG_DIR", previous.directory)
  set("CODEMAX_CONFIG_CONTENT", previous.content)
})

function set(key: string, value?: string) {
  if (value === undefined) return delete process.env[key]
  process.env[key] = value
}

describe("CodeMax global isolation", () => {
  test("uses a codemax application directory", async () => {
    const { Global } = await import(`../src/global.ts?case=${Date.now()}`)
    expect(path.basename(Global.Path.config)).toBe("codemax")
    expect(path.basename(Global.Path.data)).toBe("codemax")
  })

  test("maps CODEMAX_CONFIG variables onto internal flags", async () => {
    process.env.CODEMAX_CONFIG = "C:/tmp/codemax.jsonc"
    process.env.CODEMAX_CONFIG_DIR = "C:/tmp/codemax"
    process.env.CODEMAX_CONFIG_CONTENT = "{}"
    const { Flag } = await import(`../src/flag/flag.ts?case=${Date.now()}`)
    expect(Flag.OPENCODE_CONFIG).toBe("C:/tmp/codemax.jsonc")
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("C:/tmp/codemax")
    expect(Flag.OPENCODE_CONFIG_CONTENT).toBe("{}")
  })
})
```

- [ ] **Step 2: Run the test and verify current OpenCode values fail**

```powershell
bun test test/product-global.test.ts
```

Expected: FAIL with basename `opencode` or undefined CodeMax environment values.

- [ ] **Step 3: Route paths and config flags through Product**

In `packages/core/src/global.ts`, import `Product` and replace the hard-coded application ID:

```ts
import { Product } from "./product"

const app = Product.ID
```

In `packages/core/src/flag/flag.ts`, import `Product` and map only the approved public config inputs while retaining internal property names:

```ts
import { Product } from "../product"

export const Flag = {
  // existing properties remain unchanged
  OPENCODE_CONFIG: process.env[Product.ConfigEnvironment.file],
  OPENCODE_CONFIG_CONTENT: process.env[Product.ConfigEnvironment.content],
  OPENCODE_DISABLE_AUTOUPDATE:
    process.env.CODEMAX_DISABLE_AUTOUPDATE === undefined ? true : truthy("CODEMAX_DISABLE_AUTOUPDATE"),
  get OPENCODE_CONFIG_DIR() {
    return process.env[Product.ConfigEnvironment.directory]
  },
}
```

Keep all unrelated flag entries in the object exactly as upstream defines them.

- [ ] **Step 4: Run focused and package verification**

```powershell
bun test test/product.test.ts test/product-global.test.ts
bun typecheck
```

Expected: PASS; generated global paths end in `codemax` and flags read `CODEMAX_*`.

- [ ] **Step 5: Commit isolated storage**

```powershell
git add packages/core/src/global.ts packages/core/src/flag/flag.ts packages/core/test/product-global.test.ts
git commit -m "feat(core): isolate CodeMax user paths"
```

### Task 3: Brand The CLI And Build Output

**Files:**
- Modify: `packages/opencode/package.json`
- Rename: `packages/opencode/bin/opencode` to `packages/opencode/bin/codemax`
- Modify: `packages/opencode/bin/codemax`
- Modify: `packages/opencode/src/index.ts`
- Modify: `packages/opencode/script/build.ts`
- Modify: `packages/core/src/models-dev.ts`
- Create: `packages/script/src/release-env.ts`
- Modify: `packages/script/src/index.ts`
- Create: `packages/script/test/release-env.test.ts`
- Create: `packages/opencode/test/cli/branding.test.ts`

- [ ] **Step 1: Write failing CLI metadata tests**

```ts
import { describe, expect, test } from "bun:test"
import pkg from "../../package.json"

describe("CodeMax CLI metadata", () => {
  test("publishes only the codemax command", () => {
    expect(pkg.name).toBe("codemax")
    expect(pkg.bin).toEqual({ codemax: "./bin/codemax" })
  })

  test("launcher resolves a codemax executable", async () => {
    const text = await Bun.file(new URL("../../bin/codemax", import.meta.url)).text()
    expect(text).toContain('const binary = platform === "windows" ? "codemax.exe" : "codemax"')
    expect(text).toContain('const base = "codemax-" + platform + "-" + arch')
  })
})
```

- [ ] **Step 2: Run the test and observe missing CodeMax artifacts**

Run from `packages/opencode`:

```powershell
bun test test/cli/branding.test.ts
```

Expected: FAIL because package metadata and launcher still expose `opencode`.

- [ ] **Step 3: Apply public CLI branding**

Set the package metadata to:

```json
{
  "name": "codemax",
  "bin": {
    "codemax": "./bin/codemax"
  }
}
```

Preserve every other `package.json` field. Rename the launcher and change its public package prefix, binary name, cache filename, configuration error text, and `CODEMAX_BIN_PATH` override. In `src/index.ts`, set yargs `.scriptName(Product.Command)` and import `Product` from `@opencode-ai/core/product`.

In `script/build.ts`, keep the upstream target matrix but compile to:

```ts
outfile: `dist/${name}/bin/${Product.Command}`,
execArgv: [`--user-agent=${Product.UserAgent}/${Script.version}`, "--use-system-ca", "--"],
```

Add `import { Product } from "@opencode-ai/core/product"` and ensure the local smoke-test path also uses `Product.Command`.

Replace the models metadata HTTP user agent in `packages/core/src/models-dev.ts` with `Product.UserAgent`. Move release environment calculation into `packages/script/src/release-env.ts`:

```ts
export function resolveReleaseEnv(
  env: Record<string, string | undefined>,
  branch: string,
  now = new Date(),
) {
  const channel = env.CODEMAX_CHANNEL ?? (env.CODEMAX_VERSION ? "latest" : branch)
  if (env.CODEMAX_VERSION) return { channel, version: env.CODEMAX_VERSION, release: env.CODEMAX_RELEASE === "1" }
  if (channel === "latest") throw new Error("CODEMAX_VERSION is required for a latest release")
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, "")
  return { channel, version: `0.0.0-${channel}-${stamp}`, release: false }
}
```

Add this failing-first test in `packages/script/test/release-env.test.ts` before implementing the helper:

```ts
import { expect, test } from "bun:test"
import { resolveReleaseEnv } from "../src/release-env"

test("private releases require an explicit CodeMax version", () => {
  expect(resolveReleaseEnv({ CODEMAX_VERSION: "0.1.0", CODEMAX_RELEASE: "1" }, "codemax-mvp")).toEqual({
    channel: "latest",
    version: "0.1.0",
    release: true,
  })
  expect(() => resolveReleaseEnv({ CODEMAX_CHANNEL: "latest" }, "latest")).toThrow("CODEMAX_VERSION")
})
```

Change `packages/script/src/index.ts` to consume this helper and remove the public npm `opencode-ai/latest` fetch.

- [ ] **Step 4: Verify metadata, CLI help, and package types**

```powershell
bun test test/cli/branding.test.ts
bun run src/index.ts --help
bun typecheck
Set-Location ../script
bun test test/release-env.test.ts
bun typecheck
```

Expected: PASS; help begins with `codemax` and contains no `opencode <command>` usage line.

- [ ] **Step 5: Commit the CLI surface**

```powershell
git add packages/opencode/package.json packages/opencode/bin/codemax packages/opencode/src/index.ts packages/opencode/script/build.ts packages/opencode/test/cli/branding.test.ts packages/core/src/models-dev.ts packages/script/src/release-env.ts packages/script/src/index.ts packages/script/test/release-env.test.ts
git add -u packages/opencode/bin/opencode
git commit -m "feat(opencode): expose CodeMax CLI"
```

### Task 4: Replace Terminal Titles, Text Logos, And Crash Branding

**Files:**
- Modify: `packages/opencode/src/cli/logo.ts`
- Modify: `packages/tui/src/logo.ts`
- Modify: `packages/tui/src/component/logo.tsx`
- Modify: `packages/tui/src/component/error-component.tsx`
- Modify: `packages/tui/src/app.tsx`
- Modify: `packages/tui/src/feature-plugins/sidebar/footer.tsx`
- Modify: `packages/tui/src/routes/session/sidebar.tsx`
- Create: `packages/tui/test/branding.test.ts`

- [ ] **Step 1: Write a failing source-level branding allowlist test**

```ts
import { describe, expect, test } from "bun:test"

const files = [
  "src/app.tsx",
  "src/component/error-component.tsx",
  "src/feature-plugins/sidebar/footer.tsx",
  "src/routes/session/sidebar.tsx",
]

describe("CodeMax TUI branding", () => {
  test("does not expose OpenCode product text in primary TUI surfaces", async () => {
    const hits = (
      await Promise.all(files.map(async (file) => [file, await Bun.file(file).text()] as const))
    ).flatMap(([file, text]) => (/\bOpenCode\b|\bopencode crashed\b/.test(text) ? [file] : []))
    expect(hits).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test and observe the existing branding hits**

Run from `packages/tui`:

```powershell
bun test test/branding.test.ts
```

Expected: FAIL listing the current OpenCode-branded primary surfaces.

- [ ] **Step 3: Replace only user-facing brand text**

Use `Product.Name` and `Product.Command` where TypeScript code can import it. Set terminal titles to `CodeMax` and `CM | <session title>`. Replace crash headings, issue body text, sidebar wordmarks, home logo data, and command suggestions with CodeMax text. Do not rename plugin slot IDs, internal keymap constants, package imports, schema URLs, upstream license text, or source attribution.

The terminal wordmark must remain ASCII-safe:

```ts
export const logo = ["  ____          _      __  __           ", " / ___|___   __| | ___|  \/  | __ ___  __", "| |   / _ \\ / _` |/ _ \\ |\/| |/ _` \\ \/ /", "| |__| (_) | (_| |  __/ |  | | (_| |>  < ", " \\____\\___/ \\__,_|\\___|_|  |_|\\__,_/_/\\_\\"]
```

Keep the compact fallback `CM` for terminals narrower than the full wordmark.

- [ ] **Step 4: Run branding, lifecycle, and type verification**

```powershell
bun test test/branding.test.ts test/app-lifecycle.test.tsx test/index.test.tsx
bun typecheck
```

Expected: PASS; primary surfaces no longer expose OpenCode branding.

- [ ] **Step 5: Commit terminal branding**

```powershell
git add packages/opencode/src/cli/logo.ts packages/tui/src/logo.ts packages/tui/src/component/logo.tsx packages/tui/src/component/error-component.tsx packages/tui/src/app.tsx packages/tui/src/feature-plugins/sidebar/footer.tsx packages/tui/src/routes/session/sidebar.tsx packages/tui/test/branding.test.ts
git commit -m "feat(tui): apply CodeMax terminal branding"
```

### Task 5: Verify The Foundation Against Upstream Tests

**Files:**
- No new files

- [ ] **Step 1: Run core verification**

```powershell
Set-Location packages/core
bun test
bun typecheck
```

Expected: PASS with zero failed tests.

- [ ] **Step 2: Run TUI verification**

```powershell
Set-Location ../tui
bun test
bun typecheck
```

Expected: PASS with zero failed tests.

- [ ] **Step 3: Run CLI verification and a native smoke build**

```powershell
Set-Location ../opencode
bun test
bun typecheck
bun run script/build.ts --single
Get-ChildItem dist/codemax-windows-x64/bin/codemax.exe
& dist/codemax-windows-x64/bin/codemax.exe --version
```

Expected: all commands exit `0`; the built executable exists and prints the current version.

- [ ] **Step 4: Record the verified foundation checkpoint**

```powershell
Set-Location ../..
git status --short
git log -5 --oneline
```

Expected: working tree is clean and the four focused commits are visible.

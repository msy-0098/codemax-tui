# CodeMax Migration And Error Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load only CodeMax configuration, safely import selected OpenCode data on first run, redact sensitive data at every output boundary, and present stable actionable CodeMax errors.

**Architecture:** Configuration discovery and migration are separate modules. Redaction is a core pure function reused by logging, persisted API errors, diagnostics, and the TUI; error classification produces a presentation DTO and never changes upstream retry or provider semantics.

**Tech Stack:** TypeScript, Effect, Bun SQLite/filesystem APIs, SolidJS/OpenTUI.

---

### Task 1: Enforce CodeMax Configuration Discovery And Precedence

**Files:**
- Modify: `packages/opencode/src/config/paths.ts`
- Modify: `packages/opencode/src/config/config.ts`
- Modify: `packages/opencode/src/config/tui.ts`
- Modify: `packages/opencode/test/config/config.test.ts`
- Modify: `packages/opencode/test/config/tui.test.ts`

- [ ] **Step 1: Add failing isolation and precedence tests**

Build temporary trees containing both `.opencode/opencode.jsonc` and `.codemax/codemax.jsonc`. Assert CodeMax ignores `.opencode`, accepts `.codemax/codemax.json(c)`, writes project updates to `.codemax/codemax.jsonc`, and resolves default < global < project < `CODEMAX_CONFIG` < `CODEMAX_CONFIG_CONTENT`.

- [ ] **Step 2: Run focused config tests and observe current failures**

```powershell
bun test test/config/config.test.ts test/config/tui.test.ts
```

- [ ] **Step 3: Replace public config candidates and reorder explicit overrides**

Change `ConfigPaths.directories` targets to `.codemax`; use `ConfigPaths.files("codemax", ...)`; make global candidates `codemax.jsonc`, `codemax.json`; change update targets to `.codemax/codemax.jsonc`. Load global then project files, then `Flag.OPENCODE_CONFIG`, and finally `Flag.OPENCODE_CONFIG_CONTENT`. Preserve the existing enterprise policy by applying account and system-managed configuration last; add a test proving managed policy overrides local content.

- [ ] **Step 4: Verify and commit**

```powershell
bun test test/config/config.test.ts test/config/tui.test.ts
bun typecheck
git add src/config test/config
git commit -m "feat(opencode): isolate CodeMax configuration"
```

### Task 2: Implement Transactional OpenCode Import

**Files:**
- Create: `packages/opencode/src/migration/opencode.ts`
- Create: `packages/opencode/test/migration/opencode.test.ts`
- Modify: `packages/opencode/src/cli/cmd/tui.ts`

- [ ] **Step 1: Write failing migration-plan tests**

Test detection, default selection of config/auth, optional sessions, idempotency marker, source immutability, invalid JSONC rollback, unavailable source, interrupted copy cleanup, and SQLite `PRAGMA integrity_check`. Snapshot source file hashes before and after each test.

- [ ] **Step 2: Run and observe the missing migration module**

```powershell
bun test test/migration/opencode.test.ts
```

- [ ] **Step 3: Implement explicit plan and result types**

```ts
export type MigrationCategory = "config" | "auth" | "sessions"
export type MigrationPlan = { source: string; target: string; categories: MigrationCategory[] }
export type MigrationResult = { copied: string[]; skipped: string[] }

export function detect(source: string, target: string): Promise<MigrationPlan | undefined>
export function migrate(plan: MigrationPlan): Promise<MigrationResult>
```

`migrate` must copy to `<target>.migration-<timestamp>`, parse config through `ConfigParse`, validate auth JSON shape, require OpenCode to be closed before session import, copy database plus WAL/SHM into staging, run `PRAGMA integrity_check`, atomically rename staging to target, and write `migration.json`. On failure it removes only staging and never writes to source.

- [ ] **Step 4: Add first-run confirmation without automatic import**

Before normal TUI startup, call `detect`. Present config/auth selected and sessions unselected; run `migrate` only after explicit confirmation. A `--no-import` flag suppresses detection for automation.

- [ ] **Step 5: Verify, hash sources, and commit**

```powershell
bun test test/migration/opencode.test.ts test/cli/tui/thread.test.ts
bun typecheck
git add src/migration/opencode.ts src/cli/cmd/tui.ts test/migration/opencode.test.ts test/cli/tui/thread.test.ts
git commit -m "feat(opencode): import OpenCode data transactionally"
```

### Task 3: Add Shared Sensitive-Data Redaction

**Files:**
- Create: `packages/core/src/error/redact.ts`
- Create: `packages/core/test/error/redact.test.ts`
- Modify: `packages/core/src/observability/logging.ts`
- Modify: `packages/core/src/v1/session.ts`
- Modify: `packages/opencode/src/config/parse.ts`
- Modify: `packages/opencode/src/provider/error.ts`

- [ ] **Step 1: Write failing redaction tests**

Cover `Authorization`, `Cookie`, `Set-Cookie`, `x-api-key`, JSON `apiKey/token/secret/password`, `sk-*` strings, URL query tokens, environment maps, stderr, nested arrays, errors with causes, and circular objects. Assert non-sensitive model IDs, status codes, paths, and line/column values survive.

- [ ] **Step 2: Run and observe missing redaction**

```powershell
Set-Location packages/core
bun test test/error/redact.test.ts
```

- [ ] **Step 3: Implement boundary-safe redaction**

```ts
const sensitive = /authorization|cookie|api[-_]?key|token|secret|password/i

export function redact(input: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof input === "string") return input.replace(/\b(sk|key|token)-[A-Za-z0-9_-]{8,}\b/g, "$1-[REDACTED]")
  if (!input || typeof input !== "object") return input
  if (seen.has(input)) return "[Circular]"
  seen.add(input)
  if (Array.isArray(input)) return input.map((value) => redact(value, seen))
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, sensitive.test(key) ? "[REDACTED]" : redact(value, seen)]),
  )
}
```

Extend string handling to redact bearer headers and sensitive URL query values. Apply `redact` before log formatting, API error persistence, config parse error construction, and provider error DTO creation.

- [ ] **Step 4: Verify all affected packages and commit**

```powershell
Set-Location packages/core
bun test test/error/redact.test.ts
bun typecheck
Set-Location ../opencode
bun test test/config/config.test.ts test/provider/provider.test.ts test/cli/error.test.ts
bun typecheck
git add ../core/src/error/redact.ts ../core/src/observability/logging.ts ../core/src/v1/session.ts ../core/test/error/redact.test.ts src/config/parse.ts src/provider/error.ts
git commit -m "fix(core): redact sensitive diagnostic data"
```

### Task 4: Classify And Render Actionable CodeMax Errors

**Files:**
- Create: `packages/opencode/src/error/codemax.ts`
- Create: `packages/opencode/test/error/codemax.test.ts`
- Create: `packages/tui/src/component/codemax-error.tsx`
- Modify: `packages/tui/src/util/error.ts`
- Modify: `packages/tui/src/component/error-component.tsx`
- Modify: `packages/tui/test/util/error.test.ts`

- [ ] **Step 1: Write table-driven failing classification tests**

Map DNS/TLS/proxy/timeout to `CM-NET`, 401/403 to `CM-AUTH`, 429/quota/overload to `CM-RATE`, unsupported tool/image/context to `CM-MODEL`, config tags to `CM-CONFIG`, process exit/stderr to `CM-TOOL`, terminal capability to `CM-TERM`, and unknown crashes to `CM-CRASH`. Assert every DTO has `{ code, summaryKey, actionKey, retryable, details }` and redacted details.

- [ ] **Step 2: Implement the stable DTO classifier**

```ts
export type CodeMaxError = {
  code: string
  summaryKey: string
  actionKey: string
  retryable: boolean
  details: unknown
}

export function classify(error: unknown): CodeMaxError
```

Use exact status/tag/code matches before conservative message matching. Never mutate the original error or provider retry behavior.

- [ ] **Step 3: Render summary, action, retry, and expandable details**

`CodeMaxErrorView` consumes the DTO and `useI18n`, shows the stable code, and exposes retry/copy-details controls only when applicable. Replace direct raw stack output in the crash component with redacted details; keep a local diagnostic copy action and remove automatic raw issue URL construction.

- [ ] **Step 4: Verify and commit**

```powershell
Set-Location packages/opencode
bun test test/error/codemax.test.ts test/cli/error.test.ts
bun typecheck
Set-Location ../tui
bun test test/util/error.test.ts
bun typecheck
git add ../opencode/src/error/codemax.ts ../opencode/test/error/codemax.test.ts src/component/codemax-error.tsx src/component/error-component.tsx src/util/error.ts test/util/error.test.ts
git commit -m "feat(tui): present actionable CodeMax errors"
```

### Task 5: Restore Only Durable Session State After A Crash

**Files:**
- Modify: `packages/tui/src/component/error-component.tsx`
- Modify: `packages/opencode/src/cli/tui/worker.ts`
- Create: `packages/tui/test/component/crash-recovery.test.tsx`

- [ ] **Step 1: Add a failing recovery test**

Simulate a crash with one committed assistant message and one in-flight turn. Assert restart opens the committed session, marks the interrupted turn, does not call the provider, and reports a redacted `CM-CRASH` diagnostic.

- [ ] **Step 2: Implement recovery metadata and explicit resume**

Persist only `{ sessionID, route, crashedAt }` in TUI state. On restart navigate to the session and show an interruption banner. Do not wake SessionExecution or resubmit the prompt automatically; the user must explicitly retry.

- [ ] **Step 3: Verify and commit**

```powershell
Set-Location packages/tui
bun test test/component/crash-recovery.test.tsx test/app-lifecycle.test.tsx
bun typecheck
git add src/component/error-component.tsx test/component/crash-recovery.test.tsx ../opencode/src/cli/tui/worker.ts
git commit -m "fix(tui): restore durable session after crash"
```

### Task 6: Run Migration And Error Gates

```powershell
Set-Location packages/core
bun test
bun typecheck
Set-Location ../opencode
bun test
bun typecheck
Set-Location ../tui
bun test
bun typecheck
```

Expected: all suites pass; a repository search finds no real tokens and the exposed Gitee token is absent from Git history.

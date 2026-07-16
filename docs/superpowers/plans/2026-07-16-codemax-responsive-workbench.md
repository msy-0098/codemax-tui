# CodeMax Responsive Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing OpenCode session sidebar into the approved CodeMax dual-column workbench with deterministic wide, single-column, and compact modes.

**Architecture:** One pure layout resolver owns breakpoints. Small header/sidebar/footer components consume existing sync, plugin-slot, SDK file-list, Git diff, and session state; the 2,600-line session route only selects and composes them.

**Tech Stack:** SolidJS, OpenTUI, existing TUI plugin runtime and SDK v2.

---

### Task 1: Lock Responsive Breakpoints In A Pure Function

**Files:**
- Create: `packages/tui/src/util/workbench-layout.ts`
- Create: `packages/tui/test/util/workbench-layout.test.ts`

- [ ] **Step 1: Write the failing boundary test**

```ts
import { expect, test } from "bun:test"
import { resolveWorkbenchLayout } from "../../src/util/workbench-layout"

test.each([
  [79, "compact", false],
  [80, "single", false],
  [119, "single", false],
  [120, "dual", true],
  [160, "dual", true],
] as const)("resolves width %i", (width, mode, sidebar) => {
  expect(resolveWorkbenchLayout(width)).toEqual({ mode, sidebar, sidebarWidth: sidebar ? 42 : 0 })
})
```

- [ ] **Step 2: Run and observe the missing module**

```powershell
bun test test/util/workbench-layout.test.ts
```

- [ ] **Step 3: Implement the resolver**

```ts
export type WorkbenchMode = "compact" | "single" | "dual"

export function resolveWorkbenchLayout(width: number) {
  if (width < 80) return { mode: "compact" as const, sidebar: false, sidebarWidth: 0 }
  if (width < 120) return { mode: "single" as const, sidebar: false, sidebarWidth: 0 }
  return { mode: "dual" as const, sidebar: true, sidebarWidth: 42 }
}
```

- [ ] **Step 4: Verify and commit**

```powershell
bun test test/util/workbench-layout.test.ts
bun typecheck
git add src/util/workbench-layout.ts test/util/workbench-layout.test.ts
git commit -m "feat(tui): define responsive workbench modes"
```

### Task 2: Add Focused Workbench Header, Sidebar, And Footer Components

**Files:**
- Create: `packages/tui/src/routes/session/workbench-header.tsx`
- Create: `packages/tui/src/routes/session/workbench-sidebar.tsx`
- Create: `packages/tui/src/routes/session/workbench-footer.tsx`
- Modify: `packages/tui/src/routes/session/sidebar.tsx`
- Create: `packages/tui/test/routes/session/workbench.test.tsx`

- [ ] **Step 1: Write failing structural render tests**

Using `testRender`, `TestTuiContexts`, `createTuiResolvedConfig`, and existing sync fixtures, assert the 120-column render includes CodeMax, agent, model, project, Modified Files, recent sessions, language, context percentage, and Git branch. Assert the 80-column render excludes the persistent sidebar but exposes the sidebar toggle command.

- [ ] **Step 2: Run the render test and observe missing components**

```powershell
bun test test/routes/session/workbench.test.tsx
```

- [ ] **Step 3: Implement components against existing contexts**

`WorkbenchHeader` renders a single stable row using `useLocal`, `useProject`, `useSync`, and `useI18n`. `WorkbenchSidebar` wraps the existing `Sidebar` plugin slots, adds a collapsible project file list from `sdk.client.file.list({ path: "" })`, and limits recent sessions to the five newest entries from sync state. `WorkbenchFooter` renders language, context percentage, VCS branch, and connected state with fixed-width segments and truncation from `Locale`.

Each component receives `sessionID` and `mode` props; it must not own navigation, model calls, or session mutation.

- [ ] **Step 4: Verify component rendering and commit**

```powershell
bun test test/routes/session/workbench.test.tsx test/feature-plugins/diff-viewer-file-tree-utils.test.ts
bun typecheck
git add src/routes/session/workbench-*.tsx src/routes/session/sidebar.tsx test/routes/session/workbench.test.tsx
git commit -m "feat(tui): add CodeMax workbench components"
```

### Task 3: Integrate The Workbench Through A Thin Session Route Change

**Files:**
- Modify: `packages/tui/src/routes/session/index.tsx`
- Modify: `packages/tui/test/routes/session/workbench.test.tsx`
- Modify: `packages/tui/test/cli/tui/inline-tool-wrap-snapshot.test.tsx`

- [ ] **Step 1: Add failing 80/120/160 render assertions**

Assert: width 80 uses single-column content and overlay sidebar on explicit toggle; width 120 and 160 use persistent dual columns; width 79 hides nonessential footer fields; content width subtracts exactly the resolved sidebar width; dynamic labels do not change the root width.

- [ ] **Step 2: Run focused route and snapshot tests**

```powershell
bun test test/routes/session/workbench.test.tsx test/cli/tui/inline-tool-wrap-snapshot.test.tsx
```

Expected: FAIL on current `width > 120` behavior.

- [ ] **Step 3: Replace inline layout decisions**

In `Session`, replace `wide`, `sidebarVisible`, and hard-coded content-width arithmetic with a memoized `resolveWorkbenchLayout(dimensions().width)`. Preserve existing `sidebarOpen` overlay behavior for single mode. Render the new header above the scroll area and footer below the prompt; use persistent sidebar only when `mode === "dual"`.

- [ ] **Step 4: Update snapshots, verify, and commit**

```powershell
bun test test/routes/session/workbench.test.tsx test/cli/tui/inline-tool-wrap-snapshot.test.tsx --update-snapshots
bun test test/routes/session/workbench.test.tsx test/cli/tui/inline-tool-wrap-snapshot.test.tsx
bun typecheck
git add src/routes/session/index.tsx test/routes/session/workbench.test.tsx test/cli/tui
git commit -m "feat(tui): integrate responsive dual-column workbench"
```

### Task 4: Verify Keyboard And Windows Terminal Degradation

**Files:**
- Modify: `packages/tui/src/terminal-win32.ts`
- Modify: `packages/tui/test/runtime.test.tsx`
- Create: `packages/tui/test/util/terminal-capability.test.ts`

- [ ] **Step 1: Add failing capability tests**

Test truecolor Windows Terminal, 16-color CMD, Unicode disabled fallback, and sidebar keyboard access in every mode. Expected fallback glyphs are ASCII `>`, `v`, `+`, `-`, and `CM`.

- [ ] **Step 2: Implement a pure terminal capability result and use it in rendering**

Return `{ color: "truecolor" | "ansi16", unicode: boolean }` from environment inputs (`WT_SESSION`, `TERM`, `COLORTERM`, code page). Feed this result into theme and logo selection; do not branch throughout components.

- [ ] **Step 3: Verify focused and full TUI suites**

```powershell
bun test test/util/workbench-layout.test.ts test/util/terminal-capability.test.ts test/routes/session/workbench.test.tsx test/runtime.test.tsx
bun typecheck
bun test
```

- [ ] **Step 4: Commit terminal degradation support**

```powershell
git add src/terminal-win32.ts test/runtime.test.tsx test/util/terminal-capability.test.ts
git commit -m "fix(tui): degrade workbench for legacy terminals"
```

### Task 5: Perform Manual Layout Acceptance

- [ ] Launch CodeMax in Windows Terminal at 80×24, 120×30, and 160×45.
- [ ] Repeat 80×24 in CMD and verify Chinese characters, ASCII fallback, keyboard navigation, and prompt remain reachable.
- [ ] Confirm no label overlaps the prompt, tool output, header, sidebar, or footer.
- [ ] Record screenshots and observations in `docs/release/codemax-windows.md` during the release plan.

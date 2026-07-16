# CodeMax Localization And Provider Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent Chinese/English selection, type-safe translated core TUI text, and Chinese-first domestic provider discovery without changing provider protocols.

**Architecture:** Translation keys and locale resolution live in new pure modules, then one Solid context is mounted in `app.tsx`. Provider ranking is another pure display function; authentication, model metadata, custom providers, and SDK behavior remain upstream-owned.

**Tech Stack:** TypeScript, Effect Schema, SolidJS context, Bun test.

---

### Task 1: Implement Locale Resolution And Type-Safe Catalogs

**Files:**
- Create: `packages/tui/src/i18n/locale.ts`
- Create: `packages/tui/src/i18n/messages/en.ts`
- Create: `packages/tui/src/i18n/messages/zh-cn.ts`
- Create: `packages/tui/src/i18n/index.tsx`
- Create: `packages/tui/test/i18n/locale.test.ts`
- Create: `packages/tui/test/i18n/catalog.test.ts`

- [ ] **Step 1: Write failing locale and catalog tests**

```ts
import { describe, expect, test } from "bun:test"
import { resolveLanguage } from "../../src/i18n/locale"

describe("resolveLanguage", () => {
  test("uses CLI, config, environment, then English", () => {
    expect(resolveLanguage({ cli: "zh-CN", config: "en", environment: "en_US" })).toBe("zh-CN")
    expect(resolveLanguage({ config: "en", environment: "zh_CN.UTF-8" })).toBe("en")
    expect(resolveLanguage({ environment: "zh-Hans-CN" })).toBe("zh-CN")
    expect(resolveLanguage({ environment: "fr_FR" })).toBe("en")
  })
})
```

```ts
import { expect, test } from "bun:test"
import { en } from "../../src/i18n/messages/en"
import { zhCN } from "../../src/i18n/messages/zh-cn"

test("Chinese and English catalogs have identical keys", () => {
  expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort())
})

test("technical terms remain searchable", () => {
  expect(zhCN["provider.apiKey"]).toContain("API Key")
  expect(zhCN["provider.openaiCompatible"]).toContain("OpenAI")
  expect(zhCN["status.mcp"]).toContain("MCP")
})
```

- [ ] **Step 2: Run both tests and observe missing modules**

From `packages/tui`:

```powershell
bun test test/i18n/locale.test.ts test/i18n/catalog.test.ts
```

Expected: FAIL because `src/i18n` is absent.

- [ ] **Step 3: Implement locale parsing and the initial complete core catalog**

```ts
export type Language = "en" | "zh-CN"
export type LanguageSetting = "auto" | Language

export function normalizeLanguage(value?: string): Language | undefined {
  if (!value) return
  const normalized = value.replaceAll("_", "-").toLowerCase()
  if (normalized === "en" || normalized.startsWith("en-")) return "en"
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN"
}

export function resolveLanguage(input: { cli?: string; config?: LanguageSetting; environment?: string }): Language {
  return (
    normalizeLanguage(input.cli) ??
    (input.config && input.config !== "auto" ? input.config : undefined) ??
    normalizeLanguage(input.environment) ??
    "en"
  )
}
```

The English catalog must define these stable keys; the Chinese catalog must define the same keys with natural Chinese text: `app.name`, `app.language`, `home.prompt`, `home.start`, `session.new`, `session.list`, `session.modifiedFiles`, `session.context`, `session.todos`, `session.status`, `session.input`, `dialog.confirm`, `dialog.cancel`, `dialog.close`, `dialog.search`, `dialog.noResults`, `provider.connect`, `provider.popular`, `provider.all`, `provider.other`, `provider.apiKey`, `provider.openaiCompatible`, `provider.saved`, `model.select`, `agent.select`, `status.mcp`, `status.connected`, `status.disconnected`, `error.details`, `error.retry`, `error.copyDiagnostics`, `command.palette`, `command.language`.

Export the English object with `as const`, declare `export type MessageKey = keyof typeof en`, and type the Chinese object as `{ [K in MessageKey]: string }` so missing keys fail typecheck.

- [ ] **Step 4: Implement the Solid context with interpolation**

```tsx
import { createContext, type JSX, useContext } from "solid-js"
import { en, type MessageKey } from "./messages/en"
import { zhCN } from "./messages/zh-cn"
import type { Language } from "./locale"

const catalogs = { en, "zh-CN": zhCN }
const Context = createContext<{ language: Language; t: (key: MessageKey, values?: Record<string, string>) => string }>()

export function I18nProvider(props: { language: Language; children: JSX.Element }) {
  const t = (key: MessageKey, values: Record<string, string> = {}) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), catalogs[props.language][key])
  return <Context.Provider value={{ language: props.language, t }}>{props.children}</Context.Provider>
}

export function useI18n() {
  const value = useContext(Context)
  if (!value) throw new Error("I18nProvider is missing")
  return value
}
```

- [ ] **Step 5: Run tests, typecheck, and commit**

```powershell
bun test test/i18n/locale.test.ts test/i18n/catalog.test.ts
bun typecheck
git add src/i18n test/i18n
git commit -m "feat(tui): add typed localization catalogs"
```

Expected: PASS and a focused localization commit.

### Task 2: Add Language Configuration, CLI Override, And Persistence

**Files:**
- Modify: `packages/tui/src/config/index.tsx`
- Modify: `packages/tui/src/context/args.tsx`
- Modify: `packages/tui/src/app.tsx`
- Modify: `packages/tui/test/config.test.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui.ts`
- Modify: `packages/opencode/test/cli/tui/thread.test.ts`
- Modify: `packages/opencode/test/config/tui.test.ts`

- [ ] **Step 1: Add failing config and CLI tests**

Add these assertions to `packages/tui/test/config.test.tsx`:

```ts
test("validates and resolves language", () => {
  expect(decodeInfo({ language: "zh-CN" })).toEqual({ language: "zh-CN" })
  expect(resolve({ language: "zh-CN" }, { terminalSuspend: true }).language).toBe("zh-CN")
  expect(resolve({}, { terminalSuspend: true }).language).toBe("auto")
  expect(() => decodeInfo({ language: "fr" })).toThrow()
})
```

Add a `TuiThreadCommand` parsing test for `--language zh-CN`, plus a host-config test that supplies CLI `zh-CN`, `tui.jsonc` `en`, and `LANG=en_US`, then expects the forwarded value to be `zh-CN`.

- [ ] **Step 2: Run focused suites and observe failures**

```powershell
Set-Location packages/tui
bun test test/config.test.tsx
Set-Location ../opencode
bun test test/cli/tui/thread.test.ts test/config/tui.test.ts
```

Expected: FAIL because `language` is not defined.

- [ ] **Step 3: Add the schema and CLI argument**

In `TuiConfig.Info` add:

```ts
language: Schema.optional(Schema.Literals(["auto", "en", "zh-CN"])),
```

Set `language: input.language ?? "auto"` in `resolve`, add `language?: "auto" | "en" | "zh-CN"` to `Args`, and add this option to `TuiThreadCommand`:

```ts
.option("language", {
  type: "string",
  choices: ["auto", "en", "zh-CN"] as const,
  describe: "interface language",
})
```

- [ ] **Step 4: Mount the provider once and add a language command**

In `app.tsx`, calculate language from `args.language`, `input.config.language`, and `LC_ALL ?? LANG ?? Intl.DateTimeFormat().resolvedOptions().locale`. Wrap the existing provider tree in `<I18nProvider language={language}>`. Add command `app.language.switch` that writes `language` through the existing TUI config update path and shows `en`/`zh-CN` choices.

- [ ] **Step 5: Verify precedence and commit**

```powershell
Set-Location packages/tui
bun test test/config.test.tsx test/i18n/locale.test.ts test/i18n/catalog.test.ts
bun typecheck
Set-Location ../opencode
bun test test/cli/tui/thread.test.ts test/config/tui.test.ts
bun typecheck
git add ../tui/src/config ../tui/src/context/args.tsx ../tui/src/app.tsx ../tui/test/config.test.tsx src/cli/cmd/tui.ts test/cli/tui/thread.test.ts test/config/tui.test.ts
git commit -m "feat(tui): persist interface language"
```

Expected: CLI > config > environment > English behavior is covered and passing.

### Task 3: Add Locale-Aware Provider Ranking

**Files:**
- Create: `packages/tui/src/util/provider-display.ts`
- Modify: `packages/tui/src/component/dialog-provider.tsx`
- Modify: `packages/tui/src/component/dialog-model.tsx`
- Modify: `packages/tui/test/cli/cmd/tui/provider-options.test.ts`

- [ ] **Step 1: Write failing ranking tests**

Test Chinese order `recent → deepseek → alibaba/alibaba-cn → zhipuai/zai → moonshotai → volcengine/volcengine-plan → remaining alphabetic`, English upstream order, and preservation of synthetic `Other` as the final option.

- [ ] **Step 2: Run the provider tests and observe the existing global priority failure**

```powershell
bun test test/cli/cmd/tui/provider-options.test.ts test/cli/cmd/tui/model-options.test.ts
```

Expected: FAIL for Chinese and recent-provider cases.

- [ ] **Step 3: Implement the pure display ranking**

```ts
import type { Language } from "../i18n/locale"

const upstream = ["opencode", "opencode-go", "openai", "github-copilot", "anthropic", "google"]
const domestic = ["deepseek", "alibaba", "alibaba-cn", "zhipuai", "zai", "moonshotai", "volcengine", "volcengine-plan"]

export function providerRank(id: string, language: Language, recent: readonly string[]) {
  const recentIndex = recent.indexOf(id)
  if (recentIndex >= 0) return recentIndex
  const priority = language === "zh-CN" ? domestic : upstream
  const index = priority.indexOf(id)
  return recent.length + (index >= 0 ? index : priority.length + 100)
}
```

Change `providerOptions` to accept `{ language, recent }`, use `providerRank`, and derive category labels via `useI18n`. Keep `normalizeCustomProviderID`, OAuth, API key storage, and custom OpenAI-compatible behavior unchanged.

- [ ] **Step 4: Verify provider behavior and commit**

```powershell
bun test test/cli/cmd/tui/provider-options.test.ts test/cli/cmd/tui/model-options.test.ts
bun typecheck
git add src/util/provider-display.ts src/component/dialog-provider.tsx src/component/dialog-model.tsx test/cli/cmd/tui/provider-options.test.ts
git commit -m "feat(tui): prioritize domestic providers in Chinese"
```

### Task 4: Translate Core Surfaces And Register The CodeMax Theme

**Files:**
- Create: `packages/tui/src/theme/assets/codemax.json`
- Modify: `packages/tui/src/theme/index.ts`
- Modify: `packages/tui/src/context/theme.tsx`
- Modify: `packages/tui/src/routes/home.tsx`
- Modify: `packages/tui/src/routes/session/index.tsx`
- Modify: `packages/tui/src/routes/session/sidebar.tsx`
- Modify: `packages/tui/src/component/command-palette.tsx`
- Modify: `packages/tui/src/component/prompt/index.tsx`
- Modify: `packages/tui/src/ui/dialog-select.tsx`
- Modify: `packages/tui/src/ui/dialog-confirm.tsx`
- Modify: `packages/tui/src/ui/dialog-alert.tsx`
- Modify: `packages/tui/src/feature-plugins/home/tips-view.tsx`
- Modify: `packages/tui/src/feature-plugins/sidebar/files.tsx`
- Modify: `packages/tui/src/feature-plugins/sidebar/footer.tsx`
- Modify: `packages/tui/test/theme.test.ts`

- [ ] **Step 1: Add failing theme and translation-usage tests**

Assert `codemax` is a default theme, fallback theme is `codemax`, dark primary is cyan, accent is electric blue, and listed core surfaces no longer contain the exact English catalog values outside `messages/en.ts`.

- [ ] **Step 2: Run tests and observe failures**

```powershell
bun test test/theme.test.ts test/i18n/catalog.test.ts
```

Expected: FAIL because the theme is absent and core strings are inline.

- [ ] **Step 3: Add the theme and replace listed inline strings with `t(key)`**

Use `#19D7E8` for primary cyan, `#2C7CFF` for accent blue, neutral near-black backgrounds, white text, green success, amber warning, and red error. Import/register `codemax` in `DEFAULT_THEMES`, make it the fallback in `context/theme.tsx`, and migrate every user-visible string in the listed files to the catalog. Do not translate commands, model IDs, provider IDs, tool names, API, MCP, Git, or paths.

- [ ] **Step 4: Run TUI verification and commit**

```powershell
bun test test/theme.test.ts test/i18n/catalog.test.ts test/cli/cmd/tui/provider-options.test.ts
bun typecheck
git add src/theme src/context/theme.tsx src/routes src/component src/ui src/feature-plugins test/theme.test.ts
git commit -m "feat(tui): localize core CodeMax surfaces"
```

### Task 5: Verify Localization As A Package Boundary

- [ ] **Step 1: Run all TUI tests and typecheck**

```powershell
Set-Location packages/tui
bun test
bun typecheck
```

- [ ] **Step 2: Run host CLI and config tests**

```powershell
Set-Location ../opencode
bun test test/cli/tui/thread.test.ts test/config/tui.test.ts
bun typecheck
```

- [ ] **Step 3: Verify both language modes manually**

```powershell
bun run src/index.ts --language zh-CN
bun run src/index.ts --language en
```

Expected: both modes render; Chinese retains English technical identifiers; provider lists differ only in ranking and text.

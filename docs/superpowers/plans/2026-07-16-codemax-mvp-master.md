# CodeMax MVP Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved CodeMax Windows x64 MVP as a maintainable branded fork of OpenCode.

**Architecture:** Keep Agent, provider, session, SDK, and plugin internals on the OpenCode upstream implementation. Add CodeMax identity, localization, responsive workbench, migration/error presentation, and Windows distribution as narrow modules with tested integration points.

**Tech Stack:** TypeScript 5.8, Bun 1.3, Effect, SolidJS, OpenTUI, GitHub Actions, PowerShell, Python/Pillow, Inno Setup 6.

---

## Execution Order

Execute these plans in order. Each plan ends in working, testable software and a commit checkpoint.

1. [Foundation and branding](./2026-07-16-codemax-foundation-branding.md)
2. [Localization and provider experience](./2026-07-16-codemax-i18n-providers.md)
3. [Responsive workbench](./2026-07-16-codemax-responsive-workbench.md)
4. [Migration and error experience](./2026-07-16-codemax-migration-errors.md)
5. [Windows packaging and private release](./2026-07-16-codemax-windows-release.md)

## Global Constraints

- Work on branch `codemax-mvp`; keep `upstream` pointing to `https://github.com/anomalyco/opencode.git`.
- Never modify generated Protocol or SDK files for this MVP.
- Keep internal `@opencode-ai/*` workspace package names unless a user-facing artifact exposes them; renaming the internal dependency graph would create unnecessary merge conflicts.
- Run tests and type checks from the affected package directory, never from the repository root.
- Do not use the Gitee token posted in chat. Configure new least-privilege credentials only as repository secrets.
- Use TDD for behavior changes: failing test, observed failure, minimal implementation, observed pass, focused commit.
- After every plan, merge the latest `upstream/dev`, resolve only CodeMax integration points, and rerun the affected package suites.

## Specification Coverage

| Design section | Implemented by |
| --- | --- |
| Product goals, non-goals, upstream boundary | Master constraints and foundation Tasks 1-5 |
| Brand, command, icon, attribution | Foundation Tasks 1-4; Windows release Tasks 1-2 |
| Responsive TUI | Responsive workbench Tasks 1-5 |
| Chinese/English and technical terms | Localization Tasks 1-2 and 4 |
| Domestic provider discovery | Localization Task 3 |
| CodeMax paths and OpenCode import | Migration Tasks 1-2 |
| Runtime data flow and durable recovery | Migration Tasks 1, 2, and 5 |
| Error codes and secret redaction | Migration Tasks 3-4 |
| Windows ZIP, installer, shortcuts | Windows release Tasks 2-3 |
| Package, TUI, integration, and smoke tests | Verification task in every plan |
| Private GitHub and Gitee release | Windows release Tasks 4-6 |
| Acceptance, schedule, and risk controls | Master final gates and ordered plan checkpoints |

## Final Acceptance Command Set

```powershell
Set-Location packages/core
bun test
bun typecheck

Set-Location ../tui
bun test
bun typecheck

Set-Location ../opencode
bun test
bun typecheck
bun run script/build.ts --single

Set-Location ../..
pwsh script/release/test-installer.ps1
pwsh script/release/verify-artifacts.ps1 artifacts/release
```

Expected: every command exits `0`; the artifact verifier reports both ZIP variants, the installer, `SHA256SUMS.txt`, `LICENSE`, and `THIRD_PARTY_NOTICES.md`.

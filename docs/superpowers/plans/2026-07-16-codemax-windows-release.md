# CodeMax Windows Packaging And Private Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible Windows x64 native/baseline ZIPs and an Inno Setup installer, then publish verified drafts to private GitHub and mirror approved artifacts to private Gitee.

**Architecture:** Build, packaging, installer, verification, GitHub publication, and Gitee mirroring are separate deterministic stages. Release jobs consume whitelisted artifacts, sign before packaging when credentials exist, calculate hashes last, and never embed repository credentials in CodeMax.

**Tech Stack:** Bun compile, TypeScript, Photon image processing, Python/Pillow ICO assembly, Inno Setup 6, PowerShell, GitHub Actions, Gitee REST API.

---

### Task 1: Import And Deterministically Generate Brand Assets

**Files:**
- Create: `packages/opencode/assets/codemax/source.png`
- Create: `packages/opencode/assets/codemax/codemax.png`
- Create: `packages/opencode/assets/codemax/codemax.ico`
- Create: `packages/opencode/script/generate-brand-assets.ts`
- Create: `packages/opencode/script/assemble-icon.py`
- Create: `packages/opencode/test/script/brand-assets.test.ts`
- Modify: `README.md`
- Modify: `README.zh.md`

- [ ] **Step 1: Copy the approved source and verify its identity**

Copy `D:/codemax/ico/CodeMax.png` to the source path and assert SHA-256 equals `1DE08978615847895E1211650F3A1CEC5442471FC2F1499C685AC9EAF15B3124`, dimensions are 1254×1254, and source has no alpha channel.

- [ ] **Step 2: Write a failing asset test**

Assert generated PNG has transparent connected outer-black pixels while interior black remains, and ICO contains 16/24/32/48/64/128/256 frames.

- [ ] **Step 3: Implement generation and check mode**

Use `@silvia-odwyer/photon-node` to flood-fill from all four edges with a near-black threshold and set only connected pixels transparent. Invoke `assemble-icon.py` with Pillow to resize using Lanczos and write the 16/24/32/48/64/128/256-frame ICO; CI installs a pinned Pillow version before running it. `--check` regenerates in a temporary directory and byte-compares committed assets. Update the English and Chinese README files to use `assets/codemax/codemax.png`, the `codemax` command, private-MVP installation instructions, upstream attribution, and the no-affiliation notice.

- [ ] **Step 4: Generate, inspect, test, and commit**

```powershell
Set-Location packages/opencode
bun run script/generate-brand-assets.ts
bun run script/generate-brand-assets.ts --check
bun test test/script/brand-assets.test.ts
bun typecheck
git add assets/codemax script/generate-brand-assets.ts script/assemble-icon.py test/script/brand-assets.test.ts ../../README.md ../../README.zh.md
git commit -m "feat(opencode): add reproducible CodeMax assets"
```

Expected: small icons remain recognizable and no brand content changes beyond outer transparency.

### Task 2: Build And Package Both Windows x64 Variants

**Files:**
- Modify: `packages/opencode/script/build.ts`
- Create: `packages/opencode/script/package-windows.ts`
- Create: `packages/opencode/test/script/package-windows.test.ts`
- Create: `packages/opencode/release/README.txt`
- Create: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Write failing target and package-whitelist tests**

Assert `--windows-x64` selects native and baseline in one run, build output is `codemax.exe`, Windows metadata uses CodeMax, and each ZIP contains only executable, `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `README.txt`.

- [ ] **Step 2: Add the explicit target without deriving Bun target from package name**

Map CodeMax artifact names to Bun targets explicitly: native → `bun-windows-x64`, baseline → `bun-windows-x64-baseline`. Set `compile.windows` to `{ hideConsole: false, icon, title: "CodeMax", publisher: "CodeMax", description: "CodeMax TUI coding agent" }`. Disable direct `gh release upload` in CodeMax build mode.

- [ ] **Step 3: Implement whitelist packaging**

`package-windows.ts --version 0.1.0 --output dist/release` validates both executable versions, stages only approved files, writes `CodeMax-x64.zip` and `CodeMax-x64-baseline.zip`, and refuses unknown files. `THIRD_PARTY_NOTICES.md` names OpenCode, links upstream, includes MIT attribution, and states non-affiliation.

- [ ] **Step 4: Build, smoke, package, and commit**

```powershell
$env:CODEMAX_VERSION='0.1.0'
bun run script/build.ts --windows-x64
& .\dist\codemax-windows-x64\bin\codemax.exe --version
& .\dist\codemax-windows-x64-baseline\bin\codemax.exe --version
bun run script/package-windows.ts --version 0.1.0 --output dist/release
bun test test/script/package-windows.test.ts
bun typecheck
git add script/build.ts script/package-windows.ts test/script/package-windows.test.ts release/README.txt ../../THIRD_PARTY_NOTICES.md
git commit -m "feat(opencode): package CodeMax Windows binaries"
```

### Task 3: Add The Per-User Inno Setup Installer

**Files:**
- Create: `packages/opencode/installer/windows/codemax.iss`
- Create: `script/release/test-installer.ps1`

- [ ] **Step 1: Write installer acceptance assertions before the installer**

The PowerShell test must install silently into a temporary directory and assert executable, HKCU PATH opt-in, Start Menu shortcut, optional desktop shortcut, Windows Terminal target when available, console fallback otherwise, versioned overwrite, ordinary uninstall preserving `%APPDATA%/CodeMax` and `%LOCALAPPDATA%/CodeMax`, and `/DELETEUSERDATA` deleting only those two exact directories.

- [ ] **Step 2: Implement the installer**

Use `{localappdata}\Programs\CodeMax`, per-user privileges, tasks `addtopath` and `desktopicon`, and Pascal `HasWindowsTerminal`. Update HKCU `Environment\Path` without `setx`, broadcast the environment change, and remove only the exact segment on uninstall. Never recursively delete a computed path without verifying it equals an approved CodeMax directory.

- [ ] **Step 3: Compile and test**

```powershell
& "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe" /DMyAppVersion=0.1.0 packages\opencode\installer\windows\codemax.iss
pwsh script/release/test-installer.ps1
```

Expected: all assertions pass; unsigned private builds report `NotSigned`, not an invalid signature.

- [ ] **Step 4: Commit the installer**

```powershell
git add packages/opencode/installer/windows/codemax.iss script/release/test-installer.ps1
git commit -m "feat(opencode): add CodeMax Windows installer"
```

### Task 4: Add Artifact Verification And GitHub Draft Release

**Files:**
- Create: `script/release/verify-artifacts.ps1`
- Create: `script/codemax-release-check.ts`
- Create: `.github/workflows/codemax-release.yml`
- Create: `docs/release/codemax-windows.md`

- [ ] **Step 1: Implement failing release-check fixtures**

Tests must reject missing license/notice, wrong filenames, version mismatch, OpenCode user-facing brand residue outside the attribution allowlist, secret patterns, hashes calculated before signing, and unexpected ZIP members.

- [ ] **Step 2: Implement verification and the gated workflow**

The tag workflow uses Bun 1.3.14, runs affected package tests/typechecks, asset `--check`, Windows build, optional executable signing, ZIP packaging, Inno compile, optional installer signing, smoke tests, then writes sorted UTF-8 no-BOM SHA-256 values last. Only the release job has `contents: write`; it creates a GitHub draft Release in a protected environment.

- [ ] **Step 3: Validate workflow and artifacts**

```powershell
bun run script/codemax-release-check.ts artifacts/release
pwsh script/release/verify-artifacts.ps1 artifacts/release
actionlint .github/workflows/codemax-release.yml
```

- [ ] **Step 4: Commit release gates**

```powershell
git add script/release script/codemax-release-check.ts .github/workflows/codemax-release.yml docs/release/codemax-windows.md
git commit -m "chore: add gated CodeMax release workflow"
```

### Task 5: Mirror Approved Releases To Private Gitee

**Files:**
- Create: `script/codemax-gitee-release.ts`
- Create: `script/codemax-gitee-release.test.ts`
- Create: `.github/workflows/codemax-gitee-mirror.yml`

- [ ] **Step 1: Write failing HTTP tests with a local fake Gitee server**

Test private-repository assertion, idempotent release create/update, attachment deduplication, checksum mismatch rejection, 401/403 redaction, and absence of token in URL, git remote, command arguments, and logs.

- [ ] **Step 2: Implement the API client**

Read only `GITEE_TOKEN`, `GITEE_OWNER`, and `GITEE_REPO` from environment. Use `Authorization: token <value>` headers, `fetch`, and `FormData`. Refuse upload unless repository visibility is private and every downloaded GitHub asset matches `SHA256SUMS.txt`.

- [ ] **Step 3: Implement manual approved mirroring**

The workflow is `workflow_dispatch(tag)`, uses a protected environment, downloads the GitHub draft, verifies hashes, pushes only the explicit `codemax-mvp` branch and selected tag through an SSH deploy key, and calls the API script. Never use `git push --mirror`.

- [ ] **Step 4: Verify and commit**

```powershell
bun test script/codemax-gitee-release.test.ts
actionlint .github/workflows/codemax-gitee-mirror.yml
git add script/codemax-gitee-release.ts script/codemax-gitee-release.test.ts .github/workflows/codemax-gitee-mirror.yml
git commit -m "chore: mirror approved releases to Gitee"
```

### Task 6: Perform Private Release Acceptance

- [ ] Revoke the exposed Gitee token and create new least-privilege GitHub/Gitee secrets.
- [ ] Add private GitHub `origin` and private Gitee `gitee` remotes without embedding credentials in URLs.
- [ ] Push a test tag, verify GitHub Release remains draft, download every asset, and recompute SHA-256.
- [ ] Test native ZIP, baseline ZIP, and installer on a clean Windows x64 VM without Bun or Node.
- [ ] Test Windows Terminal and CMD at 80/120/160 columns.
- [ ] Approve the protected Gitee mirror job and compare both repositories' filenames, sizes, tags, and hashes.
- [ ] Record the upstream commit, exact test commands, screenshots, known unsigned SmartScreen behavior, and rollback steps in `docs/release/codemax-windows.md`.

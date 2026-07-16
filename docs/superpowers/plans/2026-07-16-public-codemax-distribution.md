# CodeMax Public Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish identical public CodeMax Windows releases to GitHub and Gitee, with the Windows installer enabling `codemax` from any newly opened terminal by default.

**Architecture:** GitHub Actions builds and verifies one Windows artifact set. The public GitHub release is created from that artifact set, then the same checked artifacts are uploaded to the public Gitee repository through its API. The installer manages only the installing user's PATH, while ZIP packages remain portable and do not modify environment state.

**Tech Stack:** Bun 1.3.14, TypeScript, Bun test, GitHub Actions, GitHub CLI, Gitee REST API, Inno Setup Pascal Script, PowerShell.

---

## File Structure

- Modify: `packages/opencode/installer/windows/codemax.iss` - default the user-level PATH task to selected.
- Modify: `packages/opencode/release/README.txt` - distinguish installer and portable ZIP behavior.
- Create: `packages/opencode/test/script/installer-windows.test.ts` - protect PATH installer defaults and scoped removal behavior.
- Modify: `script/codemax-gitee-release.ts` - reject non-public Gitee destinations and report public mirroring.
- Modify: `script/codemax-gitee-release.test.ts` - cover public-destination acceptance and private-destination rejection.
- Modify: `.github/workflows/codemax-gitee-mirror.yml` - retain a manual public mirror/recovery workflow.
- Modify: `.github/workflows/codemax-release.yml` - require a public GitHub repository, publish a non-draft release, run installer smoke checks, and mirror to public Gitee.
- Create: `script/codemax-public-release.test.ts` - statically protect critical public release workflow contracts.
- Modify: `docs/superpowers/specs/2026-07-16-public-distribution-design.md` only if implementation reveals a contradiction.

### Task 1: Default Installer PATH Setup

**Files:**
- Create: `packages/opencode/test/script/installer-windows.test.ts`
- Modify: `packages/opencode/installer/windows/codemax.iss:25-27`
- Modify: `packages/opencode/release/README.txt:1-6`

- [ ] **Step 1: Write the failing installer contract test**

```ts
import { describe, expect, test } from "bun:test"
import path from "path"

const packageDir = path.resolve(import.meta.dir, "../..")

describe("CodeMax Windows installer", () => {
  test("selects the user PATH task by default and removes only its own entry", async () => {
    const installer = await Bun.file(path.join(packageDir, "installer/windows/codemax.iss")).text()

    expect(installer).toContain('Name: "addtopath"; Description: "Add CodeMax to the user PATH"; Flags: checked')
    expect(installer).toContain("RegWriteStringValue(HKCU, EnvironmentKey, PathName, Existing)")
    expect(installer).toContain("if PathContains(Existing, ExpandConstant('{app}')) then exit")
    expect(installer).toContain("procedure RemoveUserPath;")
    expect(installer).toContain("StringChangeEx(Existing, Needle + ';', '', True)")
  })
})
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\packages\opencode
bun test test/script/installer-windows.test.ts
```

Expected: the assertion for `Flags: checked` fails because the task is currently unchecked.

- [ ] **Step 3: Enable PATH by default and clarify portable behavior**

Change the installer task to:

```iss
[Tasks]
Name: "addtopath"; Description: "Add CodeMax to the user PATH"; Flags: checked
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked
```

Replace `packages/opencode/release/README.txt` with:

```txt
CodeMax for Windows
===================

For global command access, install CodeMax with CodeMax-Setup-x64.exe. The installer adds CodeMax to your user PATH by default; open a new terminal afterwards and run codemax from any directory.

The ZIP packages are portable. Run codemax.exe from the extracted directory, or add that directory to PATH manually.

CodeMax is distributed under the MIT License. CodeMax is an independent project and is not affiliated with the OpenCode project or its maintainers.
```

- [ ] **Step 4: Run the focused test and package regression test**

Run:

```powershell
bun test test/script/installer-windows.test.ts test/script/package-windows.test.ts
```

Expected: `2 pass`, `0 fail`.

- [ ] **Step 5: Commit the installer change**

```powershell
git add packages/opencode/installer/windows/codemax.iss packages/opencode/release/README.txt packages/opencode/test/script/installer-windows.test.ts
git commit -m "feat(installer): enable CodeMax PATH by default"
```

### Task 2: Make Gitee Mirroring Public and Verifiable

**Files:**
- Modify: `script/codemax-gitee-release.ts:16-19,136-140`
- Modify: `script/codemax-gitee-release.test.ts`
- Modify: `.github/workflows/codemax-gitee-mirror.yml`

- [ ] **Step 1: Change the existing public-repository test before production code**

Rename the current private-repository rejection test and make it assert a private repository is refused:

```ts
test("rejects a private repository before creating a release", async () => {
  const directory = await releaseDirectory()
  const requests: Request[] = []

  await expect(
    mirrorRelease({
      directory,
      tag: "codemax-v0.1.0",
      env: { GITEE_TOKEN: "test-token", GITEE_OWNER: "acme", GITEE_REPO: "codemax" },
      fetch: async (input, init) => {
        requests.push(new Request(input, init))
        return json({ private: true })
      },
    }),
  ).rejects.toThrow("public")

  expect(requests).toHaveLength(1)
})
```

In the existing upload and idempotency tests, change the repository response to `json({ private: false })`.

- [ ] **Step 2: Run the mirror test and verify the expected failure**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
bun test script/codemax-gitee-release.test.ts
```

Expected: the upload test rejects the public repository under the current private-only guard.

- [ ] **Step 3: Implement the public-only Gitee guard**

Replace the visibility check in `mirrorRelease` with:

```ts
const repository = await api(input.fetch, config, "", { method: "GET" })
if (repository.private !== false) throw new Error("Gitee target repository must be public")
```

Replace the CLI completion log with:

```ts
console.log(`CodeMax mirrored to public Gitee Release: ${tag}`)
```

Update `.github/workflows/codemax-gitee-mirror.yml` to use this public contract:

```yaml
name: Mirror CodeMax release to public Gitee

jobs:
  mirror:
    runs-on: ubuntu-24.04
    environment: codemax-public-release
```

Rename its two step labels to `Download the public CodeMax release artifacts` and `Verify and mirror to public Gitee`. Keep `GITEE_TOKEN`, `GITEE_OWNER`, and `GITEE_REPO` as GitHub secrets and do not introduce token literals.

- [ ] **Step 4: Run mirror and workflow contract tests**

Run:

```powershell
bun test script/codemax-gitee-release.test.ts
rg -n "private Gitee|codemax-gitee-private-mirror" .github/workflows/codemax-gitee-mirror.yml script/codemax-gitee-release.ts
```

Expected: mirror tests pass, and the search returns no matches.

- [ ] **Step 5: Commit the public mirror change**

```powershell
git add script/codemax-gitee-release.ts script/codemax-gitee-release.test.ts .github/workflows/codemax-gitee-mirror.yml
git commit -m "feat(release): mirror CodeMax to public Gitee"
```

### Task 3: Publish and Mirror Public Releases Automatically

**Files:**
- Create: `script/codemax-public-release.test.ts`
- Modify: `.github/workflows/codemax-release.yml`

- [ ] **Step 1: Write the failing public-release workflow contract test**

```ts
import { describe, expect, test } from "bun:test"

test("publishes an immediately public GitHub release and mirrors it to Gitee", async () => {
  const workflow = await Bun.file(".github/workflows/codemax-release.yml").text()

  expect(workflow).toContain("name: CodeMax public release")
  expect(workflow).toContain("contents: write")
  expect(workflow).toContain("codemax-public-release")
  expect(workflow).toContain("gh api repos/$GITHUB_REPOSITORY --jq .private")
  expect(workflow).toContain('gh release create "codemax-v${tag}" release/* --title "CodeMax ${tag}" --generate-notes')
  expect(workflow).toContain('bun script/codemax-gitee-release.ts release "codemax-v${tag}"')
  expect(workflow).not.toContain("--draft")
  expect(workflow).not.toContain("codemax-private-release")
})
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
bun test script/codemax-public-release.test.ts
```

Expected: it fails because the workflow is named `CodeMax private release`, creates a draft, and uses the private environment.

- [ ] **Step 3: Convert the release workflow to an automatic public dual-channel release**

Use this release job structure after artifact download:

```yaml
  release:
    needs: build
    runs-on: ubuntu-24.04
    environment: codemax-public-release
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.14
      - uses: actions/download-artifact@v4
        with:
          name: codemax-release
          path: release
      - name: Require a public GitHub repository
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          test "$(gh api repos/$GITHUB_REPOSITORY --jq .private)" = "false"
      - name: Create public GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
          VERSION: ${{ inputs.version || github.ref_name }}
        run: |
          tag="${VERSION#codemax-v}"
          gh release create "codemax-v${tag}" release/* --title "CodeMax ${tag}" --generate-notes
      - name: Mirror verified assets to public Gitee
        env:
          GITEE_TOKEN: ${{ secrets.GITEE_TOKEN }}
          GITEE_OWNER: ${{ secrets.GITEE_OWNER }}
          GITEE_REPO: ${{ secrets.GITEE_REPO }}
          VERSION: ${{ inputs.version || github.ref_name }}
        run: |
          tag="${VERSION#codemax-v}"
          bun script/codemax-gitee-release.ts release "codemax-v${tag}"
```

Rename the workflow to `CodeMax public release`. Set top-level `permissions` to `contents: read`; the release job retains `contents: write`. Do not use `--draft` anywhere in this workflow.

- [ ] **Step 4: Add an installer PATH smoke check to the Windows build job**

Immediately after Inno Setup produces `CodeMax-Setup-x64.exe`, add this Windows PowerShell step:

```yaml
      - name: Verify installer adds codemax to the user PATH
        shell: pwsh
        run: |
          $installer = "${{ github.workspace }}\packages\opencode\dist\release\CodeMax-Setup-x64.exe"
          $installDir = Join-Path $env:LOCALAPPDATA "Programs\CodeMax"
          & $installer /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /TASKS="addtopath"
          if ($LASTEXITCODE -ne 0) { throw "CodeMax installer failed: $LASTEXITCODE" }
          $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
          $probe = Join-Path $env:TEMP "codemax-path-probe"
          New-Item -ItemType Directory -Force -Path $probe | Out-Null
          Push-Location $probe
          try { & codemax --version } finally { Pop-Location }
          if (-not (($env:Path -split ';') | Where-Object { $_ -eq $installDir })) { throw "CodeMax install directory is missing from user PATH" }
```

- [ ] **Step 5: Run release workflow tests and static validation**

Run:

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
bun test script/codemax-public-release.test.ts script/codemax-gitee-release.test.ts script/codemax-release-check.test.ts
rg -n "--draft|codemax-private-release|private Gitee" .github/workflows/codemax-release.yml .github/workflows/codemax-gitee-mirror.yml script/codemax-gitee-release.ts
```

Expected: all Bun tests pass and the search returns no matches.

- [ ] **Step 6: Commit the public release automation**

```powershell
git add .github/workflows/codemax-release.yml script/codemax-public-release.test.ts
git commit -m "feat(release): publish CodeMax publicly to GitHub and Gitee"
```

### Task 4: Verify the Complete Local Release Contract

**Files:**
- Test: `packages/opencode/test/script/installer-windows.test.ts`
- Test: `packages/opencode/test/script/package-windows.test.ts`
- Test: `script/codemax-gitee-release.test.ts`
- Test: `script/codemax-release-check.test.ts`
- Test: `script/codemax-public-release.test.ts`
- Test: `packages/opencode/installer/windows/codemax.iss`

- [ ] **Step 1: Run all focused tests**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
$bun = 'C:\Users\21578\.cache\codemax-tools\bun-1.3.14\bun-windows-x64-baseline\bun.exe'
& $bun test packages/opencode/test/script/installer-windows.test.ts packages/opencode/test/script/package-windows.test.ts script/codemax-gitee-release.test.ts script/codemax-release-check.test.ts script/codemax-public-release.test.ts
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run packaging and artifact verification**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI\packages\opencode
$bun = 'C:\Users\21578\.cache\codemax-tools\bun-1.3.14\bun-windows-x64-baseline\bun.exe'
$env:CODEMAX_VERSION = '0.1.0'
& $bun run script/build.ts --windows-x64 --skip-install
& $bun run script/package-windows.ts --version 0.1.0 --output dist/release
& $bun ..\..\script\codemax-release-check.ts dist/release
```

Expected: both Windows executables build, ZIP packages are created, and the release checker reports success. Local installation smoke testing is performed by the Windows CI job because Inno Setup is not installed in this workspace.

- [ ] **Step 3: Inspect the final diff and commit any documentation correction**

```powershell
Set-Location D:\AllTools\CLI-AI\CodeMax-TUI
git diff --check
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files. If the design document changed during implementation, commit it with `git commit -m "docs: clarify CodeMax public distribution"`.

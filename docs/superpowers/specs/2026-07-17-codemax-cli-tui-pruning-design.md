# CodeMax CLI/TUI Pruning Design

## Goal

Turn the CodeMax fork into a focused CLI and TUI repository. Keep the Windows distribution and public release workflow, while removing OpenCode products and infrastructure that are not required to build, test, package, or run `codemax`.

## Product Boundary

CodeMax provides:

- A cross-platform `codemax` CLI.
- The terminal-based CodeMax TUI.
- Provider, model, plugin, configuration, session, tool, and server capabilities required by that CLI/TUI.
- Windows x64 installation, portable ZIP packages, checksums, and public GitHub/Gitee release automation.

CodeMax does not provide the upstream desktop app, web app, Console product, enterprise product, Slack integration, Stats service, Storybook, hosted deployment infrastructure, or community automation.

## Retention Model

The retention source of truth is the workspace dependency closure rooted at `packages/opencode` (`name: codemax`) plus the Windows release scripts and their direct workspace dependencies. A package remains only when it is reachable from that closure or is needed by a retained build, test, packaging, asset, or release script.

The retained product packages initially include `opencode`, `tui`, `core`, `sdk`, `server`, `plugin`, `schema`, `protocol`, `llm`, `script`, and any transitive workspace dependency that the closure discovers. The pruning script must write an allowlist report before deletion and fail if a retained manifest references a package outside that report.

MIT license and third-party notices remain intact. Upstream copyright attribution remains in the license and release notices.

## Removal Scope

The following product areas are candidates for deletion unless the closure report proves that a retained package depends on them:

- `packages/app`, `packages/desktop`, `packages/console`, `packages/enterprise`, `packages/slack`, `packages/stats`, and `packages/storybook`.
- Upstream cloud infrastructure and deployment directories, including `infra`, `containers`, and product-specific GitHub workflows.
- Product-specific documentation, examples, generated assets, tests, package scripts, and lockfile entries belonging only to removed packages.
- Root scripts and metadata that start, publish, test, or deploy removed products.

The deletion process does not remove Git history, `LICENSE`, `THIRD_PARTY_NOTICES.md`, CodeMax release assets, or the CodeMax public release workflows.

## Pruning Procedure

1. Parse all workspace `package.json` manifests and build a directed graph from `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies` entries using `workspace:` versions.
2. Start from the CodeMax CLI package and explicitly retained release-support packages. Traverse the graph to produce sorted retained and removable package lists.
3. Add a test fixture that proves the graph retains transitive runtime dependencies and excludes an unrelated product package.
4. Commit the generated retention report for review before the first destructive deletion batch.
5. Delete only packages and root surfaces classified as removable. Remove their workspace globs only when no retained child package remains in that group.
6. Replace the root README with a concise Chinese CodeMax README. It must describe CodeMax rather than OpenCode, provide Windows installation and global command guidance, link to public release/download locations, document `.codemax` configuration, and state the upstream derivation and MIT attribution.
7. Reinstall dependencies, regenerate `bun.lock`, and remove stale workspace references.

## Failure Handling

- If a deletion causes a retained manifest to reference a missing workspace package, restore that package from the immediately preceding commit and add it to the retention root or closure logic.
- If dependency installation or a retained typecheck fails after a deletion, stop before further deletions and identify the missing retained dependency.
- Public release automation must reject incomplete artifacts and invalid checksums as it does today.
- The repository keeps the existing CodeMax configuration migration and error redaction behavior during pruning.

## Verification

- The new dependency-closure unit test passes before and after pruning.
- `bun install --frozen-lockfile` succeeds after lockfile regeneration.
- CodeMax CLI/TUI branding, runtime, configuration migration, error, package, and public release tests pass.
- Retained packages typecheck successfully.
- Windows x64 and baseline binaries build, return a CodeMax version, and create the expected ZIP package contents.
- Static checks confirm removed package paths and removed product workflow names no longer exist.

## README

The new root `README.md` is Chinese-first and contains only CodeMax content:

- Product name and terminal coding-agent description.
- Windows installer and portable download instructions.
- `codemax` use from any directory after installation.
- `.codemax` configuration and optional migration note.
- Local development, test, build, and public-release instructions.
- MIT license, upstream attribution, and the CodeMax repository URL.

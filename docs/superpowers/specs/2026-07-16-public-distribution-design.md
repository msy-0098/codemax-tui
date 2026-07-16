# CodeMax Public Distribution Design

## Goal

Publish each CodeMax version publicly to GitHub Releases and Gitee Releases. Windows users install once and can run `codemax` from any newly opened terminal in any directory.

## Scope

- Build one signed Windows release set on GitHub Actions.
- Publish the identical release assets to a public GitHub repository and a public Gitee repository.
- Make the Windows installer opt users into the current-user PATH by default.
- Keep ZIP packages portable and non-mutating.
- Verify release checksums and installer PATH lifecycle behavior.

## Distribution Model

GitHub Actions is the sole build authority. A `codemax-v*` tag builds the x64 and x64-baseline executables, creates the installer and ZIP files, creates a public GitHub Release, then mirrors those exact files to Gitee.

Both destination repositories must be public before a release can be downloaded without authentication. The workflow will use repository configuration for destination names and protected secrets for Gitee authentication. No personal token is stored in source control or workflow YAML.

Release assets are:

- `CodeMax-Setup-x64.exe`
- `CodeMax-x64.zip`
- `CodeMax-x64-baseline.zip`
- `SHA256SUMS.txt`

The GitHub and Gitee releases use the same tag, title, assets, and SHA-256 file. The mirror step must reject missing, extra, or hash-mismatched assets.

## Windows Installation

`CodeMax-Setup-x64.exe` installs to `%LocalAppData%\Programs\CodeMax` without elevation. The installer defaults the "Add CodeMax to the user PATH" task to selected. On installation it appends the application directory to the user's `PATH` only when absent, writes no machine-wide environment variable, and broadcasts the environment change notification.

Users open a new terminal after installation and can run `codemax` from any directory. The uninstaller removes only its own PATH entry. Existing unrelated PATH values and CodeMax user data remain intact unless the user passes the explicit user-data removal flag.

The ZIP packages remain portable. They do not change PATH; their README states that the installer is required for global command access or that the executable directory can be added manually.

## Error Handling

- A missing build artifact, installer artifact, or checksum fails the release job before publication.
- A non-public destination is reported as a release configuration error instead of silently creating an inaccessible release.
- Gitee upload failures leave the GitHub release as a draft and fail the workflow for manual retry, preventing a falsely complete dual-channel release.
- PATH update errors do not corrupt the existing value and are surfaced by the installer.

## Verification

- Unit tests assert that the installer PATH task is selected by default and removal remains scoped to the CodeMax path.
- Release tests assert exact ZIP contents and validate `SHA256SUMS.txt` against every shipped asset.
- Workflow tests assert public-release behavior and prohibit private-release flags or private-only environment names.
- The Windows CI release job installs the generated installer in a clean user profile, opens a new shell, and runs `codemax --version` from a temporary directory.

## Out Of Scope

- Making a repository public or creating the destination GitHub/Gitee repositories. Those are account-level actions owned by the repository administrator.
- macOS and Linux installers.
- Renaming upstream provider and model display names such as `OpenCode Zen`; that is a separate UI copy cleanup.

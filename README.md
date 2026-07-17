# CodeMax

CodeMax 是一个面向本地项目的开源终端 AI 编程助手。它以 TUI 形式运行在 PowerShell、Windows Terminal 或命令提示符中，支持模型配置、工具调用、会话和插件，并提供中文体验。

## 下载与安装

Windows 用户请从 [GitHub Releases](https://github.com/msy-0098/codemax-tui/releases) 下载 `CodeMax-Setup-x64.exe`。安装器默认将 CodeMax 添加到当前用户的 `PATH`；安装完成后重新打开终端，即可在任意目录运行：

```powershell
codemax
```

也可以下载便携版本：

- `CodeMax-x64.zip`：适用于多数 64 位 Windows 设备。
- `CodeMax-x64-baseline.zip`：适用于不支持较新 CPU 指令集的 64 位 Windows 设备。

解压 ZIP 后直接运行其中的 `codemax.exe`。便携版不会自动修改 `PATH`。

每个 Release 都包含 `SHA256SUMS.txt`。下载完成后可在 PowerShell 中校验文件完整性：

```powershell
Get-FileHash .\CodeMax-Setup-x64.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

将两处的 SHA-256 值进行比较即可。

## 使用

进入你的项目目录后启动 CodeMax：

```powershell
codemax --language zh-CN
```

首次启动后，在 TUI 中选择模型、输入任务，并根据提示确认所需权限即可开始工作。

## 配置

项目配置放在项目根目录下的 `.codemax/codemax.json` 或 `.codemax/codemax.jsonc`；全局配置存放在 CodeMax 的用户配置目录中。CodeMax 可在首次使用时迁移已有 OpenCode 配置，迁移后的 CodeMax 配置可独立使用。

## 本地开发

本项目使用 Bun 1.3.14：

```powershell
bun install
bun run dev
bun run --cwd packages/opencode typecheck
bun test --cwd packages/tui
```

构建 Windows 二进制和 ZIP 包：

```powershell
cd packages/opencode
$env:CODEMAX_VERSION = "0.1.0"
bun run script/build.ts --windows-x64
bun run script/package-windows.ts --version 0.1.0 --output dist/release
```

## 发布

推送 `codemax-v<版本号>` 标签会触发公开发布流程，生成以下文件并同步到 GitHub 与 Gitee Release：

- `CodeMax-Setup-x64.exe`
- `CodeMax-x64.zip`
- `CodeMax-x64-baseline.zip`
- `SHA256SUMS.txt`

发布流程会校验 Release 文件、Windows 安装器和全局 `codemax` 命令。Gitee 同步需要在 GitHub Actions 环境中配置对应的公开仓库与密钥。

## 许可与归属

CodeMax 采用 MIT 许可证发布，基于 OpenCode 的开源代码构建，并保留上游版权与第三方声明。

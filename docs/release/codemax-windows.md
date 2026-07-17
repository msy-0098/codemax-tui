# CodeMax Windows public release

推送 `codemax-v<version>` 标签，或在 GitHub Actions 手动输入版本号，会触发公开的 Windows 发布流程。流程构建 native x64 和 baseline x64 二进制，打包 ZIP、编译 Inno Setup 安装器、计算 SHA-256，并创建 GitHub Release 后同步到 Gitee Release。

发布资产固定为：

- `CodeMax-x64.zip`
- `CodeMax-x64-baseline.zip`
- `CodeMax-Setup-x64.exe`
- `SHA256SUMS.txt`

ZIP 仅包含 `codemax.exe`、`LICENSE`、`README.txt` 和 `THIRD_PARTY_NOTICES.md`。安装器默认安装到 `%LOCALAPPDATA%\Programs\CodeMax`，默认将目录加入当前用户的 `PATH`；重新打开终端后，可在任意目录执行 `codemax`。卸载默认保留 `%APPDATA%\CodeMax` 和 `%LOCALAPPDATA%\CodeMax`，只有显式传入 `/DELETEUSERDATA` 才会删除这两个目录。

发布前，GitHub Actions 会在 Windows 环境执行：

```powershell
bun script/codemax-release-check.ts packages/opencode/dist/release
pwsh script/release/verify-artifacts.ps1 packages/opencode/dist/release
```

工作流还会静默安装 `CodeMax-Setup-x64.exe`，验证用户 `PATH` 中的 `codemax` 能在临时目录输出版本号。Gitee 同步仅在对应仓库为公开仓库且 GitHub Actions 已配置所需发布密钥时进行。

发布后应从 GitHub 或 Gitee 下载四个资产，使用 `SHA256SUMS.txt` 复核哈希，并在未安装 Bun/Node 的干净 Windows x64 环境中分别验证两种 ZIP 和安装器。没有代码签名时，Windows SmartScreen 可能提示未知发布者；这不影响 SHA-256 完整性校验。

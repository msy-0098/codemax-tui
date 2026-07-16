# CodeMax Windows private release

该流程只用于私有 MVP。推送 `codemax-v<version>` 标签或手动输入版本后，GitHub Actions 会构建原生 x64 与 baseline x64 二进制，签名（凭据存在时）、打包 ZIP、编译 Inno Setup 安装器，并在计算 SHA-256 后创建草稿 Release。

发布资产固定为：

- `CodeMax-x64.zip`
- `CodeMax-x64-baseline.zip`
- `CodeMax-Setup-x64.exe`
- `SHA256SUMS.txt`

ZIP 仅包含 `codemax.exe`、`LICENSE`、`README.txt` 和 `THIRD_PARTY_NOTICES.md`。安装器默认安装到 `%LOCALAPPDATA%\Programs\CodeMax`，可选写入当前用户 PATH 与桌面快捷方式；卸载默认保留 `%APPDATA%\CodeMax` 和 `%LOCALAPPDATA%\CodeMax`。仅在显式传入 `/DELETEUSERDATA` 时删除这两个精确目录。

发布前在 Windows 上执行：

```powershell
bun script/codemax-release-check.ts packages/opencode/dist/release
pwsh script/release/verify-artifacts.ps1 packages/opencode/dist/release
```

私有构建没有签名时，Windows SmartScreen 可能提示未知发布者；这不是完整性校验失败。发布前必须下载四个资产、复算 SHA-256，并在无 Bun/Node 的干净 Windows x64 环境分别验证两种 ZIP 和安装器。

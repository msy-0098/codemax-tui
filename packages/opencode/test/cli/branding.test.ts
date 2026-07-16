import { describe, expect, test } from "bun:test"
import path from "path"

const packageDir = path.resolve(import.meta.dir, "../..")

describe("CodeMax CLI branding", () => {
  test("publishes the codemax package and binary", async () => {
    const pkg = await Bun.file(path.join(packageDir, "package.json")).json()

    expect(pkg.name).toBe("codemax")
    expect(pkg.bin).toEqual({ codemax: "./bin/codemax" })
  })

  test("launches CodeMax platform binaries and prefers CODEMAX_BIN_PATH", async () => {
    const launcher = await Bun.file(path.join(packageDir, "bin/codemax")).text()

    expect(launcher).toContain("process.env.CODEMAX_BIN_PATH || process.env.OPENCODE_BIN_PATH")
    expect(launcher).toContain('const cached = path.join(scriptDir, ".codemax")')
    expect(launcher).toContain('const base = "codemax-" + platform + "-" + arch')
    expect(launcher).toContain('platform === "windows" ? "codemax.exe" : "codemax"')
    expect(launcher).not.toContain("opencode CLI for your platform")
  })

  test("uses CodeMax for CLI help, compiled binary names, and model requests", async () => {
    const index = await Bun.file(path.join(packageDir, "src/index.ts")).text()
    const build = await Bun.file(path.join(packageDir, "script/build.ts")).text()
    const modelsDev = await Bun.file(path.resolve(packageDir, "../core/src/models-dev.ts")).text()

    expect(index).toContain(".scriptName(Product.Command)")
    expect(index).not.toContain('.scriptName("opencode")')
    expect(build).toContain("outfile: `dist/${name}/bin/${Product.Command}`")
    expect(build).toContain("`--user-agent=${Product.UserAgent}/${Script.version}`")
    expect(build).toContain("target: item.target")
    expect(build).not.toContain('name.replace(pkg.name, "bun")')
    expect(modelsDev).toContain("const USER_AGENT = Product.UserAgent")
  })

  test("uses the CodeMax workspace package for web development tooling", async () => {
    const web = await Bun.file(path.resolve(packageDir, "../web/package.json")).json()

    expect(web.devDependencies.codemax).toBe("workspace:*")
    expect(web.devDependencies.opencode).toBeUndefined()
  })
})

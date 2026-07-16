import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"

const packageDir = path.resolve(import.meta.dir, "../..")

describe("CodeMax Windows package", () => {
  test("creates whitelisted native and baseline archives", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codemax-package-"))
    const dist = path.join(root, "dist")
    const output = path.join(root, "release")
    const version = "0.1.0-test"

    for (const name of ["codemax-windows-x64", "codemax-windows-x64-baseline"]) {
      await fs.mkdir(path.join(dist, name, "bin"), { recursive: true })
      await Bun.write(path.join(dist, name, "bin", "codemax.exe"), "binary")
      await Bun.write(path.join(dist, name, "package.json"), JSON.stringify({ version }))
    }

    const result = Bun.spawn(
      [process.execPath, "run", "script/package-windows.ts", "--version", version, "--output", output, "--dist", dist],
      { cwd: packageDir, stdout: "pipe", stderr: "pipe" },
    )
    expect(await result.exited).toBe(0)

    for (const name of ["CodeMax-x64.zip", "CodeMax-x64-baseline.zip"]) {
      const zip = Bun.file(path.join(output, name))
      expect(await zip.exists()).toBe(true)
      const entries = await new Response(zip.stream().pipeThrough(new DecompressionStream("deflate-raw"))).text().catch(() => "")
      expect(entries).not.toContain("package.json")
    }
  })

  test("rejects unexpected files beside the executable", async () => {
    const script = await Bun.file(path.join(packageDir, "script/package-windows.ts")).text()
    expect(script).toContain("Unexpected release file")
    expect(script).toContain("THIRD_PARTY_NOTICES.md")
  })
})

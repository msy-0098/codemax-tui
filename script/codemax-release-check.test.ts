import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"

describe("CodeMax release check", () => {
  test("rejects an incomplete release directory", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codemax-release-"))
    const result = Bun.spawn([process.execPath, path.resolve(import.meta.dir, "codemax-release-check.ts"), directory], {
      cwd: path.resolve(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })

    expect(await result.exited).not.toBe(0)
    expect(await new Response(result.stderr).text()).toContain("CodeMax-x64.zip")
  })
})

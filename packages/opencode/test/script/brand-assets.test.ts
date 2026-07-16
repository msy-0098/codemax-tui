import { describe, expect, test } from "bun:test"
import path from "path"

const packageDir = path.resolve(import.meta.dir, "../..")

describe("CodeMax brand assets", () => {
  test("commits the approved source and deterministic runtime icon", async () => {
    const source = Bun.file(path.join(packageDir, "assets/codemax/source.png"))
    const icon = Bun.file(path.join(packageDir, "assets/codemax/codemax.ico"))

    expect(await source.exists()).toBe(true)
    expect(await icon.exists()).toBe(true)
    expect(new Uint8Array(await source.arrayBuffer()).byteLength).toBeGreaterThan(1000)

    const bytes = new Uint8Array(await icon.arrayBuffer())
    expect(Array.from(bytes.slice(0, 6))).toEqual([0, 0, 1, 0, 7, 0])
    expect(Array.from({ length: 7 }, (_, index) => bytes[6 + index * 16] || 256)).toEqual([16, 24, 32, 48, 64, 128, 256])
  })

  test("can verify committed assets without changing them", async () => {
    const result = Bun.spawn([process.execPath, "script/generate-brand-assets.ts", "--check"], {
      cwd: packageDir,
      stdout: "ignore",
      stderr: "ignore",
    })

    expect(await result.exited).toBe(0)
  }, 15000)
})

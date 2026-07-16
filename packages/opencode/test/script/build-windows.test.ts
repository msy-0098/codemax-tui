import { expect, test } from "bun:test"

test("Windows release builds only the native and baseline CodeMax x64 targets", async () => {
  const source = await Bun.file("script/build.ts").text()

  expect(source).toContain('const windowsX64Flag = process.argv.includes("--windows-x64")')
  expect(source).toContain("const targets = windowsX64Flag")
  expect(source).toContain('? allTargets.filter((item) => item.os === "win32" && item.arch === "x64")')
  expect(source).toContain('icon: "./assets/codemax/codemax.ico"')
  expect(source).toContain('title: Product.Name')
})

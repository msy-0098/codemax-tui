import { expect, test } from "bun:test"

test("uses CodeMax terminal titles and an ASCII-safe home logo", async () => {
  const app = await Bun.file("src/app.tsx").text()
  const logo = await Bun.file("src/logo.ts").text()

  expect(app).toContain('from "@opencode-ai/core/product"')
  expect(app).toContain("renderer.setTerminalTitle(Product.Name)")
  expect(app).toContain("`CM | ${title}`")
  expect(logo).toContain("CODEMAX")
  expect([...logo].every((character) => character.charCodeAt(0) <= 127)).toBe(true)
})

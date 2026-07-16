import { expect, test } from "bun:test"

test("TUI command exposes and forwards the CodeMax language option", async () => {
  const source = await Bun.file("src/cli/cmd/tui.ts").text()

  expect(source).toContain('.option("language"')
  expect(source).toContain('choices: ["auto", "en", "zh-CN"]')
  expect(source).toContain("language: args.language")
})

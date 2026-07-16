import { expect, test } from "bun:test"

test("crash screen keeps diagnostics local and redacts displayed details", async () => {
  const source = await Bun.file("src/component/error-component.tsx").text()

  expect(source).toContain('from "@opencode-ai/core/error/redact"')
  expect(source).toContain("CodeMax 发生意外错误")
  expect(source).not.toContain("github.com/anomalyco/opencode/issues/new")
  expect(source).not.toContain("buildIssueURL")
})

import { expect, test } from "bun:test"
import { en } from "../../src/i18n/messages/en"
import { zhCN } from "../../src/i18n/messages/zh-cn"

test("Chinese and English catalogs have identical keys", () => {
  expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort())
})

test("technical terms remain searchable", () => {
  expect(zhCN["provider.apiKey"]).toContain("API Key")
  expect(zhCN["provider.openaiCompatible"]).toContain("OpenAI")
  expect(zhCN["status.mcp"]).toContain("MCP")
})

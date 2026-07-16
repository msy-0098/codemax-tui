import { describe, expect, test } from "bun:test"
import { classify } from "../../src/error/codemax"

describe("CodeMax error classification", () => {
  test("classifies authorization failures with a Chinese recovery action", () => {
    expect(classify({ status: 401, message: "invalid API key sk-secret-value-12345678" })).toMatchObject({
      code: "CM-AUTH-401",
      summary: "认证失败",
      action: "请检查 API Key 后重试。",
      retryable: false,
    })
  })

  test("classifies network timeouts and redacts the detail", () => {
    const result = classify(new Error("request timeout Authorization: Bearer token-live-12345678"))

    expect(result).toMatchObject({ code: "CM-NET-TIMEOUT", retryable: true })
    expect(JSON.stringify(result.details)).not.toContain("token-live")
  })

  test("uses a stable crash code for unknown errors", () => {
    expect(classify(new Error("unexpected"))).toMatchObject({
      code: "CM-CRASH-UNEXPECTED",
      summary: "CodeMax 发生意外错误",
      retryable: false,
    })
  })
})

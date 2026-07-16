import { describe, expect, test } from "bun:test"
import { redact, redactText } from "../../src/error/redact"

describe("CodeMax diagnostic redaction", () => {
  test("redacts credential fields while preserving safe diagnostic context", () => {
    expect(
      redact({
        authorization: "Bearer sk-secret-value-12345678",
        nested: { apiKey: "token-live-12345678", path: "C:/project/codemax.jsonc", status: 401 },
        model: "deepseek/deepseek-chat",
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", path: "C:/project/codemax.jsonc", status: 401 },
      model: "deepseek/deepseek-chat",
    })
  })

  test("redacts bearer headers and secret query values in arbitrary text", () => {
    const result = redactText(
      "Authorization: Bearer sk-secret-value-12345678 https://example.com?token=token-live-12345678&safe=value",
    )

    expect(result).not.toContain("secret-value")
    expect(result).not.toContain("token-live")
    expect(result).toContain("safe=value")
  })

  test("handles cyclic diagnostic objects", () => {
    const input: { cause?: unknown } = {}
    input.cause = input

    expect(redact(input)).toEqual({ cause: "[Circular]" })
  })
})

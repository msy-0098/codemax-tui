import { describe, expect, test } from "bun:test"
import { normalizeLanguage, resolveLanguage } from "../../src/i18n/locale"

describe("resolveLanguage", () => {
  test("uses CLI, config, environment, then English", () => {
    expect(resolveLanguage({ cli: "zh-CN", config: "en", environment: "en_US" })).toBe("zh-CN")
    expect(resolveLanguage({ config: "en", environment: "zh_CN.UTF-8" })).toBe("en")
    expect(resolveLanguage({ environment: "zh-Hans-CN" })).toBe("zh-CN")
    expect(resolveLanguage({ environment: "fr_FR" })).toBe("en")
  })

  test("normalizes supported locale variants", () => {
    expect(normalizeLanguage("EN_us.UTF-8")).toBe("en")
    expect(normalizeLanguage("zh_CN")).toBe("zh-CN")
    expect(normalizeLanguage("fr_FR")).toBeUndefined()
  })

  test("uses a persisted setting before the environment", () => {
    expect(resolveLanguage({ persisted: "zh-CN", environment: "en_US" })).toBe("zh-CN")
  })
})

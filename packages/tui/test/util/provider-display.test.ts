import { describe, expect, test } from "bun:test"
import { providerRank, sortProviders } from "../../src/util/provider-display"

describe("provider display", () => {
  test("keeps recent providers ahead of Chinese domestic priority", () => {
    expect(
      sortProviders(
        [
          { id: "openai", name: "OpenAI" },
          { id: "deepseek", name: "DeepSeek" },
          { id: "alibaba", name: "Qwen" },
          { id: "zhipuai", name: "Zhipu AI" },
          { id: "moonshotai", name: "Kimi" },
          { id: "volcengine", name: "Doubao" },
          { id: "mistral", name: "Mistral" },
        ],
        "zh-CN",
        ["openai"],
      ).map((provider) => provider.id),
    ).toEqual(["openai", "deepseek", "alibaba", "zhipuai", "moonshotai", "volcengine", "mistral"])
  })

  test("preserves the upstream priority for English", () => {
    expect(providerRank("openai", "en", [])).toBeLessThan(providerRank("anthropic", "en", []))
    expect(providerRank("anthropic", "en", [])).toBeLessThan(providerRank("mistral", "en", []))
  })
})

import type { Language } from "../i18n/locale"

const upstream = ["opencode", "opencode-go", "openai", "github-copilot", "anthropic", "google"]
const domestic = ["deepseek", "alibaba", "alibaba-cn", "zhipuai", "zai", "moonshotai", "volcengine", "volcengine-plan"]

export function isPriorityProvider(id: string, language: Language) {
  return (language === "zh-CN" ? domestic : upstream).includes(id)
}

export function providerRank(id: string, language: Language, recent: readonly string[]) {
  const recentIndex = recent.indexOf(id)
  if (recentIndex >= 0) return recentIndex
  const priority = language === "zh-CN" ? domestic : upstream
  const index = priority.indexOf(id)
  return recent.length + (index >= 0 ? index : priority.length + 100)
}

export function sortProviders<T extends { id: string; name: string }>(items: readonly T[], language: Language, recent: readonly string[]) {
  return items.toSorted(
    (left, right) =>
      providerRank(left.id, language, recent) - providerRank(right.id, language, recent) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  )
}

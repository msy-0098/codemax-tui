export type Language = "en" | "zh-CN"
export type LanguageSetting = "auto" | Language

export function normalizeLanguage(value?: string): Language | undefined {
  if (!value) return
  const normalized = value.replaceAll("_", "-").toLowerCase()
  if (normalized === "en" || normalized.startsWith("en-")) return "en"
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN"
}

export function resolveLanguage(input: {
  cli?: string
  config?: LanguageSetting
  persisted?: string
  environment?: string
}): Language {
  return (
    normalizeLanguage(input.cli) ??
    (input.config && input.config !== "auto" ? input.config : undefined) ??
    normalizeLanguage(input.persisted) ??
    normalizeLanguage(input.environment) ??
    "en"
  )
}

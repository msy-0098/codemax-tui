import { createContext, type JSX, useContext } from "solid-js"
import { useKV } from "../context/kv"
import { en, type MessageKey } from "./messages/en"
import { zhCN } from "./messages/zh-cn"
import { resolveLanguage, type Language, type LanguageSetting } from "./locale"

const catalogs = { en, "zh-CN": zhCN }

type I18nContext = {
  readonly language: Language
  setLanguage(language: Language): void
  t(key: MessageKey, values?: Record<string, string>): string
}

const Context = createContext<I18nContext>()

export function I18nProvider(props: { language: Language; children: JSX.Element; onLanguageChange?: (language: Language) => void }) {
  const language = () => props.language
  const t = (key: MessageKey, values: Record<string, string> = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value),
      catalogs[language()][key],
    )

  return (
    <Context.Provider
      value={{
        get language() {
          return language()
        },
        setLanguage(language) {
          props.onLanguageChange?.(language)
        },
        t,
      }}
    >
      {props.children}
    </Context.Provider>
  )
}

export function PersistentI18nProvider(props: {
  cli?: string
  config?: LanguageSetting
  environment?: string
  children: JSX.Element
}) {
  const kv = useKV()
  const language = () =>
    resolveLanguage({
      cli: props.cli,
      config: props.config,
      persisted: kv.get("codemax.language"),
      environment: props.environment,
    })

  return (
    <I18nProvider language={language()} onLanguageChange={(value) => kv.set("codemax.language", value)}>
      {props.children}
    </I18nProvider>
  )
}

export function useI18n() {
  const value = useContext(Context)
  if (!value) throw new Error("I18nProvider is missing")
  return value
}

export { resolveLanguage, type Language, type LanguageSetting, type MessageKey }

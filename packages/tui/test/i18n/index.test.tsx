import { expect, test } from "bun:test"
import { createEffect, createRoot, createSignal } from "solid-js"
import { renderToString } from "solid-js/web"
import { I18nProvider, useI18n } from "../../src/i18n"

test("interpolates translated messages", () => {
  function Message() {
    const { t } = useI18n()
    return <>{t("provider.saved", { provider: "DeepSeek" })}</>
  }

  expect(renderToString(() => <I18nProvider language="zh-CN"><Message /></I18nProvider>)).toContain("DeepSeek")
})

test("updates translations when the selected language changes", () => {
  const values: string[] = []

  createRoot(() => {
    const [language, setLanguage] = createSignal<"en" | "zh-CN">("en")
    function Message() {
      const i18n = useI18n()
      createEffect(() => values.push(`${i18n.language}:${i18n.t("provider.other")}`))
      return <></>
    }

    I18nProvider({
      get language() {
        return language()
      },
      get children() {
        return <Message />
      },
    })
    setLanguage("zh-CN")
  })

  expect(values).toEqual(["zh-CN:其他"])
})

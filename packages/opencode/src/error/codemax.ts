import { redact } from "@opencode-ai/core/error/redact"

export type CodeMaxError = {
  code: string
  summary: string
  action: string
  retryable: boolean
  details: unknown
}

export function classify(input: unknown): CodeMaxError {
  const status = statusCode(input)
  const message = messageOf(input).toLowerCase()
  const details = redact(input)
  if (status === 401 || status === 403) {
    return { code: `CM-AUTH-${status ?? "INVALID"}`, summary: "认证失败", action: "请检查 API Key 后重试。", retryable: false, details }
  }
  if (status === 429 || /rate limit|quota|overload/.test(message)) {
    return { code: "CM-RATE-LIMIT", summary: "服务请求受限", action: "请稍后重试或切换模型。", retryable: true, details }
  }
  if (/timeout|timed out/.test(message)) {
    return { code: "CM-NET-TIMEOUT", summary: "网络请求超时", action: "请检查网络或代理后重试。", retryable: true, details }
  }
  if (/api key|auth(?:entication)?|unauthori[sz]ed|forbidden/.test(message)) {
    return { code: "CM-AUTH-INVALID", summary: "认证失败", action: "请检查 API Key 后重试。", retryable: false, details }
  }
  if (/dns|enotfound|tls|certificate|proxy|network|econn/.test(message)) {
    return { code: "CM-NET-CONNECTION", summary: "网络连接失败", action: "请检查网络、代理和证书设置后重试。", retryable: true, details }
  }
  if (/config|jsonc|schema/.test(message)) {
    return { code: "CM-CONFIG-INVALID", summary: "配置无效", action: "请检查 CodeMax 配置文件后重试。", retryable: false, details }
  }
  return { code: "CM-CRASH-UNEXPECTED", summary: "CodeMax 发生意外错误", action: "请复制诊断信息后重试。", retryable: false, details }
}

function statusCode(input: unknown) {
  if (typeof input !== "object" || input === null) return
  const status = "status" in input ? input.status : undefined
  return typeof status === "number" ? status : undefined
}

function messageOf(input: unknown) {
  if (input instanceof Error) return input.message
  if (typeof input === "object" && input !== null && "message" in input && typeof input.message === "string") {
    return input.message
  }
  return String(input)
}

export * as CodeMaxError from "./codemax"

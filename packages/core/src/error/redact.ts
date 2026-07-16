const credentialKey = /authorization|cookie|api[-_]?key|token|secret|password/i
const bearer = /(authorization\s*:\s*bearer\s+)[^\s,;]+/gi
const credential = /\b(?:sk|key|token)-[A-Za-z0-9_-]{8,}\b/g
const query = /([?&](?:api[-_]?key|token|secret|password)=)[^&#\s]+/gi

export function redactText(input: string) {
  return input.replace(bearer, "$1[REDACTED]").replace(credential, "[REDACTED]").replace(query, "$1[REDACTED]")
}

export function redact(input: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof input === "string") return redactText(input)
  if (input === null || typeof input !== "object") return input
  if (seen.has(input)) return "[Circular]"
  seen.add(input)
  if (Array.isArray(input)) return input.map((value) => redact(value, seen))
  if (input instanceof Error) {
    return {
      name: input.name,
      message: redactText(input.message),
      stack: input.stack ? redactText(input.stack) : undefined,
      cause: input.cause === undefined ? undefined : redact(input.cause, seen),
    }
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, credentialKey.test(key) ? "[REDACTED]" : redact(value, seen)]),
  )
}

export * as Redact from "./redact"

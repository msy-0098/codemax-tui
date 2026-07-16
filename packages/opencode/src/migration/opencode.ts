import fs from "fs/promises"
import path from "path"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import { ConfigParse } from "@/config/parse"

export type MigrationCategory = "config" | "auth" | "sessions"

export type MigrationPlan = {
  source: string
  target: string
  categories: MigrationCategory[]
}

export type MigrationResult = {
  copied: string[]
  skipped: string[]
}

const configFiles = ["opencode.jsonc", "opencode.json"]

export async function detect(source: string, target: string): Promise<MigrationPlan | undefined> {
  if (await exists(path.join(target, "migration.json"))) return undefined

  const categories = [
    (await configFile(source)) ? "config" : undefined,
    (await exists(path.join(source, "auth.json"))) ? "auth" : undefined,
  ].filter((category): category is MigrationCategory => category !== undefined)

  if (!categories.length) return undefined
  return { source, target, categories }
}

export async function migrate(plan: MigrationPlan): Promise<MigrationResult> {
  if (await exists(path.join(plan.target, "migration.json"))) {
    return { copied: [], skipped: [...plan.categories] }
  }
  if (await exists(plan.target)) {
    throw new Error("CodeMax migration target already exists")
  }

  const staging = `${plan.target}.migration-${Date.now()}-${crypto.randomUUID()}`
  const copied: string[] = []
  const skipped: string[] = []

  try {
    await fs.mkdir(staging, { recursive: true })

    for (const category of plan.categories) {
      if (category === "config") {
        const source = await configFile(plan.source)
        if (!source) {
          skipped.push(category)
          continue
        }
        const content = await fs.readFile(source, "utf8")
        validateConfig(content, source)
        await fs.writeFile(path.join(staging, path.basename(source).replace("opencode", "codemax")), content)
        copied.push(category)
        continue
      }

      if (category === "auth") {
        const source = path.join(plan.source, "auth.json")
        if (!(await exists(source))) {
          skipped.push(category)
          continue
        }
        const content = await fs.readFile(source, "utf8")
        validateAuth(content)
        await fs.writeFile(path.join(staging, "auth.json"), content, { mode: 0o600 })
        copied.push(category)
        continue
      }

      skipped.push(category)
    }

    await fs.writeFile(
      path.join(staging, "migration.json"),
      JSON.stringify({ source: plan.source, categories: copied, migratedAt: new Date().toISOString() }, null, 2),
    )
    await fs.mkdir(path.dirname(plan.target), { recursive: true })
    await fs.rename(staging, plan.target)
    return { copied, skipped }
  } catch (error) {
    await fs.rm(staging, { force: true, recursive: true }).catch(() => {})
    throw error
  }
}

async function configFile(source: string) {
  for (const name of configFiles) {
    const file = path.join(source, name)
    if (await exists(file)) return file
  }
}

function validateConfig(content: string, source: string) {
  try {
    ConfigParse.schema(ConfigV1.Info, ConfigParse.jsonc(content, source), source)
  } catch {
    throw new Error("OpenCode configuration is invalid")
  }
}

function validateAuth(content: string) {
  try {
    const data: unknown = JSON.parse(content)
    if (!isRecord(data) || !Object.values(data).every(isAuthInfo)) throw new Error()
  } catch {
    throw new Error("OpenCode authentication data is invalid")
  }
}

function isAuthInfo(input: unknown) {
  if (!isRecord(input) || typeof input.type !== "string") return false
  if (input.type === "api") return typeof input.key === "string"
  if (input.type === "oauth") {
    return typeof input.access === "string" && typeof input.refresh === "string" && typeof input.expires === "number"
  }
  if (input.type === "wellknown") return typeof input.key === "string" && typeof input.token === "string"
  return false
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}

async function exists(file: string) {
  return fs.stat(file).then(() => true).catch(() => false)
}

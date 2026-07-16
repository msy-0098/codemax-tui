import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { OpenCodeMigration } from "@/migration"

const roots: string[] = []

async function tempdir() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codemax-migration-"))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { force: true, recursive: true })))
})

describe("OpenCodeMigration.detect", () => {
  test("selects config and auth without importing anything", async () => {
    const source = await tempdir()
    const target = path.join(await tempdir(), "codemax")
    await fs.writeFile(path.join(source, "opencode.jsonc"), '{ "model": "openai/gpt-4" }')
    await fs.writeFile(path.join(source, "auth.json"), '{ "openai": { "type": "api", "key": "secret" } }')

    const plan = await OpenCodeMigration.detect(source, target)

    expect(plan).toEqual({
      source,
      target,
      categories: ["config", "auth"],
    })
    await expect(fs.stat(path.join(target, "codemax.jsonc"))).rejects.toThrow()
  })
})

describe("OpenCodeMigration.migrate", () => {
  test("copies validated config and auth without modifying the source", async () => {
    const source = await tempdir()
    const target = path.join(await tempdir(), "codemax")
    const config = '{ "model": "openai/gpt-4" }'
    const auth = '{ "openai": { "type": "api", "key": "secret" } }'
    await fs.writeFile(path.join(source, "opencode.jsonc"), config)
    await fs.writeFile(path.join(source, "auth.json"), auth)

    const result = await OpenCodeMigration.migrate({ source, target, categories: ["config", "auth"] })

    expect(result).toEqual({ copied: ["config", "auth"], skipped: [] })
    expect(await fs.readFile(path.join(target, "codemax.jsonc"), "utf8")).toBe(config)
    expect(await fs.readFile(path.join(target, "auth.json"), "utf8")).toBe(auth)
    expect(await fs.readFile(path.join(source, "opencode.jsonc"), "utf8")).toBe(config)
    expect(await fs.readFile(path.join(source, "auth.json"), "utf8")).toBe(auth)
    expect(JSON.parse(await fs.readFile(path.join(target, "migration.json"), "utf8"))).toMatchObject({
      source,
      categories: ["config", "auth"],
    })
  })

  test("rejects malformed auth data without leaving a staging directory", async () => {
    const source = await tempdir()
    const target = path.join(await tempdir(), "codemax")
    await fs.writeFile(path.join(source, "auth.json"), '{ "openai": "not-auth-data" }')

    await expect(OpenCodeMigration.migrate({ source, target, categories: ["auth"] })).rejects.toThrow(
      "OpenCode authentication data is invalid",
    )

    expect(await fs.readdir(path.dirname(target))).toEqual([])
  })
})

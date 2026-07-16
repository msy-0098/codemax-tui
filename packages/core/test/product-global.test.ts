import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import path from "path"
import { Product } from "../src/product"

const variables = [
  Product.ConfigEnvironment.file,
  Product.ConfigEnvironment.directory,
  Product.ConfigEnvironment.content,
  "CODEMAX_DISABLE_AUTOUPDATE",
  "OPENCODE_CONFIG",
  "OPENCODE_CONFIG_DIR",
  "OPENCODE_CONFIG_CONTENT",
  "OPENCODE_DISABLE_AUTOUPDATE",
]

let environment = new Map<string, string | undefined>()

beforeEach(() => {
  environment = new Map(variables.map((key) => [key, process.env[key]]))
  variables.forEach((key) => delete process.env[key])
})

afterEach(() => {
  variables.forEach((key) => {
    const value = environment.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  })
})

async function flag() {
  return (await import(`../src/flag/flag.ts?test=${crypto.randomUUID()}`)).Flag
}

describe("CodeMax global paths", () => {
  test("uses the product ID as the basename for user data paths", async () => {
    const { Global } = await import(`../src/global.ts?test=${crypto.randomUUID()}`)

    ;[Global.Path.data, Global.Path.config, Global.Path.cache, Global.Path.state, Global.Path.tmp].forEach((value) =>
      expect(path.basename(value)).toBe(Product.ID),
    )
    expect(path.dirname(Global.Path.log)).toBe(Global.Path.data)
    expect(path.basename(Global.Path.log)).toBe("log")
    expect(path.dirname(Global.Path.repos)).toBe(Global.Path.data)
    expect(path.basename(Global.Path.repos)).toBe("repos")
  })
})

describe("CodeMax configuration flags", () => {
  test("maps CodeMax configuration environment variables", async () => {
    process.env[Product.ConfigEnvironment.file] = "codemax.json"
    process.env[Product.ConfigEnvironment.directory] = "codemax-config"
    process.env[Product.ConfigEnvironment.content] = '{"model":"codemax"}'

    const Flag = await flag()

    expect(Flag.OPENCODE_CONFIG).toBe("codemax.json")
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("codemax-config")
    expect(Flag.OPENCODE_CONFIG_CONTENT).toBe('{"model":"codemax"}')
  })

  test("prefers CodeMax configuration variables over OpenCode compatibility variables", async () => {
    process.env[Product.ConfigEnvironment.file] = "codemax.json"
    process.env[Product.ConfigEnvironment.directory] = "codemax-config"
    process.env[Product.ConfigEnvironment.content] = "codemax-content"
    process.env.OPENCODE_CONFIG = "opencode.json"
    process.env.OPENCODE_CONFIG_DIR = "opencode-config"
    process.env.OPENCODE_CONFIG_CONTENT = "opencode-content"

    const Flag = await flag()

    expect(Flag.OPENCODE_CONFIG).toBe("codemax.json")
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("codemax-config")
    expect(Flag.OPENCODE_CONFIG_CONTENT).toBe("codemax-content")
  })

  test("falls back to OpenCode configuration variables", async () => {
    process.env.OPENCODE_CONFIG = "opencode.json"
    process.env.OPENCODE_CONFIG_DIR = "opencode-config"
    process.env.OPENCODE_CONFIG_CONTENT = "opencode-content"

    const Flag = await flag()

    expect(Flag.OPENCODE_CONFIG).toBe("opencode.json")
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("opencode-config")
    expect(Flag.OPENCODE_CONFIG_CONTENT).toBe("opencode-content")
  })

  test("evaluates the configuration directory getter at access time", async () => {
    const Flag = await flag()

    process.env[Product.ConfigEnvironment.directory] = "codemax-config"
    process.env.OPENCODE_CONFIG_DIR = "opencode-config"
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("codemax-config")

    delete process.env[Product.ConfigEnvironment.directory]
    expect(Flag.OPENCODE_CONFIG_DIR).toBe("opencode-config")
  })
})

describe("CodeMax auto update flag", () => {
  test("disables auto updates by default", async () => {
    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(true)
  })

  test("accepts an explicit false value", async () => {
    process.env.CODEMAX_DISABLE_AUTOUPDATE = "false"

    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(false)
  })

  test("accepts an explicit true value", async () => {
    process.env.CODEMAX_DISABLE_AUTOUPDATE = "true"

    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(true)
  })

  test("falls back to the OpenCode auto update variable", async () => {
    process.env.OPENCODE_DISABLE_AUTOUPDATE = "false"

    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(false)
  })

  test("prefers explicit CodeMax auto update false over OpenCode true", async () => {
    process.env.CODEMAX_DISABLE_AUTOUPDATE = "false"
    process.env.OPENCODE_DISABLE_AUTOUPDATE = "true"

    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(false)
  })

  test("prefers explicit CodeMax auto update true over OpenCode false", async () => {
    process.env.CODEMAX_DISABLE_AUTOUPDATE = "true"
    process.env.OPENCODE_DISABLE_AUTOUPDATE = "false"

    expect((await flag()).OPENCODE_DISABLE_AUTOUPDATE).toBe(true)
  })
})

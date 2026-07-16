import { describe, expect, test } from "bun:test"
import { Product } from "../src/product"

describe("Product", () => {
  test("exposes the CodeMax display name", () => {
    expect(Product.Name).toBe("CodeMax")
  })

  test("exposes the codemax command name", () => {
    expect(Product.Command).toBe("codemax")
  })

  test("exposes the codemax identifier", () => {
    expect(Product.ID).toBe("codemax")
  })

  test("exposes the codemax user agent", () => {
    expect(Product.UserAgent).toBe("codemax")
  })

  test("exposes CodeMax config environment names", () => {
    expect(Product.ConfigEnvironment).toEqual({
      file: "CODEMAX_CONFIG",
      directory: "CODEMAX_CONFIG_DIR",
      content: "CODEMAX_CONFIG_CONTENT",
    })
  })
})

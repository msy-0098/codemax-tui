import { describe, expect, test } from "bun:test"
import { resolveReleaseEnv } from "../src/release-env"

describe("resolveReleaseEnv", () => {
  test("uses an explicit CodeMax version and defaults the channel", () => {
    expect(resolveReleaseEnv({ CODEMAX_VERSION: "1.2.3" })).toEqual({
      channel: "latest",
      preview: false,
      release: false,
      version: "1.2.3",
    })
  })

  test("builds a preview version for non-latest channels", () => {
    expect(resolveReleaseEnv({ CODEMAX_CHANNEL: "dev" }, new Date("2026-07-16T12:34:56Z"))).toEqual({
      channel: "dev",
      preview: true,
      release: false,
      version: "0.0.0-dev-202607161234",
    })
  })

  test("requires a version for latest releases", () => {
    expect(() => resolveReleaseEnv({ CODEMAX_CHANNEL: "latest" })).toThrow(
      "CODEMAX_VERSION is required for a latest release",
    )
  })

  test("marks only CODEMAX_RELEASE=1 as a release", () => {
    expect(resolveReleaseEnv({ CODEMAX_VERSION: "1.2.3", CODEMAX_RELEASE: "1" }).release).toBe(true)
    expect(resolveReleaseEnv({ CODEMAX_VERSION: "1.2.3", CODEMAX_RELEASE: "true" }).release).toBe(false)
  })
})

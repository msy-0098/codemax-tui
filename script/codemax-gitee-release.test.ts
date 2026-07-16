import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { mirrorRelease } from "./codemax-gitee-release"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })))
})

describe("CodeMax Gitee release mirror", () => {
  test("creates a release and uploads each verified artifact once", async () => {
    const directory = await releaseDirectory()
    const requests: Request[] = []
    const files = new Set<string>()
    const fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)
      const url = new URL(request.url)

      if (request.method === "GET" && url.pathname === "/api/v5/repos/acme/codemax") {
        return json({ private: true })
      }
      if (request.method === "GET" && url.pathname.endsWith("/releases/tags/codemax-v0.1.0")) {
        return json({ message: "Not Found" }, 404)
      }
      if (request.method === "POST" && url.pathname.endsWith("/releases")) {
        return json({ id: 42, attach_files: [] })
      }
      if (request.method === "POST" && url.pathname.endsWith("/releases/42/attach_files")) {
        const body = await request.formData()
        files.add(String(body.get("file") instanceof File && body.get("file")?.name))
        return json({})
      }
      return json({ message: `Unexpected request: ${request.method} ${url.pathname}` }, 500)
    }

    await mirrorRelease({
      directory,
      tag: "codemax-v0.1.0",
      env: { GITEE_TOKEN: "test-token", GITEE_OWNER: "acme", GITEE_REPO: "codemax" },
      fetch,
    })

    expect(files).toEqual(
      new Set(["CodeMax-Setup-x64.exe", "CodeMax-x64-baseline.zip", "CodeMax-x64.zip", "SHA256SUMS.txt"]),
    )
    expect(requests.filter((request) => request.method === "POST" && request.url.endsWith("/releases"))).toHaveLength(1)
    expect(requests.every((request) => request.headers.get("authorization") === "token test-token")).toBe(true)
  })

  test("rejects a public repository before creating a release", async () => {
    const directory = await releaseDirectory()
    const requests: Request[] = []

    await expect(
      mirrorRelease({
        directory,
        tag: "codemax-v0.1.0",
        env: { GITEE_TOKEN: "test-token", GITEE_OWNER: "acme", GITEE_REPO: "codemax" },
        fetch: async (input, init) => {
          requests.push(new Request(input, init))
          return json({ private: false })
        },
      }),
    ).rejects.toThrow("私有仓库")

    expect(requests).toHaveLength(1)
  })

  test("reuses an existing release and does not re-upload existing attachments", async () => {
    const directory = await releaseDirectory()
    const uploads: Request[] = []

    await mirrorRelease({
      directory,
      tag: "codemax-v0.1.0",
      env: { GITEE_TOKEN: "test-token", GITEE_OWNER: "acme", GITEE_REPO: "codemax" },
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const url = new URL(request.url)
        if (request.method === "GET" && url.pathname === "/api/v5/repos/acme/codemax") return json({ private: true })
        if (request.method === "GET" && url.pathname.endsWith("/releases/tags/codemax-v0.1.0")) {
          return json({
            id: 42,
            attach_files: [
              { name: "CodeMax-Setup-x64.exe" },
              { name: "CodeMax-x64-baseline.zip" },
              { name: "CodeMax-x64.zip" },
              { name: "SHA256SUMS.txt" },
            ],
          })
        }
        if (request.method === "POST") uploads.push(request)
        return json({})
      },
    })

    expect(uploads).toHaveLength(0)
  })

  test("rejects a release directory with an invalid hash manifest", async () => {
    const directory = await releaseDirectory()
    await Bun.write(path.join(directory, "SHA256SUMS.txt"), "0".repeat(64) + "  CodeMax-x64.zip\n")

    await expect(
      mirrorRelease({
        directory,
        tag: "codemax-v0.1.0",
        env: { GITEE_TOKEN: "test-token", GITEE_OWNER: "acme", GITEE_REPO: "codemax" },
        fetch: async () => json({ private: true }),
      }),
    ).rejects.toThrow("SHA256SUMS.txt")
  })
})

async function releaseDirectory() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codemax-gitee-release-"))
  directories.push(directory)
  const artifacts = ["CodeMax-Setup-x64.exe", "CodeMax-x64-baseline.zip", "CodeMax-x64.zip"]
  await Promise.all(artifacts.map((name) => Bun.write(path.join(directory, name), name)))
  const hashes = await Promise.all(
    artifacts.map(async (name) => {
      const hash = new Bun.CryptoHasher("sha256")
      hash.update(await Bun.file(path.join(directory, name)).arrayBuffer())
      return `${hash.digest("hex")}  ${name}`
    }),
  )
  await Bun.write(path.join(directory, "SHA256SUMS.txt"), hashes.join("\n") + "\n")
  return directory
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

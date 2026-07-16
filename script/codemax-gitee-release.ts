#!/usr/bin/env bun

import path from "path"

const artifacts = ["CodeMax-Setup-x64.exe", "CodeMax-x64-baseline.zip", "CodeMax-x64.zip"]
const releaseFiles = [...artifacts, "SHA256SUMS.txt"]
const base = "https://gitee.com/api/v5"

export async function mirrorRelease(input: {
  directory: string
  tag: string
  env: Record<string, string | undefined>
  fetch: (input: string, init?: RequestInit) => Promise<Response>
}) {
  const config = readConfig(input.env)
  const directory = path.resolve(input.directory)
  await verifyArtifacts(directory)

  const repository = await api(input.fetch, config, "", { method: "GET" })
  if (repository.private !== false) throw new Error("Gitee target repository must be public")

  const release = await findOrCreateRelease(input.fetch, config, input.tag)
  const uploaded = new Set(release.attach_files.map((file) => file.name))
  for (const name of releaseFiles) {
    if (uploaded.has(name)) continue
    const body = new FormData()
    body.set("file", Bun.file(path.join(directory, name)), name)
    await api(input.fetch, config, `/releases/${release.id}/attach_files`, { method: "POST", body })
  }
}

function readConfig(env: Record<string, string | undefined>) {
  const token = required(env, "GITEE_TOKEN")
  const owner = required(env, "GITEE_OWNER")
  const repo = required(env, "GITEE_REPO")
  return { token, owner, repo }
}

function required(env: Record<string, string | undefined>, name: "GITEE_TOKEN" | "GITEE_OWNER" | "GITEE_REPO") {
  const value = env[name]?.trim()
  if (!value) throw new Error(`缺少 CI 环境变量 ${name}`)
  return value
}

async function verifyArtifacts(directory: string) {
  const files = (await Array.fromAsync(new Bun.Glob("*").scan({ cwd: directory, onlyFiles: true }))).sort()
  if (files.length !== releaseFiles.length || files.some((file) => !releaseFiles.includes(file))) {
    throw new Error("发布目录只能包含 CodeMax 制品和 SHA256SUMS.txt")
  }

  const entries = await hashEntries(directory)
  if (entries.size !== artifacts.length || artifacts.some((name) => !entries.has(name))) {
    throw new Error("SHA256SUMS.txt 必须包含全部 CodeMax 制品")
  }

  for (const name of artifacts) {
    const hash = new Bun.CryptoHasher("sha256")
    hash.update(await Bun.file(path.join(directory, name)).arrayBuffer())
    if (entries.get(name) !== hash.digest("hex")) throw new Error(`SHA256SUMS.txt 校验失败: ${name}`)
  }
}

async function hashEntries(directory: string) {
  const text = await Bun.file(path.join(directory, "SHA256SUMS.txt")).text()
  const entries = new Map<string, string>()
  for (const line of text.trim().split(/\r?\n/)) {
    const match = line.match(/^([a-fA-F0-9]{64})  (CodeMax-(?:Setup-x64\.exe|x64-baseline\.zip|x64\.zip))$/)
    if (!match || entries.has(match[2])) throw new Error("SHA256SUMS.txt 格式无效")
    entries.set(match[2], match[1].toLowerCase())
  }
  return entries
}

async function findOrCreateRelease(
  fetch: (input: string, init?: RequestInit) => Promise<Response>,
  config: { token: string; owner: string; repo: string },
  tag: string,
) {
  const response = await request(fetch, config, `/releases/tags/${encodeURIComponent(tag)}`, { method: "GET" })
  if (response.status !== 404) return release(await expectJson(response, "读取 Gitee Release 失败"))

  const created = await request(fetch, config, "/releases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tag_name: tag, name: `CodeMax ${tag.replace(/^codemax-v/, "")}` }),
  })
  if (created.ok) return release(await expectJson(created, "创建 Gitee Release 失败"))
  if (created.status !== 422) throw new Error(`创建 Gitee Release 失败 (HTTP ${created.status})`)

  const existing = await request(fetch, config, `/releases/tags/${encodeURIComponent(tag)}`, { method: "GET" })
  return release(await expectJson(existing, "读取并发创建的 Gitee Release 失败"))
}

async function api(
  fetch: (input: string, init?: RequestInit) => Promise<Response>,
  config: { token: string; owner: string; repo: string },
  endpoint: string,
  init: RequestInit,
) {
  return expectJson(await request(fetch, config, endpoint, init), `Gitee 请求失败: ${endpoint || "/"}`)
}

async function request(
  fetch: (input: string, init?: RequestInit) => Promise<Response>,
  config: { token: string; owner: string; repo: string },
  endpoint: string,
  init: RequestInit,
) {
  return fetch(`${base}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${endpoint}`, {
    ...init,
    headers: { authorization: `token ${config.token}`, ...init.headers },
  })
}

async function expectJson(response: Response, message: string) {
  if (!response.ok) throw new Error(`${message} (HTTP ${response.status})`)
  return response.json() as Promise<unknown>
}

function release(value: unknown) {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "number") {
    throw new Error("Gitee Release 响应无效")
  }
  const attachFiles = "attach_files" in value && Array.isArray(value.attach_files) ? value.attach_files : []
  return {
    id: value.id,
    attach_files: attachFiles.filter((file): file is { name: string } =>
      Boolean(file && typeof file === "object" && "name" in file && typeof file.name === "string"),
    ),
  }
}

if (import.meta.main) {
  const directory = process.argv[2]
  const tag = process.argv[3]
  if (!directory || !tag) throw new Error("用法: bun script/codemax-gitee-release.ts <发布目录> <标签>")
  await mirrorRelease({ directory, tag, env: process.env, fetch })
  console.log(`CodeMax mirrored to public Gitee Release: ${tag}`)
}

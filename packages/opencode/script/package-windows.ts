#!/usr/bin/env bun

import path from "path"

const args = process.argv.slice(2)
const version = argument("--version")
const output = path.resolve(argument("--output"))
const dist = path.resolve(argument("--dist", "dist"))

for (const item of [
  { directory: "codemax-windows-x64", archive: "CodeMax-x64.zip" },
  { directory: "codemax-windows-x64-baseline", archive: "CodeMax-x64-baseline.zip" },
]) {
  const binary = path.join(dist, item.directory, "bin", "codemax.exe")
  const metadata = await Bun.file(path.join(dist, item.directory, "package.json")).json().catch(() => null)
  if (!(await Bun.file(binary).exists())) throw new Error(`Missing CodeMax executable: ${binary}`)
  if (metadata?.version !== version) throw new Error(`Version mismatch for ${item.directory}; expected ${version}`)

  const actual = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: path.join(dist, item.directory), onlyFiles: true }))).sort()
  const allowed = ["bin/codemax.exe", "package.json"]
  const unknown = actual.filter((file) => !allowed.includes(file.replaceAll("\\", "/")))
  if (unknown.length) throw new Error(`Unexpected release file in ${item.directory}: ${unknown.join(", ")}`)

  await Bun.write(path.join(output, item.archive), zip([
    { name: "codemax.exe", data: new Uint8Array(await Bun.file(binary).arrayBuffer()) },
    { name: "LICENSE", data: new Uint8Array(await Bun.file(path.resolve(import.meta.dir, "../../../LICENSE")).arrayBuffer()) },
    { name: "README.txt", data: new Uint8Array(await Bun.file(path.resolve(import.meta.dir, "../release/README.txt")).arrayBuffer()) },
    { name: "THIRD_PARTY_NOTICES.md", data: new Uint8Array(await Bun.file(path.resolve(import.meta.dir, "../../../THIRD_PARTY_NOTICES.md")).arrayBuffer()) },
  ]))
}

function argument(name: string, fallback?: string) {
  const value = args.at(args.indexOf(name) + 1)
  if (value && !value.startsWith("--")) return value
  if (fallback) return fallback
  throw new Error(`${name} is required`)
}

function zip(files: { name: string; data: Uint8Array }[]) {
  const encoder = new TextEncoder()
  const sections: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const local = new Uint8Array(30 + name.length + file.data.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, file.data.length, true)
    localView.setUint32(22, file.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(file.data, 30 + name.length)
    sections.push(local)

    const entry = new Uint8Array(46 + name.length)
    const view = new DataView(entry.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint32(16, crc, true)
    view.setUint32(20, file.data.length, true)
    view.setUint32(24, file.data.length, true)
    view.setUint16(28, name.length, true)
    view.setUint32(42, offset, true)
    entry.set(name, 46)
    central.push(entry)
    offset += local.length
  }
  const centralLength = central.reduce((total, entry) => total + entry.length, 0)
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, files.length, true)
  view.setUint16(10, files.length, true)
  view.setUint32(12, centralLength, true)
  view.setUint32(16, offset, true)
  return concat([...sections, ...central, end])
}

function crc32(input: Uint8Array) {
  let value = 0xffffffff
  for (const byte of input) {
    value ^= byte
    for (let index = 0; index < 8; index++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  parts.reduce((offset, part) => {
    output.set(part, offset)
    return offset + part.length
  }, 0)
  return output
}

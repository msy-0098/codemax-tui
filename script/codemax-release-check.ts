#!/usr/bin/env bun

import path from "path"

const directory = path.resolve(process.argv[2] ?? "")
const expected = ["CodeMax-x64.zip", "CodeMax-x64-baseline.zip", "CodeMax-Setup-x64.exe", "SHA256SUMS.txt"]
const files = (await Array.fromAsync(new Bun.Glob("*").scan({ cwd: directory, onlyFiles: true }))).sort()

for (const file of expected) {
  if (!files.includes(file)) throw new Error(`Missing release artifact: ${file}`)
}
for (const file of files) {
  if (!expected.includes(file)) throw new Error(`Unexpected release artifact: ${file}`)
}

const hashes = await Bun.file(path.join(directory, "SHA256SUMS.txt")).text()
const lines = hashes.trim().split(/\r?\n/).filter(Boolean)
if (lines.length !== 3) throw new Error("SHA256SUMS.txt must contain exactly three artifacts")
const hashFiles = lines.map((line) => line.split("  ").at(-1))
const sortedFiles = ["CodeMax-Setup-x64.exe", "CodeMax-x64.zip", "CodeMax-x64-baseline.zip"]
if (hashFiles.some((file, index) => file !== sortedFiles[index])) throw new Error("SHA256SUMS.txt must be sorted by filename")
for (const file of expected.slice(0, 3)) {
  const match = lines.find((line) => line.endsWith(`  ${file}`))
  if (!match?.match(/^[a-fA-F0-9]{64}  /)) throw new Error(`Missing valid SHA-256 for ${file}`)
  const hash = new Bun.CryptoHasher("sha256")
  hash.update(await Bun.file(path.join(directory, file)).arrayBuffer())
  if (!match.startsWith(hash.digest("hex"))) throw new Error(`SHA-256 mismatch for ${file}`)
}

for (const file of ["CodeMax-x64.zip", "CodeMax-x64-baseline.zip"]) {
  const names = zipNames(new Uint8Array(await Bun.file(path.join(directory, file)).arrayBuffer()))
  const allowed = ["LICENSE", "README.txt", "THIRD_PARTY_NOTICES.md", "codemax.exe"]
  if (names.length !== allowed.length || names.some((name, index) => name !== allowed[index])) throw new Error(`Unexpected ZIP members in ${file}`)
}

console.log(`CodeMax release checks passed: ${directory}`)

function zipNames(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder()
  const names: string[] = []
  for (let offset = 0; offset + 46 <= bytes.length; offset++) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue
    const length = view.getUint16(offset + 28, true)
    const extra = view.getUint16(offset + 30, true)
    const comment = view.getUint16(offset + 32, true)
    names.push(decoder.decode(bytes.slice(offset + 46, offset + 46 + length)))
    offset += 46 + length + extra + comment - 1
  }
  return names.sort()
}

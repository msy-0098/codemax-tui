#!/usr/bin/env bun

import path from "path"
import fs from "fs/promises"

const directory = path.resolve(import.meta.dir, "../assets/codemax")
const source = path.join(directory, "source.png")
const expected = "1DE08978615847895E1211650F3A1CEC5442471FC2F1499C685AC9EAF15B3124"
const check = process.argv.includes("--check")
const output = check ? await mktemp() : directory

const hasher = new Bun.CryptoHasher("sha256")
hasher.update(await Bun.file(source).arrayBuffer())
if (hasher.digest("hex").toUpperCase() !== expected) throw new Error("CodeMax source icon does not match the approved SHA-256")

const result = Bun.spawn(["python", path.join(import.meta.dir, "assemble-icon.py"), source, path.join(output, "codemax.png"), path.join(output, "codemax.ico")], {
  cwd: path.resolve(import.meta.dir, ".."),
  stdout: "pipe",
  stderr: "pipe",
})

if ((await result.exited) !== 0) throw new Error(`Unable to generate CodeMax icons: ${await new Response(result.stderr).text()}`)

if (check) {
  for (const name of ["codemax.png", "codemax.ico"]) {
    const generated = new Uint8Array(await Bun.file(path.join(output, name)).arrayBuffer())
    const committed = new Uint8Array(await Bun.file(path.join(directory, name)).arrayBuffer())
    if (generated.length !== committed.length || generated.some((value, index) => value !== committed[index])) {
      throw new Error(`Committed ${name} is not reproducible; run bun run script/generate-brand-assets.ts`)
    }
  }
}

async function mktemp() {
  const output = path.join(process.env.TEMP ?? process.env.TMP ?? ".", `codemax-assets-${crypto.randomUUID()}`)
  await fs.mkdir(output, { recursive: true })
  return output
}

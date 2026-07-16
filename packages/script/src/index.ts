import semver from "semver"
import path from "path"
import { resolveReleaseEnv } from "./release-env"

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = resolveReleaseEnv({
  CODEMAX_CHANNEL: process.env.CODEMAX_CHANNEL,
  CODEMAX_RELEASE: process.env.CODEMAX_RELEASE,
  CODEMAX_VERSION: process.env.CODEMAX_VERSION,
})

const bot = ["actions-user", "codemax", "codemax-agent[bot]"]
const teamPath = path.resolve(import.meta.dir, "../../../.github/TEAM_MEMBERS")
const team = [
  ...(await Bun.file(teamPath)
    .text()
    .then((x) => x.split(/\r?\n/).map((x) => x.trim()))
    .then((x) => x.filter((x) => x && !x.startsWith("#")))),
  ...bot,
]

export const Script = {
  get channel() {
    return env.channel
  },
  get version() {
    return env.version
  },
  get preview() {
    return env.preview
  },
  get release(): boolean {
    return env.release
  },
  get team() {
    return team
  },
}
console.log(`CodeMax script`, JSON.stringify(Script, null, 2))

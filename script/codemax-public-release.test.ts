import { expect, test } from "bun:test"
import path from "path"

test("publishes an immediately public GitHub release and mirrors it to Gitee", async () => {
  const workflow = await Bun.file(path.resolve(import.meta.dir, "../.github/workflows/codemax-release.yml")).text()

  expect(workflow).toContain("name: CodeMax public release")
  expect(workflow).toContain("contents: write")
  expect(workflow).toContain("codemax-public-release")
  expect(workflow).toContain("gh api repos/$GITHUB_REPOSITORY --jq .private")
  expect(workflow).toContain('gh release create "codemax-v${tag}" release/* --title "CodeMax ${tag}" --generate-notes')
  expect(workflow).toContain('bun script/codemax-gitee-release.ts release "codemax-v${tag}"')
  expect(workflow).not.toContain("--draft")
  expect(workflow).not.toContain("codemax-private-release")
})

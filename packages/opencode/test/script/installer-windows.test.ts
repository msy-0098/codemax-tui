import { describe, expect, test } from "bun:test"
import path from "path"

const packageDir = path.resolve(import.meta.dir, "../..")

describe("CodeMax Windows installer", () => {
  test("selects the user PATH task by default and removes only its own entry", async () => {
    const installer = await Bun.file(path.join(packageDir, "installer/windows/codemax.iss")).text()

    expect(installer).toContain('Name: "addtopath"; Description: "Add CodeMax to the user PATH"; Flags: checked')
    expect(installer).toContain("RegWriteStringValue(HKCU, EnvironmentKey, PathName, Existing)")
    expect(installer).toContain("if PathContains(Existing, ExpandConstant('{app}')) then exit")
    expect(installer).toContain("procedure RemoveUserPath;")
    expect(installer).toContain("StringChangeEx(Existing, Needle + ';', '', True)")
  })
})

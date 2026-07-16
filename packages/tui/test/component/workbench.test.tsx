/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { WorkbenchFooter, WorkbenchHeader, WorkbenchSidebar } from "../../src/component/workbench"

test("renders the dual-column CodeMax workbench metadata", async () => {
  const app = await testRender(
    () => (
      <box width={120} height={20} flexDirection="column">
        <WorkbenchHeader mode="dual" agent="Build" model="GPT-5" project="CodeMax-TUI" />
        <box height={8}>
          <WorkbenchSidebar
            files={["packages/tui/src/routes/session/index.tsx"]}
            sessions={["Implement responsive workbench"]}
          >
            <text>Plugin panel</text>
          </WorkbenchSidebar>
        </box>
        <WorkbenchFooter mode="dual" language="中文" context="42%" branch="workbench" connected />
      </box>
    ),
    { width: 120, height: 20 },
  )

  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    expect(frame).toContain("CodeMax")
    expect(frame).toContain("Build")
    expect(frame).toContain("GPT-5")
    expect(frame).toContain("CodeMax-TUI")
    expect(frame).toContain("Modified Files")
    expect(frame).toContain("Recent Sessions")
    expect(frame).toContain("中文")
    expect(frame).toContain("42%")
    expect(frame).toContain("workbench")
  } finally {
    app.renderer.destroy()
  }
})

test("uses compact labels and hides nonessential footer fields below 80 columns", async () => {
  const app = await testRender(
    () => (
      <box width={79} height={4}>
        <WorkbenchHeader mode="compact" agent="Build" model="GPT-5" project="CodeMax-TUI" />
        <WorkbenchFooter mode="compact" language="中文" context="42%" branch="workbench" connected />
      </box>
    ),
    { width: 79, height: 4 },
  )

  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    expect(frame).toContain("CM")
    expect(frame).not.toContain("CodeMax-TUI")
    expect(frame).not.toContain("GPT-5")
    expect(frame).not.toContain("42%")
    expect(frame).not.toContain("workbench")
  } finally {
    app.renderer.destroy()
  }
})

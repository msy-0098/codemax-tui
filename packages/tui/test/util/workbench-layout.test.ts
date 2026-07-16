import { expect, test } from "bun:test"
import { resolveWorkbenchContentWidth, resolveWorkbenchLayout } from "../../src/util/workbench-layout"

test.each([
  [79, "compact", false],
  [80, "single", false],
  [119, "single", false],
  [120, "dual", true],
  [160, "dual", true],
] as const)("resolves width %i", (width, mode, sidebar) => {
  expect(resolveWorkbenchLayout(width)).toEqual({ mode, sidebar, sidebarWidth: sidebar ? 42 : 0 })
})

test("reserves the persistent sidebar without changing narrow content widths", () => {
  expect(resolveWorkbenchContentWidth(79)).toBe(75)
  expect(resolveWorkbenchContentWidth(80)).toBe(76)
  expect(resolveWorkbenchContentWidth(120)).toBe(74)
  expect(resolveWorkbenchContentWidth(160)).toBe(114)
})

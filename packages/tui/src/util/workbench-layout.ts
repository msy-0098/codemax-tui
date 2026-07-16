export type WorkbenchMode = "compact" | "single" | "dual"

export function resolveWorkbenchLayout(width: number) {
  if (width < 80) return { mode: "compact" as const, sidebar: false, sidebarWidth: 0 }
  if (width < 120) return { mode: "single" as const, sidebar: false, sidebarWidth: 0 }
  return { mode: "dual" as const, sidebar: true, sidebarWidth: 42 }
}

export function resolveWorkbenchContentWidth(width: number) {
  return Math.max(1, width - resolveWorkbenchLayout(width).sidebarWidth - 4)
}

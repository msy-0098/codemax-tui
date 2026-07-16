import type { WorkbenchMode } from "../../util/workbench-layout"

export function WorkbenchFooter(props: {
  mode: WorkbenchMode
  language: string
  context: string
  branch: string
  connected: boolean
}) {
  return (
    <box height={1} flexShrink={0} flexDirection="row" gap={2}>
      <text wrapMode="none">{props.language}</text>
      {props.mode !== "compact" && <text wrapMode="none">ctx {props.context}</text>}
      {props.mode !== "compact" && <text wrapMode="none">git {props.branch.slice(0, 24)}</text>}
      <text wrapMode="none">{props.connected ? "online" : "offline"}</text>
    </box>
  )
}

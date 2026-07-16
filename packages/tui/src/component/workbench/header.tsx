import type { WorkbenchMode } from "../../util/workbench-layout"

export function WorkbenchHeader(props: { mode: WorkbenchMode; agent: string; model: string; project: string }) {
  return (
    <box height={1} flexShrink={0} flexDirection="row" gap={2}>
      <text wrapMode="none">
        <b>{props.mode === "compact" ? "CM" : "CodeMax"}</b>
      </text>
      <text wrapMode="none">{props.agent.slice(0, props.mode === "compact" ? 18 : 24)}</text>
      {props.mode !== "compact" && <text wrapMode="none">{props.model.slice(0, 24)}</text>}
      {props.mode !== "compact" && <text wrapMode="none">{props.project.slice(0, 32)}</text>}
    </box>
  )
}

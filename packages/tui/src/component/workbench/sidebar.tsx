import { For, Show, type ParentProps } from "solid-js"
import type { RGBA } from "@opentui/core"

export function WorkbenchSidebar(
  props: ParentProps<{ files: string[]; sessions: string[]; overlay?: boolean; backgroundColor?: RGBA }>,
) {
  return (
    <box
      width={42}
      height="100%"
      flexDirection="column"
      flexShrink={0}
      paddingLeft={2}
      paddingRight={2}
      gap={1}
      backgroundColor={props.backgroundColor}
      position={props.overlay ? "absolute" : "relative"}
    >
      <box flexShrink={0}>
        <text wrapMode="none">
          <b>Modified Files</b>
        </text>
        <Show when={props.files.length > 0} fallback={<text wrapMode="none">No changes</text>}>
          <For each={props.files.slice(0, 5)}>{(file) => <text wrapMode="none">- {file.slice(0, 34)}</text>}</For>
        </Show>
      </box>
      <box flexShrink={0}>
        <text wrapMode="none">
          <b>Recent Sessions</b>
        </text>
        <For each={props.sessions.slice(0, 5)}>{(session) => <text wrapMode="none">- {session.slice(0, 34)}</text>}</For>
      </box>
      <box flexGrow={1}>{props.children}</box>
    </box>
  )
}

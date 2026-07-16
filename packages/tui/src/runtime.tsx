import path from "path"

export function abbreviateHome(input: string, home: string) {
  if (!home) return input
  const paths = input.includes("/") && home.includes("/") ? path.posix : path
  const relative = paths.relative(home, input)
  if (relative === "") return "~"
  if (relative === ".." || relative.startsWith(".." + paths.sep) || paths.isAbsolute(relative)) return input
  return "~" + paths.sep + relative
}

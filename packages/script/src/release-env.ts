export function resolveReleaseEnv(
  env: {
    CODEMAX_CHANNEL?: string
    CODEMAX_RELEASE?: string
    CODEMAX_VERSION?: string
  },
  now = new Date(),
) {
  const channel = env.CODEMAX_CHANNEL || "latest"
  const preview = channel !== "latest"

  if (!env.CODEMAX_VERSION && !preview) {
    throw new Error("CODEMAX_VERSION is required for a latest release")
  }

  return {
    channel,
    preview,
    release: env.CODEMAX_RELEASE === "1",
    version: env.CODEMAX_VERSION ?? `0.0.0-${channel}-${now.toISOString().slice(0, 16).replace(/[-:T]/g, "")}`,
  }
}

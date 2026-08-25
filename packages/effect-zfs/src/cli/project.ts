import type { ProjectAction } from "../args/index.js"
import { projectId } from "../schema/limits.js"

export type ParsedProjectRow = {
  readonly path: string
  readonly projectId: bigint
  readonly inherit: boolean
  readonly message?: string
}

const listRe = /^\s*(\d+)\s+([P-])\s+(.+)$/
const checkRe = /^(.+?) - (.+)$/

/** Parse `zfs project` list (`%5u %c path`) and check diagnostics. */
export const parseProjectStdout = (stdout: string, action: ProjectAction): ReadonlyArray<ParsedProjectRow> => {
  const trimmed = stdout.trim()
  if (trimmed.length === 0) return []
  const rows: Array<ParsedProjectRow> = []
  for (const line of trimmed.split(/\r?\n/)) {
    if (action === "list") {
      const match = listRe.exec(line)
      if (!match) continue
      rows.push({
        path: match[3] ?? "",
        projectId: projectId(BigInt(match[1] ?? "0")),
        inherit: match[2] === "P"
      })
      continue
    }
    if (action === "check") {
      const match = checkRe.exec(line)
      if (!match) continue
      rows.push({
        path: match[1] ?? "",
        projectId: projectId(0n),
        inherit: false,
        ...(match[2] === undefined ? {} : { message: match[2] })
      })
    }
  }
  return rows
}

export const projectArgv = (input: {
  readonly action: ProjectAction
  readonly paths: ReadonlyArray<string>
  readonly projectId?: bigint
  readonly recursive?: boolean
  readonly directoryOnly?: boolean
  readonly inherit?: boolean
  readonly keepId?: boolean
}): ReadonlyArray<string> => {
  const flags: Array<string> = ["project"]
  if (input.action === "clear") flags.push("-C")
  if (input.action === "check") flags.push("-c")
  if (input.action === "clear" && input.keepId === true) flags.push("-k")
  if (input.action === "set" && input.inherit === true) flags.push("-s")
  if (input.directoryOnly === true) flags.push("-d")
  if (input.recursive === true) flags.push("-r")
  if (input.projectId !== undefined && input.action !== "clear") {
    flags.push("-p", String(input.projectId))
  }
  for (const path of input.paths) {
    flags.push(path)
  }
  return flags
}

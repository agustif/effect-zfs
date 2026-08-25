import { byteCount } from "../schema/limits.js"

export type ParsedUserspaceRow = {
  readonly type: string
  readonly name: string
  readonly used: bigint
  readonly quota: bigint | "none"
  readonly objused?: bigint
  readonly objquota?: bigint | "none"
}

const parseQuota = (wire: string): bigint | "none" => {
  if (wire === "none" || wire === "-" || wire === "0") return "none"
  return byteCount(BigInt(wire))
}

/** Parse `zfs userspace -Hp -o type,name,used,quota,objused,objquota` rows. */
export const parseUserspaceStdout = (stdout: string): ReadonlyArray<ParsedUserspaceRow> => {
  const trimmed = stdout.trim()
  if (trimmed.length === 0) return []
  const rows: Array<ParsedUserspaceRow> = []
  for (const line of trimmed.split(/\r?\n/)) {
    const columns = line.split("\t")
    const type = columns[0]
    const name = columns[1]
    const usedWire = columns[2]
    const quotaWire = columns[3]
    if (type === undefined || name === undefined || usedWire === undefined || quotaWire === undefined) continue
    const objusedWire = columns[4]
    const objquotaWire = columns[5]
    rows.push({
      type,
      name,
      used: byteCount(BigInt(usedWire)),
      quota: parseQuota(quotaWire),
      ...(objusedWire === undefined ? {} : { objused: byteCount(BigInt(objusedWire)) }),
      ...(objquotaWire === undefined ? {} : { objquota: parseQuota(objquotaWire) })
    })
  }
  return rows
}

export const userspaceArgv = (
  subcommand: "userspace" | "groupspace" | "projectspace",
  input: {
    readonly name: string
    readonly numeric?: boolean
    readonly sidToPosix?: boolean
    readonly types?: ReadonlyArray<string>
  }
): ReadonlyArray<string> => {
  const flags: Array<string> = [subcommand, "-Hp", "-o", "type,name,used,quota,objused,objquota"]
  if (subcommand !== "projectspace") {
    if (input.numeric === true) flags.push("-n")
    if (input.sidToPosix === true) flags.push("-i")
    if (input.types !== undefined && input.types.length > 0) {
      flags.push("-t", input.types.join(","))
    }
  }
  flags.push(input.name)
  return flags
}

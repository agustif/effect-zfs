import { Schema } from "effect"

export class ZfsVersion extends Schema.Class<ZfsVersion>("effect-zfs/ZfsVersion")({
  major: Schema.Int,
  minor: Schema.Int,
  patch: Schema.Int,
  raw: Schema.String
}) {}

export const linux = {
  v2_2_2: { major: 2, minor: 2, patch: 2 } as const,
  v2_3_0: { major: 2, minor: 3, patch: 0 } as const
}

/** First Linux ZFS userspace this library supports (Ubuntu 24.04 LTS). */
export const minimumSupported = linux.v2_2_2

/** `zpool status -j` exists from OpenZFS 2.3. Linux 2.2.x uses text `status -p`. */
export const jsonStatusMinimum = linux.v2_3_0

export const releases = [linux.v2_2_2, linux.v2_3_0] as const

export const parseZfsVersionLine = (line: string): ZfsVersion => {
  const match = /zfs-(\d+)\.(\d+)\.(\d+)/.exec(line)
  if (!match) return new ZfsVersion({ major: 0, minor: 0, patch: 0, raw: line.trim() })
  return new ZfsVersion({
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: line.trim()
  })
}

export class ZfsVersionInfo extends Schema.Class<ZfsVersionInfo>("effect-zfs/ZfsVersionInfo")({
  userspace: ZfsVersion,
  kernel: Schema.optionalKey(ZfsVersion),
  raw: Schema.String
}) {}

export const parseZfsKmodLine = (line: string): ZfsVersion => {
  const match = /zfs-kmod-(\d+)\.(\d+)\.(\d+)/.exec(line)
  if (match) {
    return new ZfsVersion({
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      raw: line.trim()
    })
  }
  return parseZfsVersionLine(line)
}

/** Parse `zfs version` / `zpool version` text (and JSON when present). */
export const parseVersionOutput = (stdout: string): ZfsVersionInfo => {
  const raw = stdout.trim()
  if (raw.startsWith("{")) {
    const userland = /"userland"\s*:\s*"([^"]+)"/.exec(raw)?.[1]
    const kernelObj = /"kernel"\s*:\s*"([^"]+)"/.exec(raw)?.[1]
    const userspaceStr = /"zfs_version"\s*:\s*"([^"]+)"/.exec(raw)?.[1]
    const kernelStr = /"zfs_kmod_version"\s*:\s*"([^"]+)"/.exec(raw)?.[1]
    const userspace = parseZfsVersionLine(userland ?? userspaceStr ?? raw)
    const kernelRaw = kernelObj ?? kernelStr
    return new ZfsVersionInfo({
      userspace,
      raw,
      ...(kernelRaw === undefined ? {} : { kernel: parseZfsKmodLine(kernelRaw) })
    })
  }
  const lines = raw === "" ? [] : raw.split("\n")
  const userspace = parseZfsVersionLine(lines[0] ?? raw)
  const kmodLine = lines.find((line) => line.includes("kmod"))
  return new ZfsVersionInfo({
    userspace,
    raw,
    ...(kmodLine === undefined ? {} : { kernel: parseZfsKmodLine(kmodLine) })
  })
}

export const compare = (
  left: ZfsVersion,
  right: { readonly major: number; readonly minor: number; readonly patch: number }
) => {
  if (left.major !== right.major) return left.major - right.major
  if (left.minor !== right.minor) return left.minor - right.minor
  return left.patch - right.patch
}

export const atLeast = (
  version: ZfsVersion,
  minimum: { readonly major: number; readonly minor: number; readonly patch: number }
) => compare(version, minimum) >= 0

export const supportsJsonStatus = (version: ZfsVersion) => atLeast(version, jsonStatusMinimum)

export const featuresFor = (version: ZfsVersion) => ({
  jsonStatus: supportsJsonStatus(version)
})

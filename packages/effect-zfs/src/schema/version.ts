import { Schema } from "effect"
import {
  featureSince,
  linux,
  type LinuxRelease,
  linuxReleases,
  type ZfsFeatureName
} from "../generated/releases.generated.js"

export { featureSince, linux, type LinuxRelease, linuxReleases, type ZfsFeatureName }

export class ZfsVersion extends Schema.Class<ZfsVersion>("effect-zfs/ZfsVersion")({
  major: Schema.Int,
  minor: Schema.Int,
  patch: Schema.Int,
  raw: Schema.String
}) {}

export class ZfsFeatures extends Schema.Class<ZfsFeatures>("effect-zfs/ZfsFeatures")({
  datasetPrefetchProp: Schema.Boolean,
  jsonStatus: Schema.Boolean,
  jsonVersion: Schema.Boolean,
  raidzExpansion: Schema.Boolean,
  directIO: Schema.Boolean,
  longNames: Schema.Boolean,
  fastDedup: Schema.Boolean,
  allPoolsOps: Schema.Boolean,
  scrubTimeRange: Schema.Boolean,
  rewritePreserve: Schema.Boolean,
  prefetchBrt: Schema.Boolean,
  defaultQuotas: Schema.Boolean
}) {}

/** First Linux ZFS userspace this library supports (Ubuntu 24.04 LTS). */
export const minimumSupported = linux.v2_2_2

/** `zpool status -j` / `zfs version -j` exist from OpenZFS 2.3. */
export const jsonStatusMinimum = linux.v2_3_0

/** Dataset `prefetch` property. */
export const datasetPrefetchMinimum = linux.v2_2_4

/** `zpool scrub|trim|initialize -a`, scrub `-S/-E`, `zfs rewrite -P`, `prefetch -t brt`. */
export const allPoolsOpsMinimum = linux.v2_4_0

export const releases = linuxReleases

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
  left: ZfsVersion | { readonly major: number; readonly minor: number; readonly patch: number },
  right: { readonly major: number; readonly minor: number; readonly patch: number }
) => {
  if (left.major !== right.major) return left.major - right.major
  if (left.minor !== right.minor) return left.minor - right.minor
  return left.patch - right.patch
}

export const atLeast = (
  version: ZfsVersion | { readonly major: number; readonly minor: number; readonly patch: number },
  minimum: { readonly major: number; readonly minor: number; readonly patch: number }
) => compare(version, minimum) >= 0

export const supportsJsonStatus = (version: ZfsVersion) => atLeast(version, jsonStatusMinimum)

export const releaseFor = (
  version: ZfsVersion | { readonly major: number; readonly minor: number; readonly patch: number }
): LinuxRelease => {
  let match: LinuxRelease = linuxReleases[0]
  for (const row of linuxReleases) {
    if (compare(version, row) >= 0) match = row
    else break
  }
  return match
}

export const featuresFor = (
  version: ZfsVersion | { readonly major: number; readonly minor: number; readonly patch: number }
): ZfsFeatures => new ZfsFeatures(releaseFor(version).features)

export const propertyAvailable = (
  version: ZfsVersion | { readonly major: number; readonly minor: number; readonly patch: number },
  since: string | undefined
) => {
  if (since === undefined) return true
  const parsed = parseZfsVersionLine(`zfs-${since}`)
  if (parsed.major === 0) return true
  return atLeast(version, parsed)
}

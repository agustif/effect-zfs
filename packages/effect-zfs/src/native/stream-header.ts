import type { Receive } from "../args/index.js"
import { entityWhy } from "../schema/name.js"

/** `DMU_BACKUP_MAGIC` from `sys/dmu.h`. */
const dmuBackupMagic = 0x2f5bacbacn
const drrBegin = 0
const maxNameLen = 256
/** `sizeof(drr_type)+drr_payloadlen` + offset of `drr_toname` in `struct drr_begin`. */
const tonameOffset = 56
/** `sizeof(dmu_replay_record)` through `drr_begin.drr_toname`. */
export const beginRecordBytes = tonameOffset + maxNameLen
/** `DMU_BACKUP_FEATURE_RAW` in the feature-flags field of `drr_versioninfo`. */
const dmuBackupFeatureRaw = 1n << 24n

const u32 = (bytes: Uint8Array, offset: number): number =>
  bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)

const u64 = (bytes: Uint8Array, offset: number): bigint => {
  let value = 0n
  for (let i = 0; i < 8; i++) value |= BigInt(bytes[offset + i] ?? 0) << BigInt(i * 8)
  return value
}

const cString = (bytes: Uint8Array, offset: number, max: number): string => {
  let end = offset
  const stop = Math.min(bytes.length, offset + max)
  while (end < stop && bytes[end] !== 0) end++
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(offset, end))
}

export type SendBeginInfo =
  | { readonly status: "short" }
  | { readonly status: "invalid" }
  | { readonly status: "ok"; readonly toname: string; readonly raw: boolean }

/** Parse a `DRR_BEGIN` record at the start of a send stream. */
export const sendBeginInfo = (bytes: Uint8Array): SendBeginInfo => {
  if (bytes.byteLength < beginRecordBytes) return { status: "short" }
  if (u32(bytes, 0) !== drrBegin) return { status: "invalid" }
  const magic = u64(bytes, 8)
  if (magic !== dmuBackupMagic) return { status: "invalid" }
  const versioninfo = u64(bytes, 16)
  const features = versioninfo >> 2n
  const name = cString(bytes, tonameOffset, maxNameLen)
  if (name.length === 0) return { status: "invalid" }
  return { status: "ok", toname: name, raw: (features & dmuBackupFeatureRaw) !== 0n }
}

/** Parse `drr_toname` from a `DRR_BEGIN` record at the start of a send stream. */
export const tonameFromSendStream = (bytes: Uint8Array): string | undefined => {
  const info = sendBeginInfo(bytes)
  return info.status === "ok" ? info.toname : undefined
}

export const receiveSnapName = (input: Receive, toname: string): string => {
  const at = toname.lastIndexOf("@")
  const dataset = at >= 0 ? toname.slice(0, at) : toname
  const component = at >= 0 ? toname.slice(at + 1) : "recv"
  if (input.dest === "prefix") {
    const slash = dataset.indexOf("/")
    const rest = slash >= 0 ? dataset.slice(slash) : `/${dataset}`
    return `${input.target}${rest}@${component}`
  }
  if (input.dest === "tail") {
    const slash = dataset.lastIndexOf("/")
    const last = slash >= 0 ? dataset.slice(slash + 1) : dataset
    return `${input.target}/${last}@${component}`
  }
  return `${input.target}@${component}`
}

/** Kernel namecheck for a native receive destination derived from `drr_toname`. */
export const receiveSnapWhy = (name: string): string | undefined => entityWhy(name, "snapshot")

export const concatBytes = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  let size = 0
  for (const chunk of chunks) size += chunk.byteLength
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

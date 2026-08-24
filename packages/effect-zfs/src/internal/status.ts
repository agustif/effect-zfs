import { Schema } from "effect"
import type { PoolName } from "../Name.js"
import {
  JsonStatusCodec,
  PoolStatus,
  VdevStatus,
  poolHealthOf
} from "../Schemas.js"

export type ParsedPoolStatus = PoolStatus

const firstLineValue = (stdout: string, label: string) => {
  const match = new RegExp(`^\\s*${label}:\\s*(.*)$`, "m").exec(stdout)
  const value = match?.[1]?.trim()
  return value ? value : undefined
}

const countOf = (value: string | undefined): bigint | undefined => {
  if (value === undefined || value === "-" || value === "") return undefined
  try {
    return BigInt(value)
  } catch {
    return undefined
  }
}

const parseTextVdevLine = (line: string): { readonly indent: number; readonly node: VdevStatus } | undefined => {
  const indent = line.search(/\S/)
  if (indent < 0) return undefined
  const rest = line.trim()
  if (rest === "" || /^NAME\s+STATE/.test(rest)) return undefined
  const match = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(rest)
  if (match === null) {
    const name = rest.split(/\s+/)[0]
    if (name === undefined || name === "") return undefined
    return { indent, node: new VdevStatus({ name }) }
  }
  const name = match[1] ?? rest
  const state = poolHealthOf(match[2])
  const read = countOf(match[3])
  const write = countOf(match[4])
  const checksum = countOf(match[5])
  const errors = match[6]?.trim()
  return {
    indent,
    node: new VdevStatus({
      name,
      ...(state === undefined ? {} : { state }),
      ...(read === undefined ? {} : { read }),
      ...(write === undefined ? {} : { write }),
      ...(checksum === undefined ? {} : { checksum }),
      ...(errors === undefined || errors === "" ? {} : { errors })
    })
  }
}

/** Indent-based `zpool status` config tree. */
export const parseTextVdevTree = (lines: ReadonlyArray<string>): ReadonlyArray<VdevStatus> => {
  const roots: VdevStatus[] = []
  const stack: Array<{ readonly indent: number; readonly node: VdevStatus }> = []
  for (const line of lines) {
    const parsed = parseTextVdevLine(line)
    if (parsed === undefined) continue
    while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? -1) >= parsed.indent) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]
    if (parent === undefined) {
      roots.push(parsed.node)
    } else {
      const children = parent.node.children === undefined ? [] : [...parent.node.children]
      children.push(parsed.node)
      Object.assign(parent.node, { children })
    }
    stack.push(parsed)
  }
  return roots
}

const jsonCount = (value: unknown): bigint | undefined => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value)
  if (typeof value === "string") return countOf(value)
  return undefined
}

const jsonRecord = (value: unknown): { readonly [key: string]: unknown } | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as { readonly [key: string]: unknown }
}

const vdevFromJsonNode = (value: unknown): VdevStatus | undefined => {
  if (value instanceof VdevStatus) return value
  const row = jsonRecord(value)
  if (row === undefined) return undefined
  const name = typeof row.name === "string" && row.name !== ""
    ? row.name
    : typeof row.path === "string" && row.path !== ""
      ? row.path
      : undefined
  if (name === undefined) return undefined
  const state = typeof row.state === "string" ? poolHealthOf(row.state) : undefined
  const read = jsonCount(row.read_errors ?? row.read)
  const write = jsonCount(row.write_errors ?? row.write)
  const checksum = jsonCount(row.checksum_errors ?? row.checksum ?? row.cksum)
  const kind = typeof row.vdev_type === "string"
    ? row.vdev_type
    : typeof row.type === "string"
      ? row.type
      : undefined
  const nested = row.vdevs ?? row.children
  const children = vdevTreeFromUnknown(nested)
  return new VdevStatus({
    name,
    ...(state === undefined ? {} : { state }),
    ...(read === undefined ? {} : { read }),
    ...(write === undefined ? {} : { write }),
    ...(checksum === undefined ? {} : { checksum }),
    ...(kind === undefined ? {} : { kind }),
    ...(children.length === 0 ? {} : { children })
  })
}

export const vdevTreeFromUnknown = (value: unknown): ReadonlyArray<VdevStatus> => {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) {
    const out: VdevStatus[] = []
    for (const item of value) {
      if (typeof item === "string") {
        const parsed = parseTextVdevLine(item)
        if (parsed) out.push(parsed.node)
        continue
      }
      const node = vdevFromJsonNode(item)
      if (node) out.push(node)
    }
    return out
  }
  const record = jsonRecord(value)
  if (record === undefined) return []
  if (typeof record.name === "string") {
    const node = vdevFromJsonNode(record)
    return node === undefined ? [] : [node]
  }
  const out: VdevStatus[] = []
  for (const [key, child] of Object.entries(record)) {
    const node = vdevFromJsonNode(child) ?? vdevFromJsonNode({
      ...(jsonRecord(child) ?? {}),
      name: key
    })
    if (node) out.push(node)
  }
  return out
}

export const textStatusRecord = (stdout: string, name: string) => {
  const config: string[] = []
  let inConfig = false
  for (const line of stdout.split(/\r?\n/)) {
    if (/^\s*config:\s*$/.test(line)) {
      inConfig = true
      continue
    }
    if (/^\s*errors:\s*/.test(line)) {
      inConfig = false
      continue
    }
    if (inConfig) config.push(line)
  }
  const state = poolHealthOf(firstLineValue(stdout, "state")?.split(/\s+/)[0])
  const status = firstLineValue(stdout, "status")
  const action = firstLineValue(stdout, "action")
  const scan = firstLineValue(stdout, "scan")
  const tree = parseTextVdevTree(config)
  return {
    name,
    ...(state ? { state } : {}),
    ...(status ? { status } : {}),
    ...(action ? { action } : {}),
    ...(scan ? { scan: { summary: scan } } : {}),
    ...(tree.length === 0 ? {} : { config: tree }),
    raw: stdout
  }
}

export const parseStatusOutput = (stdout: string, name: PoolName): PoolStatus => {
  const trimmed = stdout.trim()
  if (trimmed.startsWith("{")) {
    const document = Schema.decodeUnknownSync(JsonStatusCodec)(trimmed)
    const pools = document.pools ?? {}
    const row = pools[name] ?? Object.values(pools)[0]
    const tree = vdevTreeFromUnknown(row?.vdevs ?? row?.config)
    const state = typeof row?.state === "string" ? poolHealthOf(row.state.split(/\s+/)[0]) : undefined
    return Schema.decodeUnknownSync(PoolStatus)({
      name,
      ...(state ? { state } : {}),
      ...(row?.status ? { status: row.status } : {}),
      ...(row?.action ? { action: row.action } : {}),
      ...(row?.scan !== undefined && row.scan !== null ? { scan: row.scan } : {}),
      ...(tree.length === 0 ? {} : { config: tree }),
      raw: document
    })
  }
  return Schema.decodeUnknownSync(PoolStatus)(textStatusRecord(stdout, name))
}

export const isUnsupportedStatusJsonFlag = (stderr: string) =>
  /invalid option/.test(stderr.toLowerCase())

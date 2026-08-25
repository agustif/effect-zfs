import fs from "node:fs/promises"
import { findCalls, isPropertyName, parseAccess, parseIndexTables, parseTargets, unquote } from "./c-parser.mjs"

const parseDefault = (token) => {
  const value = unquote(token)
  if (value === null) return null
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value
  return value
}

const inferCodec = (kind, values, valuesText) => {
  if (kind === "index") {
    const listed = values ?? []
    if (listed.length === 2 && listed.includes("on") && listed.includes("off")) return "boolean"
    return "enum"
  }
  if (kind === "number") {
    const text = typeof valuesText === "string" ? valuesText : ""
    if (/<size>/.test(text) && /\bnone\b/.test(text)) return "bytesOrNone"
    if (/<size>/.test(text)) return "bytes"
    if (/<percent>/.test(text)) return "integer"
    return "bigint"
  }
  return "string"
}

const publicTargets = (targets) => targets.filter((t) => t !== "vdev")

const MC_FIELDS = [
  ["size", "<size>"],
  ["capacity", "<percent>"],
  ["free", "<size>"],
  ["allocated", "<size>"],
  ["available", "<size>"],
  ["usable", "<size>"],
  ["used", "<size>"],
  ["expandsize", "<size>"],
  ["fragmentation", "<percent>"]
]

const pushProperty = (properties, patches, row) => {
  if (!isPropertyName(row.name)) return
  const targets = publicTargets(row.targets)
  if (targets.length === 0) return
  const patch = patches[row.name] ?? {}
  properties.push({
    ...row,
    targets,
    codec: patch.codec ?? inferCodec(row.kind, row.values, row.valuesText),
    ...patch
  })
}

export const extractProperties = (source, scope, patches = {}) => {
  const tables = parseIndexTables(source)
  const properties = []
  for (const call of findCalls(source)) {
    if (!call.name.startsWith("zprop_register_")) continue
    const kind = call.name.slice("zprop_register_".length)
    const a = call.args

    if (kind === "mc_props") {
      // Expand `zprop_register_mc_props(NORMAL, normal, sfeatures)` into the
      // class_* metaslab-class size properties the macro would register.
      const uclass = a[0]?.trim() ?? ""
      const lclass = a[1]?.trim() ?? ""
      if (!/^[A-Z][A-Z0-9_]*$/.test(uclass) || !/^[a-z][a-z0-9_]*$/.test(lclass)) continue
      for (const [field, valuesText] of MC_FIELDS) {
        pushProperty(properties, patches, {
          scope,
          symbol: `ZPOOL_MC_PROPS_${uclass}_${field}`,
          name: `class_${lclass}_${field}`,
          kind: "number",
          access: "readonly",
          targets: ["pool"],
          default: "0",
          valuesText,
          values: undefined,
          table: undefined,
          hidden: false
        })
      }
      continue
    }

    if (kind === "impl") {
      if (a.length < 8) continue
      const name = unquote(a[1])
      const propType = a[2]?.trim()
      const implKind = propType === "PROP_TYPE_STRING" ? "string" : propType === "PROP_TYPE_INDEX" ? "index" : "number"
      const table = a[4]?.trim()
      pushProperty(properties, patches, {
        scope,
        symbol: a[0].trim(),
        name,
        kind: implKind,
        access: parseAccess(a[5]),
        targets: parseTargets(a[6]),
        default: parseDefault(a[3]),
        valuesText: unquote(a[7]),
        values: implKind === "index" && table && table !== "NULL" ? tables.get(table) : undefined,
        table: implKind === "index" ? table : undefined,
        hidden: false
      })
      continue
    }

    if (!["string", "number", "index", "hidden"].includes(kind)) continue
    if (a.length < 6) continue
    const name = unquote(a[1])
    const table = kind === "index" ? a[7]?.trim() : undefined
    pushProperty(properties, patches, {
      scope,
      symbol: a[0].trim(),
      name,
      kind,
      access: parseAccess(a[3]),
      targets: parseTargets(a[4]),
      default: parseDefault(a[2]),
      valuesText: unquote(a[5]),
      values: kind === "index" && table ? tables.get(table) : undefined,
      table,
      hidden: kind === "hidden"
    })
  }
  return properties
}

/** Vdev properties live in `zpool_prop.c` `vdev_prop_init` (`ZFS_TYPE_VDEV`). */
export const extractVdevProperties = (source, patches = {}) => {
  const tables = parseIndexTables(source)
  const properties = []
  for (const call of findCalls(source)) {
    if (!call.name.startsWith("zprop_register_")) continue
    const kind = call.name.slice("zprop_register_".length)
    if (!["string", "number", "index", "hidden"].includes(kind)) continue
    const a = call.args
    if (a.length < 6) continue
    const targets = parseTargets(a[4])
    if (!targets.includes("vdev")) continue
    const name = unquote(a[1])
    if (!isPropertyName(name)) continue
    const table = kind === "index" ? a[7]?.trim() : undefined
    const values = kind === "index" && table ? tables.get(table) : undefined
    const valuesText = unquote(a[5])
    const patch = patches[name] ?? {}
    properties.push({
      scope: "vdev",
      symbol: a[0].trim(),
      name,
      kind,
      access: parseAccess(a[3]),
      targets: ["vdev"],
      default: parseDefault(a[2]),
      valuesText,
      values,
      table,
      hidden: kind === "hidden",
      codec: patch.codec ?? inferCodec(kind, values, valuesText),
      ...patch
    })
  }
  return properties
}

export const extractPropertyFiles = async ({ datasetPath, patchPath, poolPath }) => {
  const [datasetSource, poolSource, patchRaw] = await Promise.all([
    fs.readFile(datasetPath, "utf8"),
    fs.readFile(poolPath, "utf8"),
    fs.readFile(patchPath, "utf8")
  ])
  const patches = JSON.parse(patchRaw)
  return [
    ...extractProperties(datasetSource, "dataset", patches.dataset ?? {}),
    ...extractProperties(poolSource, "pool", patches.pool ?? {}),
    ...extractVdevProperties(poolSource, patches.vdev ?? {})
  ]
}

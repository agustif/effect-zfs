const trait = "effect.zfs#zfsProperty"
const errTrait = "effect.zfs#zfsError"
const opTrait = "effect.zfs#zfsOperation"

const identifier = (name) => name.replace(/[^A-Za-z0-9_$]/g, "_").replace(/^[0-9]/, "_$&")
const camel = (name) => name.replace(/[-_.]+(.)?/g, (_, c) => c ? c.toUpperCase() : "")
const q = JSON.stringify

const enumValues = (shape) =>
  Object.values(shape.members ?? {}).map((m) => m.traits?.["smithy.api#enumValue"]).filter((x) => typeof x === "string")

const typeFor = (meta, shape) => {
  switch (meta.codec) {
    case "boolean":
      return "boolean"
    case "integer":
      return "number"
    case "bytes":
      return "bigint"
    case "bigint":
      return "bigint"
    case "bytesOrNone":
      return "bigint | \"none\""
    case "enum": {
      const values = enumValues(shape)
      return values.length ? values.map(q).join(" | ") : "string"
    }
    default:
      return "string"
  }
}

const valueLiteral = (value) => value === undefined ? "undefined" : JSON.stringify(value)

const fieldSchema = (meta, shape) => {
  switch (meta.codec) {
    case "boolean":
      return "Schema.Boolean"
    case "integer":
      return "Schema.Number"
    case "bytes":
    case "bigint":
      return "Schema.BigInt"
    case "bytesOrNone":
      return "Schema.Union([Schema.Literals([\"none\"]), Schema.BigInt])"
    case "enum": {
      const values = enumValues(shape)
      return values.length ? `Schema.Literals([${values.map(q).join(", ")}])` : "Schema.String"
    }
    default:
      return "Schema.String"
  }
}

const emitBag = (className, selected) => {
  const fields = selected.map(({ meta, shape }) => {
    const key = identifier(camel(meta.name))
    return `  ${key}: Schema.optionalKey(${fieldSchema(meta, shape)}),`
  }).join("\n")
  return `export class ${className} extends Schema.Class<${className}>(${
    q("effect-zfs/" + className)
  })({\n${fields}\n}) {}\n`
}

export const emitProperties = (model) => {
  const rows = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[trait])
    .map(([shapeId, shape]) => ({ shapeId, shape, meta: shape.traits[trait] }))
    .filter((row) => row.meta.hidden !== true)
  const emitScope = (scope) =>
    rows.filter((r) => r.meta.scope === scope).map(({ meta, shape }) => {
      const type = typeFor(meta, shape)
      const key = identifier(camel(meta.name))
      const values = enumValues(shape)
      return `  ${key}: defineProperty<${q(meta.name)}, ${type}, ${meta.targets.map(q).join(" | ") || "never"}, ${
        q(meta.access)
      }>({\n` +
        `    name: ${q(meta.name)}, scope: ${q(meta.scope)}, access: ${q(meta.access)}, targets: ${
          JSON.stringify(meta.targets)
        }, codec: ${q(meta.codec)}, default: ${valueLiteral(meta.default)}${
          values.length ? `, values: ${JSON.stringify(values)}` : ""
        }${meta.since ? `, since: ${q(meta.since)}` : ""}\n` +
        `  }),`
    }).join("\n")
  const namesOf = (scope) => rows.filter((r) => r.meta.scope === scope).map(({ meta }) => meta.name)
  const emitNameArray = (ident, names) => `export const ${ident} = [${names.map(q).join(", ")}] as const\n`
  const dataset = rows.filter((r) => r.meta.scope === "dataset")
  const pool = rows.filter((r) => r.meta.scope === "pool")
  const vdev = rows.filter((r) => r.meta.scope === "vdev")
  const hasTarget = (row, target) => (row.meta.targets ?? []).includes(target)
  const bags = [
    emitBag(
      "CreateFilesystemProperties",
      dataset.filter((r) => hasTarget(r, "filesystem") && r.meta.access !== "readonly")
    ),
    emitBag("CreateVolumeProperties", dataset.filter((r) => hasTarget(r, "volume") && r.meta.access !== "readonly")),
    emitBag(
      "WritableFilesystemProperties",
      dataset.filter((r) =>
        hasTarget(r, "filesystem") && (r.meta.access === "mutable" || r.meta.access === "inheritable")
      )
    ),
    emitBag(
      "WritableVolumeProperties",
      dataset.filter((r) => hasTarget(r, "volume") && (r.meta.access === "mutable" || r.meta.access === "inheritable"))
    ),
    emitBag("CreatePoolProperties", pool.filter((r) => r.meta.access !== "readonly")),
    emitBag(
      "WritablePoolProperties",
      pool.filter((r) => r.meta.access === "mutable" || r.meta.access === "inheritable")
    ),
    emitBag(
      "WritableVdevProperties",
      vdev.filter((r) => r.meta.access === "mutable" || r.meta.access === "inheritable")
    )
  ].join("\n")
  return `// AUTO-GENERATED. DO NOT EDIT.\nimport { Schema } from "effect"\nimport { defineProperty } from "../schema/property.js"\n\nexport const DatasetProperty = {\n${
    emitScope("dataset")
  }\n} as const\n\nexport const PoolProperty = {\n${emitScope("pool")}\n} as const\n\nexport const VdevProperty = {\n${
    emitScope("vdev")
  }\n} as const\n\n${emitNameArray("datasetPropertyNames", namesOf("dataset"))}\n${
    emitNameArray("poolPropertyNames", namesOf("pool"))
  }\n${emitNameArray("vdevPropertyNames", namesOf("vdev"))}\n${bags}`
}

export const emitErrors = (model) => {
  const rows = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[errTrait])
    .map(([shapeId, shape]) => ({ name: shapeId.split("#")[1], meta: shape.traits[errTrait] }))
    .sort((a, b) => a.meta.value - b.meta.value)
  return `// AUTO-GENERATED. DO NOT EDIT.\nimport { Schema } from "effect"\n\n${
    rows.map(({ meta, name }) =>
      `export class ${name} extends Schema.TaggedError<${name}>()(${q(name)}, {\n  code: Schema.Literal(${
        q(meta.code)
      }),\n  operation: Schema.String,\n  message: Schema.String,\n  stderr: Schema.optionalKey(Schema.String)\n}) {}`
    ).join("\n\n")
  }\n\nexport const errorCodeToTag = {\n${
    rows.map(({ meta, name }) => `  ${q(meta.code)}: ${q(name)},`).join("\n")
  }\n} as const\n\nexport const errorValueToCode: { readonly [value: number]: string } = {\n${
    rows.map(({ meta }) => `  ${meta.value}: ${q(meta.code)},`).join("\n")
  }\n}\n`
}

const schemaModels = new Set(["PoolStatus", "PropertyGetRow"])
const schemaVersion = new Set(["ZfsVersionInfo"])

const tsRef = (name) => {
  if (name === undefined) return "unknown"
  if (name === "void") return "void"
  if (name === "boolean") return "boolean"
  if (name.startsWith("ReadonlyArray<")) return `ReadonlyArray<${tsRef(name.slice("ReadonlyArray<".length, -1))}>`
  if (name.startsWith("Stream<")) {
    const inner = name.slice("Stream<".length, -1)
    return inner === "Uint8Array" ? "Stream.Stream<Uint8Array>" : `Stream.Stream<${tsRef(inner)}>`
  }
  if (schemaModels.has(name)) return name
  if (schemaVersion.has(name)) return name
  return `Args.${name}`
}

export const emitOperations = (model) => {
  const ops = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[opTrait])
    .map(([, shape]) => {
      const meta = shape.traits[opTrait]
      return {
        id: meta.id,
        errors: (shape.errors ?? []).map((e) => e.target.split("#")[1]),
        since: meta.since ?? "2.2.2",
        input: meta.input,
        output: meta.output,
        native: meta.native
      }
    })
  const allErrors = [...new Set(ops.flatMap((o) => o.errors))].sort()
  const shapes = Object.fromEntries(ops.map((o) => [o.id, {
    since: o.since,
    ...(o.input === undefined ? {} : { input: o.input }),
    ...(o.output === undefined ? {} : { output: o.output }),
    ...(o.native === undefined ? {} : { native: o.native })
  }]))
  const usesStream = ops.some((o) => typeof o.output === "string" && o.output.startsWith("Stream<"))
  const inputEntries = ops.map((o) => `  ${q(o.id)}: ${tsRef(o.input)}`).join("\n")
  const outputEntries = ops.map((o) => `  ${q(o.id)}: ${tsRef(o.output)}`).join("\n")
  const nativeObj = Object.fromEntries(ops.filter((o) => o.native).map((o) => [o.id, o.native]))
  return `// AUTO-GENERATED. DO NOT EDIT.\n` +
    `import type { ${allErrors.join(", ")} } from "./errors.generated.js"\n` +
    `import type { UnknownZfsError } from "../errors/classify.js"\n` +
    `import type { ZfsTransportError } from "../protocol/process.js"\n` +
    `import type * as Args from "../args/index.js"\n` +
    `import type { PoolStatus, PropertyGetRow } from "../schema/models.js"\n` +
    `import type { ZfsVersionInfo } from "../schema/version.js"\n` +
    (usesStream ? `import type { Stream } from "effect"\n` : "") +
    `\n${
      ops.map((o) => {
        const typeName = identifier(o.id) + "Error"
        const variants = [...o.errors.map((e) => e), "UnknownZfsError", "ZfsTransportError"]
        return `export type ${typeName} = ${[...new Set(variants)].join(" | ")}\n`
      }).join("\n")
    }` +
    `\nexport const OperationErrorTags = ${
      JSON.stringify(Object.fromEntries(ops.map((o) => [o.id, o.errors])), null, 2)
    } as const\n\n` +
    `export const OperationShapes = ${JSON.stringify(shapes, null, 2)} as const\n\n` +
    `export const OperationNative = ${JSON.stringify(nativeObj, null, 2)} as const\n\n` +
    `export type OperationInput = {\n${inputEntries}\n}\n\n` +
    `export type OperationOutput = {\n${outputEntries}\n}\n`
}

const parseTag = (tag) => {
  const match = /^zfs-(\d+)\.(\d+)\.(\d+)$/.exec(tag)
  if (!match) throw new Error(`invalid OpenZFS tag: ${tag}`)
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
}

const compareTriple = (left, right) => {
  if (left.major !== right.major) return left.major - right.major
  if (left.minor !== right.minor) return left.minor - right.minor
  return left.patch - right.patch
}

const featuresAt = (featureSince, version) =>
  Object.fromEntries(
    Object.entries(featureSince).map(([name, since]) => [
      name,
      compareTriple(version, parseTag(`zfs-${since}`)) >= 0
    ])
  )

export const emitReleases = (catalog) => {
  const releases = catalog.releases.map((row) => {
    const version = parseTag(row.tag)
    return {
      ...version,
      tag: row.tag,
      sha: row.sha,
      series: `${version.major}.${version.minor}`,
      ubuntu: row.ubuntu ?? [],
      ...(row.guest === undefined ? {} : { guest: row.guest }),
      features: featuresAt(catalog.featureSince, version)
    }
  })
  const linuxMembers = releases.map((row) =>
    `  v${row.major}_${row.minor}_${row.patch}: { major: ${row.major}, minor: ${row.minor}, patch: ${row.patch} } as const`
  ).join(",\n")
  return `// AUTO-GENERATED. DO NOT EDIT.\n` +
    `export const featureSince = ${JSON.stringify(catalog.featureSince, null, 2)} as const\n\n` +
    `export const linux = {\n${linuxMembers}\n} as const\n\n` +
    `export const linuxReleases = ${JSON.stringify(releases, null, 2)} as const\n\n` +
    `export type LinuxRelease = (typeof linuxReleases)[number]\n` +
    `export type LinuxTag = LinuxRelease["tag"]\n` +
    `export type ZfsFeatureName = keyof typeof featureSince\n`
}

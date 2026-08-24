const trait = "effect.zfs#zfsProperty"
const errTrait = "effect.zfs#zfsError"
const opTrait = "effect.zfs#zfsOperation"

const identifier = (name) => name.replace(/[^A-Za-z0-9_$]/g, "_").replace(/^[0-9]/, "_$&")
const camel = (name) => name.replace(/[-_.]+(.)?/g, (_, c) => c ? c.toUpperCase() : "")
const q = JSON.stringify

const enumValues = (shape) => Object.values(shape.members ?? {}).map((m) => m.traits?.["smithy.api#enumValue"]).filter((x) => typeof x === "string")

const typeFor = (meta, shape) => {
  switch (meta.codec) {
    case "boolean": return "boolean"
    case "integer": return "number"
    case "bytes": return "bigint"
    case "bigint": return "bigint"
    case "bytesOrNone": return 'bigint | "none"'
    case "enum": {
      const values = enumValues(shape)
      return values.length ? values.map(q).join(" | ") : "string"
    }
    default: return "string"
  }
}

const valueLiteral = (value) => value === undefined ? "undefined" : JSON.stringify(value)

export const emitProperties = (model) => {
  const rows = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[trait])
    .map(([shapeId, shape]) => ({ shapeId, shape, meta: shape.traits[trait] }))
    .filter((row) => row.meta.hidden !== true)
  const emitScope = (scope) => rows.filter((r) => r.meta.scope === scope).map(({ shape, meta }) => {
    const type = typeFor(meta, shape)
    const key = identifier(camel(meta.name))
    const values = enumValues(shape)
    return `  ${key}: defineProperty<${q(meta.name)}, ${type}, ${meta.targets.map(q).join(" | ") || "never"}, ${q(meta.access)}>({\n` +
      `    name: ${q(meta.name)}, scope: ${q(meta.scope)}, access: ${q(meta.access)}, targets: ${JSON.stringify(meta.targets)}, codec: ${q(meta.codec)}, default: ${valueLiteral(meta.default)}${values.length ? `, values: ${JSON.stringify(values)}` : ""}\n` +
      `  }),`
  }).join("\n")
  const namesOf = (scope) => rows.filter((r) => r.meta.scope === scope).map(({ meta }) => meta.name)
  const emitNameArray = (ident, names) => `export const ${ident} = [${names.map(q).join(", ")}] as const\n`
  return `// AUTO-GENERATED. DO NOT EDIT.\nimport { defineProperty } from "../Property.js"\n\nexport const DatasetProperty = {\n${emitScope("dataset")}\n} as const\n\nexport const PoolProperty = {\n${emitScope("pool")}\n} as const\n\nexport const VdevProperty = {\n${emitScope("vdev")}\n} as const\n\n${emitNameArray("datasetPropertyNames", namesOf("dataset"))}\n${emitNameArray("poolPropertyNames", namesOf("pool"))}\n${emitNameArray("vdevPropertyNames", namesOf("vdev"))}`
}

export const emitErrors = (model) => {
  const rows = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[errTrait])
    .map(([shapeId, shape]) => ({ name: shapeId.split("#")[1], meta: shape.traits[errTrait] }))
    .sort((a, b) => a.meta.value - b.meta.value)
  return `// AUTO-GENERATED. DO NOT EDIT.\nimport { Schema } from "effect"\n\n${rows.map(({ name, meta }) => `export class ${name} extends Schema.TaggedError<${name}>()(${q(name)}, {\n  code: Schema.Literal(${q(meta.code)}),\n  operation: Schema.String,\n  message: Schema.String,\n  stderr: Schema.optionalKey(Schema.String)\n}) {}`).join("\n\n")}\n\nexport const errorCodeToTag = {\n${rows.map(({ name, meta }) => `  ${q(meta.code)}: ${q(name)},`).join("\n")}\n} as const\n\nexport const errorValueToCode: { readonly [value: number]: string } = {\n${rows.map(({ meta }) => `  ${meta.value}: ${q(meta.code)},`).join("\n")}\n}\n`
}

export const emitOperations = (model) => {
  const ops = Object.entries(model.shapes)
    .filter(([, shape]) => shape.traits?.[opTrait])
    .map(([, shape]) => ({ id: shape.traits[opTrait].id, errors: (shape.errors ?? []).map((e) => e.target.split("#")[1]) }))
  const allErrors = [...new Set(ops.flatMap((o) => o.errors))].sort()
  return `// AUTO-GENERATED. DO NOT EDIT.\nimport type { ${allErrors.join(", ")} } from "./errors.generated.js"\nimport type { UnknownZfsError } from "../Error.js"\nimport type { ZfsTransportError } from "../Process.js"\n\n${ops.map((o) => {
    const typeName = identifier(o.id) + "Error"
    const variants = [...o.errors.map((e) => e), "UnknownZfsError", "ZfsTransportError"]
    return `export type ${typeName} = ${[...new Set(variants)].join(" | ")}\n`
  }).join("\n")}\nexport const OperationErrorTags = ${JSON.stringify(Object.fromEntries(ops.map((o) => [o.id, o.errors])), null, 2)} as const\n`
}

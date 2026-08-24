const ns = "effect.zfs"
const id = (name) => `${ns}#${name}`

const enumMembers = (values) => Object.fromEntries(values.map((v, i) => [
  v.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "") || `VALUE_${i}`,
  { target: "smithy.api#String", traits: { "smithy.api#enumValue": v } }
]))

export const buildSmithy = ({ properties, errors, operations, source }) => {
  const shapes = {}
  for (const p of properties) {
    const shapeName = `${p.scope === "pool" ? "Pool" : p.scope === "vdev" ? "Vdev" : "Dataset"}Property_${p.name.replace(/[^A-Za-z0-9]/g, "_")}`
    const traits = {
      [id("zfsProperty")]: {
        name: p.name,
        scope: p.scope,
        access: p.access,
        targets: p.targets,
        codec: p.codec,
        default: p.default,
        valuesText: p.valuesText,
        hidden: p.hidden === true
      }
    }
    if (p.codec === "enum" && p.values?.length) {
      shapes[id(shapeName)] = { type: "enum", members: enumMembers(p.values), traits }
    } else {
      shapes[id(shapeName)] = { type: "string", traits }
    }
  }
  for (const e of errors) {
    if (!e.tag || e.code === "EZFS_SUCCESS") continue
    shapes[id(e.tag)] = {
      type: "structure",
      members: {
        code: { target: "smithy.api#String" },
        operation: { target: "smithy.api#String" },
        message: { target: "smithy.api#String" }
      },
      traits: {
        "smithy.api#error": "client",
        [id("zfsError")]: { code: e.code, value: e.value }
      }
    }
  }
  for (const op of operations) {
    const name = op.id.replace(/[^A-Za-z0-9]/g, "_")
    shapes[id(name)] = {
      type: "operation",
      errors: op.errors.filter((e) => shapes[id(e)]).map((e) => ({ target: id(e) })),
      traits: { [id("zfsOperation")]: { id: op.id } }
    }
  }
  return {
    smithy: "2.0",
    metadata: {
      generatedBy: "@effect-zfs/codegen",
      upstream: source,
      note: "Normalized OpenZFS model. Custom effect.zfs traits are consumed by effect-zfs codegen."
    },
    shapes
  }
}

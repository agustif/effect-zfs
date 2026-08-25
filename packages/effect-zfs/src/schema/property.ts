import { Schema } from "effect"
import { type DatasetKind, PropertyGetRow, propertyValueCodec } from "./models.js"

export type PoolKind = "pool"
export type VdevKind = "vdev"
export type PropertyAccess = "readonly" | "inheritable" | "mutable" | "setOnce"
export type PropertyCodec = "boolean" | "integer" | "bytes" | "bytesOrNone" | "enum" | "string" | "bigint"

export interface PropertyDefinition<
  Name extends string,
  Value,
  Target extends DatasetKind | PoolKind | VdevKind,
  Access extends PropertyAccess
> {
  readonly name: Name
  readonly scope: "dataset" | "pool" | "vdev"
  readonly access: Access
  readonly targets: ReadonlyArray<Target>
  readonly codec: PropertyCodec
  readonly schema: Schema.Codec<Value, string>
  readonly default: unknown
  readonly values?: ReadonlyArray<string>
  /** First Linux OpenZFS userspace that registers this property (`2.2.4`, `2.3.0`, …). */
  readonly since?: string
  readonly "~Value"?: Value
  readonly "~Target"?: Target
}

export const defineProperty = <
  const Name extends string,
  Value,
  Target extends DatasetKind | PoolKind | VdevKind,
  Access extends PropertyAccess
>(
  definition: Omit<PropertyDefinition<Name, Value, Target, Access>, "~Value" | "~Target" | "schema">
): PropertyDefinition<Name, Value, Target, Access> => ({
  ...definition,
  schema: propertyValueCodec(definition.codec, definition.values) as Schema.Codec<Value, string>
})

export type PropertyValue<P> = P extends PropertyDefinition<any, infer A, any, any> ? A : never
export type PropertyTarget<P> = P extends PropertyDefinition<any, any, infer K, any> ? K : never
export type PropertyAccessOf<P> = P extends PropertyDefinition<any, any, any, infer A> ? A : never
export type PropertyName<P> = P extends PropertyDefinition<infer N, any, any, any> ? N : never

export interface ResolvedProperty<A> {
  readonly value: A
  readonly source: string
  readonly received?: A
}

export const codecFor = <Value>(
  property: PropertyDefinition<string, Value, any, any>
): Schema.Codec<Value, string> => property.schema

export const encodePropertyValue = (
  property: PropertyDefinition<string, any, any, any>,
  value: unknown
): string => Schema.encodeUnknownSync(property.schema)(value)

export const decodePropertyValue = (
  property: PropertyDefinition<string, any, any, any>,
  value: string
): unknown => Schema.decodeUnknownSync(property.schema)(value)

const wireNameIndex = new WeakMap<object, Map<string, PropertyDefinition<string, any, any, any>>>()

export const propertyByWireName = (
  table: { readonly [key: string]: PropertyDefinition<string, any, any, any> },
  name: string
): PropertyDefinition<string, any, any, any> | undefined => {
  let index = wireNameIndex.get(table)
  if (index === undefined) {
    index = new Map()
    for (const property of Object.values(table)) {
      index.set(property.name, property)
    }
    wireNameIndex.set(table, index)
  }
  return index.get(name)
}

export const withDecodedPropertyRow = (
  row: PropertyGetRow,
  table: { readonly [key: string]: PropertyDefinition<string, any, any, any> }
): PropertyGetRow => {
  const property = propertyByWireName(table, row.property)
  if (property === undefined) return row
  try {
    return new PropertyGetRow({
      name: row.name,
      property: row.property,
      value: row.value,
      source: row.source,
      decoded: decodePropertyValue(property, row.value),
      ...(row.received === undefined ? {} : { received: row.received })
    })
  } catch {
    return row
  }
}

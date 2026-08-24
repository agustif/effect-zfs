import { Schema } from "effect"
import { propertyValueCodec } from "./Schemas.js"

export type DatasetKind = "filesystem" | "volume" | "snapshot" | "bookmark"
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
  readonly targets: readonly Target[]
  readonly codec: PropertyCodec
  readonly schema: Schema.Codec<Value, string>
  readonly default: unknown
  readonly values?: readonly string[]
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

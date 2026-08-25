import { Schema } from "effect"
import type { ZfsTransportError } from "../protocol/process.js"

/**
 * libzfs_errno() / lzc failure. A napi addon reports EZFS_* by `code` and/or
 * numeric `errno`. `layerFrom` maps that to generated tagged errors; it never
 * parses CLI stderr or argv.
 */
export class NativeFailure extends Schema.TaggedError<NativeFailure>()("NativeFailure", {
  operation: Schema.String,
  code: Schema.optionalKey(Schema.String),
  errno: Schema.optionalKey(Schema.Int),
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect())
}) {}

export type NativeFailureOrTransport = NativeFailure | ZfsTransportError

import type { Effect, Schema } from "effect"
import type { UnknownZfsError } from "../errors/classify.js"
import type { CommandResult } from "../protocol/process.js"
import { decodeCodec } from "../schema/decode.js"

export { decodeCodec, decodeNameArg, decodePropertyArg } from "../schema/decode.js"

export const decodeCli = <A, Encoded>(
  operation: string,
  result: CommandResult,
  codec: Schema.Codec<A, Encoded>,
  input: unknown = result.stdout
): Effect.Effect<A, UnknownZfsError> =>
  decodeCodec(operation, codec, input, {
    command: result.command,
    exitCode: result.exitCode,
    stdout: result.stdout
  })

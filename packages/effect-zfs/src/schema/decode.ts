import { Effect, Schema } from "effect"
import { UnknownZfsError } from "../errors/classify.js"
import { InvalidName, InvalidProperty } from "../generated/errors.generated.js"
import type { CommandResult } from "../protocol/process.js"

export const decodeCodec = <A, Encoded>(
  operation: string,
  codec: Schema.Codec<A, Encoded>,
  input: unknown,
  extras?: {
    readonly command?: CommandResult["command"]
    readonly exitCode?: number
    readonly stdout?: string
  }
): Effect.Effect<A, UnknownZfsError> =>
  Schema.decodeUnknownEffect(codec)(input).pipe(
    Effect.catchTag("SchemaError", (error) =>
      new UnknownZfsError({
        operation,
        stderr: error.message,
        ...(extras?.command ? { command: extras.command } : {}),
        ...(extras?.exitCode !== undefined ? { exitCode: extras.exitCode } : {}),
        ...(extras?.stdout !== undefined ? { stdout: extras.stdout } : {})
      }))
  )

export const decodeNameArg = <A, Encoded>(
  operation: string,
  codec: Schema.Codec<A, Encoded>,
  input: unknown
): Effect.Effect<A, InvalidName> =>
  decodeCodec(operation, codec, input).pipe(
    Effect.mapError((error) =>
      new InvalidName({
        code: "EZFS_INVALIDNAME",
        operation,
        message: error.stderr
      })
    )
  )

export const decodePropertyArg = <A, Encoded>(
  operation: string,
  codec: Schema.Codec<A, Encoded>,
  input: unknown
): Effect.Effect<A, InvalidProperty> =>
  decodeCodec(operation, codec, input).pipe(
    Effect.mapError((error) =>
      new InvalidProperty({
        code: "EZFS_BADPROP",
        operation,
        message: error.stderr
      })
    )
  )

import type { Effect, Stream } from "effect"
import { Context, Schema } from "effect"

export const ZfsBinary = Schema.Literals(["zfs", "zpool", "zfsbootenv", "zinject"])
export type ZfsBinary = typeof ZfsBinary.Type

export class ZfsCommand extends Schema.Class<ZfsCommand>("effect-zfs/ZfsCommand")({
  binary: ZfsBinary,
  args: Schema.Array(Schema.String)
}) {}

export class CommandResult extends Schema.Class<CommandResult>("effect-zfs/CommandResult")({
  command: ZfsCommand,
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number
}) {}

export class ZfsTransportError extends Schema.TaggedError<ZfsTransportError>()("ZfsTransportError", {
  operation: Schema.String,
  command: Schema.optionalKey(ZfsCommand),
  cause: Schema.Defect()
}) {}

export class ZfsCommandFailure extends Schema.TaggedError<ZfsCommandFailure>()("ZfsCommandFailure", {
  command: ZfsCommand,
  stderr: Schema.String,
  exitCode: Schema.Number
}) {}

export const command = (binary: ZfsBinary, ...args: Array<string>): ZfsCommand => new ZfsCommand({ binary, args })

/**
 * CLI-only process transport. Native interpreters implement `ZfsProtocol`
 * operations and must not depend on argv.
 */
export class ZfsProcess extends Context.Service<ZfsProcess, {
  readonly run: (command: ZfsCommand) => Effect.Effect<CommandResult, ZfsTransportError>
  readonly stream: (command: ZfsCommand) => Stream.Stream<Uint8Array, ZfsTransportError | ZfsCommandFailure>
  readonly runWithInput: <E>(
    command: ZfsCommand,
    input: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<CommandResult, ZfsTransportError | E>
}>()("effect-zfs/ZfsProcess") {}

import { Effect, Stream } from "effect"
import { classifyCliError } from "../Error.js"
import { ZfsProcess, type ZfsCommand } from "../Process.js"

export const runCommand = (process: ZfsProcess["Service"]) =>
  Effect.fn("Zfs.runCommand")(function*(operation: string, command: ZfsCommand) {
    const result = yield* process.run(command)
    if (result.exitCode !== 0) {
      return yield* classifyCliError(operation, result)
    }
    return result
  })

export const runCommandWithInput = (process: ZfsProcess["Service"]) =>
  Effect.fn("Zfs.runCommandWithInput")(function*<E>(
    operation: string,
    command: ZfsCommand,
    input: Stream.Stream<Uint8Array, E>
  ) {
    const result = yield* process.runWithInput(command, input)
    if (result.exitCode !== 0) {
      return yield* classifyCliError(operation, result)
    }
    return result
  })

export const execute = Effect.fn("Zfs.execute")(function*(operation: string, command: ZfsCommand) {
  const process = yield* ZfsProcess
  return yield* runCommand(process)(operation, command)
})

export const executeWithInput = Effect.fn("Zfs.executeWithInput")(function*<E>(
  operation: string,
  command: ZfsCommand,
  input: Stream.Stream<Uint8Array, E>
) {
  const process = yield* ZfsProcess
  return yield* runCommandWithInput(process)(operation, command, input)
})

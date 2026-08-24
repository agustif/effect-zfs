import { Data, Effect, Fiber, Layer, Schema, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import {
  ClearPool,
  Cache,
  Clone,
  CreateFilesystem,
  CreatePool,
  CreateSnapshot,
  CreateVolume,
  DataVdev,
  DatasetListItem,
  Disk,
  Draid,
  File,
  SnapshotListItem,
  Destroy,
  DestroyPool,
  EncodedProperty,
  GetProperty,
  Hold,
  InheritProperty,
  InitializePool,
  ListDatasets,
  ListHolds,
  ListSnapshots,
  Log,
  Mirror,
  MountFilesystem,
  PoolListItem,
  Promote,
  Rename,
  Raidz,
  Rollback,
  Spare,
  encodePropertyAssignment,
  AbortReceive,
  Allow,
  AllowListing,
  Unallow,
  ListAllow,
  Userspace,
  UserspaceRow,
  Project,
  ProjectRow,
  BookmarkListItem,
  CreateBookmark,
  DestroyBookmark,
  GetBookmarkProps,
  ListBookmarks,
  Receive,
  Release,
  ReopenPool,
  Resilver,
  Scrub,
  Send,
  SendProgress,
  SendSpaceEstimate,
  SetProperty,
  SnapshotHold,
  ShareFilesystem,
  StatusPool,
  SyncPool,
  TrimPool,
  UnmountFilesystem,
  UnshareFilesystem,
  CheckpointPool,
  ExportPool,
  ImportPool,
  LabelClear,
  ReguidPool,
  UpgradePool,
  Bootenv,
  ChannelProgram,
  ChannelProgramResult,
  Condense,
  DdtPrune,
  Diff,
  GetBootenv,
  parseBootenvPairs,
  parseDiffOutput,
  Redact,
  SetBootenv,
  WaitFilesystem,
  WaitPool,
  WaitResult,
  Zone,
  LoadKey,
  UnloadKey,
  ChangeKey,
  wrappingKeyToCliBytes,
  keyFormatFromProperties,
  Events,
  EventsClear,
  EventsSeek,
  History,
  Iostat,
  Prefetch,
  AddVdevs,
  AttachVdev,
  DetachVdev,
  encodeVdevs,
  OfflineVdevs,
  OnlineVdevs,
  RemoveVdevs,
  ReplaceVdev,
  SplitPool,
  Exists,
  GetVdevProperty,
  ListPools,
  SetVdevProperty,
  SnaprangeSpace,
  UpgradeDataset
} from "./Args.js"
import { classifyCliError, UnknownZfsError } from "./Error.js"
import { parseVersionOutput } from "./Version.js"
import { inheritFlags, parseAllowStdout, whoArgv } from "./internal/allow.js"
import { decodeCli } from "./internal/decode.js"
import { parseProjectStdout, projectArgv } from "./internal/project.js"
import { parseUserspaceStdout, userspaceArgv } from "./internal/quota.js"
import { isUnsupportedStatusJsonFlag, textStatusRecord, vdevTreeFromUnknown } from "./internal/status.js"
import {
  eventsFromLines,
  historyFromLines,
  iostatFromLines,
  parseEventsCleared
} from "./internal/observe.js"
import {
  CommandResult,
  ZfsCommandFailure,
  ZfsProcess,
  ZfsTransportError,
  command,
  type ZfsCommand
} from "./Process.js"
import { ZfsProtocol } from "./Protocol.js"
import {
  BookmarkListTuple,
  DatasetKind,
  HoldsListTuple,
  JsonStatusCodec,
  Lines,
  PoolListTuple,
  PoolStatus,
  PropertyGetFromColumns,
  TabSeparated,
  UInt64FromString,
  poolHealthOf
} from "./Schemas.js"
import { ByteCount } from "./Limits.js"
import { BookmarkName, DatasetName, SnapshotName } from "./Name.js"

const collect = (stream: Stream.Stream<Uint8Array, unknown>) =>
  stream.pipe(Stream.decodeText(), Stream.mkString)

const makeCommand = (cmd: ZfsCommand, stdin: "ignore" | "pipe" = "ignore") =>
  ChildProcess.make(cmd.binary, [...cmd.args], {
    stdin,
    extendEnv: true
  })

class InputStreamFailure<E> extends Data.TaggedError("InputStreamFailure")<{
  readonly error: E
}> {}

const transport = (operation: string, cmd: ZfsCommand, cause: unknown) =>
  new ZfsTransportError({ operation, command: cmd, cause })

const propertyFlags = (properties: ReadonlyArray<EncodedProperty>) => {
  const out: string[] = []
  for (const property of properties) {
    out.push("-o", encodePropertyAssignment(property))
  }
  return out
}

const filesystemPropertyFlags = (properties: ReadonlyArray<EncodedProperty>) => {
  const out: string[] = []
  for (const property of properties) {
    out.push("-O", encodePropertyAssignment(property))
  }
  return out
}

const leafPath = (leaf: File | Disk): string => leaf.path

const encodeLeaves = (leaves: ReadonlyArray<File | Disk>): string[] =>
  leaves.map(leafPath)

const encodeDataVdev = (vdev: DataVdev): string[] => {
  switch (vdev._tag) {
    case "File":
    case "Disk":
      return [vdev.path]
    case "Mirror":
      return ["mirror", ...encodeLeaves(vdev.children)]
    case "Raidz":
      return [`raidz${vdev.parity}`, ...encodeLeaves(vdev.children)]
    case "Draid": {
      let keyword = `draid${vdev.parity}`
      if (vdev.data !== undefined) keyword += `:${vdev.data}d`
      if (vdev.nchildren !== undefined) keyword += `:${vdev.nchildren}c`
      if (vdev.spares !== undefined) keyword += `:${vdev.spares}s`
      return [keyword, ...encodeLeaves(vdev.children)]
    }
  }
}

const encodeLogChild = (child: File | Disk | Mirror): string[] => {
  switch (child._tag) {
    case "File":
    case "Disk":
      return [child.path]
    case "Mirror":
      return ["mirror", ...encodeLeaves(child.children)]
  }
}

const encodeTopology = (input: CreatePool): string[] => {
  const out: string[] = []
  for (const vdev of input.vdevs) {
    out.push(...encodeDataVdev(vdev))
  }
  if (input.log !== undefined) {
    out.push("log", ...input.log.children.flatMap(encodeLogChild))
  }
  if (input.cache !== undefined) {
    out.push("cache", ...encodeLeaves(input.cache.children))
  }
  if (input.spare !== undefined) {
    out.push("spare", ...encodeLeaves(input.spare.children))
  }
  return out
}

/** `zfs receive` argv including the subcommand. Native must not parse this. */
export const receiveArgv = (input: Receive): string[] => {
  const out: string[] = ["receive"]
  if (input.heal === true) out.push("-c")
  if (input.dest === "prefix") out.push("-d")
  if (input.dest === "tail") out.push("-e")
  if (input.force === true) out.push("-F")
  if (input.skipHolds === true) out.push("-h")
  if (input.forceUnmount === true) out.push("-M")
  if (input.dryRun === true) out.push("-n")
  if (input.origin !== undefined) out.push("-o", `origin=${input.origin}`)
  if (input.properties !== undefined) {
    for (const property of input.properties) {
      out.push("-o", encodePropertyAssignment(property))
    }
  }
  if (input.resumable === true) out.push("-s")
  if (input.unmounted === true) out.push("-u")
  if (input.verbose === true) out.push("-v")
  if (input.exclude !== undefined) {
    for (const name of input.exclude) {
      out.push("-x", name)
    }
  }
  out.push(input.target)
  return out
}

/** `zfs receive -A` argv including the subcommand. */
export const abortReceiveArgv = (input: AbortReceive): string[] =>
  ["receive", "-A", input.target]

const hasLzcSendFlag = (
  flags: ReadonlyArray<"large-block" | "embed" | "compress" | "raw"> | undefined,
  name: "large-block" | "embed" | "compress" | "raw"
): boolean => {
  if (flags === undefined) return false
  for (const flag of flags) {
    if (flag === name) return true
  }
  return false
}

const parseSendSpaceSize = (stdout: string): string | undefined => {
  const lines = stdout.trim() === "" ? [] : stdout.trim().split("\n")
  for (let i = lines.length - 1; i >= 0; i--) {
    const columns = (lines[i] ?? "").split("\t")
    if (columns[0] === "size" && columns[1] !== undefined && columns[1] !== "") {
      return columns[1]
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const columns = (lines[i] ?? "").split("\t")
    const kind = columns[0]
    if (kind === "full" || kind === "incremental") {
      const last = columns[columns.length - 1]
      if (last !== undefined && last !== "" && last !== kind) return last
    }
  }
  return undefined
}

/** `zfs send` argv including the subcommand. Native must not parse this. */
export const sendArgv = (
  input: Send,
  extras: { readonly dryRun?: boolean; readonly parsable?: boolean } = {}
): string[] => {
  const options = input.options
  const flags = options?.flags
  const args: string[] = ["send"]
  if (extras.dryRun === true || options?.dryRun === true) args.push("-n")
  if (extras.parsable === true || options?.parsable === true) args.push("-P")
  if (options?.progress === true) args.push("-v")
  if (options?.compressed === true || hasLzcSendFlag(flags, "compress")) args.push("-c")
  if (options?.properties === true) args.push("-p")
  if (options?.raw === true || hasLzcSendFlag(flags, "raw")) args.push("-w")
  if (hasLzcSendFlag(flags, "large-block")) args.push("-L")
  if (hasLzcSendFlag(flags, "embed")) args.push("-e")
  if (options?.holds === true) args.push("-h")
  if (options?.replicate === true) args.push("-R")
  if (options?.exclude !== undefined && options.exclude.length > 0) {
    args.push("-X", options.exclude.join(","))
  }
  if (options?.redact !== undefined) args.push("--redact", options.redact)
  if (options?.saved === true) args.push("--saved")
  if (options?.from !== undefined) {
    args.push(options.incremental === "intermediate" ? "-I" : "-i", options.from)
  }
  if (options?.resumeToken !== undefined) {
    args.push("-t", options.resumeToken)
    return args
  }
  if (options?.saved === true) {
    if (input.dataset !== undefined) args.push(input.dataset)
    else if (input.snapshot !== undefined) args.push(input.snapshot)
    return args
  }
  if (input.snapshot !== undefined) args.push(input.snapshot)
  else if (input.dataset !== undefined) args.push(input.dataset)
  return args
}

const argvDevices = (devices: ReadonlyArray<string> | undefined): string[] =>
  devices === undefined ? [] : [...devices]

const trimArgv = (input: TrimPool): string[] => [
  ...(input.secure === true ? ["-d"] : []),
  ...(input.wait === true ? ["-w"] : []),
  ...(input.rate === undefined ? [] : ["-r", String(input.rate)]),
  ...(input.command === "cancel" ? ["-c"] : []),
  ...(input.command === "suspend" ? ["-s"] : []),
  input.name,
  ...argvDevices(input.devices)
]

const initializeArgv = (input: InitializePool): string[] => [
  ...(input.command === "cancel" ? ["-c"] : []),
  ...(input.command === "suspend" ? ["-s"] : []),
  ...(input.command === "uninit" ? ["-u"] : []),
  ...(input.wait === true ? ["-w"] : []),
  input.name,
  ...argvDevices(input.devices)
]

const clearArgv = (input: ClearPool): string[] => [
  ...(input.dryRun === true ? ["-n"] : []),
  ...(input.rewind === true ? ["-F"] : []),
  input.name,
  ...argvDevices(input.devices)
]

const mountArgv = (input: MountFilesystem): string[] => [
  ...(input.overlay === true ? ["-O"] : []),
  ...(input.force === true ? ["-f"] : []),
  ...(input.loadKeys === true ? ["-l"] : []),
  ...(input.verbose === true ? ["-v"] : []),
  ...(input.options === undefined ? [] : ["-o", input.options]),
  ...(input.all === true ? ["-a"] : []),
  ...(input.recursive === true ? ["-R"] : []),
  ...(input.name === undefined ? [] : [input.name])
]

const unmountArgv = (input: UnmountFilesystem): string[] => [
  ...(input.force === true ? ["-f"] : []),
  ...(input.unloadKeys === true ? ["-u"] : []),
  ...(input.all === true ? ["-a"] : []),
  ...(input.target === undefined ? [] : [input.target])
]

const shareArgv = (input: ShareFilesystem): string[] => [
  ...(input.loadKeys === true ? ["-l"] : []),
  ...(input.all === true ? ["-a"] : []),
  ...(input.name === undefined ? [] : [input.name])
]

const unshareArgv = (input: UnshareFilesystem): string[] => [
  ...(input.all === true ? ["-a"] : []),
  ...(input.target === undefined ? [] : [input.target])
]

const scrubArgv = (input: Scrub): string[] => {
  if (input.command === "wait") return ["wait", "-t", "scrub", input.name]
  return [
    "scrub",
    ...(input.command === "pause" ? ["-p"] : []),
    ...(input.command === "stop" ? ["-s"] : []),
    input.name
  ]
}

const repeatFlag = (token: string, values: ReadonlyArray<string> | undefined): string[] => {
  if (values === undefined) return []
  const out: string[] = []
  for (const value of values) out.push(token, value)
  return out
}

const importArgv = (input: ImportPool): string[] => [
  ...repeatFlag("-d", input.searchDirs),
  ...(input.force === true ? ["-f"] : []),
  ...(input.unmounted === true ? ["-N"] : []),
  ...(input.missingLog === true ? ["-m"] : []),
  ...(input.destroyed === true ? ["-D"] : []),
  ...(input.temporary === true ? ["-t"] : []),
  ...(input.altroot === undefined ? [] : ["-R", input.altroot]),
  ...(input.rewindToCheckpoint === true ? ["--rewind-to-checkpoint"] : []),
  ...propertyFlags(input.properties ?? []),
  input.name,
  ...(input.newName === undefined ? [] : [input.newName])
]

export const processLayer: Layer.Layer<ZfsProcess, never, ChildProcessSpawner.ChildProcessSpawner> = Layer.effect(
  ZfsProcess,
  Effect.gen(function*() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

    const run = Effect.fn("ZfsProcess.run")(function*(cmd: ZfsCommand) {
      const handle = yield* spawner.spawn(makeCommand(cmd)).pipe(
        Effect.mapError((cause) => transport("ZfsProcess.run", cmd, cause))
      )
      const [stdout, stderr, exitCode] = yield* Effect.all([
        collect(handle.stdout),
        collect(handle.stderr),
        handle.exitCode
      ], { concurrency: 3 }).pipe(
        Effect.mapError((cause) => transport("ZfsProcess.run", cmd, cause))
      )
      return new CommandResult({ command: cmd, stdout, stderr, exitCode: Number(exitCode) })
    }, Effect.scoped)

    const runWithInput = Effect.fn("ZfsProcess.runWithInput")(function*<E>(
      cmd: ZfsCommand,
      input: Stream.Stream<Uint8Array, E>
    ) {
      const handle = yield* spawner.spawn(makeCommand(cmd, "pipe")).pipe(
        Effect.mapError((cause) => transport("ZfsProcess.runWithInput", cmd, cause))
      )
      const pump = Stream.run(
        input.pipe(Stream.mapError((error) => new InputStreamFailure({ error }))),
        handle.stdin
      ).pipe(
        Effect.mapError((cause) =>
          cause instanceof InputStreamFailure
            ? cause.error
            : transport("ZfsProcess.runWithInput", cmd, cause)
        )
      )
      const [stdout, stderr, exitCode] = yield* Effect.all([
        collect(handle.stdout).pipe(Effect.mapError((cause) => transport("ZfsProcess.runWithInput", cmd, cause))),
        collect(handle.stderr).pipe(Effect.mapError((cause) => transport("ZfsProcess.runWithInput", cmd, cause))),
        handle.exitCode.pipe(Effect.mapError((cause) => transport("ZfsProcess.runWithInput", cmd, cause))),
        pump
      ], { concurrency: 4 })
      return new CommandResult({ command: cmd, stdout, stderr, exitCode: Number(exitCode) })
    }, Effect.scoped)

    const stream = (cmd: ZfsCommand) => Stream.unwrap(
      Effect.gen(function*() {
        const handle = yield* spawner.spawn(makeCommand(cmd)).pipe(
          Effect.mapError((cause) => transport("ZfsProcess.stream", cmd, cause))
        )
        const stderrFiber = yield* collect(handle.stderr).pipe(
          Effect.mapError((cause) => transport("ZfsProcess.stream", cmd, cause)),
          Effect.forkScoped
        )
        const completion = Effect.gen(function*() {
          const [stderr, exitCode] = yield* Effect.all([
            Fiber.join(stderrFiber),
            handle.exitCode.pipe(Effect.mapError((cause) => transport("ZfsProcess.stream", cmd, cause)))
          ], { concurrency: 2 })
          if (Number(exitCode) !== 0) {
            return yield* new ZfsCommandFailure({
              command: cmd,
              stderr,
              exitCode: Number(exitCode)
            })
          }
        })
        const check = Stream.fromEffect(completion).pipe(
          Stream.filter((value): value is never => false)
        )
        return handle.stdout.pipe(
          Stream.mapError((cause) => transport("ZfsProcess.stream", cmd, cause)),
          Stream.concat(check)
        )
      })
    )

    return ZfsProcess.of({ run, runWithInput, stream })
  })
)

const runChecked = (process: ZfsProcess["Service"], operation: string, cmd: ZfsCommand) =>
  Effect.gen(function*() {
    const result = yield* process.run(cmd)
    if (result.exitCode !== 0) return yield* classifyCliError(operation, result)
    return result
  })

const runCheckedWithInput = <E>(
  process: ZfsProcess["Service"],
  operation: string,
  cmd: ZfsCommand,
  input: Stream.Stream<Uint8Array, E>
) =>
  Effect.gen(function*() {
    const result = yield* process.runWithInput(cmd, input)
    if (result.exitCode !== 0) return yield* classifyCliError(operation, result)
    return result
  })

const defaultListColumns: ReadonlyArray<string> = [
  "name",
  "type",
  "used",
  "available",
  "referenced",
  "mountpoint"
]

const listOutputColumns = (options?: ListDatasets): ReadonlyArray<string> => {
  const out: Array<string> = []
  const seen = new Set<string>()
  for (const column of defaultListColumns) {
    seen.add(column)
    out.push(column)
  }
  for (const column of options?.columns ?? []) {
    if (!seen.has(column)) {
      seen.add(column)
      out.push(column)
    }
  }
  return out
}

const listCommand = (options?: ListDatasets): ZfsCommand => {
  const flags: Array<string> = ["list", "-Hp"]
  if (options?.depth !== undefined) {
    flags.push("-d", String(options.depth))
  } else if (options?.recursive === true) {
    flags.push("-r")
  }
  if (options?.types !== undefined && options.types.length > 0) {
    flags.push("-t", options.types.join(","))
  }
  if (options?.sort !== undefined) {
    for (const item of options.sort) {
      flags.push(item.descending === true ? "-S" : "-s", item.property)
    }
  }
  flags.push("-o", listOutputColumns(options).join(","))
  if (options?.root !== undefined) {
    flags.push(options.root)
  }
  return command("zfs", ...flags)
}

const getCommand = (input: GetProperty): ZfsCommand => {
  const names: Array<string> = [input.name, ...(input.targets ?? [])]
  if (input.scope === "pool") {
    return command("zpool", "get", "-Hp", input.property, ...names)
  }
  const flags: Array<string> = ["get", "-Hp"]
  if (input.depth !== undefined) {
    flags.push("-d", String(input.depth))
  } else if (input.recursive === true) {
    flags.push("-r")
  }
  if (input.types !== undefined && input.types.length > 0) {
    flags.push("-t", input.types.join(","))
  }
  if (input.sources !== undefined && input.sources.length > 0) {
    flags.push("-s", input.sources.join(","))
  }
  flags.push("-o", "name,property,value,received,source", input.property, ...names)
  return command("zfs", ...flags)
}

const setCommand = (input: SetProperty): ZfsCommand => {
  const binary = input.scope === "pool" ? "zpool" : "zfs"
  const flags: Array<string> = ["set"]
  if (input.scope === "dataset" && input.unmounted === true) {
    flags.push("-u")
  }
  flags.push(`${input.property}=${input.value}`, input.name, ...(input.targets ?? []))
  return command(binary, ...flags)
}

const inheritCommand = (input: InheritProperty): ZfsCommand =>
  command(
    "zfs",
    "inherit",
    ...(input.recursive === true ? ["-r"] : []),
    ...(input.received === true ? ["-S"] : []),
    input.property,
    input.name,
    ...(input.targets ?? [])
  )

const optionalByteCount = (
  operation: string,
  result: CommandResult,
  raw: string | undefined
): Effect.Effect<ByteCount | undefined, UnknownZfsError> => {
  if (raw === undefined || raw === "" || raw === "-") {
    return Effect.succeed(undefined)
  }
  return decodeCli(operation, result, UInt64FromString, raw).pipe(
    Effect.flatMap((n) => decodeCli(operation, result, ByteCount, n))
  )
}

const parseListItem = (
  operation: string,
  result: CommandResult,
  columns: ReadonlyArray<string>,
  header: ReadonlyArray<string>
) =>
  Effect.gen(function*() {
    const nameRaw = columns[0]
    const kindRaw = columns[1]
    if (nameRaw === undefined || kindRaw === undefined) {
      return yield* new UnknownZfsError({
        operation,
        command: result.command,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: "zfs list row missing name or type"
      })
    }
    const kind = yield* decodeCli(operation, result, DatasetKind, kindRaw)
    const name = kind === "snapshot"
      ? yield* decodeCli(operation, result, SnapshotName, nameRaw)
      : kind === "bookmark"
        ? yield* decodeCli(operation, result, BookmarkName, nameRaw)
        : yield* decodeCli(operation, result, DatasetName, nameRaw)
    const at = (key: string): string | undefined => {
      const index = header.indexOf(key)
      return index >= 0 ? columns[index] : undefined
    }
    const used = yield* optionalByteCount(operation, result, at("used"))
    const available = yield* optionalByteCount(operation, result, at("available"))
    const referenced = yield* optionalByteCount(operation, result, at("referenced"))
    const mountpoint = at("mountpoint")
    const extra: { [key: string]: string } = {}
    for (let i = 0; i < header.length; i++) {
      const key = header[i]
      const value = columns[i]
      if (key === undefined || value === undefined) continue
      if (
        key === "name" ||
        key === "type" ||
        key === "used" ||
        key === "available" ||
        key === "referenced" ||
        key === "mountpoint"
      ) continue
      extra[key] = value
    }
    return new DatasetListItem({
      name,
      kind,
      ...(used === undefined ? {} : { used }),
      ...(available === undefined ? {} : { available }),
      ...(referenced === undefined ? {} : { referenced }),
      ...(mountpoint === undefined ? {} : { mountpoint }),
      ...(Object.keys(extra).length === 0 ? {} : { extra })
    })
  })

export const protocolLayer: Layer.Layer<ZfsProtocol, never, ZfsProcess> = Layer.effect(
  ZfsProtocol,
  Effect.gen(function*() {
    const process = yield* ZfsProcess

    const listDatasets = Effect.fn("ZfsProtocol.listDatasets")(function*(options?: ListDatasets) {
      const header = listOutputColumns(options)
      const result = yield* runChecked(process, "Dataset.List", listCommand(options))
      const lines = yield* decodeCli("Dataset.List", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Dataset.List", new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => parseListItem("Dataset.List", result, columns, header))
        )
      )
    })

    const getProperties = Effect.fn("ZfsProtocol.getProperties")(function*(input: GetProperty) {
      const operation = input.scope === "pool" ? "Pool.Get" : "Dataset.Get"
      const result = yield* runChecked(process, operation, getCommand(input))
      const lines = yield* decodeCli(operation, result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli(operation, new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => decodeCli(operation, result, PropertyGetFromColumns, columns))
        )
      )
    })

    const getProperty = Effect.fn("ZfsProtocol.getProperty")(function*(input: GetProperty) {
      const operation = input.scope === "pool" ? "Pool.Get" : "Dataset.Get"
      const rows = yield* getProperties(input)
      const row = rows[0]
      if (row === undefined) {
        return yield* new UnknownZfsError({
          operation,
          stderr: "zfs get produced no rows"
        })
      }
      return row
    })

    const setProperty = Effect.fn("ZfsProtocol.setProperty")(function*(input: SetProperty) {
      const operation = input.scope === "pool" ? "Pool.Set" : "Dataset.Set"
      yield* runChecked(process, operation, setCommand(input))
    })

    const inheritProperty = Effect.fn("ZfsProtocol.inheritProperty")(function*(input: InheritProperty) {
      yield* runChecked(process, "Dataset.Inherit", inheritCommand(input))
    })

    const createFilesystem = Effect.fn("ZfsProtocol.createFilesystem")(function*(input: CreateFilesystem) {
      const cmd = command(
        "zfs",
        "create",
        ...(input.dryRun === true ? ["-n"] : []),
        ...(input.parsable === true ? ["-P"] : []),
        ...(input.parents ? ["-p"] : []),
        ...(input.unmounted === true ? ["-u"] : []),
        ...(input.verbose === true ? ["-v"] : []),
        ...propertyFlags(input.properties),
        input.name
      )
      if (input.wrappingKey !== undefined) {
        yield* runCheckedWithInput(
          process,
          "Dataset.CreateFilesystem",
          cmd,
          Stream.make(wrappingKeyToCliBytes(input.wrappingKey, keyFormatFromProperties(input.properties)))
        )
      } else {
        yield* runChecked(process, "Dataset.CreateFilesystem", cmd)
      }
    })

    const createVolume = Effect.fn("ZfsProtocol.createVolume")(function*(input: CreateVolume) {
      const cmd = command(
        "zfs",
        "create",
        ...(input.dryRun === true ? ["-n"] : []),
        ...(input.parsable === true ? ["-P"] : []),
        ...(input.unmounted === true ? ["-u"] : []),
        ...(input.verbose === true ? ["-v"] : []),
        ...(input.sparse ? ["-s"] : []),
        ...(input.volblocksize === undefined ? [] : ["-b", String(input.volblocksize)]),
        ...propertyFlags(input.properties),
        "-V",
        String(input.size),
        input.name
      )
      if (input.wrappingKey !== undefined) {
        yield* runCheckedWithInput(
          process,
          "Dataset.CreateVolume",
          cmd,
          Stream.make(wrappingKeyToCliBytes(input.wrappingKey, keyFormatFromProperties(input.properties)))
        )
      } else {
        yield* runChecked(process, "Dataset.CreateVolume", cmd)
      }
    })

    const destroy = Effect.fn("ZfsProtocol.destroy")(function*(input: Destroy) {
      const operation = input.name.includes("#")
        ? "Bookmark.Destroy"
        : input.name.includes("@")
          ? "Snapshot.Destroy"
          : "Dataset.Destroy"
      yield* runChecked(process, operation, command(
        "zfs",
        "destroy",
        ...(input.dryRun === true ? ["-n"] : []),
        ...(input.parsable === true ? ["-p"] : []),
        ...(input.verbose === true ? ["-v"] : []),
        ...(input.descendants === true ? ["-R"] : []),
        ...(input.recursive ? ["-r"] : []),
        ...(input.force ? ["-f"] : []),
        ...(input.defer ? ["-d"] : []),
        input.name
      ))
    })

    const createSnapshot = Effect.fn("ZfsProtocol.createSnapshot")(function*(input: CreateSnapshot) {
      yield* runChecked(process, "Snapshot.Create", command(
        "zfs",
        "snapshot",
        ...(input.recursive ? ["-r"] : []),
        ...propertyFlags(input.properties ?? []),
        input.name,
        ...(input.snapshots ?? [])
      ))
    })

    const clone = Effect.fn("ZfsProtocol.clone")(function*(input: Clone) {
      yield* runChecked(process, "Snapshot.Clone", command(
        "zfs",
        "clone",
        ...(input.parents === true ? ["-p"] : []),
        ...propertyFlags(input.properties),
        input.snapshot,
        input.target
      ))
    })

    const listSnapshots = Effect.fn("ZfsProtocol.listSnapshots")(function*(options?: ListSnapshots) {
      const result = yield* runChecked(process, "Snapshot.List", command(
        "zfs",
        "list",
        "-t",
        "snapshot",
        "-Hp",
        ...(options?.recursive === true ? ["-r"] : []),
        "-o",
        "name",
        ...(options?.root ? [options.root] : [])
      ))
      const lines = yield* decodeCli("Snapshot.List", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Snapshot.List", result, SnapshotName, line).pipe(
          Effect.map((name) => new SnapshotListItem({ name }))
        )
      )
    })

    const rollback = Effect.fn("ZfsProtocol.rollback")(function*(input: Rollback) {
      yield* runChecked(process, "Snapshot.Rollback", command(
        "zfs",
        "rollback",
        ...(input.destroyClones === true ? ["-R"] : input.destroyRecent === true ? ["-r"] : []),
        ...(input.force === true ? ["-f"] : []),
        input.snapshot
      ))
    })

    const promote = Effect.fn("ZfsProtocol.promote")(function*(input: Promote) {
      yield* runChecked(process, "Snapshot.Promote", command("zfs", "promote", input.name))
    })

    const rename = Effect.fn("ZfsProtocol.rename")(function*(input: Rename) {
      const operation = input.from.includes("@") ? "Snapshot.Rename" : "Dataset.Rename"
      yield* runChecked(process, operation, command(
        "zfs",
        "rename",
        ...(input.force === true ? ["-f"] : []),
        ...(input.parents === true ? ["-p"] : []),
        ...(input.unmounted === true ? ["-u"] : []),
        ...(input.recursive === true ? ["-r"] : []),
        input.from,
        input.to
      ))
    })

    const listPools = Effect.fn("ZfsProtocol.listPools")(function*(options?: ListPools) {
      const header: Array<string> = ["name", "size", "free", "health"]
      if (options?.columns !== undefined) {
        for (const column of options.columns) {
          if (!header.includes(column)) header.push(column)
        }
      }
      const result = yield* runChecked(process, "Pool.List", command(
        "zpool",
        "list",
        "-Hp",
        "-o",
        header.join(","),
        ...(options?.name === undefined ? [] : [options.name])
      ))
      const lines = yield* decodeCli("Pool.List", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Pool.List", new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => {
            const core = columns.slice(0, 4)
            const extraEntries: Array<readonly [string, string]> = []
            for (let i = 4; i < header.length; i++) {
              const key = header[i]
              const value = columns[i]
              if (key !== undefined && value !== undefined) extraEntries.push([key, value])
            }
            const extra = extraEntries.length === 0 ? undefined : Object.fromEntries(extraEntries)
            return decodeCli("Pool.List", result, PoolListTuple, core).pipe(
              Effect.flatMap(([name, size, free, health]) =>
                decodeCli("Pool.List", result, PoolListItem, {
                  name,
                  size,
                  free,
                  health,
                  ...(extra === undefined ? {} : { extra })
                })
              )
            )
          })
        )
      )
    })

    const statusFrom = Effect.fn("ZfsProtocol.poolStatusFrom")(function*(name: string, args: readonly string[]) {
      const result = yield* runChecked(process, "Pool.Status", command("zpool", "status", ...args, name))
      if (args.includes("-j")) {
        const document = yield* decodeCli("Pool.Status", result, JsonStatusCodec)
        const pools = document.pools ?? {}
        const row = pools[name] ?? Object.values(pools)[0]
        const tree = vdevTreeFromUnknown(row?.vdevs ?? row?.config)
        const state = typeof row?.state === "string" ? poolHealthOf(row.state.split(/\s+/)[0]) : undefined
        return yield* decodeCli("Pool.Status", result, PoolStatus, {
          name,
          ...(state ? { state } : {}),
          ...(row?.status ? { status: row.status } : {}),
          ...(row?.action ? { action: row.action } : {}),
          ...(row?.scan !== undefined && row.scan !== null ? { scan: row.scan } : {}),
          ...(tree.length === 0 ? {} : { config: tree }),
          raw: document
        })
      }
      return yield* decodeCli("Pool.Status", result, PoolStatus, textStatusRecord(result.stdout, name))
    })

    const poolStatus = Effect.fn("ZfsProtocol.poolStatus")(function*(input: StatusPool) {
      return yield* statusFrom(input.name, ["-j", "-p"]).pipe(
        Effect.catchIf(
          (error) => error._tag === "UnknownZfsError" && isUnsupportedStatusJsonFlag(error.stderr),
          () => statusFrom(input.name, ["-p"])
        )
      )
    })

    const createPool = Effect.fn("ZfsProtocol.createPool")(function*(input: CreatePool) {
      yield* runChecked(process, "Pool.Create", command(
        "zpool",
        "create",
        ...(input.force === true ? ["-f"] : []),
        ...propertyFlags(input.properties),
        ...filesystemPropertyFlags(input.filesystemProperties),
        ...(input.mountpoint !== undefined ? ["-m", input.mountpoint] : []),
        input.name,
        ...encodeTopology(input)
      ))
    })

    const destroyPool = Effect.fn("ZfsProtocol.destroyPool")(function*(input: DestroyPool) {
      yield* runChecked(process, "Pool.Destroy", command(
        "zpool",
        "destroy",
        ...(input.force === true ? ["-f"] : []),
        input.name
      ))
    })

    const importPool = Effect.fn("ZfsProtocol.importPool")(function*(input: ImportPool) {
      yield* runChecked(process, "Pool.Import", command("zpool", "import", ...importArgv(input)))
    })

    const exportPool = Effect.fn("ZfsProtocol.exportPool")(function*(input: ExportPool) {
      yield* runChecked(process, "Pool.Export", command(
        "zpool",
        "export",
        ...(input.force === true ? ["-f"] : []),
        input.name
      ))
    })

    const reguidPool = Effect.fn("ZfsProtocol.reguidPool")(function*(input: ReguidPool) {
      yield* runChecked(process, "Pool.Reguid", command(
        "zpool",
        "reguid",
        ...(input.guid === undefined ? [] : ["-g", String(input.guid)]),
        input.name
      ))
    })

    const upgradePool = Effect.fn("ZfsProtocol.upgradePool")(function*(input: UpgradePool) {
      yield* runChecked(process, "Pool.Upgrade", command(
        "zpool",
        "upgrade",
        ...(input.version === undefined ? [] : ["-V", String(input.version)]),
        input.name
      ))
    })

    const labelClear = Effect.fn("ZfsProtocol.labelClear")(function*(input: LabelClear) {
      yield* runChecked(process, "Pool.LabelClear", command(
        "zpool",
        "labelclear",
        ...(input.force === true ? ["-f"] : []),
        input.device
      ))
    })

    const checkpointPool = Effect.fn("ZfsProtocol.checkpointPool")(function*(input: CheckpointPool) {
      yield* runChecked(process, "Pool.Checkpoint", command(
        "zpool",
        "checkpoint",
        ...(input.discard === true ? ["--discard"] : []),
        input.name
      ))
    })

    const send = (input: Send) =>
      process.stream(command("zfs", ...sendArgv(input))).pipe(
        Stream.mapError((error) =>
          error._tag === "ZfsCommandFailure"
            ? classifyCliError("Replication.Send", new CommandResult({
              command: error.command,
              stdout: "",
              stderr: error.stderr,
              exitCode: error.exitCode
            }))
            : error
        )
      )

    const sendSpace = Effect.fn("ZfsProtocol.sendSpace")(function*(input: Send) {
      const result = yield* runChecked(
        process,
        "Replication.SendSpace",
        command("zfs", ...sendArgv(input, { dryRun: true, parsable: true }))
      )
      const size = parseSendSpaceSize(result.stdout)
      if (size === undefined) {
        return yield* new UnknownZfsError({
          operation: "Replication.SendSpace",
          command: result.command,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr === "" ? "zfs send -nP produced no size line" : result.stderr
        })
      }
      const raw = yield* decodeCli("Replication.SendSpace", result, UInt64FromString, size)
      const bytes = yield* decodeCli("Replication.SendSpace", result, ByteCount, raw)
      return new SendSpaceEstimate({ bytes })
    })

    const sendProgress = Effect.fn("ZfsProtocol.sendProgress")(function*(_input: SendProgress) {
      return yield* new UnknownZfsError({
        operation: "Replication.SendProgress",
        stderr: "send progress query is not available via zfs(8); use native lzc_send_progress"
      })
    })

    const receive = Effect.fn("ZfsProtocol.receive")(function*<E>(
      input: Receive,
      stream: Stream.Stream<Uint8Array, E>
    ) {
      yield* runCheckedWithInput(
        process,
        "Replication.Receive",
        command("zfs", ...receiveArgv(input)),
        stream
      )
    })

    const abortReceive = Effect.fn("ZfsProtocol.abortReceive")(function*(input: AbortReceive) {
      yield* runChecked(process, "Replication.AbortReceive", command("zfs", ...abortReceiveArgv(input)))
    })

    const upgradeDataset = Effect.fn("ZfsProtocol.upgradeDataset")(function*(input: UpgradeDataset) {
      yield* runChecked(process, "Dataset.Upgrade", command(
        "zfs",
        "upgrade",
        ...(input.recursive === true ? ["-r"] : []),
        ...(input.version === undefined ? [] : ["-V", String(input.version)]),
        ...(input.all === true ? ["-a"] : []),
        ...(input.name === undefined ? [] : [input.name])
      ))
    })

    const exists = Effect.fn("ZfsProtocol.exists")(function*(input: Exists) {
      const result = yield* process.run(command("zfs", "list", "-H", "-o", "name", input.name))
      if (result.exitCode === 0) return true
      if (/does not exist|no such (pool|dataset)/i.test(result.stderr)) return false
      return yield* classifyCliError("Dataset.Exists", result)
    })

    const getVdevProperties = Effect.fn("ZfsProtocol.getVdevProperties")(function*(input: GetVdevProperty) {
      const result = yield* runChecked(process, "Pool.GetVdev", command(
        "zpool",
        "get",
        "-Hp",
        "-o",
        "name,property,value,source",
        input.property,
        input.pool,
        input.vdev
      ))
      const lines = yield* decodeCli("Pool.GetVdev", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Pool.GetVdev", new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => decodeCli("Pool.GetVdev", result, PropertyGetFromColumns, columns))
        )
      )
    })

    const getVdevProperty = Effect.fn("ZfsProtocol.getVdevProperty")(function*(input: GetVdevProperty) {
      const rows = yield* getVdevProperties(input)
      const row = rows[0]
      if (row === undefined) {
        return yield* new UnknownZfsError({
          operation: "Pool.GetVdev",
          stderr: "zpool get produced no vdev rows"
        })
      }
      return row
    })

    const setVdevProperty = Effect.fn("ZfsProtocol.setVdevProperty")(function*(input: SetVdevProperty) {
      yield* runChecked(process, "Pool.SetVdev", command(
        "zpool",
        "set",
        `${input.property}=${input.value}`,
        input.pool,
        input.vdev
      ))
    })

    const snaprangeSpace = Effect.fn("ZfsProtocol.snaprangeSpace")(function*(input: SnaprangeSpace) {
      const result = yield* runChecked(
        process,
        "Replication.SnaprangeSpace",
        command("zfs", "send", "-nP", "-i", input.first, input.last)
      )
      const size = parseSendSpaceSize(result.stdout)
      if (size === undefined) {
        return yield* new UnknownZfsError({
          operation: "Replication.SnaprangeSpace",
          command: result.command,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr === "" ? "zfs send -nP produced no size line" : result.stderr
        })
      }
      const raw = yield* decodeCli("Replication.SnaprangeSpace", result, UInt64FromString, size)
      const bytes = yield* decodeCli("Replication.SnaprangeSpace", result, ByteCount, raw)
      return new SendSpaceEstimate({ bytes })
    })

    const trimPool = Effect.fn("ZfsProtocol.trimPool")(function*(input: TrimPool) {
      yield* runChecked(process, "Pool.Trim", command("zpool", "trim", ...trimArgv(input)))
    })

    const initializePool = Effect.fn("ZfsProtocol.initializePool")(function*(input: InitializePool) {
      yield* runChecked(process, "Pool.Initialize", command("zpool", "initialize", ...initializeArgv(input)))
    })

    const clearPool = Effect.fn("ZfsProtocol.clearPool")(function*(input: ClearPool) {
      yield* runChecked(process, "Pool.Clear", command("zpool", "clear", ...clearArgv(input)))
    })

    const reopenPool = Effect.fn("ZfsProtocol.reopenPool")(function*(input: ReopenPool) {
      yield* runChecked(process, "Pool.Reopen", command(
        "zpool",
        "reopen",
        ...(input.noRestart === true ? ["-n"] : []),
        input.name
      ))
    })

    const syncPool = Effect.fn("ZfsProtocol.syncPool")(function*(input: SyncPool) {
      yield* runChecked(process, "Pool.Sync", command(
        "zpool",
        "sync",
        ...(input.force === true ? ["-f"] : []),
        input.name
      ))
    })

    const scrub = Effect.fn("ZfsProtocol.scrub")(function*(input: Scrub) {
      const argv = scrubArgv(input)
      const subcommand = argv[0] ?? "scrub"
      yield* runChecked(process, "Pool.Scrub", command("zpool", subcommand, ...argv.slice(1)))
    })

    const resilver = Effect.fn("ZfsProtocol.resilver")(function*(input: Resilver) {
      yield* runChecked(process, "Pool.Resilver", command("zpool", "resilver", input.name))
      if (input.wait === true) {
        yield* runChecked(process, "Pool.Resilver", command("zpool", "wait", "-t", "resilver", input.name))
      }
    })

    const hold = Effect.fn("ZfsProtocol.hold")(function*(input: Hold) {
      yield* runChecked(process, "Snapshot.Hold", command(
        "zfs",
        "hold",
        ...(input.recursive ? ["-r"] : []),
        input.tag,
        input.snapshot
      ))
    })

    const holds = Effect.fn("ZfsProtocol.holds")(function*(input: ListHolds) {
      const result = yield* runChecked(process, "Snapshot.Holds", command(
        "zfs",
        "holds",
        "-Hp",
        ...(input.recursive ? ["-r"] : []),
        input.snapshot
      ))
      const lines = yield* decodeCli("Snapshot.Holds", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Snapshot.Holds", new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => decodeCli("Snapshot.Holds", result, HoldsListTuple, columns)),
          Effect.map(([snapshot, tag, timestamp]) => new SnapshotHold({ snapshot, tag, timestamp }))
        )
      )
    })

    const release = Effect.fn("ZfsProtocol.release")(function*(input: Release) {
      yield* runChecked(process, "Snapshot.Release", command(
        "zfs",
        "release",
        ...(input.recursive ? ["-r"] : []),
        input.tag,
        input.snapshot
      ))
    })

    const createBookmark = Effect.fn("ZfsProtocol.createBookmark")(function*(input: CreateBookmark) {
      yield* runChecked(process, "Bookmark.Create", command("zfs", "bookmark", input.source, input.name))
    })

    const destroyBookmark = Effect.fn("ZfsProtocol.destroyBookmark")(function*(input: DestroyBookmark) {
      yield* runChecked(process, "Bookmark.Destroy", command("zfs", "destroy", input.name))
    })

    const listBookmarks = Effect.fn("ZfsProtocol.listBookmarks")(function*(options?: ListBookmarks) {
      const result = yield* runChecked(process, "Bookmark.List", command(
        "zfs",
        "list",
        "-t",
        "bookmark",
        "-Hp",
        ...(options?.recursive === true ? ["-r"] : []),
        "-o",
        "name,type",
        ...(options?.root ? [options.root] : [])
      ))
      const lines = yield* decodeCli("Bookmark.List", result, Lines)
      return yield* Effect.forEach(lines, (line) =>
        decodeCli("Bookmark.List", new CommandResult({ ...result, stdout: line }), TabSeparated).pipe(
          Effect.flatMap((columns) => decodeCli("Bookmark.List", result, BookmarkListTuple, columns)),
          Effect.map(([name]) => new BookmarkListItem({ name }))
        )
      )
    })

    const getBookmarkProps = Effect.fn("ZfsProtocol.getBookmarkProps")(function*(input: GetBookmarkProps) {
      const result = yield* runChecked(process, "Bookmark.Get", command(
        "zfs",
        "get",
        "-Hp",
        "-o",
        "name,property,value,source",
        input.property,
        input.name
      ))
      const columns = yield* decodeCli("Bookmark.Get", result, TabSeparated)
      return yield* decodeCli("Bookmark.Get", result, PropertyGetFromColumns, columns)
    })

    const mount = Effect.fn("ZfsProtocol.mount")(function*(input: MountFilesystem) {
      yield* runChecked(process, "Mount.Mount", command("zfs", "mount", ...mountArgv(input)))
    })

    const unmount = Effect.fn("ZfsProtocol.unmount")(function*(input: UnmountFilesystem) {
      yield* runChecked(process, "Mount.Unmount", command("zfs", "unmount", ...unmountArgv(input)))
    })

    const share = Effect.fn("ZfsProtocol.share")(function*(input: ShareFilesystem) {
      yield* runChecked(process, "Mount.Share", command("zfs", "share", ...shareArgv(input)))
    })

    const unshare = Effect.fn("ZfsProtocol.unshare")(function*(input: UnshareFilesystem) {
      yield* runChecked(process, "Mount.Unshare", command("zfs", "unshare", ...unshareArgv(input)))
    })

    const programArgv = (input: ChannelProgram, json: boolean): string[] => [
      "program",
      ...(json ? ["-j"] : []),
      ...(input.nosync === true ? ["-n"] : []),
      ...(input.instructionLimit === undefined ? [] : ["-t", String(input.instructionLimit)]),
      ...(input.memoryLimit === undefined ? [] : ["-m", String(input.memoryLimit)]),
      input.pool,
      "/dev/stdin",
      ...(input.argv ?? [])
    ]

    const channelProgramFrom = Effect.fn("ZfsProtocol.channelProgramFrom")(function*(input: ChannelProgram, json: boolean) {
      const result = yield* runCheckedWithInput(
        process,
        "Pool.Program",
        command("zfs", ...programArgv(input, json)),
        Stream.make(new TextEncoder().encode(input.program))
      )
      const trimmed = result.stdout.trim()
      if (json && trimmed.startsWith("{")) {
        const parsed = yield* decodeCli("Pool.Program", result, Schema.fromJsonString(Schema.Unknown), trimmed).pipe(
          Effect.orElseSucceed(() => undefined)
        )
        return new ChannelProgramResult({
          raw: result.stdout,
          ...(parsed === undefined ? {} : { json: parsed })
        })
      }
      return new ChannelProgramResult({ raw: result.stdout })
    })

    const channelProgram = Effect.fn("ZfsProtocol.channelProgram")(function*(input: ChannelProgram) {
      return yield* channelProgramFrom(input, true).pipe(
        Effect.catchIf(
          (error) => error._tag === "UnknownZfsError" && isUnsupportedStatusJsonFlag(error.stderr),
          () => channelProgramFrom(input, false)
        )
      )
    })

    const redact = Effect.fn("ZfsProtocol.redact")(function*(input: Redact) {
      yield* runChecked(process, "Snapshot.Redact", command(
        "zfs",
        "redact",
        input.snapshot,
        input.bookmark,
        ...input.snapshots
      ))
    })

    const waitFs = Effect.fn("ZfsProtocol.waitFs")(function*(input: WaitFilesystem) {
      yield* runChecked(process, "Dataset.Wait", command(
        "zfs",
        "wait",
        ...(input.activities === undefined ? [] : ["-t", input.activities.join(",")]),
        input.dataset
      ))
      return new WaitResult({})
    })

    const waitPool = Effect.fn("ZfsProtocol.waitPool")(function*(input: WaitPool) {
      yield* runChecked(process, "Pool.Wait", command(
        "zpool",
        "wait",
        ...(input.activities === undefined ? [] : ["-t", input.activities.join(",")]),
        input.pool
      ))
      return new WaitResult({})
    })

    const diff = Effect.fn("ZfsProtocol.diff")(function*(input: Diff) {
      const result = yield* runChecked(process, "Dataset.Diff", command(
        "zfs",
        "diff",
        "-H",
        ...(input.fileTypes === true ? ["-F"] : []),
        ...(input.timestamps === true ? ["-t"] : []),
        input.from,
        ...(input.to === undefined ? [] : [input.to])
      ))
      return parseDiffOutput(result.stdout, {
        ...(input.fileTypes === undefined ? {} : { fileTypes: input.fileTypes }),
        ...(input.timestamps === undefined ? {} : { timestamps: input.timestamps })
      })
    })

    const version = Effect.fn("ZfsProtocol.version")(function*() {
      const result = yield* runChecked(process, "Zfs.Version", command("zfs", "version"))
      return parseVersionOutput(result.stdout)
    })

    const zone = Effect.fn("ZfsProtocol.zone")(function*(input: Zone) {
      yield* runChecked(process, "Dataset.Zone", command("zfs", "zone", input.namespace, input.dataset))
    })

    const unzone = Effect.fn("ZfsProtocol.unzone")(function*(input: Zone) {
      yield* runChecked(process, "Dataset.Unzone", command("zfs", "unzone", input.namespace, input.dataset))
    })

    const getBootenv = Effect.fn("ZfsProtocol.getBootenv")(function*(input: GetBootenv) {
      const result = yield* runChecked(process, "Pool.GetBootenv", command("zfsbootenv", input.pool))
      return new Bootenv({
        pool: input.pool,
        raw: result.stdout,
        pairs: parseBootenvPairs(result.stdout)
      })
    })

    const setBootenv = Effect.fn("ZfsProtocol.setBootenv")(function*(input: SetBootenv) {
      yield* Effect.forEach(input.pairs, (pair) =>
        runChecked(process, "Pool.SetBootenv", command("zfsbootenv", "-k", pair.key, "-v", pair.value, input.pool)),
        { discard: true }
      )
    })

    const ddtPrune = Effect.fn("ZfsProtocol.ddtPrune")(function*(input: DdtPrune) {
      yield* runChecked(process, "Pool.DdtPrune", command(
        "zpool",
        "ddtprune",
        input.unit === "days" ? "-d" : "-p",
        String(input.amount),
        input.pool
      ))
    })

    const condense = Effect.fn("ZfsProtocol.condense")(function*(input: Condense) {
      yield* runChecked(process, "Pool.Condense", command(
        "zpool",
        "condense",
        ...(input.command === "cancel" ? ["-c"] : []),
        ...(input.wait === true && input.command !== "cancel" ? ["-w"] : []),
        ...(input.type === undefined ? [] : ["-t", input.type]),
        input.pool
      ))
    })

    const loadKey = Effect.fn("ZfsProtocol.loadKey")(function*(input: LoadKey) {
      const cmd = command(
        "zfs",
        "load-key",
        ...(input.noop === true ? ["-n"] : []),
        ...(input.recursive === true ? ["-r"] : []),
        ...(input.keylocation === undefined ? [] : ["-L", input.keylocation]),
        ...(input.all === true ? ["-a"] : []),
        ...(input.all === true || input.name === undefined ? [] : [input.name])
      )
      if (input.wrappingKey !== undefined) {
        yield* runCheckedWithInput(
          process,
          "Crypto.LoadKey",
          cmd,
          Stream.make(wrappingKeyToCliBytes(input.wrappingKey, input.keyformat ?? "passphrase"))
        )
      } else {
        yield* runChecked(process, "Crypto.LoadKey", cmd)
      }
    })

    const unloadKey = Effect.fn("ZfsProtocol.unloadKey")(function*(input: UnloadKey) {
      yield* runChecked(process, "Crypto.UnloadKey", command(
        "zfs",
        "unload-key",
        ...(input.recursive === true ? ["-r"] : []),
        ...(input.all === true ? ["-a"] : []),
        ...(input.all === true || input.name === undefined ? [] : [input.name])
      ))
    })

    const changeKey = Effect.fn("ZfsProtocol.changeKey")(function*(input: ChangeKey) {
      const inherit = input.command === "inherit" || input.command === "forceInherit"
      const force = input.command === "forceNewKey" || input.command === "forceInherit"
      const cmd = command(
        "zfs",
        "change-key",
        ...(input.load === true ? ["-l"] : []),
        ...(force ? ["-f"] : []),
        ...(inherit ? ["-i"] : []),
        ...(input.keyformat === undefined ? [] : ["-o", `keyformat=${input.keyformat}`]),
        ...(input.keylocation === undefined ? [] : ["-o", `keylocation=${input.keylocation}`]),
        ...(input.pbkdf2iters === undefined ? [] : ["-o", `pbkdf2iters=${input.pbkdf2iters}`]),
        input.name
      )
      if (input.wrappingKey !== undefined) {
        yield* runCheckedWithInput(
          process,
          "Crypto.ChangeKey",
          cmd,
          Stream.make(wrappingKeyToCliBytes(input.wrappingKey, input.keyformat ?? "passphrase"))
        )
      } else {
        yield* runChecked(process, "Crypto.ChangeKey", cmd)
      }
    })

    const allow = Effect.fn("ZfsProtocol.allow")(function*(input: Allow) {
      const perms = input.permissions.join(",")
      yield* runChecked(process, "Dataset.Allow", command(
        "zfs",
        "allow",
        ...inheritFlags(input.inherit),
        ...whoArgv(input.who.kind, input.who.name),
        perms,
        input.name
      ))
    })

    const unallow = Effect.fn("ZfsProtocol.unallow")(function*(input: Unallow) {
      const perms = input.permissions === undefined || input.permissions.length === 0
        ? []
        : [input.permissions.join(",")]
      yield* runChecked(process, "Dataset.Unallow", command(
        "zfs",
        "unallow",
        ...(input.recursive === true ? ["-r"] : []),
        ...inheritFlags(input.inherit),
        ...whoArgv(input.who.kind, input.who.name),
        ...perms,
        input.name
      ))
    })

    const listAllow = Effect.fn("ZfsProtocol.listAllow")(function*(input: ListAllow) {
      const result = yield* runChecked(process, "Dataset.ListAllow", command("zfs", "allow", input.name))
      const listings = parseAllowStdout(result.stdout)
      return yield* Effect.forEach(listings, (row) => decodeCli("Dataset.ListAllow", result, AllowListing, row))
    })

    const userspace = Effect.fn("ZfsProtocol.userspace")(function*(input: Userspace) {
      const result = yield* runChecked(
        process,
        "Dataset.Userspace",
        command("zfs", ...userspaceArgv("userspace", input))
      )
      const rows = parseUserspaceStdout(result.stdout)
      return yield* Effect.forEach(rows, (row) => decodeCli("Dataset.Userspace", result, UserspaceRow, row))
    })

    const groupspace = Effect.fn("ZfsProtocol.groupspace")(function*(input: Userspace) {
      const result = yield* runChecked(
        process,
        "Dataset.Groupspace",
        command("zfs", ...userspaceArgv("groupspace", input))
      )
      const rows = parseUserspaceStdout(result.stdout)
      return yield* Effect.forEach(rows, (row) => decodeCli("Dataset.Groupspace", result, UserspaceRow, row))
    })

    const projectspace = Effect.fn("ZfsProtocol.projectspace")(function*(input: Userspace) {
      const result = yield* runChecked(
        process,
        "Dataset.Projectspace",
        command("zfs", ...userspaceArgv("projectspace", input))
      )
      const rows = parseUserspaceStdout(result.stdout)
      return yield* Effect.forEach(rows, (row) => decodeCli("Dataset.Projectspace", result, UserspaceRow, row))
    })

    const project = Effect.fn("ZfsProtocol.project")(function*(input: Project) {
      const result = yield* runChecked(process, "Dataset.Project", command("zfs", ...projectArgv(input)))
      const rows = parseProjectStdout(result.stdout, input.action)
      return yield* Effect.forEach(rows, (row) => decodeCli("Dataset.Project", result, ProjectRow, row))
    })

    const classifyProcessStream = (operation: string) =>
      (error: ZfsTransportError | ZfsCommandFailure) =>
        error._tag === "ZfsCommandFailure"
          ? classifyCliError(operation, new CommandResult({
            command: error.command,
            stdout: "",
            stderr: error.stderr,
            exitCode: error.exitCode
          }))
          : error

    const textLines = (operation: string, cmd: ReturnType<typeof command>) =>
      process.stream(cmd).pipe(
        Stream.mapError(classifyProcessStream(operation)),
        Stream.decodeText(),
        Stream.splitLines
      )

    const events = (input: Events) =>
      eventsFromLines(textLines("Pool.Events", command(
        "zpool",
        "events",
        "-H",
        ...(input.verbose === true ? ["-v"] : []),
        ...(input.follow === true ? ["-f"] : []),
        ...(input.name === undefined ? [] : [input.name])
      )))

    const eventsClear = Effect.fn("ZfsProtocol.eventsClear")(function*(_input: EventsClear) {
      const result = yield* runChecked(process, "Pool.EventsClear", command("zpool", "events", "-c"))
      return parseEventsCleared(result.stdout)
    })

    const eventsSeek = Effect.fn("ZfsProtocol.eventsSeek")(function*(_input: EventsSeek) {
      // CLI has no seek ioctl; the kernel cursor is consumed by `events()`.
    })

    const iostat = (input: Iostat) => {
      const interval = input.interval ?? (input.count === undefined ? undefined : 1)
      return iostatFromLines(textLines("Pool.Iostat", command(
        "zpool",
        "iostat",
        "-H",
        "-p",
        "-T",
        "u",
        ...(input.verbose === true ? ["-v"] : []),
        ...(input.skipSinceBoot === true ? ["-y"] : []),
        ...(input.name === undefined ? [] : [input.name]),
        ...(input.vdevs === undefined ? [] : [...input.vdevs]),
        ...(interval === undefined ? [] : [String(interval)]),
        ...(input.count === undefined ? [] : [String(input.count)])
      )))
    }

    const history = (input: History) =>
      historyFromLines(textLines("Pool.History", command(
        "zpool",
        "history",
        ...(input.internal === true ? ["-i"] : []),
        ...(input.longFormat === true ? ["-l"] : []),
        ...(input.name === undefined ? [] : [input.name])
      )))

    const prefetch = Effect.fn("ZfsProtocol.prefetch")(function*(input: Prefetch) {
      yield* runChecked(process, "Pool.Prefetch", command(
        "zpool",
        "prefetch",
        ...(input.prefetchType === undefined ? [] : ["-t", input.prefetchType]),
        input.name
      ))
    })

    const addVdevs = Effect.fn("ZfsProtocol.addVdevs")(function*(input: AddVdevs) {
      yield* runChecked(process, "Pool.Add", command(
        "zpool",
        "add",
        ...(input.force === true ? ["-f"] : []),
        ...(input.dryRun === true ? ["-n"] : []),
        ...propertyFlags(input.properties),
        input.pool,
        ...encodeVdevs(input.vdevs)
      ))
    })

    const removeVdevs = Effect.fn("ZfsProtocol.removeVdevs")(function*(input: RemoveVdevs) {
      if (input.cancel === true) {
        yield* runChecked(process, "Pool.Remove", command("zpool", "remove", "-s", input.pool))
        return
      }
      yield* runChecked(process, "Pool.Remove", command(
        "zpool",
        "remove",
        ...(input.dryRun === true ? ["-n"] : []),
        ...(input.wait === true ? ["-w"] : []),
        input.pool,
        ...input.devices
      ))
    })

    const attachVdev = Effect.fn("ZfsProtocol.attachVdev")(function*(input: AttachVdev) {
      yield* runChecked(process, "Pool.Attach", command(
        "zpool",
        "attach",
        ...(input.force === true ? ["-f"] : []),
        ...(input.sequential === true ? ["-s"] : []),
        ...(input.wait === true ? ["-w"] : []),
        ...propertyFlags(input.properties),
        input.pool,
        input.device,
        input.newDevice
      ))
    })

    const detachVdev = Effect.fn("ZfsProtocol.detachVdev")(function*(input: DetachVdev) {
      yield* runChecked(process, "Pool.Detach", command("zpool", "detach", input.pool, input.device))
    })

    const replaceVdev = Effect.fn("ZfsProtocol.replaceVdev")(function*(input: ReplaceVdev) {
      yield* runChecked(process, "Pool.Replace", command(
        "zpool",
        "replace",
        ...(input.force === true ? ["-f"] : []),
        ...(input.sequential === true ? ["-s"] : []),
        ...(input.wait === true ? ["-w"] : []),
        ...propertyFlags(input.properties),
        input.pool,
        input.device,
        ...(input.newDevice === undefined ? [] : [input.newDevice])
      ))
    })

    const splitPool = Effect.fn("ZfsProtocol.splitPool")(function*(input: SplitPool) {
      yield* runChecked(process, "Pool.Split", command(
        "zpool",
        "split",
        ...(input.dryRun === true ? ["-n"] : []),
        ...(input.altroot === undefined ? [] : ["-R", input.altroot]),
        ...propertyFlags(input.properties),
        input.pool,
        input.newPool,
        ...argvDevices(input.devices)
      ))
    })

    const onlineVdevs = Effect.fn("ZfsProtocol.onlineVdevs")(function*(input: OnlineVdevs) {
      yield* runChecked(process, "Pool.Online", command(
        "zpool",
        "online",
        ...(input.expand === true ? ["-e"] : []),
        input.pool,
        ...input.devices
      ))
    })

    const offlineVdevs = Effect.fn("ZfsProtocol.offlineVdevs")(function*(input: OfflineVdevs) {
      yield* runChecked(process, "Pool.Offline", command(
        "zpool",
        "offline",
        ...(input.force === true ? ["-f"] : []),
        ...(input.temporary === true ? ["-t"] : []),
        input.pool,
        ...input.devices
      ))
    })

    return ZfsProtocol.of({
      listDatasets,
      getProperty,
      getProperties,
      setProperty,
      inheritProperty,
      createFilesystem,
      createVolume,
      destroy,
      createSnapshot,
      clone,
      listSnapshots,
      rollback,
      promote,
      rename,
      listPools,
      poolStatus,
      upgradeDataset,
      exists,
      getVdevProperty,
      getVdevProperties,
      setVdevProperty,
      snaprangeSpace,
      createPool,
      destroyPool,
      importPool,
      exportPool,
      reguidPool,
      upgradePool,
      labelClear,
      checkpointPool,
      send,
      sendSpace,
      sendProgress,
      receive,
      abortReceive,
      trimPool,
      initializePool,
      clearPool,
      reopenPool,
      syncPool,
      scrub,
      resilver,
      hold,
      holds,
      release,
      createBookmark,
      destroyBookmark,
      listBookmarks,
      getBookmarkProps,
      mount,
      unmount,
      share,
      unshare,
      channelProgram,
      redact,
      waitFs,
      waitPool,
      diff,
      version,
      zone,
      unzone,
      getBootenv,
      setBootenv,
      ddtPrune,
      condense,
      loadKey,
      unloadKey,
      changeKey,
      allow,
      unallow,
      listAllow,
      userspace,
      groupspace,
      projectspace,
      project,
      events,
      eventsClear,
      eventsSeek,
      iostat,
      history,
      prefetch,
      addVdevs,
      removeVdevs,
      attachVdev,
      detachVdev,
      replaceVdev,
      splitPool,
      onlineVdevs,
      offlineVdevs
    })
  })
)

/** Typed protocol + CLI process transport. Domain services require `ZfsProtocol`. */
export const layer: Layer.Layer<ZfsProtocol | ZfsProcess, never, ChildProcessSpawner.ChildProcessSpawner> =
  protocolLayer.pipe(Layer.provideMerge(processLayer))

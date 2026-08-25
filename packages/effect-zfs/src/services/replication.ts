import { Context, Effect, Layer, Stream } from "effect"
import type {
  EncodedProperty,
  IncrementalMode,
  LzcSendFlag,
  PropertyName,
  ReceiveDest,
  ResumeToken,
  SendOptions,
  SendProgressReport,
  SendSpaceEstimate
} from "../args/index.js"
import { AbortReceive, Receive, Send, SendProgress, SnaprangeSpace } from "../args/index.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeNameArg } from "../schema/decode.js"
import { Snapshot } from "../schema/models.js"
import type { BookmarkName, DatasetName, SnapshotName } from "../schema/name.js"

const snapshotNameOf = (value: Snapshot | SnapshotName): SnapshotName => value instanceof Snapshot ? value.name : value

type SendFlags = {
  readonly compressed?: boolean
  readonly properties?: boolean
  readonly raw?: boolean
  readonly replicate?: boolean
  readonly flags?: ReadonlyArray<LzcSendFlag>
  readonly incremental?: IncrementalMode
  readonly from?: SnapshotName | BookmarkName | Snapshot | string
  readonly resumeToken?: ResumeToken | string
  readonly saved?: boolean
  readonly exclude?: ReadonlyArray<DatasetName | string>
  readonly redact?: BookmarkName | string
  readonly progress?: boolean
  readonly dryRun?: boolean
  readonly parsable?: boolean
  readonly holds?: boolean
}

const fromValue = (value: SnapshotName | BookmarkName | Snapshot | string): string =>
  value instanceof Snapshot ? value.name : value

const sendOptionsRecord = (options: SendOptions | SendFlags): Record<string, unknown> | undefined => {
  const compacted = {
    ...(options.compressed === undefined ? {} : { compressed: options.compressed }),
    ...(options.properties === undefined ? {} : { properties: options.properties }),
    ...(options.raw === undefined ? {} : { raw: options.raw }),
    ...(options.replicate === undefined ? {} : { replicate: options.replicate }),
    ...(options.flags === undefined ? {} : { flags: options.flags }),
    ...(options.incremental === undefined ? {} : { incremental: options.incremental }),
    ...(options.from === undefined ? {} : { from: fromValue(options.from) }),
    ...(options.resumeToken === undefined ? {} : { resumeToken: options.resumeToken }),
    ...(options.saved === undefined ? {} : { saved: options.saved }),
    ...(options.exclude === undefined ? {} : { exclude: options.exclude }),
    ...(options.redact === undefined ? {} : { redact: options.redact }),
    ...(options.progress === undefined ? {} : { progress: options.progress }),
    ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
    ...(options.parsable === undefined ? {} : { parsable: options.parsable }),
    ...(options.holds === undefined ? {} : { holds: options.holds })
  }
  return Object.keys(compacted).length === 0 ? undefined : compacted
}

const encodeSend = (
  snapshot: Snapshot | SnapshotName | Send,
  options: SendOptions | SendFlags = {}
): unknown => {
  if (snapshot instanceof Send) return snapshot
  const flags = sendOptionsRecord(options)
  return {
    snapshot: snapshotNameOf(snapshot),
    ...(flags === undefined ? {} : { options: flags })
  }
}

type ReceiveInput<E> = {
  readonly target: DatasetName
  readonly stream: Stream.Stream<Uint8Array, E>
  readonly force?: boolean
  readonly unmounted?: boolean
  readonly dest?: ReceiveDest
  readonly origin?: SnapshotName
  readonly properties?: ReadonlyArray<EncodedProperty>
  readonly exclude?: ReadonlyArray<PropertyName>
  readonly forceUnmount?: boolean
  readonly dryRun?: boolean
  readonly resumable?: boolean
  readonly skipHolds?: boolean
  readonly verbose?: boolean
  readonly heal?: boolean
}

export class Replication extends Context.Service<Replication, {
  readonly send: (
    snapshot: Snapshot | SnapshotName | Send,
    options?: SendOptions | SendFlags
  ) => Stream.Stream<Uint8Array, Failure>
  readonly sendSpace: (
    snapshot: Snapshot | SnapshotName | Send,
    options?: SendOptions | SendFlags
  ) => Effect.Effect<SendSpaceEstimate, Failure>
  readonly sendProgress: (
    input: SendProgress | Snapshot | SnapshotName
  ) => Effect.Effect<SendProgressReport, Failure>
  readonly receive: <E>(input: ReceiveInput<E>) => Effect.Effect<void, Failure | E>
  readonly abortReceive: (target: DatasetName) => Effect.Effect<void, Failure>
  readonly snaprangeSpace: (
    first: Snapshot | SnapshotName,
    last: Snapshot | SnapshotName
  ) => Effect.Effect<SendSpaceEstimate, Failure>
}>()("effect-zfs/Replication") {
  static readonly layer = Layer.effect(
    Replication,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const send = (
        snapshot: Snapshot | SnapshotName | Send,
        options: SendOptions | SendFlags = {}
      ): Stream.Stream<Uint8Array, Failure> =>
        Stream.unwrap(
          decodeNameArg("Replication.Send", Send, encodeSend(snapshot, options)).pipe(
            Effect.map((args) => zfs.send(args))
          )
        )

      const sendSpace = Effect.fn("Replication.sendSpace")(function*(
        snapshot: Snapshot | SnapshotName | Send,
        options: SendOptions | SendFlags = {}
      ) {
        const args = yield* decodeNameArg("Replication.SendSpace", Send, encodeSend(snapshot, options))
        return yield* zfs.sendSpace(args)
      })

      const sendProgress = Effect.fn("Replication.sendProgress")(function*(
        input: SendProgress | Snapshot | SnapshotName
      ) {
        const args = input instanceof SendProgress
          ? input
          : yield* decodeNameArg("Replication.SendProgress", SendProgress, {
            snapshot: snapshotNameOf(input)
          })
        return yield* zfs.sendProgress(args)
      })

      const receive = Effect.fn("Replication.receive")(function*<E>(input: ReceiveInput<E>) {
        const args = yield* decodeNameArg("Replication.Receive", Receive, {
          target: input.target,
          ...(input.force === undefined ? {} : { force: input.force }),
          ...(input.unmounted === undefined ? {} : { unmounted: input.unmounted }),
          ...(input.dest === undefined ? {} : { dest: input.dest }),
          ...(input.origin === undefined ? {} : { origin: input.origin }),
          ...(input.properties === undefined ? {} : { properties: input.properties }),
          ...(input.exclude === undefined ? {} : { exclude: input.exclude }),
          ...(input.forceUnmount === undefined ? {} : { forceUnmount: input.forceUnmount }),
          ...(input.dryRun === undefined ? {} : { dryRun: input.dryRun }),
          ...(input.resumable === undefined ? {} : { resumable: input.resumable }),
          ...(input.skipHolds === undefined ? {} : { skipHolds: input.skipHolds }),
          ...(input.verbose === undefined ? {} : { verbose: input.verbose }),
          ...(input.heal === undefined ? {} : { heal: input.heal })
        })
        yield* zfs.receive(args, input.stream)
      })

      const abortReceive = Effect.fn("Replication.abortReceive")(function*(target: DatasetName) {
        const args = yield* decodeNameArg("Replication.AbortReceive", AbortReceive, { target })
        yield* zfs.abortReceive(args)
      })

      const snaprangeSpace = Effect.fn("Replication.snaprangeSpace")(function*(
        first: Snapshot | SnapshotName,
        last: Snapshot | SnapshotName
      ) {
        const args = yield* decodeNameArg("Replication.SnaprangeSpace", SnaprangeSpace, {
          first: snapshotNameOf(first),
          last: snapshotNameOf(last)
        })
        return yield* zfs.snaprangeSpace(args)
      })

      return Replication.of({ send, sendSpace, sendProgress, receive, abortReceive, snaprangeSpace })
    })
  )
}

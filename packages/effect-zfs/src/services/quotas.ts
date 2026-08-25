import { Context, Effect, Layer } from "effect"
import type { ProjectAction, ProjectRow, QuotaSpaceType, UserspaceRow } from "../args/index.js"
import { Project, Userspace } from "../args/index.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeNameArg } from "../schema/decode.js"
import type { ProjectId } from "../schema/limits.js"
import type { DatasetName, SnapshotName } from "../schema/name.js"

type SpaceName = DatasetName | SnapshotName

type SpaceOptions = {
  readonly numeric?: boolean
  readonly sidToPosix?: boolean
  readonly types?: ReadonlyArray<QuotaSpaceType>
}

export class Quotas extends Context.Service<Quotas, {
  readonly userspace: (
    name: SpaceName,
    options?: SpaceOptions
  ) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly groupspace: (
    name: SpaceName,
    options?: SpaceOptions
  ) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly projectspace: (
    name: SpaceName
  ) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly project: (input: {
    readonly action: ProjectAction
    readonly paths: ReadonlyArray<string>
    readonly projectId?: ProjectId | bigint
    readonly recursive?: boolean
    readonly directoryOnly?: boolean
    readonly inherit?: boolean
    readonly keepId?: boolean
  }) => Effect.Effect<ReadonlyArray<ProjectRow>, Failure>
}>()("effect-zfs/Quotas") {
  static readonly layer = Layer.effect(
    Quotas,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const spaceArgs = (name: SpaceName, options: SpaceOptions = {}) =>
        decodeNameArg("Dataset.Userspace", Userspace, {
          name,
          ...(options.numeric === undefined ? {} : { numeric: options.numeric }),
          ...(options.sidToPosix === undefined ? {} : { sidToPosix: options.sidToPosix }),
          ...(options.types === undefined ? {} : { types: options.types })
        })

      const userspace = Effect.fn("Quotas.userspace")(function*(
        name: SpaceName,
        options: SpaceOptions = {}
      ) {
        const args = yield* spaceArgs(name, options)
        return yield* zfs.userspace(args)
      })

      const groupspace = Effect.fn("Quotas.groupspace")(function*(
        name: SpaceName,
        options: SpaceOptions = {}
      ) {
        const args = yield* spaceArgs(name, options)
        return yield* zfs.groupspace(args)
      })

      const projectspace = Effect.fn("Quotas.projectspace")(function*(name: SpaceName) {
        const args = yield* decodeNameArg("Dataset.Projectspace", Userspace, { name })
        return yield* zfs.projectspace(args)
      })

      const project = Effect.fn("Quotas.project")(function*(input: {
        readonly action: ProjectAction
        readonly paths: ReadonlyArray<string>
        readonly projectId?: ProjectId | bigint
        readonly recursive?: boolean
        readonly directoryOnly?: boolean
        readonly inherit?: boolean
        readonly keepId?: boolean
      }) {
        const args = yield* decodeNameArg("Dataset.Project", Project, {
          action: input.action,
          paths: input.paths,
          ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
          ...(input.recursive === undefined ? {} : { recursive: input.recursive }),
          ...(input.directoryOnly === undefined ? {} : { directoryOnly: input.directoryOnly }),
          ...(input.inherit === undefined ? {} : { inherit: input.inherit }),
          ...(input.keepId === undefined ? {} : { keepId: input.keepId })
        })
        return yield* zfs.project(args)
      })

      return Quotas.of({ userspace, groupspace, projectspace, project })
    })
  )
}

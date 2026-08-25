import { Context, Effect, Layer } from "effect"
import {
  type AbsolutePath,
  MountFilesystem,
  ShareFilesystem,
  SmbAcl,
  type SmbAclAction,
  UnmountFilesystem,
  UnshareFilesystem
} from "../args/index.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeNameArg } from "../schema/decode.js"
import { Dataset } from "../schema/models.js"
import type { DatasetName } from "../schema/name.js"

const nameOf = (value: Dataset | DatasetName): DatasetName => value instanceof Dataset ? value.name : value

const unmountTargetOf = (value: Dataset | DatasetName | AbsolutePath): DatasetName | AbsolutePath =>
  value instanceof Dataset ? value.name : value

export class Mount extends Context.Service<Mount, {
  readonly mount: (input: {
    readonly name?: Dataset | DatasetName
    readonly all?: boolean
    readonly overlay?: boolean
    readonly recursive?: boolean
    readonly force?: boolean
    readonly loadKeys?: boolean
    readonly verbose?: boolean
    readonly options?: string
  }) => Effect.Effect<void, Failure>
  readonly unmount: (input: {
    readonly target?: Dataset | DatasetName | AbsolutePath
    readonly all?: boolean
    readonly force?: boolean
    readonly unloadKeys?: boolean
  }) => Effect.Effect<void, Failure>
  readonly share: (input: {
    readonly name?: Dataset | DatasetName
    readonly all?: boolean
    readonly loadKeys?: boolean
  }) => Effect.Effect<void, Failure>
  readonly unshare: (input: {
    readonly target?: Dataset | DatasetName | AbsolutePath
    readonly all?: boolean
  }) => Effect.Effect<void, Failure>
  readonly smbAcl: (input: {
    readonly dataset: Dataset | DatasetName
    readonly action: SmbAclAction
    readonly path?: string
  }) => Effect.Effect<void, Failure>
}>()("effect-zfs/Mount") {
  static readonly layer = Layer.effect(
    Mount,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const mount = Effect.fn("Mount.mount")(function*(input: {
        readonly name?: Dataset | DatasetName
        readonly all?: boolean
        readonly overlay?: boolean
        readonly recursive?: boolean
        readonly force?: boolean
        readonly loadKeys?: boolean
        readonly verbose?: boolean
        readonly options?: string
      }) {
        const name = input.name === undefined ? undefined : nameOf(input.name)
        const args = yield* decodeNameArg("Mount.Mount", MountFilesystem, {
          ...(name === undefined ? {} : { name }),
          ...(input.all === undefined ? {} : { all: input.all }),
          ...(input.overlay === undefined ? {} : { overlay: input.overlay }),
          ...(input.recursive === undefined ? {} : { recursive: input.recursive }),
          ...(input.force === undefined ? {} : { force: input.force }),
          ...(input.loadKeys === undefined ? {} : { loadKeys: input.loadKeys }),
          ...(input.verbose === undefined ? {} : { verbose: input.verbose }),
          ...(input.options === undefined ? {} : { options: input.options })
        })
        yield* zfs.mount(args)
      })

      const unmount = Effect.fn("Mount.unmount")(function*(input: {
        readonly target?: Dataset | DatasetName | AbsolutePath
        readonly all?: boolean
        readonly force?: boolean
        readonly unloadKeys?: boolean
      }) {
        const target = input.target === undefined ? undefined : unmountTargetOf(input.target)
        const args = yield* decodeNameArg("Mount.Unmount", UnmountFilesystem, {
          ...(target === undefined ? {} : { target }),
          ...(input.all === undefined ? {} : { all: input.all }),
          ...(input.force === undefined ? {} : { force: input.force }),
          ...(input.unloadKeys === undefined ? {} : { unloadKeys: input.unloadKeys })
        })
        yield* zfs.unmount(args)
      })

      const share = Effect.fn("Mount.share")(function*(input: {
        readonly name?: Dataset | DatasetName
        readonly all?: boolean
        readonly loadKeys?: boolean
      }) {
        const name = input.name === undefined ? undefined : nameOf(input.name)
        const args = yield* decodeNameArg("Mount.Share", ShareFilesystem, {
          ...(name === undefined ? {} : { name }),
          ...(input.all === undefined ? {} : { all: input.all }),
          ...(input.loadKeys === undefined ? {} : { loadKeys: input.loadKeys })
        })
        yield* zfs.share(args)
      })

      const unshare = Effect.fn("Mount.unshare")(function*(input: {
        readonly target?: Dataset | DatasetName | AbsolutePath
        readonly all?: boolean
      }) {
        const target = input.target === undefined ? undefined : unmountTargetOf(input.target)
        const args = yield* decodeNameArg("Mount.Unshare", UnshareFilesystem, {
          ...(target === undefined ? {} : { target }),
          ...(input.all === undefined ? {} : { all: input.all })
        })
        yield* zfs.unshare(args)
      })

      const smbAcl = Effect.fn("Mount.smbAcl")(function*(input: {
        readonly dataset: Dataset | DatasetName
        readonly action: SmbAclAction
        readonly path?: string
      }) {
        const args = yield* decodeNameArg("Mount.SmbAcl", SmbAcl, {
          dataset: nameOf(input.dataset),
          action: input.action,
          ...(input.path === undefined ? {} : { path: input.path })
        })
        yield* zfs.smbAcl(args)
      })

      return Mount.of({ mount, unmount, share, unshare, smbAcl })
    })
  )
}

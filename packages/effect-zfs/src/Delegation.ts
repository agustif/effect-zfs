import { Context, Effect, Layer } from "effect"
import {
  Allow,
  AllowListing,
  DelegWho,
  ListAllow,
  Unallow,
  type DelegInherit,
  type DelegPermission
} from "./Args.js"
import { decodeNameArg } from "./internal/decode.js"
import type { DatasetName } from "./Name.js"
import { ZfsProtocol, type Failure } from "./Protocol.js"

export class Delegations extends Context.Service<Delegations, {
  readonly allow: (input: {
    readonly name: DatasetName
    readonly who: DelegWho
    readonly permissions: ReadonlyArray<DelegPermission | string>
    readonly inherit?: DelegInherit
  }) => Effect.Effect<void, Failure>
  readonly unallow: (input: {
    readonly name: DatasetName
    readonly who: DelegWho
    readonly permissions?: ReadonlyArray<DelegPermission | string>
    readonly inherit?: DelegInherit
    readonly recursive?: boolean
  }) => Effect.Effect<void, Failure>
  readonly list: (name: DatasetName) => Effect.Effect<ReadonlyArray<AllowListing>, Failure>
}>()("effect-zfs/Delegations") {
  static readonly layer = Layer.effect(
    Delegations,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const allow = Effect.fn("Delegations.allow")(function*(input: {
        readonly name: DatasetName
        readonly who: DelegWho
        readonly permissions: ReadonlyArray<DelegPermission | string>
        readonly inherit?: DelegInherit
      }) {
        const args = yield* decodeNameArg("Dataset.Allow", Allow, {
          name: input.name,
          who: input.who,
          permissions: input.permissions,
          ...(input.inherit === undefined ? {} : { inherit: input.inherit })
        })
        yield* zfs.allow(args)
      })

      const unallow = Effect.fn("Delegations.unallow")(function*(input: {
        readonly name: DatasetName
        readonly who: DelegWho
        readonly permissions?: ReadonlyArray<DelegPermission | string>
        readonly inherit?: DelegInherit
        readonly recursive?: boolean
      }) {
        const args = yield* decodeNameArg("Dataset.Unallow", Unallow, {
          name: input.name,
          who: input.who,
          ...(input.permissions === undefined ? {} : { permissions: input.permissions }),
          ...(input.inherit === undefined ? {} : { inherit: input.inherit }),
          ...(input.recursive === undefined ? {} : { recursive: input.recursive })
        })
        yield* zfs.unallow(args)
      })

      const list = Effect.fn("Delegations.list")(function*(name: DatasetName) {
        const args = yield* decodeNameArg("Dataset.ListAllow", ListAllow, { name })
        return yield* zfs.listAllow(args)
      })

      return Delegations.of({ allow, unallow, list })
    })
  )
}

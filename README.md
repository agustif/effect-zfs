# effect-zfs

Effect v4 library for **Linux OpenZFS**. Typed services for datasets, pools,
snapshots, bookmarks, send/receive, crypto, mount, delegations, and quotas.

Compatibility floor: **OpenZFS 2.2.2** (Ubuntu 24.04 `zfsutils-linux`). Every
minor from **2.2.2–2.4.4** is catalogued in `spec/releases.json`. This is not a
macOS OpenZFS wrapper.

**0.1.0** is the first tagged release. Effect 4 is still `4.0.0-rc.111`, so this
is not 1.0.

```text
OpenZFS C tables + patches
        → Smithy model
        → generated Schema / TaggedError / operation IO
        → Datasets Pools Snapshots Bookmarks Replication
           Crypto Mount Delegations Quotas
                    ↓
              ZfsProtocol  (typed ops, not argv)
           /        |         \
        CLI      Native       Test
     adapter   linuxLayer   testLayer
```

On Linux, **`Native.linuxLayer()`** is the production interpreter (libzfs /
libzfs_core via optional koffi). CLI is the portable adapter. Ioctl-only ops
have no Ubuntu subcommand and fail closed on CLI.

## Install

Peer: `effect@>=4.0.0-rc.111 <5`. Node also needs `@effect/platform-node` at the
same RC. Native bindings need optional `koffi` on Linux.

```sh
git clone git@github.com:agustif/effect-zfs.git
cd effect-zfs
npm install
npm run typecheck
npm run lint
npm test
```

The package is TypeScript source (`exports` point at `src/*.ts`). Use the
workspace TypeScript so `@effect/language-service` loads.

## Usage

Yield a service, call methods, provide `layer` plus an interpreter at the edge.

```ts
import { Effect } from "effect"
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import {
  DatasetProperty,
  Datasets,
  Name,
  Snapshots,
  layer
} from "effect-zfs"
import * as Native from "effect-zfs/native"

const program = Effect.gen(function*() {
  const datasets = yield* Datasets
  const snapshots = yield* Snapshots

  const data = yield* datasets.createFilesystem({
    name: Name.datasetName("tank/data"),
    properties: {
      compression: "zstd-3",
      atime: false,
      recordsize: 1024n * 1024n
    }
  })

  const compression = yield* datasets.get(data, DatasetProperty.compression)
  yield* snapshots.create(data, "before-upgrade")
  return compression
}).pipe(
  Effect.provide(layer),
  Effect.provide(Native.linuxLayer()),
  Effect.provide(NodeServices.layer)
)

NodeRuntime.runMain(program)
```

On a machine without libzfs, swap `Native.linuxLayer()` for `Cli.layer`:

```ts
import * as Cli from "effect-zfs/cli"

Effect.provide(Cli.layer)
```

Names are branded (`Name.datasetName`, `Name.poolName`). Byte and uint64 values
are `bigint`. Booleans on the wire are `on` / `off`. Invalid names fail as
`InvalidName` at the service boundary.

```ts
import { Limits, Name } from "effect-zfs"

const vol = yield* datasets.createVolume({
  name: Name.datasetName("tank/vol"),
  size: Limits.volumeSize(Limits.mib(8)),
  sparse: true
})
```

### Replication

`send` is a `Stream` of chunks. `receive` consumes that stream. Do not buffer a
backup in memory.

```ts
const datasets = yield* Datasets
const snapshots = yield* Snapshots
const replication = yield* Replication

const fs = yield* datasets.createFilesystem({ name: Name.datasetName("tank/src") })
const snap = yield* snapshots.create(fs, "seed")
yield* replication.receive({
  target: Name.datasetName("tank/dst"),
  unmounted: true,
  stream: replication.send(snap)
})
```

### Tests without ZFS

Handlers are typed operations, not argv.

```ts
import { Args, Name, layer } from "effect-zfs"
import * as Test from "effect-zfs/test"

const program = listEffect.pipe(
  Effect.provide(layer),
  Effect.provide(Test.layer({
    listDatasets: () => [
      new Args.DatasetListItem({ name: Name.datasetName("tank"), kind: "filesystem" })
    ]
  }))
)
```

## Errors

Generated failures are `Schema.TaggedError` classes (`DatasetNotFound`,
`DatasetAlreadyExists`, …). CLI stderr is classified conservatively: a phrase
is promoted only when that tag is declared for the current operation. Anything
else is `UnknownZfsError`. Spawn failures are `ZfsTransportError`. Native maps
`libzfs_errno()` / EZFS_* through `classifyNativeError`.

```ts
const error = yield* datasets.get(
  Name.datasetName("tank/missing"),
  DatasetProperty.compression
).pipe(Effect.flip)
```

## What CLI cannot do

These have **no Linux `zfs`/`zpool` subcommand** (or no query API). Native
implements the ioctl. Use `Native.linuxLayer()`:

- obj-to-path, dsobj-to-name, next-obj, obj-to-stats
- `eventsSeek`
- send-progress query (`lzc_send_progress` needs the send fd)

Also: `zinject`, `zpool freeze`, and `zfs remap` are often missing from Ubuntu
`zfsutils-linux`. `zpool trim|initialize|scrub -a` is typed and **refused**
(would touch non-test pools).

## Test

```sh
npm run typecheck
npm test                 # codegen + Vitest (live skips unless Linux+ZFS)
npm run test:live        # Lima Ubuntu 24.04 / zfs-2.2.2
npm run test:live:2.3    # Lima Ubuntu 25.04 / zfs-2.3.1
npm run test:live:2.4    # Lima Ubuntu 26.04 / zfs-2.4.x
```

Live mutation is allowed only on process-created pools named `effectzfs_test_*`.
`npm run test:live` copies the tree to `~/.cache/effect-zfs-live` in the VM and
runs `npm ci` there (the virtiofs `$HOME` mount is read-only).

## Generate

Do not hand-edit `packages/effect-zfs/src/generated/*`. Change `patches/` or
`spec/` and regenerate.

```sh
npm run generate
bash scripts/fetch-openzfs.sh
node packages/codegen/src/generate-all.mjs --openzfs ./vendor/openzfs
```

## Layout

| Path | Role |
| --- | --- |
| `packages/effect-zfs/src/services/` | Nine `Context.Service` modules + `layer` |
| `packages/effect-zfs/src/args/` | Operation `Schema.Class` inputs |
| `packages/effect-zfs/src/cli/` | CLI adapter (argv lives here only) |
| `packages/effect-zfs/src/native/` | koffi `libzfs_core` / `libzfs` |
| `packages/effect-zfs/src/protocol/` | `ZfsProtocol`, process transport, test layer |
| `packages/effect-zfs/src/generated/` | Properties, errors, operation IO, Linux minors |
| `packages/codegen` | C extractors, Smithy, Effect emitter |
| `patches/` | Property/error overrides + RFC 6902 `smithy.json` |
| `spec/` | Operations, IO, native catalog, releases |
| `examples/` | Copy-paste programs |

Invariants and the native contract: `ARCHITECTURE.md`. Remaining thinner spots:
`GAPS.md`. Full zfs/zpool map: `ZFS_MAP.md`.

## License

MIT

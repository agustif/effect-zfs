# effect-zfs

Effect v4 library for Linux ZFS. Property tables, libzfs error codes, and
operation unions are generated from OpenZFS source plus semantic patches. The
runtime talks to `zfs` / `zpool` through a replaceable `ZfsProtocol`.

```text
OpenZFS source (zfs_prop.c / zpool_prop.c / libzfs.h)
        + patches/properties.json, patches/errors.json
                |
                v
        Smithy 2.0 model
                |
                v
     generated Schema types / TaggedError / operation unions
                |
                v
     Datasets, Pools, Snapshots, Replication   (Context.Service)
                |
            ZfsProtocol  (typed ops, not argv)
           /     |      \
       CLI     Native    Test
      (v0)   layerFrom   (v0)
```

Compatibility floor is **Linux ZFS 2.2.2** (Ubuntu 24.04 LTS `zfsutils-linux`).
This is not a macOS OpenZFS wrapper. `zpool status -j` exists from OpenZFS 2.3;
the CLI adapter tries JSON then falls back to parsable text (`-p`) when the flag
is rejected. `Pools.status` just calls `ZfsProtocol.poolStatus`.

## Status

v0 is typed and host-tested against Effect `4.0.0-rc.111`.

| Gate | Result |
| --- | --- |
| Effect / platform / vitest | `4.0.0-rc.111` |
| TypeScript | 5.9.3, `tsc --noEmit` clean |
| Codegen | OpenZFS `84aa7e7e09f6a4ddad9ec40dbe9498d50184ed07` → dataset/pool/vdev properties, 103 libzfs codes, 91 operations |
| Host tests | 9 codegen + 31 Vitest (11 live skipped on Darwin) |
| Linux live | Lima Ubuntu 24.04 / zfs-2.2.2 (`npm run test:live`). Lima Ubuntu 25.04 / zfs-2.3.1 JSON status (`npm run test:live:2.3`) |

Live mutation is allowed only on process-created pools named `effectzfs_test_*`.

## Install

Peer: `effect@>=4.0.0-rc.111 <5`. Node usage also needs `@effect/platform-node`
at the same RC.

```sh
npm install
npm run typecheck
npm test
```

## Usage

Domain behavior is on services. Yield the service, then call methods. Provide
`layer` (all four services), `Cli.layer` (`ZfsProtocol`), and `NodeServices`
once at the edge.

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
import * as Cli from "effect-zfs/cli"

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
  Effect.provide(Cli.layer),
  Effect.provide(NodeServices.layer)
)

NodeRuntime.runMain(program)
```

`Dataset`, `Pool`, and `Snapshot` are `Schema.Class` models. `Datasets`,
`Pools`, `Snapshots`, and `Replication` are the services. Names are branded:
`Name.datasetName("tank/data")`, `Name.poolName("tank")`.

Byte and uint64 values are `bigint`, never JavaScript `number`. Booleans on
the wire are `on` / `off`. Operation inputs are `Schema.Class` values in
`Args` (`CreateVolume`, `Send`, `GetProperty`, …). Names follow
`zfs_namecheck`; zvol/vdev sizes are branded (`Limits.volumeSize`,
`Limits.vdevSize`) with OpenZFS floors (`SPA_MINBLOCKSIZE` 512,
`SPA_MINDEVSIZE` 64 MiB).

```ts
import { Limits, Name } from "effect-zfs"

const vol = yield* datasets.createVolume({
  name: Name.datasetName("tank/vol"),
  size: Limits.volumeSize(Limits.mib(8)),
  sparse: true
})
```

### Replication

`send` is a `Stream` of stdout chunks. `receive` consumes that stream; upstream
stream errors stay typed.

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
import { Name, layer } from "effect-zfs"
import * as Test from "effect-zfs/test"

const program = listEffect.pipe(
  Effect.provide(layer),
  Effect.provide(Test.layer({
    listDatasets: () => [{ name: Name.datasetName("tank"), kind: "filesystem" }]
  }))
)
```

### Native (contract only)

A future napi addon implements `NativeBindings` (`lzc_*` + libzfs list/props). Map errno, do not parse CLI:

```ts
import * as Native from "effect-zfs/native"

const program = listEffect.pipe(
  Effect.provide(layer),
  Effect.provide(Native.layerFrom(bindings))
)
```

## Errors

Generated failures are `Schema.TaggedError` classes (`DatasetNotFound`,
`DatasetAlreadyExists`, …). CLI stderr is classified conservatively: a phrase
is promoted only when that tag is declared for the current operation. Anything
else is `UnknownZfsError`. Transport/spawn failures are `ZfsTransportError`.

```ts
const error = yield* datasets.get(Name.datasetName("tank/missing"), DatasetProperty.compression).pipe(Effect.flip)
// error._tag === "DatasetNotFound" | "UnknownZfsError" | ...
```

## Generate

```sh
npm run generate
# pin / refresh vendor/openzfs:
bash scripts/fetch-openzfs.sh
node packages/codegen/src/generate-all.mjs --openzfs ./vendor/openzfs
```

Do not hand-edit `packages/effect-zfs/src/generated/*`. Change
`patches/properties.json`, `patches/errors.json`, or `spec/operations.json`
and regenerate.

## Test

```sh
npm run typecheck
npm test                 # codegen + Vitest (live tests skip unless Linux+ZFS)
npm run test:live        # Lima Ubuntu 24.04 / zfs-2.2.2; see scripts/lima-live.sh
npm run test:live:2.3    # Lima Ubuntu 25.04 / zfs-2.3.1 JSON status
# limactl start --yes scripts/lima/effect-zfs-2.3.yaml
bash scripts/smoke-zfs.sh
```

`npm run test:live` copies the tree to `~/.cache/effect-zfs-live` inside the
VM and `npm ci`s **there**. The virtiofs mount of `$HOME` is read-only; the
script never writes Darwin `node_modules`. Version suites live in
`test/version/2.2.2.test.ts`, `test/version/2.3.test.ts`, `test/live/2.2.2.test.ts`,
and `test/live/2.3.test.ts`.

## Layout

| Path | Role |
| --- | --- |
| `packages/codegen` | C extractors, Smithy, Effect emitter |
| `packages/effect-zfs/src` | Schema models, services, CLI / native-contract / test layers |
| `patches/` | semantic overrides on generated metadata |
| `spec/operations.json` | operation → error-tag unions |
| `examples/` | copy-paste programs |
| `vendor/openzfs` | sparse OpenZFS checkout used for codegen |

See `ARCHITECTURE.md` for invariants, `ZFS_MAP.md` for the full zfs/zpool gap map, and `TASKS.md` for remaining work.

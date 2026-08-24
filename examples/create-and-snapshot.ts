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

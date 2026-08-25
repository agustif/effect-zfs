import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Effect } from "effect"
import { Datasets, layer, Name, Replication, Snapshots } from "effect-zfs"
import * as Cli from "effect-zfs/cli"

const program = Effect.gen(function*() {
  const datasets = yield* Datasets
  const snapshots = yield* Snapshots
  const replication = yield* Replication

  const source = yield* datasets.createFilesystem({
    name: Name.datasetName("tank/src"),
    properties: { mountpoint: "none" }
  })
  const snap = yield* snapshots.create(source, "seed")

  yield* replication.receive({
    target: Name.datasetName("tank/dst"),
    unmounted: true,
    stream: replication.send(snap)
  })
}).pipe(
  Effect.provide(layer),
  Effect.provide(Cli.layer),
  Effect.provide(NodeServices.layer)
)

NodeRuntime.runMain(program)

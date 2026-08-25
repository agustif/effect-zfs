import { Layer } from "effect"
import { Bookmarks } from "./bookmarks.js"
import { Crypto } from "./crypto.js"
import { Datasets } from "./datasets.js"
import { Delegations } from "./delegations.js"
import { Mount } from "./mount.js"
import { Pools } from "./pools.js"
import { Quotas } from "./quotas.js"
import { Replication } from "./replication.js"
import { Snapshots } from "./snapshots.js"

export * from "./bookmarks.js"
export * from "./crypto.js"
export * from "./datasets.js"
export * from "./delegations.js"
export * from "./mount.js"
export * from "./pools.js"
export * from "./quotas.js"
export * from "./replication.js"
export * from "./snapshots.js"

export const layer = Layer.mergeAll(
  Datasets.layer,
  Pools.layer,
  Snapshots.layer,
  Bookmarks.layer,
  Replication.layer,
  Crypto.layer,
  Mount.layer,
  Delegations.layer,
  Quotas.layer
)

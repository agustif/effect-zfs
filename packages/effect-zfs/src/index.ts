export { Dataset, Datasets, dataset, type CreateDatasetProperties, type KindedDataset, type WritableDatasetProperties } from "./Dataset.js"
export { Pool, Pools, PoolScan, type CreatePoolProperties, type WritablePoolProperties, type WritableVdevProperties } from "./Pool.js"
export { Snapshot, Snapshots, SnapshotHold } from "./Snapshot.js"
export { Bookmark, Bookmarks } from "./Bookmark.js"
export { Replication } from "./Replication.js"
export { Mount } from "./Mount.js"
export { Delegations } from "./Delegation.js"
export { Quotas } from "./Quota.js"
export { Crypto, wrappingKey } from "./Crypto.js"
export * as Property from "./Property.js"
export * as Name from "./Name.js"
export * as Args from "./Args.js"
export * as Limits from "./Limits.js"
export {
  CommandResult,
  ZfsCommand,
  ZfsCommandFailure,
  ZfsProtocol,
  ZfsTransportError,
  command,
  AbortReceive,
  EncodedProperty,
  Receive,
  ReceiveDest,
  SendOptions,
  SendProgress,
  SendSpaceEstimate,
  type Failure
} from "./Protocol.js"
export { ZfsProcess } from "./Process.js"
export { DatasetProperty, PoolProperty, VdevProperty } from "./generated/properties.generated.js"
export * from "./generated/errors.generated.js"
export { UnknownZfsError, type ZfsError } from "./Error.js"
export * as Schemas from "./Schemas.js"
export * as Version from "./Version.js"
export * as Cli from "./Cli.js"
export * as Test from "./Test.js"
export * as Native from "./Native.js"

import { Layer } from "effect"
import { Crypto } from "./Crypto.js"
import { Datasets } from "./Dataset.js"
import { Pools } from "./Pool.js"
import { Snapshots } from "./Snapshot.js"
import { Bookmarks } from "./Bookmark.js"
import { Replication } from "./Replication.js"
import { Mount } from "./Mount.js"
import { Delegations } from "./Delegation.js"
import { Quotas } from "./Quota.js"

/** Domain services. Provide `ZfsProtocol` (CLI, native, or test) at the edge. */
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

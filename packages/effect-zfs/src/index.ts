export * as Args from "./args/index.js"
export * as Cli from "./cli/adapter.js"
export { UnknownZfsError, type ZfsError } from "./errors/classify.js"
export * from "./generated/errors.generated.js"
export {
  OperationErrorTags,
  type OperationInput,
  OperationNative,
  type OperationOutput,
  OperationShapes
} from "./generated/operations.generated.js"
export { DatasetProperty, PoolProperty, VdevProperty } from "./generated/properties.generated.js"
export { linux, linuxReleases } from "./generated/releases.generated.js"
export * as Native from "./native/bindings.js"
export { ZfsProcess } from "./protocol/process.js"
export {
  AbortReceive,
  command,
  CommandResult,
  EncodedProperty,
  type Failure,
  Receive,
  ReceiveDest,
  SendOptions,
  SendProgress,
  SendSpaceEstimate,
  ZfsCommand,
  ZfsCommandFailure,
  ZfsProtocol,
  ZfsTransportError
} from "./protocol/protocol.js"
export * as Test from "./protocol/test.js"
export * as Limits from "./schema/limits.js"
export * as Schemas from "./schema/models.js"
export * as Name from "./schema/name.js"
export * as Property from "./schema/property.js"
export * as Version from "./schema/version.js"
export { Bookmark, Bookmarks } from "./services/bookmarks.js"
export { Crypto, wrappingKey } from "./services/crypto.js"
export {
  type CreateDatasetProperties,
  Dataset,
  dataset,
  Datasets,
  type KindedDataset,
  type WritableDatasetProperties
} from "./services/datasets.js"
export { Delegations } from "./services/delegations.js"
export { Mount } from "./services/mount.js"
export {
  type CreatePoolProperties,
  Pool,
  Pools,
  PoolScan,
  type WritablePoolProperties,
  type WritableVdevProperties
} from "./services/pools.js"
export { Quotas } from "./services/quotas.js"
export { Replication } from "./services/replication.js"
export { Snapshot, SnapshotHold, Snapshots } from "./services/snapshots.js"

export { layer } from "./services/index.js"

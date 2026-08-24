import { Redacted, Schema } from "effect"
import {
  BookmarkComponent,
  BookmarkName,
  DatasetName,
  DestroyTarget,
  DelegPermSetName,
  HoldTag,
  permsetWhy,
  PoolName,
  SnapshotComponent,
  SnapshotName
} from "./Name.js"
import {
  ByteCount,
  DatasetVersion,
  maxPathBytes,
  PoolGuid,
  PoolVersion,
  ProjectId,
  uInt64Max,
  VdevSize,
  VolBlockSize,
  VolumeSize
} from "./Limits.js"
import { BytesOrNone, DatasetKind, PoolHealth } from "./Schemas.js"
import {
  datasetPropertyNames,
  poolPropertyNames,
  vdevPropertyNames
} from "./generated/properties.generated.js"

export { DatasetKind }

export const Flag = Schema.Boolean
export type Flag = typeof Flag.Type

export const PropertyScope = Schema.Literals(["dataset", "pool"])
export type PropertyScope = typeof PropertyScope.Type

export const DatasetPropertyName = Schema.Literals(datasetPropertyNames)
export type DatasetPropertyName = typeof DatasetPropertyName.Type

export const PoolPropertyName = Schema.Literals(poolPropertyNames)
export type PoolPropertyName = typeof PoolPropertyName.Type

export const VdevPropertyName = Schema.Literals(vdevPropertyNames)
export type VdevPropertyName = typeof VdevPropertyName.Type

/** `zfs get all` and the hidden `name` list column. */
export const SpecialPropertyName = Schema.Literals(["all", "name"])
export type SpecialPropertyName = typeof SpecialPropertyName.Type

const interiorSeparator = (separator: string, title: string) =>
  Schema.makeFilter((value: string) => {
    const index = value.indexOf(separator)
    if (index <= 0 || index >= value.length - 1) {
      return `${title} requires an interior '${separator}'`
    }
    return undefined
  }, { title, description: title })

export const UserPropertyName = Schema.NonEmptyString.pipe(
  Schema.check(interiorSeparator(":", "UserPropertyName")),
  Schema.brand("UserPropertyName")
)
export type UserPropertyName = typeof UserPropertyName.Type

export const SnapshotRelativePropertyName = Schema.NonEmptyString.pipe(
  Schema.check(interiorSeparator("@", "SnapshotRelativePropertyName")),
  Schema.brand("SnapshotRelativePropertyName")
)
export type SnapshotRelativePropertyName = typeof SnapshotRelativePropertyName.Type

export const PropertyName = Schema.Union([
  DatasetPropertyName,
  PoolPropertyName,
  SpecialPropertyName,
  UserPropertyName,
  SnapshotRelativePropertyName
])
export type PropertyName = typeof PropertyName.Type
export const propertyName = Schema.decodeUnknownSync(PropertyName)

export const PropertySourceKind = Schema.Literals([
  "local",
  "default",
  "inherited",
  "temporary",
  "received",
  "none"
])
export type PropertySourceKind = typeof PropertySourceKind.Type

export const DatasetKindFilter = DatasetKind
export type DatasetKindFilter = DatasetKind

export const PropertyWireValue = Schema.String
export type PropertyWireValue = typeof PropertyWireValue.Type

/** Already-encoded `name=value` pair passed to create/clone `-o`. */
export class EncodedProperty extends Schema.Class<EncodedProperty>("effect-zfs/EncodedProperty")({
  name: PropertyName,
  value: PropertyWireValue
}) {}

/** CLI `-o name=value` token. EncodedProperty is the decoded shape. */
export const encodePropertyAssignment = (row: EncodedProperty): string =>
  `${row.name}=${row.value}`

export const decodePropertyAssignment = (wire: string): EncodedProperty => {
  const eq = wire.indexOf("=")
  if (eq <= 0) {
    return new EncodedProperty({ name: propertyName(wire), value: "" })
  }
  return new EncodedProperty({
    name: propertyName(wire.slice(0, eq)),
    value: wire.slice(eq + 1)
  })
}

const utf8 = new TextEncoder()

const keyLocationWhy = (value: string): string | undefined => {
  if (value === "prompt" || value === "none") return undefined
  if (value.startsWith("file://") && value.length > "file://".length) return undefined
  if (value.startsWith("https://") && value.length > "https://".length) return undefined
  return "keylocation must be prompt, none, file://path, or https://url"
}

/** `keylocation`: prompt, none, `file://`, or `https://`. */
export const KeyLocation = Schema.NonEmptyString.pipe(
  Schema.check(Schema.makeFilter((value: string) => keyLocationWhy(value), {
    title: "KeyLocation",
    description: "ZFS keylocation"
  })),
  Schema.brand("KeyLocation")
)
export type KeyLocation = typeof KeyLocation.Type
export const keyLocation = Schema.decodeUnknownSync(KeyLocation)

/** Wrapping-key formats used at create / change-key (`none` is unencrypted). */
export const KeyFormat = Schema.Literals(["raw", "hex", "passphrase"])
export type KeyFormat = typeof KeyFormat.Type

/**
 * `dcp_cmd_t` for `lzc_change_key`. Default change-key is `newKey`.
 * `force*` maps to CLI `-f` (rewrap skipped).
 */
export const ChangeKeyCommand = Schema.Literals(["newKey", "inherit", "forceNewKey", "forceInherit"])
export type ChangeKeyCommand = typeof ChangeKeyCommand.Type

/** `DCP_CMD_NEW_KEY` */
export const dcpCmdNewKey = 2n
/** `DCP_CMD_INHERIT` */
export const dcpCmdInherit = 3n
/** `DCP_CMD_FORCE_NEW_KEY` */
export const dcpCmdForceNewKey = 4n
/** `DCP_CMD_FORCE_INHERIT` */
export const dcpCmdForceInherit = 5n

export const dcpCmdOf = (command: ChangeKeyCommand | undefined): bigint => {
  if (command === "inherit") return dcpCmdInherit
  if (command === "forceNewKey") return dcpCmdForceNewKey
  if (command === "forceInherit") return dcpCmdForceInherit
  return dcpCmdNewKey
}

/** Wrapping key / passphrase. Redacted; never logged or placed on argv. */
export const WrappingKeyMaterial = Schema.Union([Schema.String, Schema.Uint8Array])
export const WrappingKey = Schema.Redacted(WrappingKeyMaterial, { disallowJsonEncode: true })
export type WrappingKey = typeof WrappingKey.Type

export const wrappingKey = (value: string | Uint8Array): WrappingKey =>
  Redacted.make(value)

const decodeHexKey = (hex: string): Uint8Array => {
  const trimmed = hex.trim()
  if (trimmed.length === 0 || trimmed.length % 2 !== 0) return utf8.encode(trimmed)
  const out = new Uint8Array(trimmed.length / 2)
  for (let i = 0; i < out.length; i++) {
    const n = Number.parseInt(trimmed.slice(i * 2, i * 2 + 2), 16)
    if (!Number.isFinite(n)) return utf8.encode(trimmed)
    out[i] = n
  }
  return out
}

export const keyFormatFromProperties = (properties: ReadonlyArray<EncodedProperty>): KeyFormat => {
  for (const row of properties) {
    if (row.name === "keyformat" && (row.value === "raw" || row.value === "hex" || row.value === "passphrase")) {
      return row.value
    }
  }
  return "passphrase"
}

/** CLI stdin bytes. Passphrase is newline-terminated; do not log the result. */
export const wrappingKeyToCliBytes = (
  key: WrappingKey,
  format: KeyFormat = "passphrase"
): Uint8Array => {
  const material = Redacted.value(key)
  if (typeof material !== "string") return material
  if (format === "passphrase") {
    return utf8.encode(material.endsWith("\n") ? material : `${material}\n`)
  }
  return utf8.encode(material)
}

/** `lzc_*` wkeydata. Passphrase/hex strings have no CLI newline. Do not log. */
export const wrappingKeyToNativeBytes = (
  key: WrappingKey,
  format: KeyFormat = "passphrase"
): Uint8Array => {
  const material = Redacted.value(key)
  if (typeof material !== "string") return material
  if (format === "hex") return decodeHexKey(material)
  return utf8.encode(material)
}



export class PropertySort extends Schema.Class<PropertySort>("effect-zfs/args/PropertySort")({
  property: PropertyName,
  descending: Schema.optionalKey(Flag)
}) {}

export class ListDatasets extends Schema.Class<ListDatasets>("effect-zfs/args/ListDatasets")({
  root: Schema.optionalKey(DatasetName),
  recursive: Schema.optionalKey(Flag),
  types: Schema.optionalKey(Schema.Array(DatasetKindFilter)),
  depth: Schema.optionalKey(Schema.Natural),
  sort: Schema.optionalKey(Schema.Array(PropertySort)),
  columns: Schema.optionalKey(Schema.Array(PropertyName))
}) {}

export class ListSnapshots extends Schema.Class<ListSnapshots>("effect-zfs/args/ListSnapshots")({
  root: Schema.optionalKey(Schema.Union([DatasetName, SnapshotName])),
  recursive: Schema.optionalKey(Flag)
}) {}

export class GetProperty extends Schema.Class<GetProperty>("effect-zfs/args/GetProperty")({
  scope: PropertyScope,
  name: Schema.Union([DatasetName, PoolName, SnapshotName, BookmarkName]),
  property: PropertyName,
  recursive: Schema.optionalKey(Flag),
  depth: Schema.optionalKey(Schema.Natural),
  types: Schema.optionalKey(Schema.Array(DatasetKindFilter)),
  sources: Schema.optionalKey(Schema.Array(PropertySourceKind)),
  targets: Schema.optionalKey(Schema.Array(Schema.Union([DatasetName, PoolName])))
}) {}

export class SetProperty extends Schema.Class<SetProperty>("effect-zfs/args/SetProperty")({
  scope: PropertyScope,
  name: Schema.Union([DatasetName, PoolName, SnapshotName, BookmarkName]),
  property: PropertyName,
  value: PropertyWireValue,
  unmounted: Schema.optionalKey(Flag),
  targets: Schema.optionalKey(Schema.Array(Schema.Union([DatasetName, PoolName, SnapshotName, BookmarkName])))
}) {}

export class InheritProperty extends Schema.Class<InheritProperty>("effect-zfs/args/InheritProperty")({
  name: Schema.Union([DatasetName, SnapshotName]),
  property: PropertyName,
  recursive: Schema.optionalKey(Flag),
  received: Schema.optionalKey(Flag),
  targets: Schema.optionalKey(Schema.Array(DatasetName))
}) {}

export class CreateFilesystem extends Schema.Class<CreateFilesystem>("effect-zfs/args/CreateFilesystem")({
  name: DatasetName,
  parents: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty),
  wrappingKey: Schema.optionalKey(WrappingKey),
  /** CLI `-n`. Native create still mutates; dry-run is CLI-only. */
  dryRun: Schema.optionalKey(Flag),
  /** CLI `-P` (parsable dry-run). */
  parsable: Schema.optionalKey(Flag),
  /** CLI `-u` (do not mount). */
  unmounted: Schema.optionalKey(Flag),
  /** CLI `-v`. */
  verbose: Schema.optionalKey(Flag)
}) {}

export class CreateVolume extends Schema.Class<CreateVolume>("effect-zfs/args/CreateVolume")({
  name: DatasetName,
  size: VolumeSize,
  sparse: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty),
  wrappingKey: Schema.optionalKey(WrappingKey),
  /** CLI `-b` / `volblocksize`. */
  volblocksize: Schema.optionalKey(VolBlockSize),
  dryRun: Schema.optionalKey(Flag),
  parsable: Schema.optionalKey(Flag),
  unmounted: Schema.optionalKey(Flag),
  verbose: Schema.optionalKey(Flag)
}) {}

export class Destroy extends Schema.Class<Destroy>("effect-zfs/args/Destroy")({
  name: DestroyTarget,
  recursive: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag),
  defer: Schema.optionalKey(Flag),
  /** CLI `-R` (also destroy clones / dependents). */
  descendants: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag),
  parsable: Schema.optionalKey(Flag),
  verbose: Schema.optionalKey(Flag)
}) {}

export class CreateSnapshot extends Schema.Class<CreateSnapshot>("effect-zfs/args/CreateSnapshot")({
  name: SnapshotName,
  recursive: Schema.optionalKey(Flag),
  properties: Schema.optionalKey(Schema.Array(EncodedProperty)),
  /** Extra `zfs snapshot a@s b@s` targets. */
  snapshots: Schema.optionalKey(Schema.NonEmptyArray(SnapshotName))
}) {}

export class Clone extends Schema.Class<Clone>("effect-zfs/args/Clone")({
  snapshot: SnapshotName,
  target: DatasetName,
  properties: Schema.Array(EncodedProperty),
  parents: Schema.optionalKey(Flag)
}) {}

export class Rollback extends Schema.Class<Rollback>("effect-zfs/args/Rollback")({
  snapshot: SnapshotName,
  destroyRecent: Schema.optionalKey(Flag),
  destroyClones: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag)
}) {}

export class Promote extends Schema.Class<Promote>("effect-zfs/args/Promote")({
  name: DatasetName
}) {}

export class Rename extends Schema.Class<Rename>("effect-zfs/args/Rename")({
  from: Schema.Union([SnapshotName, DatasetName]),
  to: Schema.Union([SnapshotName, DatasetName]),
  parents: Schema.optionalKey(Flag),
  unmounted: Schema.optionalKey(Flag),
  recursive: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag)
}) {}

export class StatusPool extends Schema.Class<StatusPool>("effect-zfs/args/StatusPool")({
  name: PoolName
}) {}

/** Absolute device or file path (`EZFS_BADPATH`). */
export const DevicePath = Schema.NonEmptyString.pipe(
  Schema.check(Schema.makeFilter((value: string) => {
    if (value.includes("\0")) return "NUL in path"
    if (value.includes("\n") || value.includes("\r")) return "newline in path"
    if (value.length > maxPathBytes) return "path longer than PATH_MAX"
    if (!value.startsWith("/")) return "path must be absolute"
    if (value === "/") return "root is not a device path"
    if (value.endsWith("/")) return "trailing slash"
    if (value.includes("//")) return "empty path component"
    return undefined
  }, { title: "DevicePath" })),
  Schema.brand("DevicePath")
)
export type DevicePath = typeof DevicePath.Type
export const devicePath = Schema.decodeUnknownSync(DevicePath)

/** Leaf vdev path. Same brand as `DevicePath`. */
export const VdevPath = DevicePath
export type VdevPath = DevicePath
export const vdevPath = devicePath

export const RaidParity = Schema.Literals([1, 2, 3])
export type RaidParity = typeof RaidParity.Type

const DraidGroupCount = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

/** Leaf file-backed vdev. Size floor is `SPA_MINDEVSIZE`. */
export class File extends Schema.TaggedClass<File>("effect-zfs/vdev/File")("File", {
  path: DevicePath,
  size: VdevSize
}) {}

/** Leaf disk vdev. Optional size is validated as `VdevSize` when present. */
export class Disk extends Schema.TaggedClass<Disk>("effect-zfs/vdev/Disk")("Disk", {
  path: DevicePath,
  size: Schema.optionalKey(VdevSize)
}) {}

export const VdevLeaf = Schema.Union([File, Disk])
export type VdevLeaf = typeof VdevLeaf.Type

export class Mirror extends Schema.TaggedClass<Mirror>("effect-zfs/vdev/Mirror")("Mirror", {
  children: Schema.NonEmptyArray(VdevLeaf)
}) {}

export class Raidz extends Schema.TaggedClass<Raidz>("effect-zfs/vdev/Raidz")("Raidz", {
  parity: RaidParity,
  children: Schema.NonEmptyArray(VdevLeaf)
}) {}

export class Draid extends Schema.TaggedClass<Draid>("effect-zfs/vdev/Draid")("Draid", {
  parity: RaidParity,
  data: Schema.optionalKey(DraidGroupCount),
  nchildren: Schema.optionalKey(DraidGroupCount),
  spares: Schema.optionalKey(Schema.Natural),
  children: Schema.NonEmptyArray(VdevLeaf)
}) {}

export const DataVdev = Schema.Union([File, Disk, Mirror, Raidz, Draid])
export type DataVdev = typeof DataVdev.Type

export class Log extends Schema.TaggedClass<Log>("effect-zfs/vdev/Log")("Log", {
  children: Schema.NonEmptyArray(Schema.Union([File, Disk, Mirror]))
}) {}

export class Cache extends Schema.TaggedClass<Cache>("effect-zfs/vdev/Cache")("Cache", {
  children: Schema.NonEmptyArray(VdevLeaf)
}) {}

export class Spare extends Schema.TaggedClass<Spare>("effect-zfs/vdev/Spare")("Spare", {
  children: Schema.NonEmptyArray(VdevLeaf)
}) {}

export const Vdev = Schema.Union([File, Disk, Mirror, Raidz, Draid, Log, Cache, Spare])
export type Vdev = typeof Vdev.Type

const encodeLeaves = (leaves: ReadonlyArray<VdevLeaf>): ReadonlyArray<string> =>
  leaves.map((leaf) => leaf.path)

const encodeDataVdev = (vdev: DataVdev): ReadonlyArray<string> => {
  switch (vdev._tag) {
    case "File":
    case "Disk":
      return [vdev.path]
    case "Mirror":
      return ["mirror", ...encodeLeaves(vdev.children)]
    case "Raidz":
      return [`raidz${vdev.parity}`, ...encodeLeaves(vdev.children)]
    case "Draid": {
      let keyword = `draid${vdev.parity}`
      if (vdev.data !== undefined) keyword += `:${vdev.data}d`
      if (vdev.nchildren !== undefined) keyword += `:${vdev.nchildren}c`
      if (vdev.spares !== undefined) keyword += `:${vdev.spares}s`
      return [keyword, ...encodeLeaves(vdev.children)]
    }
  }
}

const encodeLogChild = (child: File | Disk | Mirror): ReadonlyArray<string> => {
  switch (child._tag) {
    case "File":
    case "Disk":
      return [child.path]
    case "Mirror":
      return ["mirror", ...encodeLeaves(child.children)]
  }
}

/** Flatten a vdev AST into `zpool add` / `zpool create` tokens. */
export const encodeVdev = (vdev: Vdev): ReadonlyArray<string> => {
  switch (vdev._tag) {
    case "File":
    case "Disk":
    case "Mirror":
    case "Raidz":
    case "Draid":
      return encodeDataVdev(vdev)
    case "Log":
      return ["log", ...vdev.children.flatMap((child) => [...encodeLogChild(child)])]
    case "Cache":
      return ["cache", ...encodeLeaves(vdev.children)]
    case "Spare":
      return ["spare", ...encodeLeaves(vdev.children)]
  }
}

export const encodeVdevs = (vdevs: ReadonlyArray<Vdev>): ReadonlyArray<string> =>
  vdevs.flatMap((vdev) => [...encodeVdev(vdev)])

export class ImportPool extends Schema.Class<ImportPool>("effect-zfs/args/ImportPool")({
  name: PoolName,
  newName: Schema.optionalKey(PoolName),
  searchDirs: Schema.optionalKey(Schema.Array(Schema.NonEmptyString)),
  force: Schema.optionalKey(Flag),
  unmounted: Schema.optionalKey(Flag),
  missingLog: Schema.optionalKey(Flag),
  destroyed: Schema.optionalKey(Flag),
  temporary: Schema.optionalKey(Flag),
  altroot: Schema.optionalKey(Schema.NonEmptyString),
  rewindToCheckpoint: Schema.optionalKey(Flag),
  properties: Schema.optionalKey(Schema.Array(EncodedProperty))
}) {}

export class ExportPool extends Schema.Class<ExportPool>("effect-zfs/args/ExportPool")({
  name: PoolName,
  force: Schema.optionalKey(Flag)
}) {}

/** `zpool create`. Native: libzfs `zpool_create` (not lzc). */
export class CreatePool extends Schema.Class<CreatePool>("effect-zfs/args/CreatePool")({
  name: PoolName,
  vdevs: Schema.NonEmptyArray(DataVdev),
  log: Schema.optionalKey(Log),
  cache: Schema.optionalKey(Cache),
  spare: Schema.optionalKey(Spare),
  force: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty),
  filesystemProperties: Schema.Array(EncodedProperty),
  mountpoint: Schema.optionalKey(Schema.NonEmptyString)
}) {}

/** `zpool destroy`. Native: libzfs `zpool_destroy` (not lzc). */
export class DestroyPool extends Schema.Class<DestroyPool>("effect-zfs/args/DestroyPool")({
  name: PoolName,
  force: Schema.optionalKey(Flag)
}) {}

export class ReguidPool extends Schema.Class<ReguidPool>("effect-zfs/args/ReguidPool")({
  name: PoolName,
  guid: Schema.optionalKey(PoolGuid)
}) {}

export class UpgradePool extends Schema.Class<UpgradePool>("effect-zfs/args/UpgradePool")({
  name: PoolName,
  version: Schema.optionalKey(PoolVersion)
}) {}

/** `zfs upgrade [-r] [-V version] -a | filesystem`. Native: libzfs `zfs_upgrade`. */
export class UpgradeDataset extends Schema.Class<UpgradeDataset>("effect-zfs/args/UpgradeDataset")({
  name: Schema.optionalKey(DatasetName),
  all: Schema.optionalKey(Flag),
  recursive: Schema.optionalKey(Flag),
  version: Schema.optionalKey(DatasetVersion)
}) {}

/** `lzc_exists`. CLI: `zfs list` of one name, DatasetNotFound → false. */
export class Exists extends Schema.Class<Exists>("effect-zfs/args/Exists")({
  name: Schema.Union([DatasetName, SnapshotName, BookmarkName])
}) {}

export class ListPools extends Schema.Class<ListPools>("effect-zfs/args/ListPools")({
  name: Schema.optionalKey(PoolName),
  columns: Schema.optionalKey(Schema.NonEmptyArray(Schema.Union([PoolPropertyName, SpecialPropertyName])))
}) {}

/** `lzc_snaprange_space`. CLI: `zfs send -nP -i first last`. */
export class SnaprangeSpace extends Schema.Class<SnaprangeSpace>("effect-zfs/args/SnaprangeSpace")({
  first: SnapshotName,
  last: SnapshotName
}) {}

export class LabelClear extends Schema.Class<LabelClear>("effect-zfs/args/LabelClear")({
  device: DevicePath,
  force: Schema.optionalKey(Flag)
}) {}

export class CheckpointPool extends Schema.Class<CheckpointPool>("effect-zfs/args/CheckpointPool")({
  name: PoolName,
  discard: Schema.optionalKey(Flag)
}) {}

/** Leaf vdev path, GUID, or `zpool status` name. Not a `zfs_namecheck` entity. */
export const VdevId = Schema.NonEmptyString.pipe(
  Schema.check(Schema.makeFilter((value: string) => {
    if (value.includes("\0")) return "NUL in vdev identifier"
    if (value.includes("\n") || value.includes("\r")) return "newline in vdev identifier"
    if (value.length > maxPathBytes) return "vdev identifier longer than PATH_MAX"
    return undefined
  }, { title: "VdevId" })),
  Schema.brand("VdevId")
)
export type VdevId = typeof VdevId.Type
export const vdevId = Schema.decodeUnknownSync(VdevId)

/** `zpool get [-Hp] property pool vdev`. Native: `lzc_get_vdev_prop`. */
export class GetVdevProperty extends Schema.Class<GetVdevProperty>("effect-zfs/args/GetVdevProperty")({
  pool: PoolName,
  vdev: VdevId,
  property: Schema.Union([VdevPropertyName, SpecialPropertyName, UserPropertyName])
}) {}

/** `zpool set property=value pool vdev`. Native: `lzc_set_vdev_prop`. */
export class SetVdevProperty extends Schema.Class<SetVdevProperty>("effect-zfs/args/SetVdevProperty")({
  pool: PoolName,
  vdev: VdevId,
  property: Schema.Union([VdevPropertyName, UserPropertyName]),
  value: PropertyWireValue
}) {}

/**
 * `zpool add [-fn] [-o property=value] pool vdev…` (Linux ZFS 2.2.2).
 * Native: libzfs `zpool_add`.
 */
export class AddVdevs extends Schema.Class<AddVdevs>("effect-zfs/args/AddVdevs")({
  pool: PoolName,
  vdevs: Schema.NonEmptyArray(Vdev),
  force: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty)
}) {}

/**
 * `zpool remove [-nsw] pool device…` or `zpool remove -s pool` (cancel).
 * Native: `zpool_vdev_remove` / `zpool_vdev_remove_cancel`.
 */
export class RemoveVdevs extends Schema.Class<RemoveVdevs>("effect-zfs/args/RemoveVdevs")({
  pool: PoolName,
  devices: Schema.Array(VdevId),
  cancel: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag),
  wait: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool attach [-fsw] [-o property=value] pool device new_device`.
 * Native: `zpool_vdev_attach` with `replacing=0`.
 */
export class AttachVdev extends Schema.Class<AttachVdev>("effect-zfs/args/AttachVdev")({
  pool: PoolName,
  device: VdevId,
  newDevice: DevicePath,
  force: Schema.optionalKey(Flag),
  sequential: Schema.optionalKey(Flag),
  wait: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty)
}) {}

/**
 * `zpool detach pool device`. Native: `zpool_vdev_detach`.
 */
export class DetachVdev extends Schema.Class<DetachVdev>("effect-zfs/args/DetachVdev")({
  pool: PoolName,
  device: VdevId
}) {}

/**
 * `zpool replace [-fsw] [-o property=value] pool device [new_device]`.
 * Native: `zpool_vdev_attach` with `replacing=1`.
 */
export class ReplaceVdev extends Schema.Class<ReplaceVdev>("effect-zfs/args/ReplaceVdev")({
  pool: PoolName,
  device: VdevId,
  newDevice: Schema.optionalKey(DevicePath),
  force: Schema.optionalKey(Flag),
  sequential: Schema.optionalKey(Flag),
  wait: Schema.optionalKey(Flag),
  properties: Schema.Array(EncodedProperty)
}) {}

/**
 * `zpool split [-n] [-R altroot] [-o property=value] pool newpool [device…]`.
 * Native: `zpool_vdev_split`.
 */
export class SplitPool extends Schema.Class<SplitPool>("effect-zfs/args/SplitPool")({
  pool: PoolName,
  newPool: PoolName,
  devices: Schema.optionalKey(Schema.Array(VdevId)),
  dryRun: Schema.optionalKey(Flag),
  altroot: Schema.optionalKey(DevicePath),
  properties: Schema.Array(EncodedProperty)
}) {}

/**
 * `zpool online [-e] pool device…`. Native: `zpool_vdev_online` (`ZFS_ONLINE_EXPAND`).
 */
export class OnlineVdevs extends Schema.Class<OnlineVdevs>("effect-zfs/args/OnlineVdevs")({
  pool: PoolName,
  devices: Schema.NonEmptyArray(VdevId),
  expand: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool offline [-ft] pool device…`. Native: `zpool_vdev_offline`.
 */
export class OfflineVdevs extends Schema.Class<OfflineVdevs>("effect-zfs/args/OfflineVdevs")({
  pool: PoolName,
  devices: Schema.NonEmptyArray(VdevId),
  temporary: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag)
}) {}

/** `lzc_trim` / `zpool trim` command. Omitted means start. */
export const PoolTrimCommand = Schema.Literals(["start", "cancel", "suspend"])
export type PoolTrimCommand = typeof PoolTrimCommand.Type

/** `lzc_initialize` / `zpool initialize` command. Omitted means start. */
export const PoolInitializeCommand = Schema.Literals(["start", "cancel", "suspend", "uninit"])
export type PoolInitializeCommand = typeof PoolInitializeCommand.Type

/**
 * `zpool trim [-dw] [-r rate] [-c | -s] pool [device…]` (Linux ZFS 2.2.2).
 * Native: `lzc_trim`.
 */
export class TrimPool extends Schema.Class<TrimPool>("effect-zfs/args/TrimPool")({
  name: PoolName,
  command: Schema.optionalKey(PoolTrimCommand),
  devices: Schema.optionalKey(Schema.Array(VdevId)),
  wait: Schema.optionalKey(Flag),
  secure: Schema.optionalKey(Flag),
  rate: Schema.optionalKey(ByteCount)
}) {}

/**
 * `zpool initialize [-c | -s | -u] [-w] pool [device…]` (Linux ZFS 2.2.2).
 * Native: `lzc_initialize`.
 */
export class InitializePool extends Schema.Class<InitializePool>("effect-zfs/args/InitializePool")({
  name: PoolName,
  command: Schema.optionalKey(PoolInitializeCommand),
  devices: Schema.optionalKey(Schema.Array(VdevId)),
  wait: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool clear [-nF] pool [device…]` (Linux ZFS 2.2.2). Native: libzfs `zpool_clear`.
 */
export class ClearPool extends Schema.Class<ClearPool>("effect-zfs/args/ClearPool")({
  name: PoolName,
  devices: Schema.optionalKey(Schema.Array(VdevId)),
  rewind: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool reopen [-n] pool`. Native: `lzc_reopen(pool, restart_scrub)`.
 * `noRestart` is CLI `-n` (do not restart an in-progress scrub).
 */
export class ReopenPool extends Schema.Class<ReopenPool>("effect-zfs/args/ReopenPool")({
  name: PoolName,
  noRestart: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool sync [pool]`. Native: `lzc_sync`. `force` is lzc innvl `"force"`;
 * CLI `-f` exists after 2.2.2.
 */
export class SyncPool extends Schema.Class<SyncPool>("effect-zfs/args/SyncPool")({
  name: PoolName,
  force: Schema.optionalKey(Flag)
}) {}

/**
 * `zpool scrub` action. `wait` is `zpool wait -t scrub` / `lzc_wait(ZPOOL_WAIT_SCRUB)`,
 * not `zpool scrub -w` (which also starts or resumes).
 */
export const ScrubCommand = Schema.Literals(["start", "pause", "stop", "wait"])
export type ScrubCommand = typeof ScrubCommand.Type

/**
 * `zpool scrub [-s | -p] pool` or `zpool wait -t scrub pool` (Linux ZFS 2.2.2).
 * Native: `lzc_scrub` / `zpool_scan` / `lzc_wait`.
 */
export class Scrub extends Schema.Class<Scrub>("effect-zfs/args/Scrub")({
  name: PoolName,
  command: ScrubCommand
}) {}

/**
 * `zpool resilver pool` (Linux ZFS 2.2.2). Native: `zpool_scan(POOL_SCAN_RESILVER)`.
 * `wait` is `zpool wait -t resilver` / `lzc_wait(ZPOOL_WAIT_RESILVER)`.
 */
export class Resilver extends Schema.Class<Resilver>("effect-zfs/args/Resilver")({
  name: PoolName,
  wait: Schema.optionalKey(Flag)
}) {}

/** `-i` from a snapshot/bookmark, or `-I` including intermediate snapshots. */
export const IncrementalMode = Schema.Literals(["from", "intermediate"])
export type IncrementalMode = typeof IncrementalMode.Type

/** Snapshot or bookmark used as the incremental source (`-i` / `-I`). */
export const SendFrom = Schema.Union([SnapshotName, BookmarkName])
export type SendFrom = typeof SendFrom.Type

/** `lzc_send` / CLI `-L` `-e` `-c` `-w`. */
export const LzcSendFlag = Schema.Literals(["large-block", "embed", "compress", "raw"])
export type LzcSendFlag = typeof LzcSendFlag.Type

/** `zfs send -t` / `receive_resume_token` wire value. */
export const ResumeToken = Schema.NonEmptyString.pipe(Schema.brand("ResumeToken"))
export type ResumeToken = typeof ResumeToken.Type
export const resumeToken = Schema.decodeUnknownSync(ResumeToken)

export class SendOptions extends Schema.Class<SendOptions>("effect-zfs/args/SendOptions")({
  compressed: Schema.optionalKey(Flag),
  properties: Schema.optionalKey(Flag),
  raw: Schema.optionalKey(Flag),
  replicate: Schema.optionalKey(Flag),
  flags: Schema.optionalKey(Schema.Array(LzcSendFlag)),
  incremental: Schema.optionalKey(IncrementalMode),
  from: Schema.optionalKey(SendFrom),
  resumeToken: Schema.optionalKey(ResumeToken),
  saved: Schema.optionalKey(Flag),
  /** OpenZFS `-X`; requires `replicate`. */
  exclude: Schema.optionalKey(Schema.Array(DatasetName)),
  redact: Schema.optionalKey(BookmarkName),
  progress: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag),
  parsable: Schema.optionalKey(Flag),
  holds: Schema.optionalKey(Flag)
}) {}

export class Send extends Schema.Class<Send>("effect-zfs/args/Send")({
  snapshot: Schema.optionalKey(SnapshotName),
  dataset: Schema.optionalKey(DatasetName),
  options: Schema.optionalKey(SendOptions)
}) {}

export class SendSpaceEstimate extends Schema.Class<SendSpaceEstimate>("effect-zfs/SendSpaceEstimate")({
  bytes: ByteCount
}) {}

export class SendProgress extends Schema.Class<SendProgress>("effect-zfs/args/SendProgress")({
  snapshot: SnapshotName,
  fd: Schema.optionalKey(Schema.Int)
}) {}

export class SendProgressReport extends Schema.Class<SendProgressReport>("effect-zfs/SendProgressReport")({
  bytes: ByteCount,
  blocks: ByteCount
}) {}

/**
 * Destination naming for `zfs receive` (mutually exclusive CLI `-d` / `-e`).
 * Omitted means the target is used exactly.
 */
export const ReceiveDest = Schema.Literals(["prefix", "tail"])
export type ReceiveDest = typeof ReceiveDest.Type

/**
 * `zfs receive` of a backup stream. CLI: `[-FhMnsuv] [-d|-e] [-o origin=snap]
 * [-o property=value] [-x property] [-c]` plus stdin. Native selects
 * `lzc_receive` / `lzc_receive_resumable` / `lzc_receive_with_cmdprops` /
 * `lzc_receive_with_heal`.
 */
export class Receive extends Schema.Class<Receive>("effect-zfs/args/Receive")({
  target: DatasetName,
  force: Schema.optionalKey(Flag),
  unmounted: Schema.optionalKey(Flag),
  dest: Schema.optionalKey(ReceiveDest),
  origin: Schema.optionalKey(SnapshotName),
  properties: Schema.optionalKey(Schema.Array(EncodedProperty)),
  exclude: Schema.optionalKey(Schema.Array(PropertyName)),
  forceUnmount: Schema.optionalKey(Flag),
  dryRun: Schema.optionalKey(Flag),
  resumable: Schema.optionalKey(Flag),
  skipHolds: Schema.optionalKey(Flag),
  verbose: Schema.optionalKey(Flag),
  heal: Schema.optionalKey(Flag)
}) {}

/** `zfs receive -A filesystem|volume`. Aborts a resumable receive. */
export class AbortReceive extends Schema.Class<AbortReceive>("effect-zfs/args/AbortReceive")({
  target: DatasetName
}) {}

export const ListEntityName = Schema.Union([DatasetName, SnapshotName, BookmarkName])
export type ListEntityName = typeof ListEntityName.Type

export class DatasetListItem extends Schema.Class<DatasetListItem>("effect-zfs/DatasetListItem")({
  name: ListEntityName,
  kind: DatasetKind,
  used: Schema.optionalKey(ByteCount),
  available: Schema.optionalKey(ByteCount),
  referenced: Schema.optionalKey(ByteCount),
  mountpoint: Schema.optionalKey(Schema.String),
  extra: Schema.optionalKey(Schema.Record(Schema.String, Schema.String))
}) {}

export class SnapshotListItem extends Schema.Class<SnapshotListItem>("effect-zfs/SnapshotListItem")({
  name: SnapshotName
}) {}

export class PoolListItem extends Schema.Class<PoolListItem>("effect-zfs/PoolListItem")({
  name: PoolName,
  size: ByteCount,
  free: ByteCount,
  health: PoolHealth,
  extra: Schema.optionalKey(Schema.Record(Schema.String, Schema.String))
}) {}

/** `zfs hold [-r] <tag> <snapshot>`. Native: `lzc_hold`. */
export class Hold extends Schema.Class<Hold>("effect-zfs/args/Hold")({
  snapshot: SnapshotName,
  tag: HoldTag,
  recursive: Schema.optionalKey(Flag)
}) {}

/** `zfs holds [-rHp] <snapshot>`. Native: `lzc_get_holds`. */
export class ListHolds extends Schema.Class<ListHolds>("effect-zfs/args/ListHolds")({
  snapshot: SnapshotName,
  recursive: Schema.optionalKey(Flag)
}) {}

/** `zfs release [-r] <tag> <snapshot>`. Native: `lzc_release`. */
export class Release extends Schema.Class<Release>("effect-zfs/args/Release")({
  snapshot: SnapshotName,
  tag: HoldTag,
  recursive: Schema.optionalKey(Flag)
}) {}

/** One `zfs holds -Hp` / `lzc_get_holds` row. `timestamp` is unix seconds as bigint. */
export class SnapshotHold extends Schema.Class<SnapshotHold>("effect-zfs/SnapshotHold")({
  snapshot: SnapshotName,
  tag: HoldTag,
  timestamp: Schema.BigInt
}) {}

/** `zfs bookmark <snapshot|bookmark> <bookmark>`. Native: `lzc_bookmark`. */
export class CreateBookmark extends Schema.Class<CreateBookmark>("effect-zfs/args/CreateBookmark")({
  source: Schema.Union([SnapshotName, BookmarkName]),
  name: BookmarkName
}) {}

/** `zfs destroy <bookmark>`. Native: `lzc_destroy_bookmarks`. */
export class DestroyBookmark extends Schema.Class<DestroyBookmark>("effect-zfs/args/DestroyBookmark")({
  name: BookmarkName
}) {}

/** `zfs list -t bookmark`. Native: `lzc_get_bookmarks`. */
export class ListBookmarks extends Schema.Class<ListBookmarks>("effect-zfs/args/ListBookmarks")({
  root: Schema.optionalKey(DatasetName),
  recursive: Schema.optionalKey(Flag)
}) {}

/** `zfs get` on a bookmark. Native: `lzc_get_bookmark_props`. */
export class GetBookmarkProps extends Schema.Class<GetBookmarkProps>("effect-zfs/args/GetBookmarkProps")({
  name: BookmarkName,
  property: PropertyName
}) {}

export class BookmarkListItem extends Schema.Class<BookmarkListItem>("effect-zfs/BookmarkListItem")({
  name: BookmarkName
}) {}

export { SnapshotComponent, BookmarkName, BookmarkComponent, HoldTag }

/** Non-negative OpenZFS uint64 (`instrlimit`, wait tags, ddt prune amount). */
export const UInt64 = Schema.BigInt.pipe(
  Schema.check(Schema.makeFilter((n: bigint) => {
    if (n < 0n) return "UInt64 is negative"
    if (n > uInt64Max) return "UInt64 exceeds 2^64-1"
    return undefined
  }, { title: "UInt64" })),
  Schema.brand("UInt64")
)
export type UInt64 = typeof UInt64.Type
export const uint64 = Schema.decodeUnknownSync(UInt64)

/** `zfs wait -t` activity. Native: `lzc_wait_fs` / `ZFS_WAIT_DELETEQ`. */
export const FilesystemWaitActivity = Schema.Literals(["deleteq"])
export type FilesystemWaitActivity = typeof FilesystemWaitActivity.Type

/**
 * `zpool wait -t` activities. Native: `lzc_wait` / `zpool_wait_activity_t`.
 * `raidz_expand` and `condense` exist in current OpenZFS; 2.2.2 CLI may reject them.
 */
export const PoolWaitActivity = Schema.Literals([
  "discard",
  "free",
  "initialize",
  "replace",
  "remove",
  "resilver",
  "scrub",
  "trim",
  "raidz_expand",
  "condense"
])
export type PoolWaitActivity = typeof PoolWaitActivity.Type

export const DdtPruneUnit = Schema.Literals(["days", "percentage"])
export type DdtPruneUnit = typeof DdtPruneUnit.Type

/** `lzc_condense` / `zpool condense -t`. */
export const CondenseType = Schema.Literals(["log_spacemap"])
export type CondenseType = typeof CondenseType.Type

/** `lzc_condense` command string. Omitted means start. */
export const CondenseCommand = Schema.Literals(["start", "cancel"])
export type CondenseCommand = typeof CondenseCommand.Type

export const DiffChange = Schema.Literals(["-", "+", "M", "R"])
export type DiffChange = typeof DiffChange.Type

export const DiffFileType = Schema.Literals(["B", "C", "/", ">", "|", "@", "P", "=", "F"])
export type DiffFileType = typeof DiffFileType.Type

/**
 * `zfs program [-jn] [-t instrlimit] [-m memlimit] pool script [argv…]`.
 * `program` is Lua source (native `lzc_channel_program`); CLI writes it via stdin.
 */
export class ChannelProgram extends Schema.Class<ChannelProgram>("effect-zfs/args/ChannelProgram")({
  pool: PoolName,
  program: Schema.NonEmptyString,
  argv: Schema.optionalKey(Schema.Array(Schema.String)),
  instructionLimit: Schema.optionalKey(UInt64),
  memoryLimit: Schema.optionalKey(UInt64),
  nosync: Schema.optionalKey(Flag)
}) {}

export class ChannelProgramResult extends Schema.Class<ChannelProgramResult>("effect-zfs/ChannelProgramResult")({
  raw: Schema.String,
  json: Schema.optionalKey(Schema.Unknown)
}) {}

/** `zfs redact snapshot bookmark redaction_snapshot…`. Native: `lzc_redact`. */
export class Redact extends Schema.Class<Redact>("effect-zfs/args/Redact")({
  snapshot: SnapshotName,
  bookmark: BookmarkComponent,
  snapshots: Schema.NonEmptyArray(SnapshotName)
}) {}

/** `zfs wait [-t activity[,…]] filesystem`. Native: `lzc_wait_fs`. */
export class WaitFilesystem extends Schema.Class<WaitFilesystem>("effect-zfs/args/WaitFilesystem")({
  dataset: DatasetName,
  activities: Schema.optionalKey(Schema.NonEmptyArray(FilesystemWaitActivity))
}) {}

/** `zpool wait [-t activity[,…]] pool`. Native: `lzc_wait` / `lzc_wait_tag`. */
export class WaitPool extends Schema.Class<WaitPool>("effect-zfs/args/WaitPool")({
  pool: PoolName,
  activities: Schema.optionalKey(Schema.NonEmptyArray(PoolWaitActivity)),
  tag: Schema.optionalKey(UInt64)
}) {}

export class WaitResult extends Schema.Class<WaitResult>("effect-zfs/WaitResult")({
  waited: Schema.optionalKey(Flag)
}) {}

/** `zfs diff [-FHt] snapshot [snapshot|filesystem]`. Native: `ZFS_IOC_DIFF`. */
export class Diff extends Schema.Class<Diff>("effect-zfs/args/Diff")({
  from: SnapshotName,
  to: Schema.optionalKey(Schema.Union([SnapshotName, DatasetName])),
  fileTypes: Schema.optionalKey(Flag),
  timestamps: Schema.optionalKey(Flag)
}) {}

export class DiffEntry extends Schema.Class<DiffEntry>("effect-zfs/DiffEntry")({
  change: DiffChange,
  path: Schema.String,
  newPath: Schema.optionalKey(Schema.String),
  fileType: Schema.optionalKey(DiffFileType),
  ctime: Schema.optionalKey(Schema.String),
  raw: Schema.String
}) {}

/** Linux `zfs zone` / `zfs unzone`. Native: `ZFS_IOC_USERNS_ATTACH` / `DETACH`. */
export class Zone extends Schema.Class<Zone>("effect-zfs/args/Zone")({
  namespace: DevicePath,
  dataset: DatasetName
}) {}

export class GetBootenv extends Schema.Class<GetBootenv>("effect-zfs/args/GetBootenv")({
  pool: PoolName
}) {}

export class BootenvPair extends Schema.Class<BootenvPair>("effect-zfs/BootenvPair")({
  key: Schema.NonEmptyString,
  value: Schema.String
}) {}

/** Native: `lzc_set_bootenv` nvlist pairs. CLI: `zfsbootenv -k -v`. */
export class SetBootenv extends Schema.Class<SetBootenv>("effect-zfs/args/SetBootenv")({
  pool: PoolName,
  pairs: Schema.Array(BootenvPair)
}) {}

export class Bootenv extends Schema.Class<Bootenv>("effect-zfs/Bootenv")({
  pool: PoolName,
  raw: Schema.String,
  pairs: Schema.Array(BootenvPair)
}) {}

/** `zpool ddtprune -d days | -p percentage pool`. Native: `lzc_ddt_prune`. */
export class DdtPrune extends Schema.Class<DdtPrune>("effect-zfs/args/DdtPrune")({
  pool: PoolName,
  unit: DdtPruneUnit,
  amount: UInt64
}) {}

/** `zpool condense [-t type] [-c | -w] pool`. Native: `lzc_condense`. */
export class Condense extends Schema.Class<Condense>("effect-zfs/args/Condense")({
  pool: PoolName,
  type: Schema.optionalKey(CondenseType),
  command: Schema.optionalKey(CondenseCommand),
  wait: Schema.optionalKey(Flag)
}) {}

const diffChangeOf = (value: string): DiffChange | undefined => {
  switch (value) {
    case "-":
    case "+":
    case "M":
    case "R":
      return value
    default:
      return undefined
  }
}

const diffFileTypeOf = (value: string): DiffFileType | undefined => {
  switch (value) {
    case "B":
    case "C":
    case "/":
    case ">":
    case "|":
    case "@":
    case "P":
    case "=":
    case "F":
      return value
    default:
      return undefined
  }
}

/** Parse `zfs diff -H` rows. */
export const parseDiffOutput = (
  stdout: string,
  options: { readonly fileTypes?: boolean; readonly timestamps?: boolean } = {}
): ReadonlyArray<DiffEntry> => {
  const trimmed = stdout.trim()
  if (trimmed === "") return []
  const rows: DiffEntry[] = []
  for (const line of trimmed.split("\n")) {
    const columns = line.split("\t")
    let index = 0
    const ctime = options.timestamps === true ? columns[index++] : undefined
    const change = diffChangeOf(columns[index++] ?? "")
    if (change === undefined) continue
    const fileType = options.fileTypes === true ? diffFileTypeOf(columns[index++] ?? "") : undefined
    const path = columns[index++] ?? ""
    const newPath = columns[index++]
    rows.push(new DiffEntry({
      change,
      path,
      raw: line,
      ...(ctime === undefined || ctime === "" ? {} : { ctime }),
      ...(fileType === undefined ? {} : { fileType }),
      ...(newPath === undefined || newPath === "" ? {} : { newPath })
    }))
  }
  return rows
}

/** Best-effort `nvlist_print` / `zfsbootenv` lines into pairs. */
export const parseBootenvPairs = (raw: string): ReadonlyArray<BootenvPair> => {
  const pairs: BootenvPair[] = []
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    const colon = trimmed.search(/:\s/)
    if (colon <= 0) continue
    const key = trimmed.slice(0, colon).trim()
    const value = trimmed.slice(colon + 1).trim().replace(/^'|'$/g, "")
    if (key.length === 0) continue
    pairs.push(new BootenvPair({ key, value }))
  }
  return pairs
}

/** `zfs load-key [-nr] [-L keylocation] [-a | filesystem]`. Native: `lzc_load_key`. */
export class LoadKey extends Schema.Class<LoadKey>("effect-zfs/args/LoadKey")({
  name: Schema.optionalKey(DatasetName),
  all: Schema.optionalKey(Flag),
  recursive: Schema.optionalKey(Flag),
  noop: Schema.optionalKey(Flag),
  keylocation: Schema.optionalKey(KeyLocation),
  keyformat: Schema.optionalKey(KeyFormat),
  wrappingKey: Schema.optionalKey(WrappingKey)
}) {}

/** `zfs unload-key [-r] [-a | filesystem]`. Native: `lzc_unload_key`. */
export class UnloadKey extends Schema.Class<UnloadKey>("effect-zfs/args/UnloadKey")({
  name: Schema.optionalKey(DatasetName),
  all: Schema.optionalKey(Flag),
  recursive: Schema.optionalKey(Flag)
}) {}

/** `zfs change-key [-l] [-i] [-f] [-o property=value] filesystem`. Native: `lzc_change_key`. */
export class ChangeKey extends Schema.Class<ChangeKey>("effect-zfs/args/ChangeKey")({
  name: DatasetName,
  command: Schema.optionalKey(ChangeKeyCommand),
  load: Schema.optionalKey(Flag),
  keyformat: Schema.optionalKey(KeyFormat),
  keylocation: Schema.optionalKey(KeyLocation),
  pbkdf2iters: Schema.optionalKey(Schema.BigInt),
  wrappingKey: Schema.optionalKey(WrappingKey)
}) {}

const positiveInt = (title: string) =>
  Schema.Int.pipe(
    Schema.check(Schema.makeFilter((n: number) => n >= 1 ? undefined : `${title} must be >= 1`, { title })),
    Schema.brand(title)
  )

/** `zpool iostat` interval in seconds. */
export const SampleInterval = positiveInt("SampleInterval")
export type SampleInterval = typeof SampleInterval.Type

/** `zpool iostat` sample count. */
export const SampleCount = positiveInt("SampleCount")
export type SampleCount = typeof SampleCount.Type

/** Linux `ZEVENT_SEEK_START`. */
export const eventsSeekStart = uint64(0n)
/** Linux `ZEVENT_SEEK_END`. */
export const eventsSeekEnd = uint64(uInt64Max)

/** `zpool prefetch -t` / `lzc_pool_prefetch`. Omitted means every type. */
export const PoolPrefetchType = Schema.Literals(["ddt", "brt"])
export type PoolPrefetchType = typeof PoolPrefetchType.Type

/**
 * `zpool events [-vHf] [pool]`. Native: libzfs `zpool_events_next`
 * (`ZFS_IOC_EVENTS_NEXT`). `follow` uses blocking `ZEVENT_NONE`; otherwise
 * `ZEVENT_NONBLOCK`. Do not buffer the kernel log.
 */
export class Events extends Schema.Class<Events>("effect-zfs/args/Events")({
  name: Schema.optionalKey(PoolName),
  follow: Schema.optionalKey(Flag),
  verbose: Schema.optionalKey(Flag)
}) {}

/** `zpool events -c`. Native: `zpool_events_clear` (`ZFS_IOC_EVENTS_CLEAR`). */
export class EventsClear extends Schema.Class<EventsClear>("effect-zfs/args/EventsClear")({}) {}

/** Linux `zpool_events_seek` / `ZFS_IOC_EVENTS_SEEK`. */
export class EventsSeek extends Schema.Class<EventsSeek>("effect-zfs/args/EventsSeek")({
  eid: UInt64
}) {}

/**
 * `zpool iostat [-Hpv] [-y] [-T u] [pool [vdev…]] [interval [count]]`.
 * Native: libzfs pool/vdev stats. Yield a `Stream` of samples.
 */
export class Iostat extends Schema.Class<Iostat>("effect-zfs/args/Iostat")({
  name: Schema.optionalKey(PoolName),
  vdevs: Schema.optionalKey(Schema.Array(VdevId)),
  interval: Schema.optionalKey(SampleInterval),
  count: Schema.optionalKey(SampleCount),
  verbose: Schema.optionalKey(Flag),
  skipSinceBoot: Schema.optionalKey(Flag)
}) {}

/** `zpool history [-il] [pool]`. Native: libzfs `zpool_get_history`. */
export class History extends Schema.Class<History>("effect-zfs/args/History")({
  name: Schema.optionalKey(PoolName),
  internal: Schema.optionalKey(Flag),
  longFormat: Schema.optionalKey(Flag)
}) {}

/** `zpool prefetch [-t type] pool`. Native: `lzc_pool_prefetch`. */
export class Prefetch extends Schema.Class<Prefetch>("effect-zfs/args/Prefetch")({
  name: PoolName,
  prefetchType: Schema.optionalKey(PoolPrefetchType)
}) {}

export class PoolEvent extends Schema.Class<PoolEvent>("effect-zfs/PoolEvent")({
  time: Schema.String,
  eventClass: Schema.NonEmptyString,
  pool: Schema.optionalKey(PoolName),
  payload: Schema.Record(Schema.String, Schema.String)
}) {}

export class EventsCleared extends Schema.Class<EventsCleared>("effect-zfs/EventsCleared")({
  dropped: Schema.Int
}) {}

export class IostatRow extends Schema.Class<IostatRow>("effect-zfs/IostatRow")({
  name: Schema.NonEmptyString,
  allocated: ByteCount,
  free: ByteCount,
  readOps: ByteCount,
  writeOps: ByteCount,
  readBytes: ByteCount,
  writeBytes: ByteCount
}) {}

export class IostatSample extends Schema.Class<IostatSample>("effect-zfs/IostatSample")({
  timestamp: Schema.optionalKey(Schema.BigInt),
  rows: Schema.Array(IostatRow)
}) {}

export class HistoryRecord extends Schema.Class<HistoryRecord>("effect-zfs/HistoryRecord")({
  time: Schema.String,
  command: Schema.String,
  internal: Flag,
  user: Schema.optionalKey(Schema.String),
  hostname: Schema.optionalKey(Schema.String),
  zone: Schema.optionalKey(Schema.String)
}) {}

const whyAbsolutePath = (value: string): string | undefined =>
  value.startsWith("/") ? undefined : "path must be absolute"

/** Absolute filesystem path accepted by `zfs unmount` / `zfs unshare`. */
export const AbsolutePath = Schema.NonEmptyString.pipe(
  Schema.check(Schema.makeFilter(whyAbsolutePath, {
    title: "AbsolutePath",
    description: "absolute filesystem path"
  })),
  Schema.brand("AbsolutePath")
)
export type AbsolutePath = typeof AbsolutePath.Type
export const absolutePath = Schema.decodeUnknownSync(AbsolutePath)

/** NFS/SMB share protocol. CLI uses `sharenfs`/`sharesmb`; native `zfs_share` takes this list. */
export const ShareProtocol = Schema.Literals(["nfs", "smb"])
export type ShareProtocol = typeof ShareProtocol.Type

/**
 * `zfs mount [-Oflv] [-o options] -a|-R filesystem|filesystem` (Linux ZFS 2.2.2).
 * Native: libzfs `zfs_mount` / `zfs_mount_at` (not lzc).
 */
export class MountFilesystem extends Schema.Class<MountFilesystem>("effect-zfs/args/MountFilesystem")({
  name: Schema.optionalKey(DatasetName),
  all: Schema.optionalKey(Flag),
  overlay: Schema.optionalKey(Flag),
  recursive: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag),
  loadKeys: Schema.optionalKey(Flag),
  verbose: Schema.optionalKey(Flag),
  options: Schema.optionalKey(Schema.NonEmptyString)
}) {}

/**
 * `zfs unmount [-fu] -a|filesystem|mountpoint`. Native: libzfs `zfs_unmount` / `zfs_unmountall`.
 */
export class UnmountFilesystem extends Schema.Class<UnmountFilesystem>("effect-zfs/args/UnmountFilesystem")({
  target: Schema.optionalKey(Schema.Union([DatasetName, AbsolutePath])),
  all: Schema.optionalKey(Flag),
  force: Schema.optionalKey(Flag),
  unloadKeys: Schema.optionalKey(Flag)
}) {}

/**
 * `zfs share [-l] -a|filesystem`. NFS/SMB follow dataset `sharenfs`/`sharesmb`.
 * Native: libzfs `zfs_share` (not lzc).
 */
export class ShareFilesystem extends Schema.Class<ShareFilesystem>("effect-zfs/args/ShareFilesystem")({
  name: Schema.optionalKey(DatasetName),
  all: Schema.optionalKey(Flag),
  loadKeys: Schema.optionalKey(Flag)
}) {}

/**
 * `zfs unshare -a|filesystem|mountpoint`. Native: libzfs `zfs_unshare` / `zfs_unshareall`.
 */
export class UnshareFilesystem extends Schema.Class<UnshareFilesystem>("effect-zfs/args/UnshareFilesystem")({
  target: Schema.optionalKey(Schema.Union([DatasetName, AbsolutePath])),
  all: Schema.optionalKey(Flag)
}) {}

/** Canonical `zfs_deleg_perm_tab` subcommands (Linux ZFS 2.2.2). */
export const delegSubcommands = [
  "allow",
  "bookmark",
  "clone",
  "create",
  "destroy",
  "diff",
  "mount",
  "promote",
  "receive",
  "receive:append",
  "rename",
  "rollback",
  "snapshot",
  "share",
  "send",
  "send:raw",
  "send:encrypted",
  "userprop",
  "userquota",
  "groupquota",
  "userused",
  "groupused",
  "userobjquota",
  "groupobjquota",
  "userobjused",
  "groupobjused",
  "hold",
  "release",
  "load-key",
  "change-key",
  "projectused",
  "projectquota",
  "projectobjused",
  "projectobjquota"
] as const

export const DelegSubcommand = Schema.Literals(delegSubcommands)
export type DelegSubcommand = typeof DelegSubcommand.Type

const delegPermissionWhy = (value: string): string | undefined => {
  if (value.length === 0) return "empty permission"
  if (value.includes(",") || /\s/.test(value)) return "permission must be a single token"
  if (value.startsWith("@")) return permsetWhy(value)
  return undefined
}

/** Delegatable subcommand, `@set`, or property name. */
export const DelegPermission = Schema.NonEmptyString.pipe(
  Schema.check(Schema.makeFilter(delegPermissionWhy, { title: "DelegPermission" })),
  Schema.brand("DelegPermission")
)
export type DelegPermission = typeof DelegPermission.Type
export const delegPermission = Schema.decodeUnknownSync(DelegPermission)

export const DelegWhoKind = Schema.Literals(["user", "group", "everyone", "create", "set"])
export type DelegWhoKind = typeof DelegWhoKind.Type

export const DelegInherit = Schema.Literals(["local", "descendant", "local+descendant"])
export type DelegInherit = typeof DelegInherit.Type

export class DelegWho extends Schema.Class<DelegWho>("effect-zfs/args/DelegWho")({
  kind: DelegWhoKind,
  name: Schema.optionalKey(Schema.NonEmptyString)
}) {}

/** `zfs allow [-ldug] who perm[,…] dataset` / `-e` / `-c` / `-s`. Native: `zfs_set_fsacl`. */
export class Allow extends Schema.Class<Allow>("effect-zfs/args/Allow")({
  name: DatasetName,
  who: DelegWho,
  permissions: Schema.Array(DelegPermission),
  inherit: Schema.optionalKey(DelegInherit)
}) {}

/** `zfs unallow [-rldug] who [perm[,…]] dataset`. Native: `zfs_set_fsacl` unallow. */
export class Unallow extends Schema.Class<Unallow>("effect-zfs/args/Unallow")({
  name: DatasetName,
  who: DelegWho,
  permissions: Schema.optionalKey(Schema.Array(DelegPermission)),
  inherit: Schema.optionalKey(DelegInherit),
  recursive: Schema.optionalKey(Flag)
}) {}

/** `zfs allow dataset` (print ACL). Native: `zfs_get_fsacl`. */
export class ListAllow extends Schema.Class<ListAllow>("effect-zfs/args/ListAllow")({
  name: DatasetName
}) {}

export class AllowSet extends Schema.Class<AllowSet>("effect-zfs/AllowSet")({
  name: DelegPermSetName,
  permissions: Schema.Array(DelegPermission)
}) {}

export class AllowGrant extends Schema.Class<AllowGrant>("effect-zfs/AllowGrant")({
  who: DelegWho,
  inherit: DelegInherit,
  permissions: Schema.Array(DelegPermission)
}) {}

export class AllowListing extends Schema.Class<AllowListing>("effect-zfs/AllowListing")({
  setpoint: DatasetName,
  sets: Schema.Array(AllowSet),
  create: Schema.Array(DelegPermission),
  grants: Schema.Array(AllowGrant)
}) {}

export const QuotaSpaceType = Schema.Literals([
  "posixuser",
  "smbuser",
  "posixgroup",
  "smbgroup",
  "all"
])
export type QuotaSpaceType = typeof QuotaSpaceType.Type

/**
 * `zfs userspace|groupspace|projectspace [-Hnip] [-t type] filesystem|snapshot`.
 * Native: `zfs_userspace` / `ZFS_IOC_USERSPACE_MANY`.
 */
export class Userspace extends Schema.Class<Userspace>("effect-zfs/args/Userspace")({
  name: Schema.Union([DatasetName, SnapshotName]),
  numeric: Schema.optionalKey(Flag),
  sidToPosix: Schema.optionalKey(Flag),
  types: Schema.optionalKey(Schema.Array(QuotaSpaceType))
}) {}

export class UserspaceRow extends Schema.Class<UserspaceRow>("effect-zfs/UserspaceRow")({
  type: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  used: ByteCount,
  quota: BytesOrNone,
  objused: Schema.optionalKey(ByteCount),
  objquota: Schema.optionalKey(BytesOrNone)
}) {}

export const ProjectAction = Schema.Literals(["list", "set", "clear", "check"])
export type ProjectAction = typeof ProjectAction.Type

/** `zfs project` on file paths. Native: `ZFS_IOC_FSGETXATTR` / `FSSETXATTR`. */
export class Project extends Schema.Class<Project>("effect-zfs/args/Project")({
  action: ProjectAction,
  paths: Schema.Array(Schema.NonEmptyString),
  projectId: Schema.optionalKey(ProjectId),
  recursive: Schema.optionalKey(Flag),
  directoryOnly: Schema.optionalKey(Flag),
  inherit: Schema.optionalKey(Flag),
  keepId: Schema.optionalKey(Flag)
}) {}

export class ProjectRow extends Schema.Class<ProjectRow>("effect-zfs/ProjectRow")({
  path: Schema.NonEmptyString,
  projectId: ProjectId,
  inherit: Flag,
  message: Schema.optionalKey(Schema.String)
}) {}


import { Schema, SchemaGetter, SchemaTransformation } from "effect"
import { BookmarkName, DatasetName, HoldTag, PoolName, SnapshotName } from "./Name.js"

/**
 * Linux ZFS boolean wire values. Most properties use `on`/`off`;
 * readonly index props such as `mounted` and `defer_destroy` use `yes`/`no`.
 */
export const BooleanFromOnOff: Schema.Codec<boolean, "on" | "off" | "yes" | "no"> = Schema.Literals([
  "on",
  "off",
  "yes",
  "no"
]).pipe(
  Schema.decodeTo(
    Schema.Boolean,
    SchemaTransformation.transform({
      decode: (value) => value === "on" || value === "yes",
      encode: (value) => (value ? "on" : "off")
    })
  )
)

/** Parsable (`-p`) uint64. Never a JavaScript number. */
export const UInt64FromString = Schema.BigIntFromString

/** Small integers such as `ashift`. */
export const IntegerFromString = Schema.FiniteFromString

export const BytesOrNone: Schema.Codec<bigint | "none", string> = Schema.Union([
  Schema.Literals(["none"]),
  Schema.BigIntFromString
])

export const DatasetKind = Schema.Literals(["filesystem", "volume", "snapshot", "bookmark"])
export type DatasetKind = typeof DatasetKind.Type

export const PropertySource = Schema.String

export const propertyValueCodec = (
  codec: "boolean" | "integer" | "bytes" | "bytesOrNone" | "enum" | "string" | "bigint",
  values?: readonly string[]
): Schema.Codec<unknown, string> => {
  switch (codec) {
    case "boolean":
      return BooleanFromOnOff
    case "integer":
      return IntegerFromString
    case "bytes":
    case "bigint":
      return UInt64FromString
    case "bytesOrNone":
      return BytesOrNone
    case "enum": {
      const listed = values ?? []
      const first = listed[0]
      if (first === undefined) return Schema.String
      return Schema.Literals([first, ...listed.slice(1)])
    }
    default:
      return Schema.String
  }
}

/** `-H` / `-p` CLI rows are tab-separated strings. */
export const TabSeparated: Schema.Codec<ReadonlyArray<string>, string> = Schema.String.pipe(
  Schema.decodeTo(Schema.Array(Schema.String), {
    decode: SchemaGetter.transform((line: string) => line.split("\t")),
    encode: SchemaGetter.transform((columns: ReadonlyArray<string>) => columns.join("\t"))
  })
)

export const Lines: Schema.Codec<ReadonlyArray<string>, string> = Schema.String.pipe(
  Schema.decodeTo(Schema.Array(Schema.String), {
    decode: SchemaGetter.transform((text: string) => {
      const trimmed = text.trim()
      return trimmed === "" ? [] : trimmed.split("\n")
    }),
    encode: SchemaGetter.transform((lines: ReadonlyArray<string>) => lines.join("\n"))
  })
)

export const DatasetListTuple = Schema.Tuple([
  DatasetName,
  DatasetKind,
  UInt64FromString,
  UInt64FromString,
  UInt64FromString,
  Schema.String
])

/** `zpool list -o health` / `zpool status` vdev STATE. */
export const PoolHealth = Schema.Literals([
  "ONLINE",
  "DEGRADED",
  "FAULTED",
  "OFFLINE",
  "UNAVAIL",
  "REMOVED",
  "SUSPENDED"
])
export type PoolHealth = typeof PoolHealth.Type

export const poolHealthOf = (value: string | undefined): PoolHealth | undefined => {
  switch (value) {
    case "ONLINE":
    case "DEGRADED":
    case "FAULTED":
    case "OFFLINE":
    case "UNAVAIL":
    case "REMOVED":
    case "SUSPENDED":
      return value
    default:
      return undefined
  }
}

export const PoolListTuple = Schema.Tuple([
  PoolName,
  UInt64FromString,
  UInt64FromString,
  PoolHealth
])

/** `zfs holds -Hp` columns: snapshot, tag, unix-seconds. */
export const HoldsListTuple = Schema.Tuple([
  SnapshotName,
  HoldTag,
  UInt64FromString
])

/** `zfs list -t bookmark -Hp -o name,type` columns. */
export const BookmarkListTuple = Schema.Tuple([
  BookmarkName,
  Schema.Literals(["bookmark"])
])

export const PropertyGetTuple = Schema.Union([
  Schema.Tuple([Schema.String, Schema.String, Schema.String, Schema.String, Schema.String]),
  Schema.Tuple([Schema.String, Schema.String, Schema.String, Schema.String])
])

export class Dataset extends Schema.Class<Dataset>("effect-zfs/Dataset")({
  name: DatasetName,
  kind: DatasetKind,
  used: Schema.optionalKey(Schema.BigInt),
  available: Schema.optionalKey(Schema.BigInt),
  referenced: Schema.optionalKey(Schema.BigInt),
  mountpoint: Schema.optionalKey(Schema.String),
  extra: Schema.optionalKey(Schema.Record(Schema.String, Schema.String))
}) {}

export type KindedDataset<K extends DatasetKind> = Dataset & { readonly kind: K }

export const dataset = <K extends DatasetKind>(name: DatasetName, kind: K): KindedDataset<K> =>
  new Dataset({ name, kind }) as KindedDataset<K>

export class Snapshot extends Schema.Class<Snapshot>("effect-zfs/Snapshot")({
  name: SnapshotName,
  dataset: Dataset
}) {}

export class Bookmark extends Schema.Class<Bookmark>("effect-zfs/Bookmark")({
  name: BookmarkName,
  dataset: DatasetName
}) {}

export class DatasetListRow extends Schema.Class<DatasetListRow>("effect-zfs/DatasetListRow")({
  name: DatasetName,
  kind: DatasetKind,
  used: UInt64FromString,
  available: UInt64FromString,
  referenced: UInt64FromString,
  mountpoint: Schema.String
}) {}

export class Pool extends Schema.Class<Pool>("effect-zfs/Pool")({
  name: PoolName,
  size: UInt64FromString,
  free: UInt64FromString,
  health: PoolHealth
}) {}

export class PropertyGetRow extends Schema.Class<PropertyGetRow>("effect-zfs/PropertyGetRow")({
  name: Schema.String,
  property: Schema.String,
  value: Schema.String,
  received: Schema.optionalKey(Schema.String),
  source: PropertySource
}) {}

/**
 * `zpool status` scan / resilver / error-scrub stats.
 * JSON (2.3+) uses snake_case keys and string or integer values; text `-p`
 * is a single `scan:` summary line stored in `summary`.
 */
export class PoolScan extends Schema.Class<PoolScan>("effect-zfs/PoolScan")({
  function: Schema.optionalKey(Schema.String),
  state: Schema.optionalKey(Schema.String),
  startTime: Schema.optionalKey(Schema.String),
  endTime: Schema.optionalKey(Schema.String),
  toExamine: Schema.optionalKey(Schema.String),
  examined: Schema.optionalKey(Schema.String),
  skipped: Schema.optionalKey(Schema.String),
  processed: Schema.optionalKey(Schema.String),
  errors: Schema.optionalKey(Schema.String),
  bytesPerScan: Schema.optionalKey(Schema.String),
  passStart: Schema.optionalKey(Schema.String),
  scrubPause: Schema.optionalKey(Schema.String),
  scrubSpentPaused: Schema.optionalKey(Schema.String),
  issuedBytesPerScan: Schema.optionalKey(Schema.String),
  issued: Schema.optionalKey(Schema.String),
  summary: Schema.optionalKey(Schema.String)
}) {}

const ScanField = Schema.Union([Schema.String, Schema.Number, Schema.BigInt]).pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: (value) => String(value),
      encode: (value) => value
    })
  )
)

const PoolScanWire = Schema.Struct({
  function: Schema.optionalKey(ScanField),
  state: Schema.optionalKey(ScanField),
  start_time: Schema.optionalKey(ScanField),
  startTime: Schema.optionalKey(ScanField),
  end_time: Schema.optionalKey(ScanField),
  endTime: Schema.optionalKey(ScanField),
  to_examine: Schema.optionalKey(ScanField),
  toExamine: Schema.optionalKey(ScanField),
  examined: Schema.optionalKey(ScanField),
  skipped: Schema.optionalKey(ScanField),
  processed: Schema.optionalKey(ScanField),
  errors: Schema.optionalKey(ScanField),
  bytes_per_scan: Schema.optionalKey(ScanField),
  bytesPerScan: Schema.optionalKey(ScanField),
  pass_start: Schema.optionalKey(ScanField),
  passStart: Schema.optionalKey(ScanField),
  scrub_pause: Schema.optionalKey(ScanField),
  scrubPause: Schema.optionalKey(ScanField),
  scrub_spent_paused: Schema.optionalKey(ScanField),
  scrubSpentPaused: Schema.optionalKey(ScanField),
  issued_bytes_per_scan: Schema.optionalKey(ScanField),
  issuedBytesPerScan: Schema.optionalKey(ScanField),
  issued: Schema.optionalKey(ScanField),
  summary: Schema.optionalKey(Schema.String)
})

const poolScanFromWire = (row: typeof PoolScanWire.Type): PoolScan => {
  const startTime = row.startTime ?? row.start_time
  const endTime = row.endTime ?? row.end_time
  const toExamine = row.toExamine ?? row.to_examine
  const bytesPerScan = row.bytesPerScan ?? row.bytes_per_scan
  const passStart = row.passStart ?? row.pass_start
  const scrubPause = row.scrubPause ?? row.scrub_pause
  const scrubSpentPaused = row.scrubSpentPaused ?? row.scrub_spent_paused
  const issuedBytesPerScan = row.issuedBytesPerScan ?? row.issued_bytes_per_scan
  return new PoolScan({
    ...(row.function === undefined ? {} : { function: row.function }),
    ...(row.state === undefined ? {} : { state: row.state }),
    ...(startTime === undefined ? {} : { startTime }),
    ...(endTime === undefined ? {} : { endTime }),
    ...(toExamine === undefined ? {} : { toExamine }),
    ...(row.examined === undefined ? {} : { examined: row.examined }),
    ...(row.skipped === undefined ? {} : { skipped: row.skipped }),
    ...(row.processed === undefined ? {} : { processed: row.processed }),
    ...(row.errors === undefined ? {} : { errors: row.errors }),
    ...(bytesPerScan === undefined ? {} : { bytesPerScan }),
    ...(passStart === undefined ? {} : { passStart }),
    ...(scrubPause === undefined ? {} : { scrubPause }),
    ...(scrubSpentPaused === undefined ? {} : { scrubSpentPaused }),
    ...(issuedBytesPerScan === undefined ? {} : { issuedBytesPerScan }),
    ...(row.issued === undefined ? {} : { issued: row.issued }),
    ...(row.summary === undefined ? {} : { summary: row.summary })
  })
}

const PoolScanFromString = Schema.String.pipe(
  Schema.decodeTo(
    PoolScan,
    SchemaTransformation.transform({
      decode: (summary) => new PoolScan({ summary }),
      encode: (scan) => scan.summary ?? scan.function ?? ""
    })
  )
)

const PoolScanFromWire = PoolScanWire.pipe(
  Schema.decodeTo(
    PoolScan,
    SchemaTransformation.transform({
      decode: poolScanFromWire,
      encode: (scan) => ({
        ...(scan.function === undefined ? {} : { function: scan.function }),
        ...(scan.state === undefined ? {} : { state: scan.state }),
        ...(scan.startTime === undefined ? {} : { start_time: scan.startTime, startTime: scan.startTime }),
        ...(scan.endTime === undefined ? {} : { end_time: scan.endTime, endTime: scan.endTime }),
        ...(scan.toExamine === undefined ? {} : { to_examine: scan.toExamine, toExamine: scan.toExamine }),
        ...(scan.examined === undefined ? {} : { examined: scan.examined }),
        ...(scan.skipped === undefined ? {} : { skipped: scan.skipped }),
        ...(scan.processed === undefined ? {} : { processed: scan.processed }),
        ...(scan.errors === undefined ? {} : { errors: scan.errors }),
        ...(scan.bytesPerScan === undefined ? {} : { bytes_per_scan: scan.bytesPerScan, bytesPerScan: scan.bytesPerScan }),
        ...(scan.passStart === undefined ? {} : { pass_start: scan.passStart, passStart: scan.passStart }),
        ...(scan.scrubPause === undefined ? {} : { scrub_pause: scan.scrubPause, scrubPause: scan.scrubPause }),
        ...(scan.scrubSpentPaused === undefined ? {} : { scrub_spent_paused: scan.scrubSpentPaused, scrubSpentPaused: scan.scrubSpentPaused }),
        ...(scan.issuedBytesPerScan === undefined ? {} : { issued_bytes_per_scan: scan.issuedBytesPerScan, issuedBytesPerScan: scan.issuedBytesPerScan }),
        ...(scan.issued === undefined ? {} : { issued: scan.issued }),
        ...(scan.summary === undefined ? {} : { summary: scan.summary })
      })
    })
  )
)

export const PoolScanCodec = Schema.Union([
  PoolScanFromString,
  PoolScanFromWire
])

/** One `zpool status` vdev row. Children are indented leaves / raid groups. */
export class VdevStatus {
  readonly name: string
  readonly state?: PoolHealth
  readonly read?: bigint
  readonly write?: bigint
  readonly checksum?: bigint
  readonly errors?: string
  readonly kind?: string
  readonly children?: ReadonlyArray<VdevStatus>
  constructor(fields: {
    readonly name: string
    readonly state?: PoolHealth
    readonly read?: bigint
    readonly write?: bigint
    readonly checksum?: bigint
    readonly errors?: string
    readonly kind?: string
    readonly children?: ReadonlyArray<VdevStatus>
  }) {
    this.name = fields.name
    if (fields.state !== undefined) this.state = fields.state
    if (fields.read !== undefined) this.read = fields.read
    if (fields.write !== undefined) this.write = fields.write
    if (fields.checksum !== undefined) this.checksum = fields.checksum
    if (fields.errors !== undefined) this.errors = fields.errors
    if (fields.kind !== undefined) this.kind = fields.kind
    if (fields.children !== undefined) this.children = fields.children
  }
}

export const vdevConfig = (config: unknown): ReadonlyArray<VdevStatus> => {
  if (!Array.isArray(config)) return []
  return config.filter((row): row is VdevStatus => row instanceof VdevStatus)
}

export class PoolStatus extends Schema.Class<PoolStatus>("effect-zfs/PoolStatus")({
  name: PoolName,
  state: Schema.optionalKey(PoolHealth),
  status: Schema.optionalKey(Schema.String),
  action: Schema.optionalKey(Schema.String),
  scan: Schema.optionalKey(PoolScanCodec),
  config: Schema.optionalKey(Schema.Unknown),
  raw: Schema.Unknown
}) {}

export const PropertyGetFromColumns = PropertyGetTuple.pipe(
  Schema.decodeTo(
    PropertyGetRow,
    SchemaTransformation.transform({
      decode: (parts) => {
        if (parts.length === 5) {
          const received = parts[3] === "-" ? undefined : parts[3]
          return new PropertyGetRow({
            name: parts[0] ?? "",
            property: parts[1] ?? "",
            value: parts[2] ?? "",
            source: parts[4] ?? "none",
            ...(received === undefined ? {} : { received })
          })
        }
        return new PropertyGetRow({
          name: parts[0] ?? "",
          property: parts[1] ?? "",
          value: parts[2] ?? "",
          source: parts[3] ?? "none"
        })
      },
      encode: (row) =>
        row.received === undefined
          ? [row.name, row.property, row.value, row.source] as const
          : [row.name, row.property, row.value, row.received, row.source] as const
    })
  )
)

const JsonPoolRow = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  state: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
  action: Schema.optionalKey(Schema.String),
  scan: Schema.optionalKey(Schema.Union([PoolScanCodec, Schema.Null])),
  vdevs: Schema.optionalKey(Schema.Unknown),
  config: Schema.optionalKey(Schema.Unknown)
})

export const JsonStatusDocument = Schema.Struct({
  output_version: Schema.optionalKey(Schema.Unknown),
  pools: Schema.optionalKey(Schema.Record(Schema.String, JsonPoolRow))
})

export const JsonStatusCodec = Schema.fromJsonString(JsonStatusDocument)

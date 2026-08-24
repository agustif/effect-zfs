import { Schema } from "effect"
import {
  maxDatasetNameBytes,
  maxDatasetNesting,
  maxPermsetNameLen,
  maxPoolNameBytes,
  reservedPoolNames
} from "./Limits.js"

const isValidChar = (c: string, allowPercent: boolean): boolean =>
  (c >= "a" && c <= "z") ||
  (c >= "A" && c <= "Z") ||
  (c >= "0" && c <= "9") ||
  c === "-" || c === "_" || c === "." || c === ":" || c === " " ||
  (allowPercent && c === "%")

const whyInvalidChar = (c: string) => `invalid character ${JSON.stringify(c)}`

/** Port of `zfs_component_namecheck` (snapshot/bookmark/pool component). */
export const componentWhy = (path: string): string | undefined => {
  if (path.length > maxDatasetNameBytes) return "component longer than ZFS_MAX_DATASET_NAME_LEN"
  if (path.length === 0) return "empty component"
  for (const c of path) {
    if (!isValidChar(c, false)) return whyInvalidChar(c)
  }
  return undefined
}

/**
 * Port of `entity_namecheck` (`[component/]*component[(@|#)component]?`).
 * Dataset names forbid `#`; snapshots require `@`; bookmarks require `#`.
 */
export const entityWhy = (
  path: string,
  kind: "dataset" | "snapshot" | "bookmark"
): string | undefined => {
  if (path.length > maxDatasetNameBytes) return "name longer than ZFS_MAX_DATASET_NAME_LEN"
  if (path.length === 0) return "empty name"
  if (path.startsWith("/")) return "leading slash"

  let start = 0
  let foundDelim = false
  let slashes = 0
  for (let i = 0; i <= path.length; i++) {
    const c = i === path.length ? "" : path[i] ?? ""
    const isEnd = i === path.length
    const isSlash = c === "/"
    const isAt = c === "@"
    const isHash = c === "#"
    if (!isEnd && !isSlash && !isAt && !isHash) continue

    const component = path.slice(start, i)
    if (component.length === 0) return "empty component"
    for (const ch of component) {
      if (!isValidChar(ch, true)) return whyInvalidChar(ch)
    }
    if (!foundDelim) {
      if (component === ".") return "self-reference component"
      if (component === "..") return "parent-reference component"
    }
    if (isSlash) {
      if (foundDelim) return "slash after snapshot or bookmark delimiter"
      slashes += 1
      if (slashes >= maxDatasetNesting) return `dataset nesting at or above ${maxDatasetNesting}`
    }
    if (isAt || isHash) {
      if (foundDelim) return "multiple snapshot/bookmark delimiters"
      foundDelim = true
    }
    if (isEnd) {
      if (path.endsWith("/")) return "trailing slash"
      if (kind === "dataset" && path.includes("#")) return "bookmark delimiter in dataset name"
      if (kind === "dataset" && path.includes("@")) return "snapshot delimiter in dataset name"
      if (kind === "snapshot" && !path.includes("@")) return "snapshot name requires @"
      if (kind === "bookmark" && !path.includes("#")) return "bookmark name requires #"
      return undefined
    }
    start = i + 1
  }
  return undefined
}

/** Port of `pool_namecheck`. */
export const poolWhy = (pool: string): string | undefined => {
  if (pool.length > maxPoolNameBytes) return "pool name longer than origin-adjusted ZFS_MAX_DATASET_NAME_LEN"
  if (pool.length === 0) return "empty pool name"
  const first = pool[0] ?? ""
  if (!((first >= "a" && first <= "z") || (first >= "A" && first <= "Z"))) {
    return "pool name must begin with a letter"
  }
  for (const c of pool) {
    if (!isValidChar(c, false)) return whyInvalidChar(c)
  }
  if ((reservedPoolNames as readonly string[]).includes(pool)) {
    return `reserved pool name ${pool}`
  }
  return undefined
}

const filter = (why: (value: string) => string | undefined, title: string) =>
  Schema.makeFilter((value: string) => why(value), { title, description: title })

export const PoolName = Schema.NonEmptyString.pipe(
  Schema.check(filter(poolWhy, "PoolName")),
  Schema.brand("PoolName")
)
export type PoolName = typeof PoolName.Type

export const DatasetName = Schema.NonEmptyString.pipe(
  Schema.check(filter((value) => entityWhy(value, "dataset"), "DatasetName")),
  Schema.brand("DatasetName")
)
export type DatasetName = typeof DatasetName.Type

export const SnapshotName = Schema.NonEmptyString.pipe(
  Schema.check(filter((value) => entityWhy(value, "snapshot"), "SnapshotName")),
  Schema.brand("SnapshotName")
)
export type SnapshotName = typeof SnapshotName.Type

export const BookmarkName = Schema.NonEmptyString.pipe(
  Schema.check(filter((value) => entityWhy(value, "bookmark"), "BookmarkName")),
  Schema.brand("BookmarkName")
)
export type BookmarkName = typeof BookmarkName.Type

export const SnapshotComponent = Schema.NonEmptyString.pipe(
  Schema.check(filter(componentWhy, "SnapshotComponent")),
  Schema.brand("SnapshotComponent")
)
export type SnapshotComponent = typeof SnapshotComponent.Type

/** User hold tag. Same charset/length as a snapshot component; leading '.' is reserved. */
export const holdTagWhy = (tag: string): string | undefined => {
  if (tag.startsWith(".")) return "hold tag may not start with '.'"
  return componentWhy(tag)
}

export const HoldTag = Schema.NonEmptyString.pipe(
  Schema.check(filter(holdTagWhy, "HoldTag")),
  Schema.brand("HoldTag")
)
export type HoldTag = typeof HoldTag.Type

/** Port of `permset_namecheck` (`@` + snapshot-component charset, max 63). */
export const permsetWhy = (path: string): string | undefined => {
  if (path.length >= maxPermsetNameLen) return "permission set name longer than ZFS_PERMSET_MAXLEN"
  if (!path.startsWith("@")) return "permission set name requires @"
  return componentWhy(path.slice(1))
}

export const DelegPermSetName = Schema.NonEmptyString.pipe(
  Schema.check(filter(permsetWhy, "DelegPermSetName")),
  Schema.brand("DelegPermSetName")
)
export type DelegPermSetName = typeof DelegPermSetName.Type

export const BookmarkComponent = Schema.NonEmptyString.pipe(
  Schema.check(filter(componentWhy, "BookmarkComponent")),
  Schema.brand("BookmarkComponent")
)
export type BookmarkComponent = typeof BookmarkComponent.Type

/**
 * `zfs destroy snapshot@from%to`. Both sides are snapshot components; the
 * left of `%` is a full snapshot name.
 */
export const snapshotRangeWhy = (path: string): string | undefined => {
  const at = path.indexOf("@")
  if (at <= 0) return "snapshot range requires @"
  const percent = path.indexOf("%", at + 1)
  if (percent < 0) return "snapshot range requires %"
  if (percent === path.length - 1) return "empty snapshot range end"
  const from = path.slice(0, percent)
  const toComponent = path.slice(percent + 1)
  const fromWhy = entityWhy(from, "snapshot")
  if (fromWhy) return fromWhy
  return componentWhy(toComponent)
}

export const SnapshotRange = Schema.NonEmptyString.pipe(
  Schema.check(filter(snapshotRangeWhy, "SnapshotRange")),
  Schema.brand("SnapshotRange")
)
export type SnapshotRange = typeof SnapshotRange.Type
export const snapshotRange = Schema.decodeUnknownSync(SnapshotRange)

export const DestroyTarget = Schema.Union([SnapshotName, DatasetName, BookmarkName, SnapshotRange])
export type DestroyTarget = typeof DestroyTarget.Type

export const poolName = Schema.decodeUnknownSync(PoolName)
export const datasetName = Schema.decodeUnknownSync(DatasetName)
export const snapshotComponent = Schema.decodeUnknownSync(SnapshotComponent)
export const bookmarkComponent = Schema.decodeUnknownSync(BookmarkComponent)
export const holdTag = Schema.decodeUnknownSync(HoldTag)
export const delegPermSetName = Schema.decodeUnknownSync(DelegPermSetName)

export const snapshotName = (
  dataset: DatasetName | string,
  snapshot: SnapshotComponent | string
): SnapshotName => {
  const ds = Schema.decodeUnknownSync(DatasetName)(dataset)
  const component = Schema.decodeUnknownSync(SnapshotComponent)(snapshot)
  return Schema.decodeUnknownSync(SnapshotName)(`${ds}@${component}`)
}

export const snapshotDatasetName = (name: SnapshotName): DatasetName => {
  const at = name.indexOf("@")
  return Schema.decodeUnknownSync(DatasetName)(name.slice(0, at))
}

export const snapshotComponentOf = (name: SnapshotName): SnapshotComponent => {
  const at = name.indexOf("@")
  return Schema.decodeUnknownSync(SnapshotComponent)(name.slice(at + 1))
}

export const bookmarkName = (
  dataset: DatasetName | string,
  bookmark: BookmarkComponent | string
): BookmarkName => {
  const ds = Schema.decodeUnknownSync(DatasetName)(dataset)
  const component = Schema.decodeUnknownSync(BookmarkComponent)(bookmark)
  return Schema.decodeUnknownSync(BookmarkName)(`${ds}#${component}`)
}

export const datasetOfBookmark = (name: BookmarkName): DatasetName =>
  Schema.decodeUnknownSync(DatasetName)(name.slice(0, name.indexOf("#")))

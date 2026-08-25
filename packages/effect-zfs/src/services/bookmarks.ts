import { Context, Effect, Layer } from "effect"
import { CreateBookmark, DestroyBookmark, GetBookmarkProps, ListBookmarks, propertyName } from "../args/index.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeCodec, decodeNameArg } from "../schema/decode.js"
import { Bookmark, Snapshot } from "../schema/models.js"
import {
  BookmarkComponent,
  type BookmarkName,
  bookmarkName,
  DatasetName,
  datasetOfBookmark,
  type SnapshotName
} from "../schema/name.js"
import type { PropertyDefinition, PropertyValue, ResolvedProperty } from "../schema/property.js"

export { Bookmark }

const bookmarkNameOf = (value: Bookmark | BookmarkName): BookmarkName => value instanceof Bookmark ? value.name : value

const sourceNameOf = (
  value: Snapshot | SnapshotName | Bookmark | BookmarkName
): SnapshotName | BookmarkName => {
  if (value instanceof Snapshot) return value.name
  if (value instanceof Bookmark) return value.name
  return value
}

export class Bookmarks extends Context.Service<Bookmarks, {
  readonly create: (
    source: Snapshot | SnapshotName | Bookmark | BookmarkName,
    name: BookmarkComponent | string
  ) => Effect.Effect<Bookmark, Failure>
  readonly destroy: (bookmark: Bookmark | BookmarkName) => Effect.Effect<void, Failure>
  readonly list: (
    options?: { readonly root?: DatasetName; readonly recursive?: boolean }
  ) => Effect.Effect<ReadonlyArray<Bookmark>, Failure>
  readonly get: <P extends PropertyDefinition<string, any, any, any>>(
    bookmark: Bookmark | BookmarkName,
    property: P
  ) => Effect.Effect<ResolvedProperty<PropertyValue<P>>, Failure>
}>()("effect-zfs/Bookmarks") {
  static readonly layer = Layer.effect(
    Bookmarks,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const create = Effect.fn("Bookmarks.create")(function*(
        source: Snapshot | SnapshotName | Bookmark | BookmarkName,
        name: BookmarkComponent | string
      ) {
        const component = yield* decodeNameArg("Bookmark.Create", BookmarkComponent, name)
        const sourceName = sourceNameOf(source)
        const dataset = source instanceof Snapshot
          ? source.dataset.name
          : source instanceof Bookmark
          ? source.dataset
          : yield* decodeNameArg(
            "Bookmark.Create",
            DatasetName,
            sourceName.includes("@")
              ? sourceName.slice(0, sourceName.indexOf("@"))
              : sourceName.slice(0, sourceName.indexOf("#"))
          )
        const full = bookmarkName(dataset, component)
        yield* zfs.createBookmark(
          new CreateBookmark({
            source: sourceName,
            name: full
          })
        )
        return new Bookmark({ name: full, dataset })
      })

      const destroy = Effect.fn("Bookmarks.destroy")(function*(target: Bookmark | BookmarkName) {
        yield* zfs.destroyBookmark(new DestroyBookmark({ name: bookmarkNameOf(target) }))
      })

      const list = Effect.fn("Bookmarks.list")(function*(
        options: { readonly root?: DatasetName; readonly recursive?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Bookmark.List", ListBookmarks, options)
        const rows = yield* zfs.listBookmarks(args)
        return rows.map((row) =>
          new Bookmark({
            name: row.name,
            dataset: datasetOfBookmark(row.name)
          })
        )
      })

      const get = Effect.fn("Bookmarks.get")(function*<P extends PropertyDefinition<string, any, any, any>>(
        target: Bookmark | BookmarkName,
        property: P
      ) {
        const row = yield* zfs.getBookmarkProps(
          new GetBookmarkProps({
            name: bookmarkNameOf(target),
            property: propertyName(property.name)
          })
        )
        const value = yield* decodeCodec("Bookmark.Get", property.schema, row.value)
        const received = row.received === undefined
          ? undefined
          : yield* decodeCodec("Bookmark.Get", property.schema, row.received)
        const resolved: ResolvedProperty<PropertyValue<P>> = received === undefined
          ? { value, source: row.source }
          : { value, source: row.source, received }
        return resolved
      })

      return Bookmarks.of({ create, destroy, list, get })
    })
  )
}

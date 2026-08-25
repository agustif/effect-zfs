# Architecture

## Invariants

1. Semantic services never import child processes or libzfs. They depend on `ZfsProtocol`.
2. `ZfsProtocol` is replaceable: `Cli.layer` now, `Native.layerFrom` / `Native.linuxLayer`, `Test.layer` / `ZfsProtocol.testLayer` in tests.
3. `ZfsProtocol` methods take `Args` `Schema.Class` values (`CreateVolume`, `Send`, `GetProperty`, …), not argv and not untyped objects. Argv lives only in `Cli.protocolLayer`. Native bindings must not parse argv. Names, sizes, scopes, and flags are Schema (brands, `Literals`, `optionalKey`).
4. `ZfsProcess` (`run` / `stream` / `runWithInput`) is CLI-only process transport. Native interpreters do not depend on it.
5. Upstream metadata is generated. Semantic exceptions live in patches, never in generated files.
6. ZFS uint64 values decode as `bigint`, never JavaScript `number`.
7. Read-only and type-inapplicable properties are rejected by TypeScript where the generated table allows it.
8. CLI stderr classification is conservative. Unknown text is `UnknownZfsError`. Native maps `libzfs_errno()` / EZFS_* through `Native.classifyNativeError`, still gated by per-operation tags.
9. Streams stay streams. `zfs send` / `lzc_send` must not buffer a backup stream in memory.
10. Compatibility floor is Linux ZFS 2.2.2. JSON `zpool status -j` is OpenZFS 2.3+; `Cli.protocolLayer` falls back to text `-p` only on “invalid option”. Every OpenZFS 2.2.2–2.4.4 minor is in `spec/releases.json` and generated `linuxReleases`.
11. Live mutation is allowed only on process-created pools named `effectzfs_test_*`.

## Runtime graph

```text
Datasets  Pools  Snapshots  Bookmarks  Replication
Crypto    Mount  Delegations  Quotas
                    |
              ZfsProtocol
           /        |         \
 Cli.protocolLayer  Native.layerFrom  Test.layer
          |
    ZfsProcess   (Cli.processLayer)
          |
 ChildProcessSpawner   (NodeServices.layer on Node)
```

`export const layer` merges the nine domain services and still requires `ZfsProtocol`. Provide `Cli.layer`, `Native.linuxLayer()` / `Native.layerFrom(bindings)`, or a test layer at the program edge.

Service methods close over `ZfsProtocol` in `Layer.effect`, so method signatures have `R = never`. Models (`Dataset`, `Pool`, `Snapshot`, `CommandResult`) and operation args (`Args.*`) are `Schema.Class`. Failures are `Schema.TaggedError`. Invalid names/sizes fail as `InvalidName` / `InvalidProperty` at the service boundary (`decodeNameArg` / `decodePropertyArg`).

OpenZFS limits live in `schema/limits.ts` (`SPA_MINDEVSIZE`, `SPA_MINBLOCKSIZE`, `ZFS_MAX_DATASET_NAME_LEN`, nesting 50, reserved pool names). `schema/name.ts` ports `zfs_namecheck.c`.

Switching interpreters must not change the nine domain services. CLI ops with no Ubuntu subcommand fail `UnknownZfsError`; native implements the ioctl.

## Native contract

`NativeBindings` is the FFI surface. Same `Args` as CLI.

- `Native.unboundBindings()`: every method fails `NativeFailure` (`libzfs_core addon is not loaded`). No silent `Effect.void`.
- `Native.linuxBindings()`: on Linux, optional koffi `libzfs_core.so.3` + `libnvpair` + `libzfs.so.N` (SONAME 2–10). lzc covers create/snapshot/clone/hold/release/bookmark/destroy, keys, send/receive pipes, trim/initialize/scrub, channel program, bootenv, vdev GUIDs. libzfs covers list/get/set/mount/share, pool create/destroy, import/export/reguid/upgrade/labelclear/clear, vdev topology, status/events/iostat/history, allow/quotas, version, zone, diff, upgrade, path unmount, dRAID packing, destroy ranges, rollback `-r/-R/-f`.
- `zpool trim|initialize|scrub -a` is typed but refused on both CLI-native live paths (would touch non-test pools).
- list / props / status / pool create / mount / topology: libzfs (no stable lzc equivalent)
- failures: `NativeFailure` with EZFS_* `code` and/or numeric `errno` (see generated `errorValueToCode`)
- `Native.layerFrom` maps those onto the same tagged errors the CLI classifier uses

`Native.layer` is unbound. Provide `Native.linuxLayer()` on Linux or `layerFrom(customAddon)`.

## Codegen

The extractor reads table-driven C registration in `zfs_prop.c` / `zpool_prop.c` and `zfs_error_t` in `libzfs.h`. It understands `zprop_register_{string,number,index,hidden}`, `impl`, metaslab-class macros, `PROP_ONETIME_DEFAULT`, concatenated C strings, and trailing enumerator comments. Vdev properties (`vdev_prop_init`, `ZFS_TYPE_VDEV`) emit as `VdevProperty` / `vdevPropertyNames`, separate from pool/dataset tables.

Pipeline: OpenZFS C → property/error extractors → Smithy 2.0 JSON (`buildSmithy`) → RFC 6902 `patches/smithy.json` → generated Effect types. Operations take `input`/`output`/`since` from `spec/operation-io.json` and native `kind`/`symbol`/`nvlist` from `spec/native.json`. Codegen emits `OperationInput` / `OperationOutput` / `OperationNative`. Linux minors are `spec/releases.json` → `releases.generated.ts`. `scripts/fetch-openzfs.sh [tag|sha]` can pin any OpenZFS tag for a property-table regen.

`spec/operations.json` is curated: OpenZFS does not publish operation-to-error as an IDL. Live failures should patch that spec, then regenerate. Args classes stay handwritten; Smithy records their names so codegen can infer error unions and IO shapes.

## CLI process rules

`Cli.processLayer` uses `effect/unstable/process`:

- `run` / `runWithInput` are scoped; stdout and stderr are collected with `Stream.decodeText` + `Stream.mkString`.
- `stream` (`zfs send`) yields stdout chunks, drains stderr on a scoped fiber, and concatenates a completion check after EOF so a non-zero exit is a `ZfsCommandFailure` rather than silent end-of-stream. `protocolLayer` classifies that into `ZfsError`.
- `receive` writes the caller’s `Stream` into the child stdin sink so upstream `E` is preserved.

`Stream.unwrap` is the RC.111 API that builds a stream from an Effect and drops `Scope`. There is no `Stream.unwrapScoped` on this RC.

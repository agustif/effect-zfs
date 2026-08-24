# Local handoff

Continue this v0. Do not redesign the pipeline or fall back to macOS OpenZFS.

## Pipeline (keep)

```
OpenZFS source
  -> extractor / patches
  -> Smithy 2.0 JSON
  -> generated Effect types / Schema.TaggedError / operation unions
  -> Datasets / Pools / Snapshots / Replication  (Context.Service)
  -> Args Schema.Class + Limits + Name (zfs_namecheck)
  -> ZfsProtocol   (typed operations, not argv)
       -> Cli.protocolLayer  (argv + ZfsProcess)
       -> Native.layerFrom   (contract; no .node yet)
       -> Test.layer / ZfsProtocol.testLayer
```

Target: **Linux ZFS 2.2.2+** (Ubuntu 24.04 `zfsutils-linux`). OrbStack’s custom kernel has no ZFS; Lima Ubuntu 24.04 vz guests do.

## Already green

- Effect / `@effect/platform-node` / `@effect/vitest` `4.0.0-rc.111`, TypeScript 5.9.3.
- `npm run typecheck` and `npm test` on the host (9 codegen, 31 Vitest, 11 live skipped on Darwin).
- Codegen on `vendor/openzfs` at `84aa7e7e09f6a4ddad9ec40dbe9498d50184ed07`.
- Typed `ZfsProtocol` + `Args.*` Schema classes. Domain services do not build argv.
- `Native.layerFrom` + `classifyNativeError`.
- Lima: smoke + `npm run test:live` on zfs-2.2.2 (10 live 2.2.2 tests). Guest installs Linux natives in `~/.cache/effect-zfs-live` because `/Users/af` is read-only virtiofs.

## Next executable work

Full surface map is `ZFS_MAP.md` (every `zfs`/`zpool` subcommand, `lzc_*`, and `ZFS_IOC_*` vs current 16 ops).

Suggested slice order: incremental send/receive → crypto/`Redacted` → rollback/promote/rename/holds/bookmarks → pool topology → mount/share → scrub/events → remaining ioctl.

Do not add Alchemy-style reconciliation. Keep `ZfsProtocol` + `Args` as the interpreter boundary.

Public usage is in `README.md` and `examples/`. Remaining items are in `TASKS.md`.

# Agent notes

Effect v4 library for Linux ZFS. Compatibility floor is OpenZFS 2.2.2.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run check          # typecheck + lint + test
npm run test:watch
```

Use the workspace TypeScript (`node_modules/typescript`) so `@effect/language-service` loads. `prepare` patches `tsc` for Effect diagnostics at build time.

Do not enable `@effect/eslint-plugin` dprint. It rewrites mixed Schema.Class type/value imports into invalid TypeScript. `npm run lint:fix` may add inline `import { type X }` only; do not merge or split import blocks by formatter.

## Local Effect source

If present, grep `~/.local/share/effect-solutions/effect` (Effect v4 / effect-smol) for API examples. Do not vendor it into this repo.

Live mutation is Lima-only (`npm run test:live` / `:2.3` / `:2.4`). Darwin `vitest` skips `test/live/*`. Guest work happens in `~/.cache/effect-zfs-live` because virtiofs of `$HOME` is read-only.

## Invariants

1. Domain services depend on `ZfsProtocol`, not child processes or libzfs.
2. Protocol methods take `Args` Schema classes, not argv.
3. Do not hand-edit `packages/effect-zfs/src/generated/*`. Change `patches/` / `spec/` and `npm run generate`.
4. `npm run generate` needs `vendor/openzfs` or an explicit `--fixtures` / `--openzfs` path.
5. Streams stay streams: `zfs send` / `lzc_send` must not buffer the backup in memory.
6. Live pools must be process-created names `effectzfs_test_*`. Never run `zpool trim|initialize|scrub -a`.
7. Do not add Alchemy-style reconciliation.

## Public API

Package subpaths: `effect-zfs`, `effect-zfs/cli`, `effect-zfs/native`, `effect-zfs/test`.
`layer` is nine services: Datasets, Pools, Snapshots, Bookmarks, Replication, Crypto, Mount, Delegations, Quotas.

Remaining holes: `GAPS.md`. Architecture: `ARCHITECTURE.md`.

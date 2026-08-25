import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { parseTargets, unquote } from "../src/c-parser.mjs"
import { emitErrors, emitOperations, emitProperties, emitReleases } from "../src/emit-effect.mjs"
import { extractErrors } from "../src/extract-errors.mjs"
import { extractProperties, extractVdevProperties } from "../src/extract-properties.mjs"
import { applyJsonPatch } from "../src/json-patch.mjs"
import { buildSmithy } from "../src/smithy.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../..")

test("extracts typed property metadata from OpenZFS-style tables", async () => {
  const source = await fs.readFile(path.join(root, "fixtures/openzfs/zfs_prop.c"), "utf8")
  const patches = JSON.parse(await fs.readFile(path.join(root, "patches/properties.json"), "utf8"))
  const props = extractProperties(source, "dataset", patches.dataset)
  const compression = props.find((p) => p.name === "compression")
  assert.deepEqual(compression.values, ["on", "off", "lz4", "zstd", "zstd-1", "zstd-3", "zstd-19"])
  assert.deepEqual(compression.targets, ["filesystem", "volume"])
  assert.equal(compression.access, "inheritable")
  assert.equal(props.find((p) => p.name === "used").access, "readonly")
  assert.equal(props.find((p) => p.name === "recordsize").codec, "bytes")
})

test("expands OpenZFS dataset masks and keeps hidden properties out of the public API", () => {
  assert.deepEqual(parseTargets("ZFS_TYPE_DATASET | ZFS_TYPE_BOOKMARK"), [
    "filesystem",
    "volume",
    "snapshot",
    "bookmark"
  ])

  const source = `
    void zfs_prop_init(void) {
      zprop_register_hidden(ZFS_PROP_NAME, "name", PROP_TYPE_STRING, PROP_READONLY,
          ZFS_TYPE_DATASET, "NAME", B_TRUE, NULL);
      zprop_register_string(ZFS_PROP_MOUNTPOINT, "mountpoint", "/", PROP_INHERIT,
          ZFS_TYPE_FILESYSTEM, "<path>", "MOUNTPOINT", NULL);
    }
  `
  const properties = extractProperties(source, "dataset", {})
  const hidden = properties.find((p) => p.name === "name")
  assert.equal(hidden.hidden, true)
  assert.deepEqual(hidden.targets, ["filesystem", "volume", "snapshot"])
  const model = buildSmithy({ properties, errors: [], operations: [], source: "fixture" })
  const code = emitProperties(model)
  assert.doesNotMatch(code, /\bname: defineProperty/)
  assert.match(code, /mountpoint: defineProperty/)
  assert.match(code, /export const datasetPropertyNames = \[/)
  assert.match(code, /export const poolPropertyNames = \[/)
  assert.match(code, /export const vdevPropertyNames = \[/)
})

test("extracts vdev properties from vdev_prop_init tables", () => {
  const source = `
    static const zprop_index_t boolean_table[] = {
      { "off", 0 },
      { "on", 1 },
      { NULL }
    };
    void vdev_prop_init(void) {
      zprop_register_string(VDEV_PROP_COMMENT, "comment", NULL,
          PROP_DEFAULT, ZFS_TYPE_VDEV, "<comment-string>", "COMMENT", NULL);
      zprop_register_number(VDEV_PROP_SIZE, "size", 0, PROP_READONLY,
          ZFS_TYPE_VDEV, "<size>", "SIZE", B_FALSE, NULL);
      zprop_register_index(VDEV_PROP_REMOVING, "removing", 0,
          PROP_READONLY, ZFS_TYPE_VDEV, "on | off", "REMOVING",
          boolean_table, NULL);
      zprop_register_hidden(VDEV_PROP_NAME, "name", PROP_TYPE_STRING,
          PROP_READONLY, ZFS_TYPE_VDEV, "NAME", B_TRUE, NULL);
    }
  `
  const props = extractVdevProperties(source, {})
  assert.equal(props.find((p) => p.name === "comment").access, "mutable")
  assert.equal(props.find((p) => p.name === "size").codec, "bytes")
  assert.equal(props.find((p) => p.name === "removing").codec, "boolean")
  assert.equal(props.find((p) => p.name === "name").hidden, true)
  const model = buildSmithy({ properties: props, errors: [], operations: [], source: "fixture" })
  const code = emitProperties(model)
  assert.match(code, /export const VdevProperty/)
  assert.match(code, /comment: defineProperty/)
  assert.doesNotMatch(code, /VdevProperty = \{[\s\S]*\bname: defineProperty/)
})

test("emits numeric errno table for native mapping", () => {
  const model = buildSmithy({
    properties: [],
    errors: [{ code: "EZFS_NOENT", value: 2009, tag: "DatasetNotFound" }],
    operations: [],
    source: "fixture"
  })
  const code = emitErrors(model)
  assert.match(code, /errorValueToCode/)
  assert.match(code, /2009: "EZFS_NOENT"/)
})

test("extracts libzfs error numbers and semantic patch tags", async () => {
  const source = await fs.readFile(path.join(root, "fixtures/openzfs/libzfs.h"), "utf8")
  const aliases = JSON.parse(await fs.readFile(path.join(root, "patches/errors.json"), "utf8"))
  const errors = extractErrors(source, aliases)
  assert.equal(errors.find((e) => e.code === "EZFS_NOMEM").value, 2000)
  assert.equal(errors.find((e) => e.code === "EZFS_BADPROP").value, 2001)
  assert.equal(errors.find((e) => e.code === "EZFS_BADPROP").tag, "InvalidProperty")
})

test("strips trailing comments in zfs_error_t enumerators", () => {
  const source = `
    typedef enum zfs_error {
      EZFS_SUCCESS = 0,	/* no error -- success */
      EZFS_NOMEM = 2000,	/* out of memory */
      EZFS_BADPROP,		/* invalid property value */
      EZFS_UNKNOWN
    } zfs_error_t;
  `
  const errors = extractErrors(source, { EZFS_BADPROP: "InvalidProperty" })
  assert.equal(errors.find((e) => e.code === "EZFS_NOMEM")?.value, 2000)
  assert.equal(errors.find((e) => e.code === "EZFS_BADPROP")?.value, 2001)
  assert.equal(errors.find((e) => e.code === "EZFS_BADPROP")?.tag, "InvalidProperty")
  assert.equal(errors.find((e) => e.code === "EZFS_UNKNOWN")?.value, 2002)
})

test("emits Smithy custom traits and strongly typed Effect property surface", async () => {
  const source = await fs.readFile(path.join(root, "fixtures/openzfs/zfs_prop.c"), "utf8")
  const patches = JSON.parse(await fs.readFile(path.join(root, "patches/properties.json"), "utf8"))
  const properties = extractProperties(source, "dataset", patches.dataset)
  const model = buildSmithy({ properties, errors: [], operations: [], source: "fixture" })
  const compression = Object.values(model.shapes).find((s) =>
    s.traits?.["effect.zfs#zfsProperty"]?.name === "compression"
  )
  assert.equal(compression.type, "enum")
  const code = emitProperties(model)
  assert.match(code, /compression: defineProperty<"compression", "on" \| "off" \| "lz4"/)
  assert.match(code, /used: defineProperty<"used", bigint, .*"readonly">/)
})

test("joins adjacent C string literals", () => {
  assert.equal(unquote("\"foo\" \"bar\""), "foobar")
  assert.equal(
    unquote("\"on | off | lzjb | gzip | gzip-[1-9] | zle | lz4 | \"\n    \"zstd | zstd-[1-19]\""),
    "on | off | lzjb | gzip | gzip-[1-9] | zle | lz4 | zstd | zstd-[1-19]"
  )
})

test("extracts impl, onetime-default, metaslab-class macros, and skips vdev/macro-body noise", () => {
  const source = `
    #define zprop_register_mc_props_impl(mcp, uprefix, lprefix, sfeatures) ({ \\
      zprop_register_number(mcp, #lprefix "_size", 0, PROP_READONLY, ZFS_TYPE_POOL, "<size>", #uprefix "_SIZE", B_FALSE, sfeatures); \\
    })
    #define zprop_register_mc_props(uclass, lclass, sfeatures) \\
      zprop_register_mc_props_impl(ZPOOL_MC_PROPS_##uclass, CLASS_##uclass, class_##lclass, sfeatures)

    void zpool_prop_init(void) {
      zprop_register_mc_props(NORMAL, normal, sfeatures);
      zprop_register_impl(ZFS_PROP_CREATION, "creation", PROP_TYPE_NUMBER, 0,
          NULL, PROP_READONLY, ZFS_TYPE_DATASET | ZFS_TYPE_BOOKMARK,
          "<date>", "CREATION", B_FALSE, B_TRUE, B_TRUE, NULL, sfeatures);
      zprop_register_index(ZFS_PROP_KEYFORMAT, "keyformat", 0, PROP_ONETIME_DEFAULT,
          ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, "none | raw", "KEYFORMAT", keyformat_table, sfeatures);
      zprop_register_number(VDEV_PROP_SIZE, "vdevsize", 0, PROP_READONLY, ZFS_TYPE_VDEV, "<size>", "SIZE", B_FALSE, sfeatures);
    }
    static const zprop_index_t keyformat_table[] = {
      { "none", 0 }, { "raw", 1 }, { NULL }
    };
  `
  const properties = extractProperties(source, "pool", {})
  const names = properties.map((p) => p.name)
  assert.equal(properties.find((p) => p.name === "class_normal_size")?.codec, "bytes")
  assert.equal(properties.find((p) => p.name === "class_normal_capacity")?.codec, "integer")
  assert.equal(properties.find((p) => p.name === "creation")?.access, "readonly")
  assert.equal(properties.find((p) => p.name === "creation")?.codec, "bigint")
  assert.equal(properties.find((p) => p.name === "keyformat")?.access, "setOnce")
  assert.ok(!names.includes("vdevsize"))
  assert.ok(!names.includes("_size"))
  assert.ok(!names.some((n) => n.includes("lclass") || n.includes("#")))
})

test("checked-in generated files are reproducible", async () => {
  const files = [
    "properties.generated.ts",
    "errors.generated.ts",
    "operations.generated.ts",
    "releases.generated.ts"
  ]
  const before = await Promise.all(
    files.map((f) => fs.readFile(path.join(root, "packages/effect-zfs/src/generated", f), "utf8"))
  )
  const { spawn } = await import("node:child_process")
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "packages/codegen/src/generate-all.mjs")], {
      stdio: "ignore"
    })
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`generator exited ${code}`)))
  })
  const after = await Promise.all(
    files.map((f) => fs.readFile(path.join(root, "packages/effect-zfs/src/generated", f), "utf8"))
  )
  assert.deepEqual(after, before)
})

test("RFC 6902 patches apply to the Smithy model", () => {
  const model = buildSmithy({ properties: [], errors: [], operations: [], source: "fixture" })
  const patched = applyJsonPatch(model, [
    { op: "add", path: "/metadata/patchLayer", value: "rfc6902" }
  ])
  assert.equal(patched.metadata.patchLayer, "rfc6902")
  assert.equal(model.metadata.patchLayer, undefined)
  const replaced = applyJsonPatch({ a: { b: 1 } }, [{ op: "replace", path: "/a/b", value: 2 }])
  assert.equal(replaced.a.b, 2)
  const removed = applyJsonPatch({ a: { b: 1, c: 2 } }, [{ op: "remove", path: "/a/b" }])
  assert.equal(removed.a.b, undefined)
  const copied = applyJsonPatch({ a: 1 }, [{ op: "copy", path: "/b", from: "/a" }])
  assert.equal(copied.b, 1)
})

test("operations carry input/output/since in the Smithy model and generated shapes", () => {
  const model = buildSmithy({
    properties: [],
    errors: [],
    operations: [{ id: "Dataset.CreateFilesystem", errors: [] }],
    operationIo: { "Dataset.CreateFilesystem": { input: "CreateFilesystem", output: "void" } },
    source: "fixture"
  })
  const shape = model.shapes["effect.zfs#Dataset_CreateFilesystem"]
  assert.equal(shape.input.target, "effect.zfs#CreateFilesystem")
  assert.equal(shape.traits["effect.zfs#zfsOperation"].since, "2.2.2")
  const code = emitOperations(model)
  assert.match(code, /export const OperationShapes/)
  assert.match(code, /"Dataset.CreateFilesystem"/)
  assert.match(code, /"input": "CreateFilesystem"/)
  assert.match(code, /export type OperationInput/)
  assert.match(code, /export type OperationOutput/)
})

test("Smithy native catalog is emitted onto operations", () => {
  const model = buildSmithy({
    properties: [],
    errors: [],
    operations: [{ id: "Dataset.CreateFilesystem", errors: [] }],
    operationIo: { "Dataset.CreateFilesystem": { input: "CreateFilesystem", output: "void" } },
    native: { "Dataset.CreateFilesystem": { kind: "lzc", symbol: "lzc_create", nvlist: true } },
    source: "fixture"
  })
  const meta = model.shapes["effect.zfs#Dataset_CreateFilesystem"].traits["effect.zfs#zfsOperation"]
  assert.equal(meta.native.symbol, "lzc_create")
  const code = emitOperations(model)
  assert.match(code, /export const OperationNative/)
  assert.match(code, /"lzc_create"/)
})

test("emits a typed catalog for every Linux OpenZFS 2.2.2–2.4.4 minor", async () => {
  const catalog = JSON.parse(await fs.readFile(path.join(root, "spec/releases.json"), "utf8"))
  assert.equal(catalog.releases.length, 25)
  const code = emitReleases(catalog)
  assert.match(code, /v2_2_2:/)
  assert.match(code, /v2_2_11:/)
  assert.match(code, /v2_3_9:/)
  assert.match(code, /v2_4_4:/)
  assert.match(code, /"tag": "zfs-2.3.1"/)
  assert.match(code, /"datasetPrefetchProp": true/)
})

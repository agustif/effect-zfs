#!/usr/bin/env node
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { extractPropertyFiles } from "./extract-properties.mjs"
import { extractErrorFile } from "./extract-errors.mjs"
import { buildSmithy } from "./smithy.mjs"
import { emitErrors, emitOperations, emitProperties } from "./emit-effect.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../..")
const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const vendor = path.join(root, "vendor/openzfs")
const vendorReady = fs.existsSync(path.join(vendor, "module/zcommon/zfs_prop.c"))
const fixturesOnly = process.argv.includes("--fixtures")
const upstream = arg("--openzfs") ?? (!fixturesOnly && vendorReady ? vendor : undefined)
const paths = upstream ? {
  datasetPath: path.join(upstream, "module/zcommon/zfs_prop.c"),
  poolPath: path.join(upstream, "module/zcommon/zpool_prop.c"),
  headerPath: path.join(upstream, "include/libzfs.h")
} : {
  datasetPath: path.join(root, "fixtures/openzfs/zfs_prop.c"),
  poolPath: path.join(root, "fixtures/openzfs/zpool_prop.c"),
  headerPath: path.join(root, "fixtures/openzfs/libzfs.h")
}
const [properties, errors, operationsRaw] = await Promise.all([
  extractPropertyFiles({ ...paths, patchPath: path.join(root, "patches/properties.json") }),
  extractErrorFile({ ...paths, patchPath: path.join(root, "patches/errors.json") }),
  fsp.readFile(path.join(root, "spec/operations.json"), "utf8")
])
const operations = JSON.parse(operationsRaw).operations
const model = buildSmithy({ properties, errors, operations, source: upstream ?? "fixtures/openzfs" })
await fsp.mkdir(path.join(root, ".generated-specs"), { recursive: true })
await fsp.writeFile(path.join(root, ".generated-specs/openzfs.json"), JSON.stringify(model, null, 2) + "\n")
const out = path.join(root, "packages/effect-zfs/src/generated")
await fsp.mkdir(out, { recursive: true })
await Promise.all([
  fsp.writeFile(path.join(out, "properties.generated.ts"), emitProperties(model)),
  fsp.writeFile(path.join(out, "errors.generated.ts"), emitErrors(model)),
  fsp.writeFile(path.join(out, "operations.generated.ts"), emitOperations(model))
])
console.log(`generated ${properties.length} properties, ${errors.length} libzfs error codes, ${operations.length} operations`)

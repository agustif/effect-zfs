import { assert, describe, it } from "@effect/vitest"
import { parseStatusOutput } from "../../src/internal/status.js"
import { vdevConfig } from "../../src/Schemas.js"
import { poolName } from "../../src/Name.js"
import {
  atLeast,
  featuresFor,
  linux,
  minimumSupported,
  parseZfsVersionLine,
  supportsJsonStatus
} from "../../src/Version.js"

const name = poolName("effectzfs_test_demo")

describe("linux zfs 2.2.2", () => {
  it("is the support floor and has no JSON status", () => {
    const version = parseZfsVersionLine("zfs-2.2.2-0ubuntu9.4")
    assert.isTrue(atLeast(version, minimumSupported))
    assert.deepStrictEqual(version.major, linux.v2_2_2.major)
    assert.isFalse(supportsJsonStatus(version))
    assert.isFalse(featuresFor(version).jsonStatus)
  })

  it("parses text zpool status -p", () => {
    const stdout = `
  pool: effectzfs_test_demo
 state: ONLINE
  scan: none requested
config:

	NAME                    STATE     READ WRITE CKSUM
	effectzfs_test_demo     ONLINE       0     0     0
	  mirror-0              ONLINE       0     0     0
	    /tmp/vdev-a.img     ONLINE       0     0     0
	    /tmp/vdev-b.img     ONLINE       0     0     0

errors: No known data errors
`
    const status = parseStatusOutput(stdout, name)
    assert.strictEqual(status.state, "ONLINE")
    assert.strictEqual(status.scan?.summary, "none requested")
    const tree = vdevConfig(status.config)
    assert.strictEqual(tree[0]?.name, "effectzfs_test_demo")
    assert.strictEqual(tree[0]?.children?.[0]?.name, "mirror-0")
    assert.strictEqual(tree[0]?.children?.[0]?.children?.[0]?.name, "/tmp/vdev-a.img")
    assert.strictEqual(typeof status.raw, "string")
  })
})

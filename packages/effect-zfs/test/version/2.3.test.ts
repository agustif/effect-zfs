import { assert, describe, it } from "@effect/vitest"
import { parseStatusOutput } from "../../src/cli/status.js"
import { vdevConfig } from "../../src/schema/models.js"
import { poolName } from "../../src/schema/name.js"
import {
  featuresFor,
  linux,
  parseVersionOutput,
  parseZfsVersionLine,
  supportsJsonStatus
} from "../../src/schema/version.js"

const name = poolName("effectzfs_test_demo")

describe("linux zfs 2.3+", () => {
  it("enables JSON zpool status from 2.3.0", () => {
    const version = parseZfsVersionLine("zfs-2.3.0-1")
    assert.isTrue(supportsJsonStatus(version))
    assert.isTrue(featuresFor(version).jsonStatus)
    assert.isTrue(supportsJsonStatus(parseZfsVersionLine("zfs-2.4.4")))
    assert.strictEqual(linux.v2_3_0.minor, 3)
  })

  it("parses OpenZFS 2.3 zfs version -j object form", () => {
    const info = parseVersionOutput(JSON.stringify({
      output_version: { command: "zfs version", vers_major: 0, vers_minor: 1 },
      zfs_version: {
        userland: "zfs-2.3.1-1ubuntu2",
        kernel: "zfs-kmod-2.3.1-1ubuntu1"
      }
    }))
    assert.strictEqual(info.userspace.major, 2)
    assert.strictEqual(info.userspace.minor, 3)
    assert.strictEqual(info.userspace.patch, 1)
    assert.strictEqual(info.kernel?.minor, 3)
  })

  it("parses OpenZFS 2.3+ JSON status", () => {
    const stdout = JSON.stringify({
      output_version: { command: "zpool status", vers_major: 0, vers_minor: 1 },
      pools: {
        effectzfs_test_demo: {
          name: "effectzfs_test_demo",
          state: "DEGRADED",
          status: "One or more devices has been removed.",
          action: "Replace the device.",
          scan: { function: "none" },
          vdevs: {
            effectzfs_test_demo: {
              name: "effectzfs_test_demo",
              vdev_type: "root",
              state: "ONLINE",
              read_errors: "0",
              write_errors: "0",
              checksum_errors: "0",
              vdevs: {
                "mirror-0": {
                  name: "mirror-0",
                  vdev_type: "mirror",
                  state: "DEGRADED",
                  vdevs: {
                    "/tmp/a.img": {
                      name: "/tmp/a.img",
                      vdev_type: "file",
                      state: "ONLINE",
                      read_errors: "0"
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    const status = parseStatusOutput(stdout, name)
    assert.strictEqual(status.state, "DEGRADED")
    assert.strictEqual(status.action, "Replace the device.")
    assert.strictEqual(status.scan?.function, "none")
    assert.strictEqual(typeof status.raw, "object")
    const tree = vdevConfig(status.config)
    assert.strictEqual(tree[0]?.name, "effectzfs_test_demo")
    assert.strictEqual(tree[0]?.kind, "root")
    assert.strictEqual(tree[0]?.children?.[0]?.name, "mirror-0")
    assert.strictEqual(tree[0]?.children?.[0]?.state, "DEGRADED")
    assert.strictEqual(tree[0]?.children?.[0]?.children?.[0]?.name, "/tmp/a.img")
  })
})

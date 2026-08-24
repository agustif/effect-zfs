import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import {
  AllowGrant,
  AllowListing,
  DelegWho,
  delegPermission
} from "../src/Args.js"
import { delegPermSetName } from "../src/Name.js"
import { Delegations } from "../src/Delegation.js"
import { classifyCliError } from "../src/Error.js"
import { inheritFlags, parseAllowStdout, whoArgv } from "../src/internal/allow.js"
import { datasetName } from "../src/Name.js"
import { command } from "../src/Protocol.js"
import * as Test from "../src/Test.js"
import { layer } from "../src/index.js"

const result = (stderr: string) => ({
  command: command("zfs", "allow"),
  stdout: "",
  stderr,
  exitCode: 1
})

describe("delegated allow argv and parser", () => {
  it("builds user/group/everyone/set flags", () => {
    assert.deepStrictEqual([...whoArgv("user", "alice")], ["-u", "alice"])
    assert.deepStrictEqual([...whoArgv("group", "staff")], ["-g", "staff"])
    assert.deepStrictEqual([...whoArgv("everyone", undefined)], ["-e"])
    assert.deepStrictEqual([...whoArgv("create", undefined)], ["-c"])
    assert.deepStrictEqual([...whoArgv("set", "@eng")], ["-s", "@eng"])
    assert.deepStrictEqual([...inheritFlags("local")], ["-l"])
    assert.deepStrictEqual([...inheritFlags("descendant")], ["-d"])
    assert.deepStrictEqual([...inheritFlags("local+descendant")], [])
  })

  it("parses zfs allow text including OpenZFS Descendent spelling", () => {
    const stdout = `
---- Permissions on tank/data --------------------------------------
Permission sets:
	@eng snapshot,rollback
Create time permissions:
	create,mount
Local permissions:
	user alice snapshot,mount
Descendent permissions:
	group staff create
Local+Descendent permissions:
	everyone rollback
`
    const listings = parseAllowStdout(stdout)
    assert.strictEqual(listings.length, 1)
    const row = listings[0]
    assert.ok(row)
    assert.strictEqual(row.setpoint, "tank/data")
    assert.deepStrictEqual(row.sets, [{ name: "@eng", permissions: ["snapshot", "rollback"] }])
    assert.deepStrictEqual(row.create, ["create", "mount"])
    assert.strictEqual(row.grants.length, 3)
    assert.strictEqual(row.grants[0]?.who.kind, "user")
    assert.strictEqual(row.grants[0]?.who.name, "alice")
    assert.strictEqual(row.grants[0]?.inherit, "local")
    assert.strictEqual(row.grants[1]?.inherit, "descendant")
    assert.strictEqual(row.grants[2]?.who.kind, "everyone")
    assert.strictEqual(row.grants[2]?.inherit, "local+descendant")
  })

  it("classifies allow who/perm stderr when the operation declares the tag", () => {
    assert.strictEqual(
      classifyCliError("Dataset.Allow", result("cannot set permissions: invalid user/group nobody\n"))._tag,
      "InvalidWho"
    )
    assert.strictEqual(
      classifyCliError("Dataset.Allow", result("invalid permission set @bad!\n"))._tag,
      "InvalidPermissionSet"
    )
    assert.strictEqual(
      classifyCliError("Dataset.Allow", result("invalid permission frobnicate\n"))._tag,
      "InvalidPermission"
    )
    assert.strictEqual(
      classifyCliError("Dataset.Allow", result("delegated administration is disabled on this pool\n"))._tag,
      "DelegationDisabled"
    )
    assert.strictEqual(
      classifyCliError("Dataset.List", result("invalid permission frobnicate\n"))._tag,
      "UnknownZfsError"
    )
  })
})

describe("Delegations service", () => {
  it.effect("lists ACL rows from the protocol without argv", () =>
    Effect.gen(function*() {
      const delegations = yield* Delegations
      const rows = yield* delegations.list(datasetName("tank/data"))
      assert.strictEqual(rows[0]?.setpoint, datasetName("tank/data"))
      assert.strictEqual(rows[0]?.grants[0]?.who.kind, "user")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        listAllow: () => [
          new AllowListing({
            setpoint: datasetName("tank/data"),
            sets: [],
            create: [],
            grants: [new AllowGrant({
              who: new DelegWho({ kind: "user", name: "alice" }),
              inherit: "local",
              permissions: [delegPermission("snapshot")]
            })]
          })
        ]
      }))))
    )
  )

  it("accepts @set names via permset_namecheck", () => {
    assert.strictEqual(delegPermSetName("@eng"), "@eng")
    assert.throws(() => delegPermSetName("eng"))
  })
})

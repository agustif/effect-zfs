import { assert, describe, it } from "@effect/vitest"
import { classifyCliError } from "../src/Error.js"
import { command } from "../src/Protocol.js"

const result = (stderr: string, exitCode = 1) => ({
  command: command("zfs", "get", "foo"),
  stdout: "",
  stderr,
  exitCode
})

describe("conservative CLI classifier", () => {
  it("maps stable phrases to generated tags when the operation declares them", () => {
    assert.strictEqual(classifyCliError("Dataset.Get", result("cannot open 'tank/nope': dataset does not exist"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Dataset.CreateFilesystem", result("cannot create 'tank/x': dataset already exists"))._tag, "DatasetAlreadyExists")
    assert.strictEqual(classifyCliError("Dataset.Set", result("cannot set property for 'tank/x': 'used' is readonly"))._tag, "PropertyReadOnly")
    assert.strictEqual(classifyCliError("Dataset.Set", result("cannot set property for 'tank/x': 'nope' is an invalid property"))._tag, "InvalidProperty")
    assert.strictEqual(classifyCliError("Dataset.Destroy", result("cannot destroy 'tank/x': dataset is busy"))._tag, "DatasetBusy")
    assert.strictEqual(classifyCliError("Dataset.CreateVolume", result("cannot create 'tank/vol': out of space"))._tag, "OutOfSpace")
    assert.strictEqual(classifyCliError("Replication.Receive", result("cannot receive: invalid backup stream"))._tag, "InvalidBackupStream")
    assert.strictEqual(classifyCliError("Snapshot.Rollback", result("cannot rollback 'tank/fs@a': dataset does not exist"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Dataset.Rename", result("cannot rename: different pool"))._tag, "CrossTarget")
    assert.strictEqual(classifyCliError("Snapshot.List", result("cannot open 'tank/missing': dataset does not exist"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Replication.AbortReceive", result("cannot receive resume stream: dataset is busy"))._tag, "DatasetBusy")
    assert.strictEqual(classifyCliError("Pool.Trim", result("cannot trim 'tank': no such pool"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Pool.Clear", result("cannot clear 'tank': no such pool"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Pool.Create", result("cannot create 'tank': pool already exists"))._tag, "DatasetAlreadyExists")
    assert.strictEqual(classifyCliError("Pool.Destroy", result("cannot open 'tank': no such pool"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Pool.Destroy", result("cannot destroy 'tank': pool is busy"))._tag, "DatasetBusy")
    assert.strictEqual(classifyCliError("Pool.Scrub", result("cannot scrub tank: currently being scrubbed"))._tag, "DatasetBusy")
    assert.strictEqual(classifyCliError("Pool.Resilver", result("cannot restart resilver on tank"))._tag, "Resilvering")
    assert.strictEqual(classifyCliError("Snapshot.Hold", result("cannot hold snapshot 'tank/x@s': tag already exists on this dataset"))._tag, "HoldTagExists")
    assert.strictEqual(classifyCliError("Snapshot.Release", result("cannot release hold from snapshot 'tank/x@s': no such tag on this dataset"))._tag, "HoldTagNotFound")
    assert.strictEqual(classifyCliError("Snapshot.Hold", result("cannot hold snapshot 'tank/x@s': tag is too long"))._tag, "HoldTagTooLong")
    assert.strictEqual(classifyCliError("Mount.Mount", result("cannot mount 'tank/x': filesystem already mounted"))._tag, "MountFailed")
    assert.strictEqual(classifyCliError("Mount.Unmount", result("cannot unmount 'tank/x': not currently mounted"))._tag, "UnmountFailed")
    assert.strictEqual(classifyCliError("Mount.Share", result("cannot share 'tank/x': sharing is not enabled"))._tag, "ShareFailed")
    assert.strictEqual(classifyCliError("Bookmark.Get", result("cannot open 'tank/src#keep': dataset does not exist"))._tag, "DatasetNotFound")
    assert.strictEqual(classifyCliError("Bookmark.Create", result("cannot create bookmark 'tank/src#keep': dataset already exists"))._tag, "DatasetAlreadyExists")
    assert.strictEqual(classifyCliError("Pool.Checkpoint", result("cannot checkpoint 'tank': checkpoint exists"))._tag, "CheckpointExists")
    assert.strictEqual(classifyCliError("Pool.Offline", result("cannot offline '/tmp/a.img': no such device in pool"))._tag, "NoSuchDevice")
    assert.strictEqual(classifyCliError("Pool.Detach", result("can only detach from a mirror"))._tag, "BadAttachTarget")
    assert.strictEqual(classifyCliError("Pool.Offline", result("cannot offline: no valid replicas"))._tag, "NoReplicas")
    assert.strictEqual(classifyCliError("Pool.Checkpoint", result("cannot discard checkpoint of 'tank': pool has no checkpoint"))._tag, "NoCheckpoint")
    assert.strictEqual(classifyCliError("Pool.Import", result("cannot import 'tank': pool is imported on a different system"))._tag, "PoolActive")
    assert.strictEqual(classifyCliError("Pool.LabelClear", result("failed to clear label: must be an absolute path"))._tag, "BadPath")
  })

  it("keeps unmatched stderr as UnknownZfsError", () => {
    const error = classifyCliError("Dataset.List", result("zfs: totally novel diagnostic"))
    assert.strictEqual(error._tag, "UnknownZfsError")
  })

  it("does not promote a phrase the operation did not declare", () => {
    const error = classifyCliError("Dataset.List", result("cannot create 'tank/x': dataset already exists"))
    assert.strictEqual(error._tag, "UnknownZfsError")
  })

  it("maps encryption phrases when the operation declares EncryptionFailure", () => {
    assert.strictEqual(
      classifyCliError("Crypto.LoadKey", result("cannot load key for 'tank/enc': Incorrect key"))._tag,
      "EncryptionFailure"
    )
    assert.strictEqual(
      classifyCliError("Dataset.CreateFilesystem", result("cannot create 'tank/enc': encryption failure"))._tag,
      "EncryptionFailure"
    )
  })

  it("does not promote encryption phrases for operations that omit EncryptionFailure", () => {
    assert.strictEqual(
      classifyCliError("Dataset.List", result("cannot load key for 'tank/enc': Incorrect key"))._tag,
      "UnknownZfsError"
    )
  })
})
